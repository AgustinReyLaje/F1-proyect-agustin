from rest_framework import serializers
from core.models import Driver, Constructor, Race, Result, Lap, ChampionshipStanding, Season, ConstructorSeason, DriverSeason


class DriverSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Driver
        fields = [
            'id', 'driver_id', 'number', 'code', 
            'first_name', 'last_name', 'full_name',
            'date_of_birth', 'nationality', 'url',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ['id', 'year', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


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
    season_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Constructor
        fields = [
            'id', 'constructor_id', 'name', 'nationality', 
            'url', 'car_model', 'car_image_url', 'team_color', 
            'team_color_secondary', 'drivers', 'championship_position',
            'season_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_season_data(self, obj):
        """Get season-specific data for the requested season or active season"""
        request = self.context.get('request')
        season_year = None
        
        if request and 'season' in request.query_params:
            season_year = int(request.query_params['season'])
        else:
            # Get active season
            active_season = Season.objects.filter(is_active=True).first()
            if active_season:
                season_year = active_season.year
        
        if season_year:
            try:
                season_data = ConstructorSeason.objects.get(
                    constructor=obj,
                    season__year=season_year
                )
                return {
                    'year': season_year,
                    'car_model': season_data.car_model,
                    'car_image_url': season_data.car_image_url,
                    'team_color': season_data.team_color,
                    'team_color_secondary': season_data.team_color_secondary,
                }
            except ConstructorSeason.DoesNotExist:
                pass
        return None
    
    def get_drivers(self, obj):
        # Get season from request or use active season
        request = self.context.get('request')
        season_year = 2024  # Default
        
        if request and 'season' in request.query_params:
            season_year = int(request.query_params['season'])
        else:
            active_season = Season.objects.filter(is_active=True).first()
            if active_season:
                season_year = active_season.year
        
        # Get unique drivers for this constructor from specified season results
        from django.db.models import Q
        drivers = Driver.objects.filter(
            results__constructor=obj,
            results__race__season=season_year
        ).distinct()
        return DriverSerializer(drivers, many=True).data
    
    def get_championship_position(self, obj):
        # Get season from request or use active season
        request = self.context.get('request')
        season_year = 2024  # Default
        
        if request and 'season' in request.query_params:
            season_year = int(request.query_params['season'])
        else:
            active_season = Season.objects.filter(is_active=True).first()
            if active_season:
                season_year = active_season.year
        
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
            'points', 'laps_completed', 'status',
            'fastest_lap', 'fastest_lap_time', 'fastest_lap_speed',
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
