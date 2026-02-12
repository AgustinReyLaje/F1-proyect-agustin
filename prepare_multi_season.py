"""
Prepare database for multi-season support by creating Season records
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Season, Race, ChampionshipStanding

def create_seasons():
    """Create Season records for all years in the database"""
    # Get unique years from Race model
    race_years = Race.objects.values_list('season', flat=True).distinct().order_by('season')
    
    # Get unique years from ChampionshipStanding
    standing_years = ChampionshipStanding.objects.values_list('season', flat=True).distinct().order_by('season')
    
    # Combine and get unique years
    all_years = set(list(race_years) + [int(y) for y in standing_years])
    
    created_count = 0
    for year in sorted(all_years):
        season, created = Season.objects.get_or_create(
            year=year,
            defaults={'is_active': (year == max(all_years))}
        )
        if created:
            print(f"✓ Created Season: {year}")
            created_count += 1
        else:
            print(f"- Season {year} already exists")
    
    print(f"\n{created_count} seasons created successfully!")
    return created_count

if __name__ == '__main__':
    print("Creating Season records from existing data...")
    print("-" * 60)
    create_seasons()
