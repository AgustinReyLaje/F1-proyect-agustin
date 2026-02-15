"""
Calculate and populate Championship Standings from Race Results.
This script aggregates real race data to generate standings dynamically.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Result, ChampionshipStanding, Driver, Constructor, DriverSeason, Season
from django.db.models import Sum, Count, Max, Q
from collections import defaultdict


def calculate_driver_standings(season_year):
    """Calculate driver championship standings from race results."""
    print(f"\nCalculating Driver Standings for {season_year}...")
    
    # Get all results for the season, ordered by race date
    results = Result.objects.filter(
        race__season=season_year
    ).select_related('driver', 'constructor', 'race').order_by('race__date', 'race__round')
    
    if not results.exists():
        print(f"  ⚠️  No results found for {season_year}")
        return
    
    # Aggregate points and wins per driver
    driver_stats = defaultdict(lambda: {
        'points': 0.0,
        'wins': 0,
        'latest_constructor': None,
        'latest_race_date': None
    })
    
    for result in results:
        driver_id = result.driver.id
        driver_stats[driver_id]['points'] += result.points
        if result.final_position == 1:
            driver_stats[driver_id]['wins'] += 1
        
        # Track latest constructor for multi-team drivers
        if (driver_stats[driver_id]['latest_race_date'] is None or 
            result.race.date >= driver_stats[driver_id]['latest_race_date']):
            driver_stats[driver_id]['latest_race_date'] = result.race.date
            driver_stats[driver_id]['latest_constructor'] = result.constructor
    
    # Sort by points (descending), then wins (descending)
    sorted_drivers = sorted(
        driver_stats.items(),
        key=lambda x: (x[1]['points'], x[1]['wins']),
        reverse=True
    )
    
    # Create or update standings
    season_obj = Season.objects.get(year=season_year)
    created_count = 0
    updated_count = 0
    
    for position, (driver_id, stats) in enumerate(sorted_drivers, start=1):
        driver = Driver.objects.get(id=driver_id)
        
        standing, created = ChampionshipStanding.objects.update_or_create(
            season=season_year,
            standing_type='driver',
            round=0,  # Season total
            driver=driver,
            defaults={
                'position': position,
                'points': stats['points'],
                'wins': stats['wins'],
                'constructor': None,  # Not used for driver standings
            }
        )
        
        # Also update/create DriverSeason with correct constructor
        if stats['latest_constructor']:
            DriverSeason.objects.update_or_create(
                driver=driver,
                season=season_obj,
                constructor=stats['latest_constructor'],
                defaults={}
            )
        
        if created:
            created_count += 1
        else:
            updated_count += 1
        
        team_name = stats['latest_constructor'].name if stats['latest_constructor'] else 'N/A'
        print(f"  P{position:2d}: {driver.full_name:25s} ({team_name:20s}) - {stats['points']:.0f} pts, {stats['wins']} wins")
    
    print(f"\n  ✅ Driver Standings: {created_count} created, {updated_count} updated")
    return len(sorted_drivers)


def calculate_constructor_standings(season_year):
    """Calculate constructor championship standings from race results."""
    print(f"\nCalculating Constructor Standings for {season_year}...")
    
    # Aggregate points and wins per constructor
    constructor_stats = Result.objects.filter(
        race__season=season_year
    ).values('constructor').annotate(
        total_points=Sum('points'),
        total_wins=Count('id', filter=Q(final_position=1))
    ).order_by('-total_points', '-total_wins')
    
    if not constructor_stats:
        print(f"  ⚠️  No results found for {season_year}")
        return
    
    created_count = 0
    updated_count = 0
    
    for position, stats in enumerate(constructor_stats, start=1):
        constructor = Constructor.objects.get(id=stats['constructor'])
        
        standing, created = ChampionshipStanding.objects.update_or_create(
            season=season_year,
            standing_type='constructor',
            round=0,  # Season total
            constructor=constructor,
            defaults={
                'position': position,
                'points': stats['total_points'],
                'wins': stats['total_wins'],
                'driver': None,  # Not used for constructor standings
            }
        )
        
        if created:
            created_count += 1
        else:
            updated_count += 1
        
        print(f"  P{position:2d}: {constructor.name:25s} - {stats['total_points']:.0f} pts, {stats['total_wins']} wins")
    
    print(f"\n  ✅ Constructor Standings: {created_count} created, {updated_count} updated")
    return len(constructor_stats)


def main():
    """Main function to calculate all standings."""
    print("=" * 70)
    print("CHAMPIONSHIP STANDINGS CALCULATOR")
    print("Aggregating data from race results...")
    print("=" * 70)
    
    # Get all seasons with results
    seasons = Result.objects.values_list('race__season', flat=True).distinct().order_by('-race__season')
    
    if not seasons:
        print("\n❌ No race results found in database!")
        return
    
    print(f"\nFound {len(seasons)} season(s) with results: {list(seasons)}")
    
    for season_year in seasons:
        print(f"\n{'=' * 70}")
        print(f"SEASON {season_year}")
        print('=' * 70)
        
        driver_count = calculate_driver_standings(season_year)
        constructor_count = calculate_constructor_standings(season_year)
        
        print(f"\n{'=' * 70}")
        print(f"SEASON {season_year} SUMMARY")
        print(f"  Drivers:      {driver_count}")
        print(f"  Constructors: {constructor_count}")
        print('=' * 70)
    
    # Show 2024 top 5
    print("\n" + "=" * 70)
    print("🏆 2024 FINAL STANDINGS - TOP 5")
    print("=" * 70)
    
    print("\n🏁 DRIVERS CHAMPIONSHIP:")
    driver_standings = ChampionshipStanding.objects.filter(
        season=2024,
        standing_type='driver',
        round=0
    ).select_related('driver').order_by('position')[:5]
    
    for standing in driver_standings:
        print(f"  P{standing.position}: {standing.driver.full_name:25s} - {standing.points:.0f} pts")
    
    print("\n🏁 CONSTRUCTORS CHAMPIONSHIP:")
    constructor_standings = ChampionshipStanding.objects.filter(
        season=2024,
        standing_type='constructor',
        round=0
    ).select_related('constructor').order_by('position')[:5]
    
    for standing in constructor_standings:
        print(f"  P{standing.position}: {standing.constructor.name:25s} - {standing.points:.0f} pts")
    
    print("\n" + "=" * 70)
    print("✅ COMPLETE!")
    print("=" * 70)


if __name__ == '__main__':
    main()
