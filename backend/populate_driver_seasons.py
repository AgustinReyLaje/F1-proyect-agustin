"""
Populate DriverSeason table from Results data.
This creates the driver-team-season relationships needed for the /driver-seasons/ API endpoint.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import DriverSeason, Result, Season, Driver
from django.db.models import Q

def populate_driver_seasons():
    """Create DriverSeason entries based on Results data.
    Each driver gets exactly ONE entry per season (their most recent team).
    """
    
    print("Populating DriverSeason table from Results...")
    print("Rule: One driver = One team (most recent race)\n")
    
    # Get all seasons
    seasons = Season.objects.all()
    created_count = 0
    updated_count = 0
    deleted_count = 0
    
    for season in seasons:
        print(f"\nProcessing season {season.year}...")
        
        # Get all drivers who participated this season
        drivers_in_season = Result.objects.filter(
            race__season=season.year
        ).values_list('driver', flat=True).distinct()
        
        for driver_id in drivers_in_season:
            driver = Driver.objects.get(id=driver_id)
            
            # Find most recent race for this driver
            latest_result = Result.objects.filter(
                race__season=season.year,
                driver=driver
            ).select_related('constructor', 'race').order_by('-race__date', '-race__round').first()
            
            if not latest_result:
                continue
            
            latest_constructor = latest_result.constructor
            
            # Delete any other DriverSeason entries for this driver in this season
            old_entries = DriverSeason.objects.filter(
                driver=driver,
                season=season
            ).exclude(constructor=latest_constructor)
            
            deleted = old_entries.count()
            if deleted > 0:
                old_entries.delete()
                deleted_count += deleted
                print(f"  Deleted {deleted} old entries for {driver.full_name}")
            
            # Create or update the single DriverSeason entry
            driver_season, created = DriverSeason.objects.update_or_create(
                driver=driver,
                season=season,
                constructor=latest_constructor,
                defaults={}
            )
            
            if created:
                print(f"  Created: {driver_season}")
                created_count += 1
            else:
                updated_count += 1
    
    print(f"\n✅ Done!")
    print(f"   Created: {created_count} new entries")
    print(f"   Updated: {updated_count} existing entries")
    print(f"   Deleted: {deleted_count} duplicate entries")


if __name__ == '__main__':
    populate_driver_seasons()
