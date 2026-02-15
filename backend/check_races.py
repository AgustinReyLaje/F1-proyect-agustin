import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Race

races_2024 = Race.objects.filter(season=2024).order_by('round')
print(f"\nTotal 2024 races in database: {races_2024.count()}\n")

print("All 2024 races:")
for race in races_2024:
    print(f"  Round {race.round:2d}: {race.race_name:30s} - {race.date}")
