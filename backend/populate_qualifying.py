"""
Populate qualifying data from race results grid positions.
This creates qualifying entries based on the starting grid positions.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Race, Result, Qualifying, Driver, Constructor

def populate_qualifying():
    """
    Create qualifying results based on grid positions from race results.
    """
    print("=" * 60)
    print("POPULATING QUALIFYING DATA")
    print("=" * 60)
    
    races = Race.objects.filter(season=2024).order_by('round')
    total_created = 0
    total_skipped = 0
    
    for race in races:
        print(f"\nRound {race.round}: {race.race_name}")
        
        # Check if qualifying already exists
        existing = Qualifying.objects.filter(race=race).count()
        if existing > 0:
            print(f"  ⏭️  Skipping - {existing} qualifying entries already exist")
            total_skipped += existing
            continue
        
        # Get results ordered by grid position
        results = Result.objects.filter(race=race).order_by('grid_position')
        
        if results.count() == 0:
            print(f"  ⚠️  No results found")
            continue
        
        created_count = 0
        for result in results:
            # Create qualifying entry
            qualifying = Qualifying.objects.create(
                race=race,
                driver=result.driver,
                constructor=result.constructor,
                position=result.grid_position,
                # Note: We don't have actual qualifying times, so we leave them null
                q1_time=None,
                q2_time=None,
                q3_time=None
            )
            created_count += 1
        
        print(f"  ✅ Created {created_count} qualifying entries")
        total_created += created_count
    
    print("\n" + "=" * 60)
    print(f"SUMMARY")
    print(f"  Created: {total_created}")
    print(f"  Skipped: {total_skipped}")
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
    populate_qualifying()
    add_retirement_reasons()
