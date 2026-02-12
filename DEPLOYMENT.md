# F1 Analytics Platform - Setup Guide

## 📋 Overview

This is a production-ready Django REST Framework backend for analyzing Formula 1 data. The project follows **clean architecture principles** with separated business logic layers and is optimized for scalability.

---

## 🏗️ Architecture

### **Clean Architecture Structure**

```
F1Agustin/
├── f1_analytics/              # Django project configuration
│   ├── settings.py            # Configuration with PostgreSQL & best practices
│   ├── urls.py                # Root URL routing
│   └── wsgi.py                # Production WSGI server
│
├── core/                      # Core domain layer (models & business logic)
│   ├── models.py              # Database models (Driver, Constructor, Race, etc.)
│   ├── services/              # Business logic layer (separated from views)
│   │   ├── f1_api_service.py          # External API integration
│   │   └── championship_service.py    # Championship calculations
│   └── management/
│       └── commands/
│           └── import_f1_data.py      # Data import CLI
│
├── api/                       # API presentation layer
│   ├── views.py               # API ViewSets (thin layer, no business logic)
│   ├── serializers.py         # Data serialization
│   └── urls.py                # API routing
│
├── logs/                      # Application logs
├── requirements.txt           # Python dependencies
└── .env.example               # Environment variables template
```

### **Key Architectural Decisions**

✅ **Service Layer Pattern**: Business logic is in `services/`, not in views
✅ **Repository Pattern**: Models handle data access, services handle logic
✅ **Dependency Injection**: Services are instantiated and passed dependencies
✅ **Separation of Concerns**: Each layer has a single responsibility

---

## 🚀 Setup Instructions

### **Prerequisites**

- Python 3.10+
- PostgreSQL 14+
- pip and virtualenv

### **1. Clone and Setup Environment**

```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt
```

### **2. Configure PostgreSQL**

Create a PostgreSQL database:

```sql
CREATE DATABASE f1_analytics_db;
CREATE USER f1_user WITH PASSWORD 'your_secure_password';
ALTER ROLE f1_user SET client_encoding TO 'utf8';
ALTER ROLE f1_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE f1_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE f1_analytics_db TO f1_user;
```

### **3. Configure Environment Variables**

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
SECRET_KEY=your-generated-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DB_NAME=f1_analytics_db
DB_USER=f1_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
```

**Generate a secure SECRET_KEY:**

```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### **4. Run Migrations**

```powershell
python manage.py makemigrations
python manage.py migrate
```

### **5. Create Superuser**

```powershell
python manage.py createsuperuser
```

### **6. Import F1 Data**

```powershell
# Import all data for 2024 season
python manage.py import_f1_data --season 2024

# Import specific round
python manage.py import_f1_data --season 2024 --round 1

# Import and calculate standings
python manage.py import_f1_data --season 2024 --calculate-standings

# Recalculate all standings
python manage.py import_f1_data --season 2024 --recalculate-all
```

### **7. Run Development Server**

```powershell
python manage.py runserver
```

Access the API at: `http://localhost:8000/api/`

---

## 📊 Database Models

### **Driver**
- Stores driver information (name, nationality, number, code)
- Indexed on `driver_id` and `code` for fast lookups

### **Constructor**
- F1 teams/constructors
- Indexed on `constructor_id`

### **Race**
- Race events with circuit information
- Unique constraint on `(season, round)`
- Indexed on season, round, and date

### **Result**
- Individual race results for each driver
- ForeignKey to Driver, Constructor, and Race
- Includes grid position, final position, points, status
- Unique constraint on `(race, driver)`

### **Lap**
- Lap-by-lap timing data
- ForeignKey to Driver and Race
- Indexed for efficient queries on lap times

### **ChampionshipStanding**
- Cached championship standings (calculated from Results)
- Supports both driver and constructor championships
- Round 0 = season total, Round N = standings after round N

---

## 🔌 API Endpoints

### **Base URL**: `/api/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/drivers/` | GET | List all drivers |
| `/api/drivers/{id}/` | GET | Driver details |
| `/api/constructors/` | GET | List all constructors |
| `/api/constructors/{id}/` | GET | Constructor details |
| `/api/races/` | GET | List all races |
| `/api/races/{id}/` | GET | Race details |
| `/api/results/` | GET | List all results |
| `/api/results/{id}/` | GET | Result details |
| `/api/laps/` | GET | List all lap times |
| `/api/standings/` | GET | Championship standings |

### **Query Parameters**

All endpoints support filtering, searching, and ordering:

```
GET /api/results/?race__season=2024&driver=1&ordering=-points
GET /api/drivers/?nationality=British&search=Hamilton
GET /api/races/?season=2024&country=Monaco
```

---

## 🔧 Configuration Details

### **PostgreSQL Configuration**

The project uses PostgreSQL with:
- Connection pooling (`CONN_MAX_AGE=600`)
- Connection timeout (10 seconds)
- Optimized for production performance

### **REST Framework Settings**

- **Pagination**: 20 items per page
- **Throttling**: 100 requests/hour (anonymous), 1000/hour (authenticated)
- **Filtering**: django-filter integration
- **CORS**: Configured for frontend integration

### **Logging**

Logs are written to:
- Console (development)
- Rotating file at `logs/f1_analytics.log` (max 10MB, 5 backups)

Log levels can be configured via `LOG_LEVEL` environment variable.

---

## 🎯 Service Layer Examples

### **Using Championship Service**

```python
from core.services.championship_service import ChampionshipService

# Calculate driver standings
standings = ChampionshipService.calculate_driver_standings(season=2024)

# Calculate and save to database
created, updated = ChampionshipService.save_driver_standings(season=2024, up_to_round=10)

# Get position history
history = ChampionshipService.get_driver_position_history(driver_id=1, season=2024)
```

### **Using F1 API Service**

```python
from core.services.f1_api_service import F1DataService

service = F1DataService()

# Fetch drivers
drivers = service.fetch_drivers(season=2024)

# Fetch race results
results = service.fetch_race_results(season=2024, round_number=1)

# Fetch standings
standings = service.fetch_driver_standings(season=2024)
```

---

## 🧪 Testing

```powershell
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test core
python manage.py test api

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 🚀 Production Deployment

### **1. Security Checklist**

- [ ] Set `DEBUG=False`
- [ ] Generate strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS settings (uncomment in `.env`)
- [ ] Set secure database passwords
- [ ] Configure firewall rules

### **2. Production Settings**

Uncomment these in `.env`:

```env
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

### **3. WSGI Server**

Add to `requirements.txt`:

```
gunicorn==21.2.0
```

Run with:

```powershell
gunicorn f1_analytics.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### **4. Recommended Production Stack**

- **Web Server**: Nginx (reverse proxy)
- **WSGI Server**: Gunicorn
- **Database**: PostgreSQL 14+ (with replication)
- **Cache**: Redis (for production caching)
- **Task Queue**: Celery + Redis (for async tasks)

---

## 🔮 Future Enhancements

### **Planned Features**

1. **Machine Learning Integration**
   - Race outcome predictions
   - Qualifying predictions
   - Driver performance analysis

2. **Advanced Analytics**
   - Tire strategy analysis
   - Weather impact on performance
   - Historical trends

3. **Real-time Updates**
   - WebSocket support for live race data
   - Real-time standings during races

4. **API Enhancements**
   - GraphQL endpoint
   - Batch operations
   - Advanced filtering

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Ergast API Documentation](http://ergast.com/mrd/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🤝 Contributing

1. Follow PEP 8 style guidelines
2. Write tests for new features
3. Update documentation
4. Use meaningful commit messages

---

## 📄 License

This project is for educational and analytical purposes.
