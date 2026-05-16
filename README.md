# F1 Analytics Platform

A full-stack Formula 1 analytics platform built with **Django REST Framework** and **Next.js 14**. Covers race weekends, championship standings, multi-season data, and a circuit-aware race prediction engine.

## Features

### Race Weekends
- Starting grid from qualifying results with team colors
- Sprint race support (when applicable)
- Full race results with podium styling (P1/P2/P3)
- DNF display with retirement reasons (engine, collision, etc.)
- Progressive championship timeline — standings after every round

### Predictions Engine
- MOORA multi-criteria analysis (qualifying pace, race pace, consistency, historical data)
- Circuit-aware weights: qualifying weight rises to 45% at Monaco, drops to 20% at Monza
- Team circuit affinity: performance at circuits with similar profiles (aero load, tyre wear, overtaking difficulty)
- Power unit affinity: if McLaren (Mercedes PU) is quick at a power-sensitive circuit, Alpine and Williams get a proportional boost
- Safety car risk disclaimer on circuits with historically high SC likelihood
- Prediction vs actual comparison with directional arrows (▲ finished better, ▼ finished worse)

### Championship Standings
- Driver and Constructor championships with flag emojis per nationality
- Visual podium highlighting (gold / silver / bronze)
- Progressive standings by round via dedicated API endpoint

### Multi-Season Support
- Seasons from 2000 to 2026
- Global season selector in the navbar
- Season-specific team colors, car models, and driver lineups

### UI
- Responsive design for mobile, tablet, and desktop
- Dark theme with team color integration throughout
- Circuit profile badges on the predictions page (aero, tyre wear, power, overtaking, street circuit, SC risk)

## Architecture

```
F1Agustin/
├── backend/                    # Django REST API
│   ├── api/                    # ViewSets, serializers, URL routing
│   ├── core/                   # Models and service layer
│   │   ├── models.py           # 12 Django models
│   │   └── services/           # External API, championship logic, Wikipedia
│   └── f1_analytics/           # Django project settings
│
├── frontend/                   # Next.js 14 (App Router)
│   └── src/
│       ├── app/                # Pages: home, drivers, constructors, races, standings, predictions
│       ├── components/         # Reusable UI components
│       ├── contexts/           # SeasonContext (global season state)
│       ├── lib/                # API client, prediction engine, circuit profiles, PU suppliers
│       └── types/              # TypeScript interfaces
│
└── docker/                     # Docker Compose configuration
    ├── docker-compose.yml      # Production (PostgreSQL + Gunicorn + Nginx)
    └── docker-compose.dev.yml  # Development with hot reload
```

## Quick Start (Docker)

**Requirements**: Docker Desktop, Git

```bash
git clone https://github.com/AgustinReyLaje/F1-proyect-agustin.git
cd F1-proyect-agustin/docker

# Start all services
docker compose -f docker-compose.dev.yml up -d --build

# Import F1 data for the current season
docker compose -f docker-compose.dev.yml exec backend python manage.py import_f1_data --season 2026 --calculate-standings
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api/v1/ |
| Django Admin | http://localhost:8000/admin/ |

## Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate          # Windows
source venv/bin/activate          # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py import_f1_data --season 2026 --calculate-standings
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

> The frontend expects the backend at `http://localhost:8000`. Configure via `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## API Reference

Base URL: `http://localhost:8000/api/v1/`

| Endpoint | Description |
|----------|-------------|
| `GET /seasons/` | All F1 seasons |
| `GET /drivers/` | Drivers — filter by `nationality`, `code` |
| `GET /driver-seasons/` | Season-specific driver data (team, car, stats) |
| `GET /constructors/` | Teams — filter by `nationality` |
| `GET /constructor-seasons/` | Season-specific constructor data |
| `GET /races/` | Races — filter by `season`, `round` |
| `GET /results/` | Race results — filter by `race`, `driver`, `race__season` |
| `GET /qualifying/` | Qualifying results with Q1/Q2/Q3 times |
| `GET /sprint/` | Sprint race results |
| `GET /free-practice/` | FP1/FP2/FP3 results |
| `GET /laps/` | Individual lap times |
| `GET /standings/` | Championship standings — filter by `season`, `standing_type`, `round` |
| `GET /standings/progressive/` | Cumulative points up to a specific round |

All endpoints support pagination (20 per page), filtering, search, and ordering.

**Example queries:**
```
GET /api/v1/standings/?season=2026&standing_type=driver
GET /api/v1/results/?race__season=2026&driver=1
GET /api/v1/standings/progressive/?season=2026&round=5
```

## Environment Variables

**Backend** (`backend/.env`):
```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000
DB_NAME=f1_analytics_db
DB_USER=f1_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1
F1_API_RATE_LIMIT=4
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_URL_SERVER=http://backend:8000/api/v1
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | Django 5.2 + Django REST Framework 3.15 |
| Database | PostgreSQL 15 |
| WSGI server | Gunicorn |
| Frontend framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Charts | Recharts |
| Containerization | Docker + Docker Compose |

## Detailed Documentation

- [Technical Reference](documentacion/README.md) — models, prediction engine, data import
- [Docker Guide](docker/DOCKER.md) — full Docker setup and commands
- [Deployment](documentacion/DEPLOYMENT.md) — production deployment guide

## Author

**Agustín Rey Laje** — [@AgustinReyLaje](https://github.com/AgustinReyLaje)

## License

MIT
