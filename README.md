# F1 Analytics Platform

Una plataforma fullstack para análisis de datos de Fórmula 1 con arquitectura limpia, construida con **Django REST Framework** (backend) y **Next.js 14** (frontend).

## ✨ Características

- 📊 Datos reales de F1 desde API externa (Ergast)
- 🏎️ Gestión de pilotos, constructores y carreras
- 🏁 Resultados de carreras y tiempos por vuelta
- 🏆 Cálculo de clasificación de campeonato en tiempo real
- 🔮 Preparado para predicciones con ML
- 🐳 **Totalmente dockerizado** (backend + frontend + PostgreSQL)

## 🏗️ Arquitectura

```
F1Agustin/
│
├── 🔧 Backend (Django REST API)
│   ├── api/                      # API endpoints & serializers
│   ├── core/                     # Models & business logic
│   │   ├── models.py             # Database models
│   │   └── services/             # Service layer (clean architecture)
│   │       ├── f1_api_service.py         # External API integration
│   │       └── championship_service.py    # Business logic
│   ├── f1_analytics/             # Django settings
│   ├── Dockerfile
│   └── requirements.txt
│
├── 🎨 Frontend (Next.js 14)
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # React components
│   │   ├── lib/                  # API client & utilities
│   │   └── types/                # TypeScript types
│   ├── Dockerfile
│   └── package.json
│
├── 🐳 Docker
│   ├── docker-compose.yml        # Orquestación completa
│   └── DOCKER.md                 # Guía de Docker
│
└── 📚 Documentación
    ├── README.md                 # Este archivo
    ├── DEPLOYMENT.md             # Guía de deployment
    ├── QUICKSTART.md             # Inicio rápido detallado
    └── START.md                  # Guía de setup local
```

## Models

### Driver
- Stores driver information (name, nationality, number, etc.)
- Tracks driver history and statistics

### Constructor
- Represents F1 teams
- Includes team nationality and historical data

### Race
- Race event details (season, round, circuit, date)
- Links to results and lap times

### Result
- Race results for each driver
- Includes grid position, final position, points, status
- Fastest lap information

### Lap
- Individual lap times for analysis
- Position tracking throughout the race

### ChampionshipStanding
- Cached championship standings
- Supports both driver and constructor championships
- Can be regenerated from results data

## Installation & Setup

### **🐳 Opción A: Docker (Recomendado)**

La forma más simple de correr todo:

```powershell
# Levantar servicios (Django + PostgreSQL)
docker-compose up -d --build

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Importar datos
docker-compose exec web python manage.py import_f1_data --season 2024 --calculate-standings
```

**Acceder**: http://localhost:8000/api/v1/

**📚 Guía completa**: [DOCKER.md](DOCKER.md)

---

### **🐍 Opción B: Setup Manual**

1. **Clone and setup environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate
   pip install -r requirements.txt
   ```

2. **Configure PostgreSQL**
   ```sql
   CREATE DATABASE f1_analytics_db;
   CREATE USER f1_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE f1_analytics_db TO f1_user;
   ```

3. **Setup environment variables**
   ```powershell
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations**
   ```powershell
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Import F1 data**
   ```powershell
   python manage.py import_f1_data --season 2024 --calculate-standings
   ```

6. **Run server**
   ```powershell
   python manage.py runserver
   ```

**📚 Guías detalladas**: [START.md](START.md) | [DEPLOYMENT.md](DEPLOYMENT.md)

6. **Run server**
   ```powershell
   python manage.py runserver
   ```

**📖 For detailed setup instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

## API Endpoints

All endpoints are under `/api/v1/`:

- `/api/v1/drivers/` - List all drivers
- `/api/v1/constructors/` - List all constructors
- `/api/v1/races/` - List all races
- `/api/v1/results/` - List all race results
- `/api/v1/laps/` - List all lap times
- `/api/v1/standings/` - List championship standings

### Filtering & Search

All endpoints support filtering, searching, and ordering:

```
GET /api/v1/drivers/?nationality=British
GET /api/v1/races/?season=2024
GET /api/v1/results/?race__season=2024&driver=1
GET /api/v1/standings/?season=2024&standing_type=driver
```

## Environment Variables

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
F1_API_BASE_URL=http://ergast.com/api/f1
F1_API_RATE_LIMIT=4
```

## Django Admin

Access the admin panel at `http://localhost:8000/admin/`

Features:
- Full CRUD operations on all models
- Advanced filtering and search
- Bulk actions
- Data import/export capabilities

## REST Framework Features

- **Pagination**: 20 items per page
- **Authentication**: Session-based (can be extended)
- **Permissions**: AllowAny (can be restricted)
- **Browsable API**: Available in development mode
- **CORS**: Configured for frontend integration

## Next Steps

1. **Data Fetching Service**
   - Create service to fetch data from Ergast API
   - Implement rate limiting
   - Add error handling and retry logic

2. **Championship Calculation**
   - Service to calculate standings from results
   - Historical data analysis

3. **Machine Learning Models**
   - Qualifying prediction model
   - Race outcome prediction
   - Performance trend analysis

4. **Additional Features**
   - WebSocket support for live timing
   - Caching layer (Redis)
   - Background tasks (Celery)
   - Advanced analytics endpoints

## Development Best Practices

✅ **Clean Architecture**
- Service layer separates business logic from views
- Models handle data access only
- Views are thin presentation layers

✅ **Database Optimization**
- Proper indexes on frequently queried fields
- Foreign key relationships with appropriate cascading
- Connection pooling for better performance

✅ **API Best Practices**
- ViewSet-based API with consistent filtering
- Rate limiting to prevent abuse
- Comprehensive error handling

✅ **Production Ready**
- PostgreSQL with optimized configuration
- Logging with rotation
- Environment-based configuration
- Security settings enabled

## Technology Stack

- **Framework**: Django 5.2.11
- **API**: Django REST Framework 3.15.2
- **Database**: PostgreSQL (production-ready)
- **CORS**: django-cors-headers
- **Filtering**: django-filter
- **Configuration**: python-decouple
- **HTTP Client**: requests

## License

This project is for educational/personal use.

## Contributing

1. Create feature branches
2. Write tests for new features
3. Follow PEP 8 style guide
4. Update documentation

## Support

For issues or questions, please create an issue in the repository.
