import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Driver, DriverSeason, ChampionshipStanding, Result

print("\n=== VERIFICACIÓN DE MAX VERSTAPPEN ===")
verstappen = Driver.objects.filter(last_name="Verstappen").first()
if verstappen:
    print(f"✓ Max Verstappen encontrado: ID={verstappen.id}, {verstappen.full_name}")
    results_count = Result.objects.filter(driver=verstappen, race__season=2024).count()
    print(f"✓ Resultados 2024: {results_count}")
    
    standing = ChampionshipStanding.objects.filter(
        driver=verstappen, 
        season=2024, 
        standing_type="driver", 
        round=0
    ).first()
    if standing:
        print(f"✓ Championship Standing: P{standing.position} - {standing.points} pts")
    else:
        print("✗ NO standing encontrado")
    
    driver_seasons = DriverSeason.objects.filter(driver=verstappen, season__year=2024)
    print(f"✓ DriverSeason entries: {driver_seasons.count()}")
    for ds in driver_seasons:
        print(f"  - Team: {ds.constructor.name}")
else:
    print("✗ Max Verstappen NO encontrado")

print("\n=== VERIFICACIÓN DE OLIVER BEARMAN ===")
bearman = Driver.objects.filter(last_name="Bearman").first()
if bearman:
    print(f"✓ Oliver Bearman encontrado: ID={bearman.id}, {bearman.full_name}")
    
    driver_seasons = DriverSeason.objects.filter(driver=bearman, season__year=2024)
    print(f"DriverSeason entries: {driver_seasons.count()}")
    for ds in driver_seasons:
        print(f"  - Team: {ds.constructor.name}")
    
    # Check which teams he raced for
    teams = Result.objects.filter(
        driver=bearman, 
        race__season=2024
    ).values_list('constructor__name', flat=True).distinct()
    print(f"Teams raced for: {list(teams)}")

print("\n=== TOTAL DRIVERS EN CHAMPIONSHIP ===")
standings = ChampionshipStanding.objects.filter(
    season=2024,
    standing_type="driver",
    round=0
).order_by('position')
print(f"Total drivers: {standings.count()}")
print("\nTop 5:")
for s in standings[:5]:
    print(f"  P{s.position}: {s.driver.full_name} - {s.points} pts")

print("\n=== TOTAL DriverSeason ENTRIES ===")
ds_count = DriverSeason.objects.filter(season__year=2024).count()
unique_drivers = DriverSeason.objects.filter(season__year=2024).values('driver').distinct().count()
print(f"Total DriverSeason entries: {ds_count}")
print(f"Unique drivers: {unique_drivers}")
if ds_count > unique_drivers:
    print(f"⚠️  {ds_count - unique_drivers} driver(s) have multiple entries")
