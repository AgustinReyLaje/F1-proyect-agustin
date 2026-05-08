# F1 Analytics Platform

Una plataforma fullstack para análisis de datos de Fórmula 1 con arquitectura limpia, construida con **Django REST Framework** (backend) y **Next.js 14** (frontend).

## ✨ Características

### 🏁 **Race Weekend Complete Structure**
- **Starting Grid**: Qualifying results with team colors
- **Sprint Races**: Sprint weekend support (when available)
- **Race Results**: Full race results with podium emphasis
  - 🥇 Gold, 🥈 Silver, 🥉 Bronze visual styling for P1/P2/P3
- **DNF Display**: Retirement reasons (Engine failure, Collision, etc.)
- **Progressive Championship**: Standings after each race (cumulative timeline)

### 📊 **Data & Analytics**
- 📊 Datos reales de F1 desde API externa (Jolpica F1 API)
- 🏎️ Gestión de pilotos con career statistics (wins, podiums, championships)
- 🏁 Resultados de carreras y clasificaciones
- 🏆 Championship standings en tiempo real
- 🔄 Soporte multi-temporada (2000-2026)
- 📈 Progressive standings calculation (points accumulation by round)

### 🎨 **UI/UX Excellence**
- 🎨 Interfaz moderna con Next.js 14 y Tailwind CSS
- 🎯 Driver panel with custom F1-red scrollbar
- 🖼️ Team colors integrated throughout
- 📱 Fully responsive design
- ⚡ Dynamic race detail pages with tabbed navigation

### 🐳 **DevOps Ready**
- 🐳 Totalmente dockerizado (backend + frontend + PostgreSQL)
- 🔧 Hot reload en desarrollo
- 📦 Production-ready containers

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
docker compose -f docker-compose.dev.yml up -d --build
```

Esto levantará:
- **Backend Django** en `http://localhost:8000`
- **Frontend Next.js** en `http://localhost:3000`
- **PostgreSQL** en `localhost:5432`

### 3. Importar datos de F1
```bash
# Entrar al contenedor del backend
docker compose -f docker-compose.dev.yml exec backend python manage.py import_f1_data --season 2026 --calculate-standings
```

### 4. Acceder a la aplicación
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/v1/
- **Admin Django**: http://localhost:8000/admin/

### 5. Popular datos de race weekend (qualifying y DNF reasons)
```bash
docker-compose exec backend python populate_qualifying.py
```

## 📖 Documentación Completa

Para más información detallada, consulta:
- [📚 Documentación completa](documentacion/README.md)
- [🏁 Race Weekend Implementation](documentacion/RACE-WEEKEND-IMPLEMENTATION.md) ⭐ **NEW**
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

### Race Weekend Complete Structure ⭐ **NEW**
Sistema completo de fin de semana de carreras con estructura modular:

#### **1. Race Detail Pages** (`/races/[id]`)
- **Starting Grid**: Qualifying results con posiciones y equipos
- **Sprint Race**: Resultados de sprint (cuando aplica)
- **Race Results**: 
  - Podio enfatizado con tarjetas grandes 🥇🥈🥉
  - Gold/Silver/Bronze gradient styling
  - Tabla completa de todos los finishers
- **DNF Display**: Razones de retiro ("Engine failure", "Collision", etc.)
- **Championship Timeline**: Standings progresivos después de cada carrera

#### **2. Progressive Championship Standings**
- **API Endpoint**: `/api/v1/standings/progressive/`
- **Funcionalidad**: Calcula puntos acumulados desde Race 1 hasta round específico
- **Uso**: Ver cómo estaba el campeonato después de cada carrera
- **Ejemplo**: 
  - Round 5: Verstappen 110 pts, Norris 83 pts
  - Round 12: Verstappen 265 pts, Norris 189 pts
  - Round 24: Verstappen 399 pts, Norris 344 pts

#### **3. Driver Panel Improvements**
- ✅ Mayor ancho de panel izquierdo (384px)
- ✅ Scrollbar personalizado con color F1-red
- ✅ Scroll independiente para detalles del piloto
- ✅ Layout protegido que nunca colapsa

### Multi-Season Support
Sistema completo de soporte para múltiples temporadas (2000-2026):
- Selector de temporada global en el navbar
- Todas las vistas se actualizan automáticamente al cambiar temporada
- Datos persistentes con modelos Season, ConstructorSeason, DriverSeason

### Championship Standings
- Visualización de clasificaciones de pilotos y constructores
- Efectos visuales especiales para el podio (oro/plata/bronce)
- Cálculo en tiempo real basado en resultados de carreras
- **Standings progresivos por round** ⭐ **NEW**

### Constructor Cards
- Tarjetas con información de equipos
- Efectos de brillo para posiciones de campeonato
- Imágenes de autos por temporada
- Colores oficiales de equipos
- **P1/P2/P3 color badges** ⭐ **NEW**

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
