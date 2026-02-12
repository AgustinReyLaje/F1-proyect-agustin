from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from core.models import Driver, Constructor, Race, Result, Lap, ChampionshipStanding, Season, ConstructorSeason
from .serializers import (
    DriverSerializer, ConstructorSerializer, RaceSerializer,
    ResultSerializer, LapSerializer, ChampionshipStandingSerializer,
    SeasonSerializer, ConstructorSeasonSerializer
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
    """
    queryset = ChampionshipStanding.objects.select_related('driver', 'constructor').all()
    serializer_class = ChampionshipStandingSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['season', 'standing_type', 'round', 'driver', 'constructor']
    ordering_fields = ['season', 'position', 'points']
    ordering = ['season', '-round', 'standing_type', 'position']
