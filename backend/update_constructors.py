import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Constructor

# 2024 F1 Car Models and Images
car_data = {
    'alpine': {
        'car_model': 'A524',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Pierre_Gasly_Alpine_F1_A524_2024.jpg/800px-Pierre_Gasly_Alpine_F1_A524_2024.jpg'
    },
    'aston_martin': {
        'car_model': 'AMR24',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Aston_Martin_F1_AMR24_2024.jpg/800px-Aston_Martin_F1_AMR24_2024.jpg'
    },
    'ferrari': {
        'car_model': 'SF-24',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Ferrari_SF-24_2024.jpg/800px-Ferrari_SF-24_2024.jpg'
    },
    'haas': {
        'car_model': 'VF-24',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Haas_VF-24_2024.jpg/800px-Haas_VF-24_2024.jpg'
    },
    'mclaren': {
        'car_model': 'MCL38',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/McLaren_MCL38_2024.jpg/800px-McLaren_MCL38_2024.jpg'
    },
    'mercedes': {
        'car_model': 'W15',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Mercedes_W15_2024.jpg/800px-Mercedes_W15_2024.jpg'
    },
    'red_bull': {
        'car_model': 'RB20',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Red_Bull_RB20_2024.jpg/800px-Red_Bull_RB20_2024.jpg'
    },
    'rb': {
        'car_model': 'VCARB 01',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/RB_VCARB_01_2024.jpg/800px-RB_VCARB_01_2024.jpg'
    },
    'sauber': {
        'car_model': 'C44',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Sauber_C44_2024.jpg/800px-Sauber_C44_2024.jpg'
    },
    'williams': {
        'car_model': 'FW46',
        'car_image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Williams_FW46_2024.jpg/800px-Williams_FW46_2024.jpg'
    }
}

print("Updating constructor car models and images...")
updated = 0

for constructor_id, data in car_data.items():
    try:
        constructor = Constructor.objects.get(constructor_id=constructor_id)
        constructor.car_model = data['car_model']
        constructor.car_image_url = data['car_image_url']
        constructor.save()
        print(f"✓ Updated {constructor.name} - {data['car_model']}")
        updated += 1
    except Constructor.DoesNotExist:
        print(f"✗ Constructor '{constructor_id}' not found")

print(f"\nUpdated {updated} constructors")
