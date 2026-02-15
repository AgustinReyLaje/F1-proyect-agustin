from rest_framework import serializers
from core.models import Driver, Constructor, Race, Result, Lap, ChampionshipStanding, Season, ConstructorSeason, DriverSeason, Qualifying, Sprint
from django.db.models import Count, Sum, Min, Max, Q
from datetime import date


class DriverSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Driver
        fields = [
            'id', 'driver_id', 'number', 'code', 
            'first_name', 'last_name', 'full_name',
            'date_of_birth', 'nationality', 'url',
            'age', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_age(self, obj):
        """Calculate driver's age"""
        if obj.date_of_birth:
            today = date.today()
            return today.year - obj.date_of_birth.year - ((today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day))
        return None


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ['id', 'year', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DriverSeasonSerializer(serializers.ModelSerializer):
    """
    Comprehensive driver data for a specific season including team info and career statistics.
    """
    driver = DriverSerializer(read_only=True)
    constructor = serializers.SerializerMethodField()
    season_year = serializers.IntegerField(source='season.year', read_only=True)
    career_stats = serializers.SerializerMethodField()
    current_standing = serializers.SerializerMethodField()
    
    class Meta:
        model = DriverSeason
        fields = [
            'id', 'driver', 'season_year', 'constructor', 
            'career_stats', 'current_standing',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_constructor(self, obj):
        """Get constructor with season-specific data (colors, car model)"""
        constructor = obj.constructor
        season_data = ConstructorSeason.objects.filter(
            constructor=constructor,
            season=obj.season
        ).first()
        
        return {
            'id': constructor.id,
            'name': constructor.name,
            'nationality': constructor.nationality,
            'team_color': season_data.team_color if season_data and season_data.team_color else constructor.team_color,
            'team_color_secondary': season_data.team_color_secondary if season_data and season_data.team_color_secondary else constructor.team_color_secondary,
            'car_model': season_data.car_model if season_data and season_data.car_model else constructor.car_model,
            'car_image_url': season_data.car_image_url if season_data and season_data.car_image_url else constructor.car_image_url,
        }
    
    def get_career_stats(self, obj):
        """Calculate comprehensive career statistics for the driver"""
        driver = obj.driver
        
        # Total race wins (P1 finishes)
        total_wins = Result.objects.filter(
            driver=driver,
            final_position=1
        ).count()
        
        # Total podiums (P1, P2, P3)
        total_podiums = Result.objects.filter(
            driver=driver,
            final_position__in=[1, 2, 3]
        ).count()
        
        # World Championships (P1 in final standings)
        world_championships = ChampionshipStanding.objects.filter(
            driver=driver,
            standing_type='driver',
            round=0,  # Season total
            position=1
        ).count()
        
        # Total seasons in F1
        total_seasons = DriverSeason.objects.filter(
            driver=driver
        ).values('season').distinct().count()
        
        # Best championship finish
        best_finish_qs = ChampionshipStanding.objects.filter(
            driver=driver,
            standing_type='driver',
            round=0  # Season total
        ).aggregate(best=Min('position'))
        best_championship_finish = best_finish_qs['best']
        
        # Best finish in current season (best race result)
        best_season_finish_qs = Result.objects.filter(
            driver=driver,
            race__season=obj.season.year,
            final_position__isnull=False
        ).aggregate(best=Min('final_position'))
        best_season_finish = best_season_finish_qs['best']
        
        # Total career points
        career_points = Result.objects.filter(
            driver=driver
        ).aggregate(total=Sum('points'))['total'] or 0
        
        return {
            'total_wins': total_wins,
            'total_podiums': total_podiums,
            'world_championships': world_championships,
            'total_seasons': total_seasons,
            'best_championship_finish': best_championship_finish,
            'best_season_finish': best_season_finish,
            'career_points': float(career_points),
        }
    
    def get_current_standing(self, obj):
        """Get current championship standing for this season"""
        try:
            standing = ChampionshipStanding.objects.get(
                driver=obj.driver,
                season=obj.season.year,
                standing_type='driver',
                round=0  # Season total
            )
            return {
                'position': standing.position,
                'points': standing.points,
                'wins': standing.wins,
            }
        except ChampionshipStanding.DoesNotExist:
            return None


class ConstructorSeasonSerializer(serializers.ModelSerializer):
    constructor_name = serializers.CharField(source='constructor.name', read_only=True)
    season_year = serializers.IntegerField(source='season.year', read_only=True)
    
    class Meta:
        model = ConstructorSeason
        fields = [
            'id', 'constructor', 'constructor_name', 'season', 'season_year',
            'car_model', 'car_image_url', 'team_color', 'team_color_secondary',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ConstructorSerializer(serializers.ModelSerializer):
    drivers = serializers.SerializerMethodField()
    championship_position = serializers.SerializerMethodField()
    car_model = serializers.SerializerMethodField()
    car_image_url = serializers.SerializerMethodField()
    team_color = serializers.SerializerMethodField()
    team_color_secondary = serializers.SerializerMethodField()
    
    class Meta:
        model = Constructor
        fields = [
            'id', 'constructor_id', 'name', 'nationality', 
            'url', 'car_model', 'car_image_url', 'team_color', 
            'team_color_secondary', 'drivers', 'championship_position',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def _get_season_year(self):
        """Helper to get season year from request or active season"""
        request = self.context.get('request')
        if request and 'season' in request.query_params:
            return int(request.query_params['season'])
        
        active_season = Season.objects.filter(is_active=True).first()
        return active_season.year if active_season else 2024
    
    def _get_constructor_season(self, obj):
        """Get ConstructorSeason for current season if exists"""
        season_year = self._get_season_year()
        try:
            return ConstructorSeason.objects.get(
                constructor=obj,
                season__year=season_year
            )
        except ConstructorSeason.DoesNotExist:
            return None
    
    def get_car_model(self, obj):
        """Get car model from ConstructorSeason or fallback to base model"""
        season_data = self._get_constructor_season(obj)
        return season_data.car_model if season_data and season_data.car_model else obj.car_model
    
    def get_car_image_url(self, obj):
        """Get car image from ConstructorSeason or fallback to base model"""
        season_data = self._get_constructor_season(obj)
        return season_data.car_image_url if season_data and season_data.car_image_url else obj.car_image_url
    
    def get_team_color(self, obj):
        """Get team color from ConstructorSeason or fallback to base model"""
        season_data = self._get_constructor_season(obj)
        return season_data.team_color if season_data and season_data.team_color else obj.team_color
    
    def get_team_color_secondary(self, obj):
        """Get secondary team color from ConstructorSeason or fallback to base model"""
        season_data = self._get_constructor_season(obj)
        return season_data.team_color_secondary if season_data and season_data.team_color_secondary else obj.team_color_secondary
    
    def get_drivers(self, obj):
        """Get drivers for this constructor in the specified season"""
        season_year = self._get_season_year()
        
        # Get unique drivers for this constructor from specified season results
        from django.db.models import Q
        drivers = Driver.objects.filter(
            results__constructor=obj,
            results__race__season=season_year
        ).distinct()
        return DriverSerializer(drivers, many=True).data
    
    def get_championship_position(self, obj):
        """Get constructor championship standing for specified season"""
        season_year = self._get_season_year()
        
        # Get constructor championship standing for specified season
        try:
            standing = ChampionshipStanding.objects.get(
                constructor=obj,
                season=season_year,
                standing_type='constructor',
                round=0  # Season total
            )
            return {
                'position': standing.position,
                'points': standing.points,
                'wins': standing.wins
            }
        except ChampionshipStanding.DoesNotExist:
            return None


class RaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Race
        fields = [
            'id', 'race_id', 'season', 'round', 'race_name',
            'circuit_id', 'circuit_name', 'locality', 'country',
            'date', 'time', 'url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ResultSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    constructor = ConstructorSerializer(read_only=True)
    race = RaceSerializer(read_only=True)
    
    class Meta:
        model = Result
        fields = [
            'id', 'race', 'driver', 'constructor',
            'grid_position', 'final_position', 'position_text',
            'points', 'laps_completed', 'status', 'retirement_reason',
            'fastest_lap', 'fastest_lap_time', 'fastest_lap_speed',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class QualifyingSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    constructor = ConstructorSerializer(read_only=True)
    race = RaceSerializer(read_only=True)
    
    class Meta:
        model = Qualifying
        fields = [
            'id', 'race', 'driver', 'constructor',
            'position', 'q1_time', 'q2_time', 'q3_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SprintSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    constructor = ConstructorSerializer(read_only=True)
    race = RaceSerializer(read_only=True)
    
    class Meta:
        model = Sprint
        fields = [
            'id', 'race', 'driver', 'constructor',
            'grid_position', 'final_position', 'position_text',
            'points', 'laps_completed', 'status', 'retirement_reason',
            'fastest_lap_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class LapSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    race = RaceSerializer(read_only=True)
    
    class Meta:
        model = Lap
        fields = [
            'id', 'race', 'driver', 'lap_number',
            'position', 'lap_time', 'lap_time_milliseconds',
            'created_at'
        ]
        read_only_fields = ['created_at']


class ChampionshipStandingSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    constructor = ConstructorSerializer(read_only=True)
    
    class Meta:
        model = ChampionshipStanding
        fields = [
            'id', 'season', 'standing_type', 'round',
            'driver', 'constructor', 'position', 'points', 'wins',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
