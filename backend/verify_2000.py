"""Verify all data for the 2000 F1 season."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import *
from django.db.models import Sum, Count

print("=" * 70)
print("  F1 2000 SEASON — DATA VERIFICATION")
print("=" * 70)

# Season
season = Season.objects.get(year=2000)
print(f"\n  Season: {season} (Active: {season.is_active})")

# Drivers
drivers = DriverSeason.objects.filter(season=season).select_related('driver', 'constructor')
print(f"\n  DRIVERS ({drivers.count()}):")
for ds in drivers:
    print(f"    - {ds.driver.full_name} ({ds.driver.code or 'N/A'}) -> {ds.constructor.name}")

# Constructors
constructors = ConstructorSeason.objects.filter(season=season).select_related('constructor')
print(f"\n  CONSTRUCTORS ({constructors.count()}):")
for cs in constructors:
    print(f"    - {cs.constructor.name}: {cs.car_model or 'N/A'} | Color: {cs.team_color or 'N/A'}")

# Races
races = Race.objects.filter(season=2000).order_by('round')
print(f"\n  RACES ({races.count()}):")
for race in races:
    results_count = Result.objects.filter(race=race).count()
    qual_count = Qualifying.objects.filter(race=race).count()
    print(f"    R{race.round:2d}: {race.race_name:<30s} ({race.date}) | {results_count} results, {qual_count} qualifying")

# Championship Standings (final)
print(f"\n  DRIVER CHAMPIONSHIP (Final):")
driver_standings = ChampionshipStanding.objects.filter(
    season=2000, standing_type='driver', round=0
).select_related('driver').order_by('position')[:10]
for s in driver_standings:
    print(f"    P{s.position}: {s.driver.full_name} — {s.points} pts ({s.wins} wins)")

print(f"\n  CONSTRUCTOR CHAMPIONSHIP (Final):")
constructor_standings = ChampionshipStanding.objects.filter(
    season=2000, standing_type='constructor', round=0
).select_related('constructor').order_by('position')
for s in constructor_standings:
    print(f"    P{s.position}: {s.constructor.name} — {s.points} pts ({s.wins} wins)")

# Overall stats
print(f"\n  SUMMARY:")
print(f"    Total Results: {Result.objects.filter(race__season=2000).count()}")
print(f"    Total Qualifying: {Qualifying.objects.filter(race__season=2000).count()}")
print(f"    Total Standings: {ChampionshipStanding.objects.filter(season=2000).count()}")
total_points = Result.objects.filter(race__season=2000).aggregate(total=Sum('points'))['total']
print(f"    Total Points Awarded: {total_points}")
print("=" * 70)
