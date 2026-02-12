"""
Migrate existing 2024 Constructor data to ConstructorSeason model
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Constructor, ConstructorSeason, Season

def migrate_constructor_data():
    """Copy Constructor season data to ConstructorSeason for 2024"""
    season_2024 = Season.objects.get(year=2024)
    
    print("Migrating Constructor data to ConstructorSeason for 2024...")
    print("-" * 60)
    
    migrated = 0
    for constructor in Constructor.objects.all():
        # Create ConstructorSeason entry if it has season-specific data
        if constructor.car_model or constructor.car_image_url or constructor.team_color:
            cs, created = ConstructorSeason.objects.get_or_create(
                constructor=constructor,
                season=season_2024,
                defaults={
                    'car_model': constructor.car_model,
                    'car_image_url': constructor.car_image_url,
                    'team_color': constructor.team_color,
                    'team_color_secondary': constructor.team_color_secondary,
                }
            )
            if created:
                print(f"✓ {constructor.name}: {constructor.car_model}")
                migrated += 1
            else:
                print(f"- {constructor.name}: Already exists")
    
    print(f"\n{migrated} constructors migrated to 2024 season!")

if __name__ == '__main__':
    migrate_constructor_data()
