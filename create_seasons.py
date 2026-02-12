"""
Create Season records for multiple years
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Season

SEASONS = [2020, 2021, 2022, 2023, 2024, 2025]

print("Creating Season records...")
print("-" * 60)

for year in SEASONS:
    season, created = Season.objects.get_or_create(
        year=year,
        defaults={'is_active': (year == 2025)}
    )
    if created:
        print(f"✓ Created: {year} {'(Active)' if year == 2025 else ''}")
    else:
        print(f"- Exists: {year}")

print(f"\nTotal seasons: {Season.objects.count()}")
