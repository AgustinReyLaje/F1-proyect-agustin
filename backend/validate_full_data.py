"""
Complete data validation for 2024 season.
Checks all critical data integrity requirements.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import (
    Driver, DriverSeason, Constructor, Race, Result, 
    ChampionshipStanding, Season
)
from django.db.models import Count

def validate_all():
    print("=" * 60)
    print("F1 ANALYTICS - COMPLETE DATA VALIDATION")
    print("=" * 60)
    
    # Season check
    season_2024 = Season.objects.filter(year=2024).first()
    if not season_2024:
        print("❌ Season 2024 not found!")
        return
    print(f"\n✅ Season 2024 found (ID: {season_2024.id})")
    
    # Races check
    races = Race.objects.filter(season=2024).count()
    print(f"\n📅 RACES: {races}")
    if races != 24:
        print(f"   ⚠️  Expected 24 races, found {races}")
    else:
        print("   ✅ All 24 races present")
    
    # Results check
    results = Result.objects.filter(race__season=2024).count()
    print(f"\n🏁 RESULTS: {results}")
    print("   ✅ Race results recorded")
    
    # Drivers check
    total_drivers = Driver.objects.all().count()
    drivers_2024 = Result.objects.filter(race__season=2024).values('driver').distinct().count()
    print(f"\n👤 DRIVERS:")
    print(f"   Total in DB: {total_drivers}")
    print(f"   Participated in 2024: {drivers_2024}")
    
    # DriverSeason check (CRITICAL)
    driver_seasons = DriverSeason.objects.filter(season=season_2024)
    unique_drivers = driver_seasons.values('driver').distinct().count()
    print(f"\n🏎️  DRIVER-SEASON ENTRIES:")
    print(f"   Total entries: {driver_seasons.count()}")
    print(f"   Unique drivers: {unique_drivers}")
    
    if driver_seasons.count() != unique_drivers:
        print(f"   ❌ DUPLICATE FOUND! {driver_seasons.count()} entries for {unique_drivers} drivers")
        # Find duplicates
        from django.db.models import Count
        duplicates = DriverSeason.objects.filter(season=season_2024).values('driver').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        for dup in duplicates:
            driver = Driver.objects.get(id=dup['driver'])
            teams = DriverSeason.objects.filter(driver=driver, season=season_2024).values_list('constructor__name', flat=True)
            print(f"      ⚠️  {driver.full_name}: {list(teams)}")
    else:
        print("   ✅ No duplicates - each driver appears exactly once")
    
    # Championship Standings check
    standings = ChampionshipStanding.objects.filter(
        season=2024,
        standing_type='driver',
        round=0  # Final standings
    )
    print(f"\n🏆 CHAMPIONSHIP STANDINGS: {standings.count()} drivers")
    
    if standings.count() != drivers_2024:
        print(f"   ⚠️  Mismatch: {drivers_2024} drivers raced but {standings.count()} in standings")
    else:
        print("   ✅ All drivers have championship standings")
    
    # Top 3 check
    top3 = standings.order_by('position')[:3]
    print("\n   Top 3:")
    for standing in top3:
        medal = "🥇" if standing.position == 1 else "🥈" if standing.position == 2 else "🥉"
        # Get constructor from DriverSeason
        driver_season = DriverSeason.objects.filter(driver=standing.driver, season=season_2024).first()
        team = driver_season.constructor.name if driver_season else "Unknown"
        print(f"   {medal} P{standing.position}: {standing.driver.full_name} - {standing.points} pts ({team})")
    
    # Max Verstappen specific check
    print("\n🔍 MAX VERSTAPPEN CHECK:")
    max_driver = Driver.objects.filter(last_name="Verstappen").first()
    if max_driver:
        print(f"   ✅ Found: {max_driver.full_name} (ID: {max_driver.id})")
        
        # DriverSeason entry
        max_ds = DriverSeason.objects.filter(driver=max_driver, season=season_2024)
        print(f"   DriverSeason entries: {max_ds.count()}")
        if max_ds.count() == 1:
            print(f"      ✅ Team: {max_ds.first().constructor.name}")
        elif max_ds.count() == 0:
            print(f"      ❌ No DriverSeason entry!")
        else:
            print(f"      ❌ Multiple entries!")
            for ds in max_ds:
                print(f"         - {ds.constructor.name}")
        
        # Results
        max_results = Result.objects.filter(driver=max_driver, race__season=2024).count()
        print(f"   Results 2024: {max_results}")
        
        # Championship standing
        max_standing = ChampionshipStanding.objects.filter(
            driver=max_driver, season=2024, standing_type='driver', round=0
        ).first()
        if max_standing:
            print(f"   Championship: P{max_standing.position} - {max_standing.points} pts")
            print(f"      ✅ Champion status verified" if max_standing.position == 1 else f"      Position {max_standing.position}")
        else:
            print(f"   ❌ No championship standing found")
    else:
        print("   ❌ Max Verstappen not found in database!")
    
    # Oliver Bearman specific check
    print("\n🔍 OLIVER BEARMAN CHECK:")
    bearman = Driver.objects.filter(last_name="Bearman").first()
    if bearman:
        print(f"   ✅ Found: {bearman.full_name} (ID: {bearman.id})")
        
        bearman_ds = DriverSeason.objects.filter(driver=bearman, season=season_2024)
        print(f"   DriverSeason entries: {bearman_ds.count()}")
        if bearman_ds.count() == 1:
            print(f"      ✅ Single entry: {bearman_ds.first().constructor.name}")
        else:
            print(f"      ❌ Expected 1, found {bearman_ds.count()}")
            for ds in bearman_ds:
                print(f"         - {ds.constructor.name}")
    
    # Constructors check
    constructors_2024 = Constructor.objects.filter(
        results__race__season=2024
    ).distinct().count()
    print(f"\n🏁 CONSTRUCTORS: {constructors_2024} teams in 2024")
    if constructors_2024 == 10:
        print("   ✅ All 10 teams present")
    else:
        print(f"   ⚠️  Expected 10 teams, found {constructors_2024}")
    
    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    validate_all()
