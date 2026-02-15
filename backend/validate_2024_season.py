"""
Comprehensive 2024 Season Data Validation Script

This script validates that all 2024 F1 season data is properly
loaded and consistent across the system.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Race, Result, ChampionshipStanding, Driver, Constructor, DriverSeason
from django.db.models import Sum, Count
from collections import defaultdict


def validate_races():
    """Validate all 2024 races are present."""
    print("\n" + "=" * 70)
    print("VALIDATING 2024 RACES")
    print("=" * 70)
    
    races = Race.objects.filter(season=2024).order_by('round')
    total = races.count()
    
    print(f"✓ Total races: {total}/24")
    
    if total != 24:
        print("  ⚠️  WARNING: Expected 24 races for 2024 season!")
        missing = []
        for i in range(1, 25):
            if not races.filter(round=i).exists():
                missing.append(i)
        if missing:
            print(f"  Missing rounds: {missing}")
        return False
    
    print("  ✓ All 24 races present")
    print(f"  First race: {races.first().race_name} ({races.first().date})")
    print(f"  Last race:  {races.last().race_name} ({races.last().date})")
    return True


def validate_results():
    """Validate race results are complete."""
    print("\n" + "=" * 70)
    print("VALIDATING 2024 RACE RESULTS")
    print("=" * 70)
    
    results = Result.objects.filter(race__season=2024)
    total = results.count()
    
    print(f"✓ Total race results: {total}")
    
    # Check if we have results for all races
    races_with_results = results.values('race').distinct().count()
    print(f"✓ Races with results: {races_with_results}/24")
    
    # Check average drivers per race
    avg_drivers = total / races_with_results if races_with_results > 0 else 0
    print(f"✓ Average drivers per race: {avg_drivers:.1f}")
    
    if avg_drivers < 18:
        print("  ⚠️  WARNING: Expected ~20 drivers per race")
        return False
    
    return True


def validate_driver_standings():
    """Validate driver championship standings."""
    print("\n" + "=" * 70)
    print("VALIDATING DRIVER CHAMPIONSHIP STANDINGS")
    print("=" * 70)
    
    standings = ChampionshipStanding.objects.filter(
        season=2024,
        standing_type='driver',
        round=0
    ).select_related('driver').order_by('position')
    
    total = standings.count()
    print(f"✓ Total drivers in championship: {total}")
    
    if total < 20:
        print("  ⚠️  WARNING: Expected at least 20 drivers")
        return False
    
    # Show top 5
    print("\n  Top 5 Drivers:")
    for standing in standings[:5]:
        print(f"    P{standing.position}: {standing.driver.full_name:25s} - {standing.points:.0f} pts, {standing.wins} wins")
    
    # Verify champion
    champion = standings.first()
    if champion:
        print(f"\n  🏆 2024 Champion: {champion.driver.full_name} ({champion.points:.0f} pts)")
    
    # Verify points sum matches race results
    print("\n  Validating points consistency...")
    for standing in standings[:3]:
        driver = standing.driver
        result_points = Result.objects.filter(
            race__season=2024,
            driver=driver
        ).aggregate(total=Sum('points'))['total'] or 0
        
        if abs(result_points - standing.points) > 0.1:
            print(f"  ⚠️  Mismatch for {driver.full_name}: Standing={standing.points}, Results={result_points}")
            return False
    
    print("  ✓ Points consistency verified for top 3")
    return True


def validate_constructor_standings():
    """Validate constructor championship standings."""
    print("\n" + "=" * 70)
    print("VALIDATING CONSTRUCTOR CHAMPIONSHIP STANDINGS")
    print("=" * 70)
    
    standings = ChampionshipStanding.objects.filter(
        season=2024,
        standing_type='constructor',
        round=0
    ).select_related('constructor').order_by('position')
    
    total = standings.count()
    print(f"✓ Total constructors in championship: {total}")
    
    if total != 10:
        print("  ⚠️  WARNING: Expected exactly 10 constructors for 2024")
        return False
    
    # Show top 5
    print("\n  Top 5 Constructors:")
    for standing in standings[:5]:
        print(f"    P{standing.position}: {standing.constructor.name:25s} - {standing.points:.0f} pts, {standing.wins} wins")
    
    # Verify champion
    champion = standings.first()
    if champion:
        print(f"\n  🏆 2024 Constructor Champion: {champion.constructor.name} ({champion.points:.0f} pts)")
    
    return True


def validate_multi_team_drivers():
    """Validate drivers who raced for multiple teams."""
    print("\n" + "=" * 70)
    print("VALIDATING MULTI-TEAM DRIVERS")
    print("=" * 70)
    
    # Find drivers with multiple teams
    multi_team_drivers = []
    
    for driver in Driver.objects.all():
        teams = Result.objects.filter(
            race__season=2024,
            driver=driver
        ).values_list('constructor__name', flat=True).distinct()
        
        if len(teams) > 1:
            # Get latest team
            latest_result = Result.objects.filter(
                race__season=2024,
                driver=driver
            ).select_related('constructor', 'race').order_by('-race__date').first()
            
            multi_team_drivers.append({
                'driver': driver,
                'teams': list(teams),
                'latest_team': latest_result.constructor.name if latest_result else None
            })
    
    print(f"✓ Found {len(multi_team_drivers)} multi-team drivers")
    
    if multi_team_drivers:
        print("\n  Multi-team drivers:")
        for info in multi_team_drivers:
            print(f"    {info['driver'].full_name:25s}: {', '.join(info['teams'])}")
            print(f"      Latest team: {info['latest_team']}")
            
            # Verify DriverSeason uses latest team
            driver_season = DriverSeason.objects.filter(
                driver=info['driver'],
                season__year=2024,
                constructor__name=info['latest_team']
            ).first()
            
            if driver_season:
                print(f"      ✓ DriverSeason correctly uses latest team")
            else:
                print(f"      ⚠️  DriverSeason not updated to latest team!")
                return False
    
    return True


def validate_driver_seasons():
    """Validate DriverSeason relationships."""
    print("\n" + "=" * 70)
    print("VALIDATING DRIVER-SEASON RELATIONSHIPS")
    print("=" * 70)
    
    driver_seasons = DriverSeason.objects.filter(
        season__year=2024
    ).select_related('driver', 'constructor', 'season')
    
    total = driver_seasons.count()
    print(f"✓ Total DriverSeason entries: {total}")
    
    # Count drivers
    unique_drivers = driver_seasons.values('driver').distinct().count()
    print(f"✓ Unique drivers: {unique_drivers}")
    
    # Some drivers may have multiple entries if they switched teams
    if total > unique_drivers:
        diff = total - unique_drivers
        print(f"  ℹ️  {diff} driver(s) have multiple team entries (team switches)")
    
    return True


def main():
    """Run all validation checks."""
    print("\n")
    print("=" * 70)
    print("2024 F1 SEASON DATA VALIDATION")
    print("=" * 70)
    
    checks = [
        ("Races", validate_races),
        ("Results", validate_results),
        ("Driver Standings", validate_driver_standings),
        ("Constructor Standings", validate_constructor_standings),
        ("Multi-team Drivers", validate_multi_team_drivers),
        ("Driver-Season Relationships", validate_driver_seasons),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            success = check_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n  ❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)
    
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"  {status}  {name}")
    
    all_passed = all(success for _, success in results)
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✅ ALL VALIDATIONS PASSED!")
        print("2024 season data is complete and consistent.")
    else:
        print("❌ SOME VALIDATIONS FAILED!")
        print("Please review the output above.")
    print("=" * 70 + "\n")
    
    return all_passed


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
