from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from core.models import (
    Driver, Constructor, Race, Result, Lap, 
    ChampionshipStanding, ConstructorSeason, DriverSeason,
    Qualifying, Sprint, Season
)
from .serializers import (
    DriverSerializer, ConstructorSerializer, RaceSerializer, 
    ResultSerializer, LapSerializer, ChampionshipStandingSerializer,
    ConstructorSeasonSerializer, DriverSeasonSerializer,
    QualifyingSerializer, SprintSerializer, SeasonSerializer
)


class SeasonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing F1 seasons.
    """
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    ordering = ['-year']


class DriverViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing drivers.
    """
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['nationality', 'code']
    search_fields = ['first_name', 'last_name', 'driver_id']
    ordering_fields = ['last_name', 'number']
    ordering = ['last_name']


class DriverSeasonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing drivers with season-specific data including team colors and career stats.
    Filter by season year to get drivers for that season with their team info.
    """
    queryset = DriverSeason.objects.select_related('driver', 'constructor', 'season').all()
    serializer_class = DriverSeasonSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['season__year', 'constructor', 'driver']
    search_fields = ['driver__first_name', 'driver__last_name', 'constructor__name']
    ordering_fields = ['driver__last_name', 'season__year']
    ordering = ['-season__year', 'driver__last_name']


class ConstructorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing constructors.
    """
    queryset = Constructor.objects.all()
    serializer_class = ConstructorSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['nationality']
    search_fields = ['name', 'constructor_id']
    ordering_fields = ['name']
    ordering = ['name']


class ConstructorSeasonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing constructor season-specific data (car models, colors, etc).
    """
    queryset = ConstructorSeason.objects.select_related('constructor', 'season').all()
    serializer_class = ConstructorSeasonSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['season__year', 'constructor']
    search_fields = ['constructor__name', 'car_model']
    ordering_fields = ['season__year', 'constructor__name']
    ordering = ['-season__year', 'constructor__name']


class RaceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing races.
    """
    queryset = Race.objects.all()
    serializer_class = RaceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['season', 'round', 'country']
    search_fields = ['race_name', 'circuit_name', 'country']
    ordering_fields = ['season', 'round', 'date']
    ordering = ['-season', 'round']


class ResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing race results.
    """
    queryset = Result.objects.select_related('race', 'driver', 'constructor').all()
    serializer_class = ResultSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['race__season', 'race', 'driver', 'constructor', 'status']
    ordering_fields = ['race', 'final_position', 'points']
    ordering = ['race', 'final_position']


class LapViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing lap times.
    """
    queryset = Lap.objects.select_related('race', 'driver').all()
    serializer_class = LapSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['race', 'driver', 'lap_number']
    ordering_fields = ['lap_number', 'lap_time_milliseconds']
    ordering = ['race', 'lap_number', 'position']


class ChampionshipStandingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing championship standings.
    Supports progressive standings calculation by round.
    """
    queryset = ChampionshipStanding.objects.select_related('driver', 'constructor').all()
    serializer_class = ChampionshipStandingSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season', 'standing_type', 'round', 'driver', 'constructor']
    ordering_fields = ['season', 'position', 'points']
    ordering = ['season', '-round', 'standing_type', 'position']
    
    @action(detail=False, methods=['get'])
    def progressive(self, request):
        """
        Calculate progressive championship standings up to a specific race round.
        Query params: season (required), round (required), type (optional: driver/constructor)
        """
        season = request.query_params.get('season')
        round_num = request.query_params.get('round')
        standing_type = request.query_params.get('type', 'driver')
        
        if not season or not round_num:
            return Response({'error': 'season and round parameters are required'}, status=400)
        
        try:
            season = int(season)
            round_num = int(round_num)
        except ValueError:
            return Response({'error': 'season and round must be integers'}, status=400)
        
        # Get all races up to and including this round
        races = Race.objects.filter(season=season, round__lte=round_num).order_by('round')
        
        if standing_type == 'driver':
            # Calculate driver standings
            from django.db.models import Sum, F, Max
            from core.models import DriverSeason
            
            standings = []
            results = Result.objects.filter(
                race__in=races
            ).values('driver', 'driver__first_name','driver__last_name', 'driver__code', 'driver__number').annotate(
                total_points=Sum('points'),
                total_wins=Count('id', filter=Q(final_position=1))
            ).order_by('-total_points', '-total_wins')
            
            # Get team for each driver (latest team in this round range)
            for idx, standing in enumerate(results, 1):
                driver_id = standing['driver']
                
                # Find latest team for this driver up to this round
                latest_result = Result.objects.filter(
                    driver_id=driver_id,
                    race__season=season,
                    race__round__lte=round_num
                ).select_related('constructor', 'race').order_by('-race__round', '-race__date').first()
                
                standings.append({
                    'position': idx,
                    'driver': {
                        'id': driver_id,
                        'first_name': standing['driver__first_name'],
                        'last_name': standing['driver__last_name'],
                        'code': standing['driver__code'],
                        'number': standing['driver__number'],
                    },
                    'constructor': {
                        'id': latest_result.constructor.id,
                        'name': latest_result.constructor.name,
                        'team_color': latest_result.constructor.team_color,
                    } if latest_result else None,
                    'points': round(standing['total_points'], 1),
                    'wins': standing['total_wins'],
                })
            
            return Response({
                'season': season,
                'round': round_num,
                'standings': standings
            })
        
        else:
            # Constructor standings
            standings = []
            results = Result.objects.filter(
                race__in=races
            ).values('constructor', 'constructor__name').annotate(
                total_points=Sum('points'),
                total_wins=Count('race', filter=Q(final_position=1), distinct=True)
            ).order_by('-total_points', '-total_wins')
            
            for idx, standing in enumerate(results, 1):
                standings.append({
                    'position': idx,
                    'constructor': {
                        'id': standing['constructor'],
                        'name': standing['constructor__name'],
                    },
                    'points': round(standing['total_points'], 1),
                    'wins': standing['total_wins'],
                })
            
            return Response({
                'season': season,
                'round': round_num,
                'standings': standings
            })


class QualifyingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing qualifying results.
    """
    queryset = Qualifying.objects.select_related('race', 'driver', 'constructor').all()
    serializer_class = QualifyingSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['race__season', 'race', 'driver', 'constructor']
    ordering_fields = ['position']
    ordering = ['race', 'position']


class SprintViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing sprint race results.
    """
    queryset = Sprint.objects.select_related('race', 'driver', 'constructor').all()
    serializer_class = SprintSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['race__season', 'race', 'driver', 'constructor', 'status']
    ordering_fields = ['final_position', 'points']
    ordering = ['race', 'final_position']

