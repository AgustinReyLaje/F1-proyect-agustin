"""
Import F1 data for multiple seasons
"""
import sys
import os
import django

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from django.core.management import call_command
from core.models import Season

# Seasons to import (2020-2025)
SEASONS_TO_IMPORT = [2020, 2021, 2022, 2023, 2024, 2025]

def create_season_records():
    """Create Season records"""
    print("Creating Season records...")
    for year in SEASONS_TO_IMPORT:
        season, created = Season.objects.get_or_create(
            year=year,
            defaults={'is_active': (year == 2025)}  # Set 2025 as active
        )
        if created:
            print(f"✓ Created Season: {year}")
        else:
            print(f"- Season {year} already exists")

def import_season_data(year):
    """Import data for a specific season"""
    print(f"\n{'='*60}")
    print(f"Importing data for {year} season...")
    print('='*60)
    
    try:
        call_command('import_f1_data', year=year, verbosity=1)
        print(f"✓ Successfully imported {year} season data")
    except Exception as e:
        print(f"✗ Error importing {year} season: {e}")

def main():
    print("F1 Multi-Season Data Import")
    print("="*60)
    
    # Step 1: Create Season records
    create_season_records()
    
    # Step 2: Import data for each season
    for year in SEASONS_TO_IMPORT:
        import_season_data(year)
    
    print(f"\n{'='*60}")
    print("Multi-season import completed!")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
