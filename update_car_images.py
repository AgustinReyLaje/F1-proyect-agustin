"""
Update car image URLs to use local images from 2024-season folder
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Constructor

# Mapping of constructor names to local image filenames
CAR_IMAGE_MAPPING = {
    'Alpine F1 Team': '/images/cars/2024-season/alpine.png',
    'Aston Martin': '/images/cars/2024-season/aston-martin.png',
    'Ferrari': '/images/cars/2024-season/ferrari.png',
    'Haas F1 Team': '/images/cars/2024-season/haas.png',
    'McLaren': '/images/cars/2024-season/mclaren.png',
    'Mercedes': '/images/cars/2024-season/mercedes.png',
    'RB F1 Team': '/images/cars/2024-season/rb.png',
    'Red Bull': '/images/cars/2024-season/red-bull.png',
    'Sauber': '/images/cars/2024-season/sauber.png',
    'Williams': '/images/cars/2024-season/williams.png',
}

def update_car_images():
    """Update all constructor car image URLs to local paths"""
    updated = 0
    
    for constructor in Constructor.objects.all():
        if constructor.name in CAR_IMAGE_MAPPING:
            new_url = CAR_IMAGE_MAPPING[constructor.name]
            constructor.car_image_url = new_url
            constructor.save()
            print(f"✓ Updated {constructor.name}: {new_url}")
            updated += 1
        else:
            print(f"✗ No mapping found for: {constructor.name}")
    
    print(f"\n{updated} constructors updated successfully!")

if __name__ == '__main__':
    print("Updating car image URLs to local paths...")
    print("-" * 60)
    update_car_images()
