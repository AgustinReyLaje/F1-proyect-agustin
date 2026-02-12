"""
Script to populate ConstructorSeason data for 2024 with team colors and car images
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Constructor, Season, ConstructorSeason

# Team data for 2024 season with official colors and car images
TEAM_DATA_2024 = {
    'red_bull': {
        'car_model': 'RB20',
        'car_image_url': '/images/cars/2024-season/red-bull.png',
        'team_color': '#0600EF',
        'team_color_secondary': '#1E41FF',
    },
    'ferrari': {
        'car_model': 'SF-24',
        'car_image_url': '/images/cars/2024-season/ferrari.png',
        'team_color': '#DC0000',
        'team_color_secondary': '#F91536',
    },
    'mclaren': {
        'car_model': 'MCL38',
        'car_image_url': '/images/cars/2024-season/mclaren.png',
        'team_color': '#FF8700',
        'team_color_secondary': '#F58020',
    },
    'mercedes': {
        'car_model': 'W15',
        'car_image_url': '/images/cars/2024-season/mercedes.png',
        'team_color': '#00D2BE',
        'team_color_secondary': '#27F4D2',
    },
    'aston_martin': {
        'car_model': 'AMR24',
        'car_image_url': '/images/cars/2024-season/aston-martin.png',
        'team_color': '#006F62',
        'team_color_secondary': '#00857C',
    },
    'alpine': {
        'car_model': 'A524',
        'car_image_url': '/images/cars/2024-season/alpine.png',
        'team_color': '#0090FF',
        'team_color_secondary': '#2E9CFF',
    },
    'haas': {
        'car_model': 'VF-24',
        'car_image_url': '/images/cars/2024-season/haas.png',
        'team_color': '#B6BABD',
        'team_color_secondary': '#D0D3D5',
    },
    'rb': {
        'car_model': 'VCARB 01',
        'car_image_url': '/images/cars/2024-season/rb.png',
        'team_color': '#6692FF',
        'team_color_secondary': '#86A8FF',
    },
    'williams': {
        'car_model': 'FW46',
        'car_image_url': '/images/cars/2024-season/williams.png',
        'team_color': '#005AFF',
        'team_color_secondary': '#3377FF',
    },
    'sauber': {
        'car_model': 'C44',
        'car_image_url': '/images/cars/2024-season/sauber.png',
        'team_color': '#00E701',
        'team_color_secondary': '#33ED33',
    },
}

def populate_constructor_seasons():
    """Populate ConstructorSeason data for 2024"""
    try:
        # Get or create 2024 season
        season_2024, created = Season.objects.get_or_create(
            year=2024,
            defaults={'is_active': True}
        )
        
        if created:
            print(f"✓ Created Season 2024")
        else:
            print(f"✓ Season 2024 already exists")
        
        # Get all constructors
        constructors = Constructor.objects.all()
        created_count = 0
        updated_count = 0
        
        for constructor in constructors:
            constructor_id = constructor.constructor_id
            
            if constructor_id not in TEAM_DATA_2024:
                print(f"⚠ No data for constructor: {constructor_id}")
                continue
            
            team_data = TEAM_DATA_2024[constructor_id]
            
            # Check if ConstructorSeason already exists
            constructor_season, created = ConstructorSeason.objects.update_or_create(
                constructor=constructor,
                season=season_2024,
                defaults={
                    'car_model': team_data['car_model'],
                    'car_image_url': team_data['car_image_url'],
                    'team_color': team_data['team_color'],
                    'team_color_secondary': team_data['team_color_secondary'],
                }
            )
            
            if created:
                created_count += 1
                print(f"✓ Created ConstructorSeason for {constructor.name} - {team_data['car_model']}")
            else:
                updated_count += 1
                print(f"✓ Updated ConstructorSeason for {constructor.name} - {team_data['car_model']}")
        
        print(f"\n✅ Summary:")
        print(f"   - Created: {created_count}")
        print(f"   - Updated: {updated_count}")
        print(f"   - Total: {created_count + updated_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🏎️  Populating ConstructorSeason data for 2024...\n")
    populate_constructor_seasons()
    print("\n✅ Done!")
