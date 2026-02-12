"""
Script to populate Championship Standings for 2024 season
Based on real 2024 F1 Championship results
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from core.models import Constructor, ChampionshipStanding

# 2024 Constructor Championship Final Standings
CONSTRUCTOR_STANDINGS_2024 = [
    {'constructor_id': 'mclaren', 'position': 1, 'points': 666, 'wins': 6},
    {'constructor_id': 'ferrari', 'position': 2, 'points': 652, 'wins': 5},
    {'constructor_id': 'red_bull', 'position': 3, 'points': 589, 'wins': 8},
    {'constructor_id': 'mercedes', 'position': 4, 'points': 468, 'wins': 3},
    {'constructor_id': 'aston_martin', 'position': 5, 'points': 94, 'wins': 0},
    {'constructor_id': 'alpine', 'position': 6, 'points': 65, 'wins': 0},
    {'constructor_id': 'haas', 'position': 7, 'points': 58, 'wins': 0},
    {'constructor_id': 'rb', 'position': 8, 'points': 46, 'wins': 0},
    {'constructor_id': 'williams', 'position': 9, 'points': 17, 'wins': 0},
    {'constructor_id': 'sauber', 'position': 10, 'points': 4, 'wins': 0},
]

def populate_championship_standings():
    """Populate championship standings for 2024"""
    try:
        created_count = 0
        updated_count = 0
        
        for standing_data in CONSTRUCTOR_STANDINGS_2024:
            constructor_id = standing_data['constructor_id']
            
            try:
                constructor = Constructor.objects.get(constructor_id=constructor_id)
            except Constructor.DoesNotExist:
                print(f"⚠ Constructor not found: {constructor_id}")
                continue
            
            # Create or update championship standing
            standing, created = ChampionshipStanding.objects.update_or_create(
                season=2024,
                standing_type='constructor',
                round=0,  # 0 = season total
                constructor=constructor,
                defaults={
                    'position': standing_data['position'],
                    'points': standing_data['points'],
                    'wins': standing_data['wins'],
                    'driver': None,  # No driver for constructor standings
                }
            )
            
            if created:
                created_count += 1
                print(f"✓ Created P{standing_data['position']}: {constructor.name} - {standing_data['points']} pts")
            else:
                updated_count += 1
                print(f"✓ Updated P{standing_data['position']}: {constructor.name} - {standing_data['points']} pts")
        
        print(f"\n✅ Summary:")
        print(f"   - Created: {created_count}")
        print(f"   - Updated: {updated_count}")
        print(f"   - Total: {created_count + updated_count}")
        
        # Show top 3
        print(f"\n🏆 Top 3 Constructors 2024:")
        top_3 = ChampionshipStanding.objects.filter(
            season=2024,
            standing_type='constructor',
            round=0
        ).order_by('position')[:3]
        
        medals = ['🥇', '🥈', '🥉']
        for i, standing in enumerate(top_3):
            print(f"   {medals[i]} P{standing.position}: {standing.constructor.name} - {standing.points} pts")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🏆 Populating Championship Standings for 2024...\n")
    populate_championship_standings()
    print("\n✅ Done!")
