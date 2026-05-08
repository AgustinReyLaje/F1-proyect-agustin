# Data Population Scripts

Scripts to populate and update F1 season data for the F1 Analytics Platform.

## Overview

The platform uses **two main scripts** for all data management:

| Script | Purpose |
|--------|---------|
| `import_all_seasons.py` | Initial import of full seasons (2000–2026) |
| `update_races.py` | Update/refresh race data for the current season |

## Scripts

### 1. `import_all_seasons.py` — Master Import

Imports complete season data from the Ergast/Jolpica API:
- Seasons, constructors, constructor seasons (colors, car models, images)
- Drivers, driver seasons
- Races, results, qualifying, sprints, free practice
- Championship standings (driver + constructor)

**Usage:**
```bash
# Import all seasons (2000–2026)
docker exec f1_analytics_web_dev python import_all_seasons.py

# Import a specific season
docker exec f1_analytics_web_dev python import_all_seasons.py --season 2026

# Import a range
docker exec f1_analytics_web_dev python import_all_seasons.py --start 2020 --end 2026

# Skip already-imported seasons
docker exec f1_analytics_web_dev python import_all_seasons.py --skip-existing
```

### 2. `update_races.py` — Race Updater

Updates race data for the current season (results, qualifying, FP, standings). See [UPDATE_RACES_README.md](UPDATE_RACES_README.md) for full documentation.

**Quick usage:**
```bash
# Check current status
docker exec f1_analytics_web_dev python update_races.py --status

# Update a specific round
docker exec f1_analytics_web_dev python update_races.py --round 2

# Force full reimport
docker exec f1_analytics_web_dev python update_races.py --force
```

## Car Images

Car images are placed in:
```
frontend/public/images/cars/<year>-season/
```

Example for 2026:
```
frontend/public/images/cars/2026-season/
├── alpine.png
├── aston-martin.png
├── audi.png
├── cadillac.png
├── ferrari.png
├── haas.png
├── mclaren.png
├── mercedes.png
├── rb.png
├── red-bull.png
└── williams.png
```

## Data Sources

Los datos vienen de la **Ergast API** (mirror en `https://api.jolpi.ca/ergast/f1`)
## Verification

```bash
# Check season data counts
docker exec f1_analytics_web_dev python update_races.py --status --season 2026

# Check via API
curl "http://localhost:8000/api/v1/races/?season=2026"
curl "http://localhost:8000/api/v1/results/?race__season=2026"
curl "http://localhost:8000/api/v1/standings/?season=2026"
```

## Notes

- Both scripts use `update_or_create()` — safe to run multiple times
- Seasons are auto-created if they don't exist
- Team configurations (colors, car models) for 2026 are embedded in both scripts
- Championship standings use `round=0` for season totals
- Car images are served from the Next.js `/public` directory

## See Also

- [UPDATE_RACES_README.md](UPDATE_RACES_README.md) - Detailed update_races.py docs
- [QUICKSTART.md](../documentacion/QUICKSTART.md) - Full setup guide
- [DOCKER.md](../docker/DOCKER.md) - Docker deployment
- [README.md](../README.md) - Project overview
