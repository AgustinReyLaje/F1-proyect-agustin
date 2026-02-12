# F1 Analytics Platform

Una plataforma fullstack para análisis de datos de Fórmula 1 con arquitectura limpia, construida con **Django REST Framework** (backend) y **Next.js 14** (frontend).

## ✨ Características

- 📊 Datos reales de F1 desde API externa (Jolpica F1 API)
- 🏎️ Gestión de pilotos, constructores y carreras
- 🏁 Resultados de carreras y clasificaciones
- 🏆 Championship standings en tiempo real
- 🎨 Interfaz moderna con Next.js 14 y Tailwind CSS
- 🔄 Soporte multi-temporada (2020-2025)
- 🐳 Totalmente dockerizado (backend + frontend + PostgreSQL)

## 🏗️ Arquitectura

```
F1Agustin/
│
├── 🔧 backend/                   # Django REST API
│   ├── api/                      # API endpoints & serializers
│   ├── core/                     # Models & business logic
│   │   ├── models.py             # Database models
│   │   └── services/             # Service layer
│   │       ├── f1_api_service.py         # External API integration
│   │       └── championship_service.py    # Business logic
│   ├── f1_analytics/             # Django settings
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── 🎨 frontend/                  # Next.js 14
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # React components
│   │   ├── contexts/             # React Context (SeasonContext)
│   │   ├── lib/                  # API client & utilities
│   │   └── types/                # TypeScript types
│   ├── package.json
│   └── Dockerfile
│
├── 🐳 docker/                    # Docker configuration
│   ├── docker-compose.yml        # Orquestación completa
│   ├── docker-compose.dev.yml    # Desarrollo
│   ├── DOCKER.md                 # Guía de Docker
│   └── DOCKER-QUICKSTART.md      # Quick start
│
└── 📚 documentacion/             # Documentation
    ├── README.md                 # Documentación completa
    ├── DEPLOYMENT.md             # Guía de deployment
    ├── QUICKSTART.md             # Inicio rápido
    ├── START.md                  # Setup local
    └── API-ALTERNATIVES.md       # Alternativas de API
```

## 🚀 Quick Start con Docker

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- Git

### 1. Clonar el repositorio
```bash
git clone https://github.com/AgustinReyLaje/F1-proyect-agustin.git
cd F1-proyect-agustin
```

### 2. Levantar los servicios
```bash
cd docker
docker-compose up -d --build
```

Esto levantará:
- **Backend Django** en `http://localhost:8000`
- **Frontend Next.js** en `http://localhost:3000`
- **PostgreSQL** en `localhost:5432`

### 3. Importar datos de F1
```bash
# Entrar al contenedor del backend
docker-compose exec backend python manage.py import_f1_data --season 2024 --calculate-standings
```

### 4. Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/v1/
- **Admin Django**: http://localhost:8000/admin/

## 📖 Documentación Completa

Para más información detallada, consulta:
- [📚 Documentación completa](documentacion/README.md)
- [🐳 Guía de Docker](docker/DOCKER.md)
- [⚡ Quick Start](documentacion/QUICKSTART.md)
- [🚀 Deployment](documentacion/DEPLOYMENT.md)

## 🛠️ Tecnologías

### Backend
- Python 3.11
- Django 5.2.11
- Django REST Framework
- PostgreSQL 15
- Gunicorn

### Frontend
- Next.js 14 (App Router)
- TypeScript
- React 18
- Tailwind CSS
- Axios

### DevOps
- Docker & Docker Compose
- PostgreSQL 15 Alpine
- Multi-stage builds

## 📝 Características principales

### Multi-Season Support
Sistema completo de soporte para múltiples temporadas (2020-2025):
- Selector de temporada global en el navbar
- Todas las vistas se actualizan automáticamente al cambiar temporada
- Datos persistentes con modelos Season, ConstructorSeason, DriverSeason

### Championship Standings
- Visualización de clasificaciones de pilotos y constructores
- Efectos visuales especiales para el podio (oro/plata/bronce)
- Cálculo en tiempo real basado en resultados de carreras

### Constructor Cards
- Tarjetas con información de equipos
- Efectos de brillo para posiciones de campeonato
- Imágenes de autos por temporada
- Colores oficiales de equipos

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:
1. Fork el proyecto
2. Crea tu Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la Branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👤 Autor

**Agustín Rey Laje**
- GitHub: [@AgustinReyLaje](https://github.com/AgustinReyLaje)
- Proyecto: [F1 Analytics Platform](https://github.com/AgustinReyLaje/F1-proyect-agustin)

---

⭐ Si te gusta este proyecto, dale una estrella en GitHub!
