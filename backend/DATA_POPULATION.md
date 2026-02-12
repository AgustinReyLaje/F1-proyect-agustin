# Data Population Scripts

Scripts to populate season-specific data for the F1 Analytics Platform.

## Overview

The platform requires two types of data for each season:
1. **ConstructorSeason** - Team colors, car models, and car images
2. **ChampionshipStanding** - Final standings for drivers and constructors

## Scripts

### 1. `populate_constructor_season_2024.py`

Populates team-specific data for the 2024 season including:
- Car models (e.g., RB20, SF-24, MCL38)
- Car image URLs (from `/images/cars/2024-season/`)
- Official team colors (primary and secondary)

**Usage:**
```bash
# Inside Docker container
docker-compose exec backend python populate_constructor_season_2024.py

# Or locally
python backend/populate_constructor_season_2024.py
```

**Output:**
- Creates/updates ConstructorSeason entries for all 10 teams
- Links car images to respective teams
- Sets official F1 team colors for visual consistency

### 2. `populate_standings_2024.py`

Populates final championship standings for the 2024 season:
- Constructor Championship positions
- Points and wins for each team
- Enables P1/P2/P3 glow effects on team cards

**Usage:**
```bash
# Inside Docker container
docker-compose exec backend python populate_standings_2024.py

# Or locally
python backend/populate_standings_2024.py
```

**Output:**
- Creates ChampionshipStanding entries for all constructors
- Shows top 3 teams with medals (🥇🥈🥉)
- Enables dynamic glow effects:
  - P1: Gold glow
  - P2: Silver glow
  - P3: Bronze glow

## Running Both Scripts

To populate all 2024 data at once:

```bash
cd docker
docker-compose exec backend python populate_constructor_season_2024.py
docker-compose exec backend python populate_standings_2024.py
```

## Car Images

Car images must be placed in:
```
frontend/public/images/cars/2024-season/
```

Expected filenames:
- `alpine.png`
- `aston-martin.png`
- `ferrari.png`
- `haas.png`
- `mclaren.png`
- `mercedes.png`
- `rb.png`
- `red-bull.png`
- `sauber.png`
- `williams.png`

## Creating Scripts for Other Seasons

To add data for a new season (e.g., 2025):

1. **Copy the scripts:**
   ```bash
   cp backend/populate_constructor_season_2024.py backend/populate_constructor_season_2025.py
   cp backend/populate_standings_2024.py backend/populate_standings_2025.py
   ```

2. **Update the season year** in both files

3. **Update team data:**
   - New car models
   - New car image paths
   - Updated team colors (if changed)
   - Final championship standings

4. **Add new car images:**
   ```bash
   mkdir frontend/public/images/cars/2025-season
   # Add PNG files for each team
   ```

5. **Run the scripts:**
   ```bash
   docker-compose exec backend python populate_constructor_season_2025.py
   docker-compose exec backend python populate_standings_2025.py
   ```

## Data Sources

### Team Colors
Official F1 team colors from:
- Formula 1 official website
- Team official websites
- F1 Media Center

### Championship Standings
Final standings from:
- Official F1 website
- FIA official results
- Ergast/Jolpica F1 API

### Car Models
Official nomenclature from:
- Team press releases
- FIA technical documents
- F1 official announcements

## Verification

After running the scripts, verify the data:

```bash
# Check ConstructorSeason entries
docker-compose exec backend python manage.py shell -c "from core.models import ConstructorSeason, Season; season = Season.objects.get(year=2024); print(f'ConstructorSeason count: {ConstructorSeason.objects.filter(season=season).count()}')"

# Check Championship Standings
docker-compose exec backend python manage.py shell -c "from core.models import ChampionshipStanding; print(f'Constructor standings 2024: {ChampionshipStanding.objects.filter(season=2024, standing_type=\"constructor\").count()}')"

# Check via API
curl "http://localhost:8000/api/v1/constructors/?season=2024" | jq
```

## Troubleshooting

**Issue:** Car images not loading
- **Solution:** Check image paths in `car_image_url` match actual files in `frontend/public/images/cars/`

**Issue:** No glow effects on team cards
- **Solution:** Ensure championship standings exist with `round=0` (season total)

**Issue:** Wrong team colors
- **Solution:** Update `TEAM_DATA_2024` dictionary in the populate script with correct hex colors

**Issue:** Script fails with "Constructor not found"
- **Solution:** Ensure constructors exist in database (run F1 data import first)

## Notes

- Scripts use `update_or_create()` - safe to run multiple times
- Season must exist before running scripts (created automatically if needed)
- Championship standings use `round=0` for season totals
- Car images are served from Next.js `/public` directory
- Team colors should use hex format (e.g., `#DC0000`)

## See Also

- [QUICKSTART.md](../documentacion/QUICKSTART.md) - Full setup guide
- [DOCKER.md](../docker/DOCKER.md) - Docker deployment
- [README.md](../README.md) - Project overview
