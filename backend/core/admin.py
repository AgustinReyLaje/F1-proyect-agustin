from django.contrib import admin
from .models import Season, Driver, DriverSeason, Constructor, ConstructorSeason, Race, Result, Lap, ChampionshipStanding


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ['year', 'is_active', 'created_at']
    list_filter = ['is_active']
    ordering = ['-year']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['driver_id', 'code', 'full_name', 'number', 'nationality']
    search_fields = ['first_name', 'last_name', 'driver_id', 'code']
    list_filter = ['nationality']


@admin.register(DriverSeason)
class DriverSeasonAdmin(admin.ModelAdmin):
    list_display = ['driver', 'season', 'constructor']
    search_fields = ['driver__last_name', 'constructor__name']
    list_filter = ['season']
    raw_id_fields = ['driver', 'constructor']


@admin.register(Constructor)
class ConstructorAdmin(admin.ModelAdmin):
    list_display = ['constructor_id', 'name', 'nationality']
    search_fields = ['name', 'constructor_id']
    list_filter = ['nationality']


@admin.register(ConstructorSeason)
class ConstructorSeasonAdmin(admin.ModelAdmin):
    list_display = ['constructor', 'season', 'car_model', 'team_color']
    search_fields = ['constructor__name', 'car_model']
    list_filter = ['season']
    raw_id_fields = ['constructor']


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = ['season', 'round', 'race_name', 'circuit_name', 'country', 'date']
    search_fields = ['race_name', 'circuit_name', 'country']
    list_filter = ['season']
    ordering = ['-season__year', 'round']


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['race', 'driver', 'constructor', 'grid_position', 'final_position', 'points', 'status']
    search_fields = ['driver__last_name', 'constructor__name']
    list_filter = ['race__season', 'status']
    raw_id_fields = ['race', 'driver', 'constructor']


@admin.register(Lap)
class LapAdmin(admin.ModelAdmin):
    list_display = ['race', 'driver', 'lap_number', 'position', 'lap_time']
    search_fields = ['driver__last_name']
    list_filter = ['race__season']
    raw_id_fields = ['race', 'driver']


@admin.register(ChampionshipStanding)
class ChampionshipStandingAdmin(admin.ModelAdmin):
    list_display = ['season', 'round', 'standing_type', 'position', 'get_entity', 'points', 'wins']
    search_fields = ['driver__last_name', 'constructor__name']
    list_filter = ['season', 'standing_type']
    
    def get_entity(self, obj):
        return obj.driver if obj.driver else obj.constructor
    get_entity.short_description = 'Driver/Constructor'
