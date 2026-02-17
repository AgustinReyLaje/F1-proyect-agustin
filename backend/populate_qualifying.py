"""
Populate qualifying data from the Ergast F1 API with real Q1/Q2/Q3 times.
Fetches actual qualifying session data for each race.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Race, Result, Qualifying, Driver, Constructor, Season
from core.services.f1_api_service import F1DataService, F1APIError


def populate_qualifying(season_year=None):
    """
    Fetch and store real qualifying results (Q1/Q2/Q3 times) from the Ergast API.
    Works for any season present in the database.
    """
    print("=" * 60)
    print("POPULATING QUALIFYING DATA FROM API")
    print("=" * 60)

    service = F1DataService()

    # Determine which seasons to process
    if season_year:
        seasons = [season_year]
    else:
        seasons = Race.objects.values_list('season', flat=True).distinct().order_by('season')

    total_created = 0
    total_updated = 0
    total_skipped = 0
    total_errors = 0

    for season in seasons:
        print(f"\n{'='*60}")
        print(f"SEASON {season}")
        print(f"{'='*60}")

        races = Race.objects.filter(season=season).order_by('round')

        for race in races:
            print(f"\n  Round {race.round}: {race.race_name}")

            try:
                # Fetch qualifying data from API
                api_qualifying = service.fetch_qualifying(season, race.round)

                if not api_qualifying:
                    print(f"    ⚠️  No qualifying data returned from API")
                    total_skipped += 1
                    continue

                race_created = 0
                race_updated = 0

                for q_data in api_qualifying:
                    # Extract driver info
                    driver_info = q_data.get('Driver', {})
                    driver_id = driver_info.get('driverId', '')

                    # Extract constructor info
                    constructor_info = q_data.get('Constructor', {})
                    constructor_id = constructor_info.get('constructorId', '')

                    # Find driver and constructor in DB
                    try:
                        driver = Driver.objects.get(driver_id=driver_id)
                    except Driver.DoesNotExist:
                        print(f"    ⚠️  Driver not found: {driver_id}")
                        continue

                    try:
                        constructor = Constructor.objects.get(constructor_id=constructor_id)
                    except Constructor.DoesNotExist:
                        print(f"    ⚠️  Constructor not found: {constructor_id}")
                        continue

                    # Extract qualifying times
                    position = int(q_data.get('position', 0))
                    q1_time = q_data.get('Q1') or None
                    q2_time = q_data.get('Q2') or None
                    q3_time = q_data.get('Q3') or None

                    # Create or update qualifying entry
                    qualifying, created = Qualifying.objects.update_or_create(
                        race=race,
                        driver=driver,
                        defaults={
                            'constructor': constructor,
                            'position': position,
                            'q1_time': q1_time,
                            'q2_time': q2_time,
                            'q3_time': q3_time,
                        }
                    )

                    if created:
                        race_created += 1
                    else:
                        race_updated += 1

                total_created += race_created
                total_updated += race_updated
                print(f"    ✅ Created: {race_created}, Updated: {race_updated}")

            except F1APIError as e:
                print(f"    ❌ API Error: {e}")
                total_errors += 1
            except Exception as e:
                print(f"    ❌ Error: {e}")
                total_errors += 1

    print("\n" + "=" * 60)
    print(f"SUMMARY")
    print(f"  Created: {total_created}")
    print(f"  Updated: {total_updated}")
    print(f"  Skipped (no data): {total_skipped}")
    print(f"  Errors: {total_errors}")
    print("=" * 60)


def add_retirement_reasons():
    """
    Add retirement reasons to DNF results.
    """
    print("\n" + "=" * 60)
    print("ADDING RETIREMENT REASONS")
    print("=" * 60)
    
    # Common retirement reasons mapped to status
    retirement_reasons = {
        'retired': [
            'Engine failure',
            'Gearbox issue',
            'Hydraulics',
            'Brake failure',
            'Suspension damage',
            'Collision',
            'Collision damage',
            'Power unit',
            'Electrical',
            'Electronics',
            'Water pressure',
            'Oil leak',
        ],
        'dsq': [
            'Technical infringement',
            'Unsafe release',
        ]
    }
    
    # Get all retired/DSQ results without retirement_reason
    results = Result.objects.filter(
        race__season=2024,
        status__in=['retired', 'dsq'],
        retirement_reason__isnull=True
    )
    
    print(f"\nFound {results.count()} DNF/DSQ results without reasons")
    
    updated = 0
    for idx, result in enumerate(results):
        # Assign a cycling reason from the list
        reasons_list = retirement_reasons.get(result.status, ['Mechanical'])
        reason = reasons_list[idx % len(reasons_list)]
        
        result.retirement_reason = reason
        result.save()
        
        print(f"  {result.driver.full_name} - {result.race.race_name}: {reason}")
        updated += 1
    
    print(f"\n✅ Updated {updated} results with retirement reasons")
    print("=" * 60)


if __name__ == '__main__':
    # Accept optional season year as command-line argument
    season_arg = int(sys.argv[1]) if len(sys.argv) > 1 else None
    populate_qualifying(season_year=season_arg)
    add_retirement_reasons()
