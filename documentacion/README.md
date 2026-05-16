# F1 Analytics Platform — Technical Reference

This document covers the internal architecture, data models, prediction engine, and data import procedures.

For setup and quick start, see the [root README](../README.md).

---

## Table of Contents

1. [Database Models](#database-models)
2. [API Endpoints](#api-endpoints)
3. [Prediction Engine](#prediction-engine)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Import](#data-import)
6. [Configuration Reference](#configuration-reference)

---

## Database Models

All models live in `backend/core/models.py`.

### Season
Represents a Formula 1 season year.

| Field | Type | Notes |
|-------|------|-------|
| year | IntegerField | Unique, 1950–2026 |
| is_active | BooleanField | Marks the current season |

### Driver
A Formula 1 driver across all seasons.

| Field | Type | Notes |
|-------|------|-------|
| driver_id | CharField | Ergast/Jolpica identifier (e.g. `hamilton`) |
| number | IntegerField | Permanent race number |
| code | CharField | Three-letter code (e.g. `HAM`) |
| first_name / last_name | CharField | |
| date_of_birth | DateField | |
| nationality | CharField | |
| url | URLField | Wikipedia link |

Computed property: `full_name` → `"{first_name} {last_name}"`

### Constructor
A Formula 1 constructor (team).

| Field | Type | Notes |
|-------|------|-------|
| constructor_id | CharField | Ergast identifier (e.g. `red_bull`) |
| name | CharField | Display name (e.g. `Red Bull`) |
| nationality | CharField | |
| url | URLField | Wikipedia link |
| car_image_url | URLField | Season-independent fallback image |
| team_color | CharField | Hex color for primary branding |
| team_color_secondary | CharField | Hex color for secondary elements |

### ConstructorSeason
Season-specific data for a constructor (car model, colors can change year to year).

| Field | Type | Notes |
|-------|------|-------|
| constructor | FK → Constructor | |
| season | FK → Season | |
| car_model | CharField | e.g. `RB20` |
| car_image_url | URLField | Season-specific car image |
| team_color | CharField | |
| team_color_secondary | CharField | |

Unique together: `(constructor, season)`

### DriverSeason
Records which driver drove for which team in a given season.

| Field | Type | Notes |
|-------|------|-------|
| driver | FK → Driver | |
| season | FK → Season | |
| constructor | FK → Constructor | |

Unique together: `(driver, season, constructor)`

### Race
A single Grand Prix event.

| Field | Type | Notes |
|-------|------|-------|
| race_id | CharField | Ergast identifier |
| season | FK → Season | |
| round | IntegerField | Race number within the season |
| race_name | CharField | |
| circuit_id | CharField | Ergast circuit key (e.g. `monaco`) |
| circuit_name | CharField | |
| locality / country | CharField | |
| date | DateField | |
| time | TimeField | |
| url | URLField | |

Unique together: `(season, round)`

### Result
Race result for one driver at one race.

| Field | Type | Notes |
|-------|------|-------|
| race | FK → Race | |
| driver | FK → Driver | |
| constructor | FK → Constructor | |
| grid_position | IntegerField | Starting grid position |
| final_position | IntegerField | Finishing position (null if DNF) |
| position_text | CharField | Raw position string (e.g. `R`, `D`, `W`) |
| points | FloatField | Points scored |
| laps_completed | IntegerField | |
| status | CharField | `finished`, `dnf`, `dsq`, `dns`, `retired` |
| retirement_reason | CharField | e.g. `Engine`, `Collision` |
| fastest_lap | BooleanField | Whether this driver set the fastest lap |
| fastest_lap_time | CharField | MM:SS.mmm format |
| fastest_lap_speed | FloatField | km/h |

Unique together: `(race, driver)`

### Qualifying
Qualifying session result for one driver.

| Field | Type | Notes |
|-------|------|-------|
| race | FK → Race | |
| driver | FK → Driver | |
| constructor | FK → Constructor | |
| position | IntegerField | Final qualifying position |
| q1_time / q2_time / q3_time | CharField | Lap time strings (null if didn't participate) |

Unique together: `(race, driver)`

### Sprint
Sprint race result (only for sprint weekends).

Same structure as `Result` but scoped to the sprint race.

### FreePractice
Free practice session results.

| Field | Type | Notes |
|-------|------|-------|
| race | FK → Race | |
| driver | FK → Driver | |
| constructor | FK → Constructor | |
| session | CharField | `FP1`, `FP2`, or `FP3` |
| position | IntegerField | |
| best_lap_time | CharField | |
| laps | IntegerField | |
| gap_to_leader | CharField | |

Unique together: `(race, driver, session)`

### Lap
Individual lap times for detailed analysis.

| Field | Type | Notes |
|-------|------|-------|
| race | FK → Race | |
| driver | FK → Driver | |
| lap_number | IntegerField | |
| position | IntegerField | On-track position at end of lap |
| lap_time | CharField | MM:SS.mmm |
| lap_time_milliseconds | IntegerField | For numeric comparison |

Unique together: `(race, driver, lap_number)`

### ChampionshipStanding
Cached standings. Can be regenerated from Results at any time.

| Field | Type | Notes |
|-------|------|-------|
| season | FK → Season | |
| standing_type | CharField | `driver` or `constructor` |
| round | IntegerField | 0 = season total |
| position | IntegerField | |
| points | FloatField | |
| wins | IntegerField | |
| driver | FK → Driver | Null for constructor standings |
| constructor | FK → Constructor | Null for driver standings |

---

## API Endpoints

Base URL: `/api/v1/`  
All endpoints support pagination (20 items/page), filtering via query params, search, and ordering.

### Seasons
`GET /seasons/`  
Returns all seasons ordered by year descending.

### Drivers
`GET /drivers/`  
Filter: `nationality`, `code` | Search: `first_name`, `last_name`

### Driver Seasons
`GET /driver-seasons/`  
Filter: `season__year`, `driver`, `constructor`  
Returns season-specific data including career stats and team colors.

### Constructors
`GET /constructors/`  
Filter: `nationality` | Search: `name`

### Constructor Seasons
`GET /constructor-seasons/`  
Filter: `season__year`, `constructor`

### Races
`GET /races/`  
Filter: `season`, `round` | Search: `race_name`, `circuit_name`

### Results
`GET /results/`  
Filter: `race`, `driver`, `race__season`, `constructor`, `status`

### Qualifying
`GET /qualifying/`  
Filter: `race`, `driver`, `race__season`

### Sprint
`GET /sprint/`  
Filter: `race`, `driver`, `race__season`, `status`

### Free Practice
`GET /free-practice/`  
Filter: `race`, `driver`, `race__season`, `session`

### Laps
`GET /laps/`  
Filter: `race`, `driver`, `race__season`

### Championship Standings
`GET /standings/`  
Filter: `season`, `standing_type` (`driver`/`constructor`), `round`

`GET /standings/progressive/?season=2026&round=5`  
Returns cumulative championship standings from round 1 through the specified round. Used to render the championship timeline on race detail pages.

---

## Prediction Engine

The prediction engine lives entirely in the frontend (`frontend/src/lib/`). It runs client-side with no backend dependency — it uses race results and standings already fetched from the API.

### Files

| File | Purpose |
|------|---------|
| `predictionEngine.ts` | Core MOORA algorithm and score aggregation |
| `circuitProfiles.ts` | Circuit metadata and dynamic weight calculation |
| `puSuppliers.ts` | 2026 power unit supplier mapping |

### MOORA Algorithm

MOORA (Multi-Objective Optimization on the basis of Ratio Analysis) normalizes each criterion using the ratio system:

```
x* = x / √(Σx²)
```

This produces dimensionless values comparable across criteria with very different scales (e.g. lap times in milliseconds vs. 0–1 scores).

The composite score is then:

```
Yi = Σ(w · x*_beneficial) − Σ(w · x*_non-beneficial)
```

Race pace is treated as non-beneficial (lower ms = better), so it is subtracted. All other criteria are beneficial.

### Criteria

| Criterion | Type | Description |
|-----------|------|-------------|
| `qualyScore` | Beneficial | Normalized qualifying position (pole = 1.0) |
| `racePaceMs` | Non-beneficial | Median race lap time in milliseconds |
| `consistencyScore` | Beneficial | Inverse of lap-time variance |
| `historicalScore` | Beneficial | Results at similar circuits (current season only) |
| `teamAffinityScore` | Beneficial | Teammate performance at circuits with similar profile |
| `puAffinityScore` | Beneficial | Performance of teams sharing the same PU supplier |
| `practiceScore` | Beneficial | FP session results at this circuit (if available) |

### Dynamic Circuit Weights

Weights adjust automatically based on the circuit profile:

| Circuit characteristic | Effect |
|----------------------|--------|
| Hard overtaking (Monaco, Hungary, Singapore) | Qualifying weight: 45% |
| Medium overtaking | Qualifying weight: 30% |
| Easy overtaking (Monza, Baku, Spa) | Qualifying weight: 20% |
| High tyre wear | Consistency weight: 18% |
| Low tyre wear | Consistency weight: 6% |
| High power sensitivity (Monza, Baku) | PU affinity weight: 9% |
| Low power sensitivity (Monaco) | PU affinity weight: 3% |

### Circuit Profiles

Each of the 24 current F1 circuits is classified across five dimensions:

- **aeroLoad**: `low` / `medium` / `high`
- **tireWear**: `low` / `medium` / `high`
- **overtakingDifficulty**: `easy` / `medium` / `hard`
- **powerSensitivity**: `low` / `medium` / `high`
- **streetCircuit**: boolean
- **safetyCarLikelihood**: `low` / `medium` / `high`

Circuit similarity is computed as a weighted sum of matching dimensions (0–1 score). Results from circuits with similarity ≥ 0.4 to the target circuit are used for the `teamAffinityScore`.

### Power Unit Affinity (2026)

If a power-sensitive circuit (e.g. Monza, Baku) suits the Mercedes PU and McLaren is fast, Alpine and Williams receive a proportional boost via `puAffinityScore`. The mapping follows the 2026 regulations:

| PU Supplier | Teams |
|-------------|-------|
| Mercedes | Mercedes, McLaren, Alpine, Williams |
| Ferrari | Ferrari, Haas, Cadillac |
| Honda | Aston Martin |
| Ford (RBPT) | Red Bull, Racing Bulls |
| Audi | Sauber |

PU affinity is only applied when `powerSensitivity !== 'low'`.

### Safety Car Disclaimer

Circuits with `safetyCarLikelihood === 'high'` (Monaco, Baku, Singapore, Jeddah, Canada) display a disclaimer on the predictions page. The prediction confidence level is also downgraded one level (high → medium) for these circuits, since SC periods disproportionately randomize outcomes.

### Limitations

- **2026 season data only**: The engine uses current-season results. Historical data from earlier seasons is not used because the 2026 regulation change makes prior seasons incomparable.
- **Green-flag assumption**: Predictions assume a clean race. Safety cars, crashes, and mechanical failures will produce different outcomes.

---

## Frontend Architecture

### Pages (`frontend/src/app/`)

| Route | Description |
|-------|-------------|
| `/` | Home — driver cards grid |
| `/drivers/` | Driver listing and career details |
| `/constructors/` | Constructor listing with car images |
| `/races/[id]/` | Race detail: starting grid, sprint, results, DNF list, championship timeline |
| `/standings/` | Driver and Constructor championship tables |
| `/predictions/` | Race prediction tool with circuit analysis |

### Key Components

- **`Navbar.tsx`** — Navigation bar with season selector
- **`SeasonSelector.tsx`** — Dropdown that reads/writes `SeasonContext`
- **`DriverCard/DriverCard.tsx`** — Driver card with inline hover stats (no layout shift)
- **`DriverDetailsPanel.tsx`** — Sliding driver detail sidebar
- **`TeamCard/`** — Constructor team cards with championship position glow
- **`LoadingSkeleton.tsx`** — Animated loading placeholders

### Season Context

`SeasonContext` manages global season state:

1. On first load, fetches all seasons from the API
2. Selects the `is_active` season if one exists, otherwise the closest past season
3. Persists the selection to `localStorage`
4. All pages subscribe to `currentSeason` and re-fetch when it changes

### API Client (`frontend/src/lib/api.ts`)

Axios instance with:
- Server-side base URL: `NEXT_PUBLIC_API_URL_SERVER` (used in SSR, routes through Docker network)
- Client-side base URL: `NEXT_PUBLIC_API_URL` (used in browser)
- Request interceptor for optional auth tokens
- 20+ typed methods covering all endpoints

---

## Data Import

Data is sourced from the [Jolpica F1 API](http://api.jolpi.ca/ergast/f1) (Ergast-compatible). The import is rate-limited to 4 requests/second.

### Management Command

```bash
python manage.py import_f1_data [options]
```

| Option | Description |
|--------|-------------|
| `--season YEAR` | Season to import (e.g. `2026`) |
| `--round N` | Import a specific round only |
| `--calculate-standings` | Recalculate championship standings after import |
| `--drivers` | Import drivers only |
| `--constructors` | Import constructors only |

### Importing All Seasons

```bash
python import_all_seasons.py
```

Runs the import command for each season sequentially.

### Updating Race Results

```bash
python update_races.py
```

Fetches the latest results for races that have already occurred in the current season.

### Car Images (Wikipedia)

The `wikipedia_service.py` service enriches constructor data with season-specific car images fetched from Wikipedia API. This runs as part of the constructor import.

---

## Configuration Reference

### Backend (`backend/.env`)

```env
SECRET_KEY=<django-secret-key>
DEBUG=True                          # Set False in production
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Database
DB_NAME=f1_analytics_db
DB_USER=f1_user
DB_PASSWORD=<password>
DB_HOST=localhost                   # Use 'db' when running via Docker
DB_PORT=5432

# External API
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1
F1_API_RATE_LIMIT=4                 # Requests per second
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1        # Browser requests
NEXT_PUBLIC_API_URL_SERVER=http://backend:8000/api/v1  # Server-side requests (Docker)
```

### Django Admin

Access at `http://localhost:8000/admin/` after creating a superuser:

```bash
python manage.py createsuperuser
# or via Docker:
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

The admin provides full CRUD for all models with filtering, search, and bulk actions.
