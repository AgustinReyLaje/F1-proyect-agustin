# 🐳 Docker Setup - F1 Analytics Platform

## 🏗️ Arquitectura del Proyecto

```
F1Agustin/
├── 📁 Backend (Django REST API)
│   ├── api/                  # API endpoints
│   ├── core/                 # Models & business logic
│   ├── f1_analytics/         # Django settings
│   ├── Dockerfile
│   └── requirements.txt
│
├── 📁 frontend/              # Next.js Application
│   ├── src/                  # Source code
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml        # Orquestación completa
```

## 🚀 Inicio Rápido con Docker

### 1. Levantar todos los servicios

```powershell
# Construir y levantar (primera vez o después de cambios)
docker-compose up -d --build

# Ver logs en tiempo real
docker-compose logs -f
```

### 2. Crear superusuario

```powershell
docker-compose exec web python manage.py createsuperuser
```

### 3. Importar datos de F1

```powershell
# Importar temporada 2024 completa
docker-compose exec web python manage.py import_f1_data --season 2024 --calculate-standings

# Importar round específico
docker-compose exec web python manage.py import_f1_data --season 2024 --round 5
```

### 4. Acceder a los servicios

- **API Django**: http://localhost:8000/api/v1/
- **Admin Django**: http://localhost:8000/admin/
- **PgAdmin** (Gestión DB): http://localhost:5050/
  - Email: `admin@f1analytics.com`
  - Password: `admin`

---

## 📦 Servicios Incluidos

### 1. **web** - Django Application
- Puerto: `8000`
- Comando: Gunicorn con 3 workers
- Auto-migración al iniciar

### 2. **db** - PostgreSQL 15
- Puerto: `5432`
- Base de datos: `f1_analytics_db`
- Usuario: `f1_user`
- Password: `f1_secure_password_2024`

### 3. **pgadmin** - PostgreSQL Admin Tool
- Puerto: `5050`
- Interfaz web para gestionar la base de datos

---

## 🔧 Comandos Útiles

### Gestión de Contenedores

```powershell
# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f web

# Parar servicios
docker-compose down

# Parar y eliminar volúmenes (¡CUIDADO! Borra la base de datos)
docker-compose down -v

# Reconstruir imagen
docker-compose up -d --build

# Ver estado de servicios
docker-compose ps
```

### Ejecutar Comandos en el Contenedor

```powershell
# Shell interactivo
docker-compose exec web bash

# Ejecutar migraciones
docker-compose exec web python manage.py migrate

# Crear migraciones
docker-compose exec web python manage.py makemigrations

# Ejecutar tests
docker-compose exec web python manage.py test

# Shell de Django
docker-compose exec web python manage.py shell

# Importar datos
docker-compose exec web python manage.py import_f1_data --season 2024
```

### Gestión de Base de Datos

```powershell
# Acceder a PostgreSQL
docker-compose exec db psql -U f1_user -d f1_analytics_db

# Backup de base de datos
docker-compose exec db pg_dump -U f1_user f1_analytics_db > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U f1_user -d f1_analytics_db < backup.sql

# Ver logs de PostgreSQL
docker-compose logs -f db
```

---

## 🔄 Workflow de Desarrollo

### Primera Vez

```powershell
# 1. Construir y levantar
docker-compose up -d --build

# 2. Esperar a que la DB esté lista (unos segundos)
docker-compose logs -f db

# 3. Las migraciones se ejecutan automáticamente

# 4. Crear superusuario
docker-compose exec web python manage.py createsuperuser

# 5. Importar datos
docker-compose exec web python manage.py import_f1_data --season 2024 --calculate-standings

# 6. Acceder a http://localhost:8000/api/v1/
```

### Desarrollo Diario

```powershell
# Iniciar servicios
docker-compose up -d

# Trabajar en tu código...
# Los cambios se reflejan automáticamente (volume montado)

# Ver logs si hay problemas
docker-compose logs -f web

# Parar cuando termines
docker-compose down
```

### Actualizar Dependencias

```powershell
# 1. Modificar requirements.txt

# 2. Reconstruir imagen
docker-compose up -d --build web
```

### Nuevas Migraciones

```powershell
# 1. Modificar models.py

# 2. Crear migración
docker-compose exec web python manage.py makemigrations

# 3. Aplicar migración
docker-compose exec web python manage.py migrate
```

---

## 🐛 Solución de Problemas

### Error: "Port already in use"

```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :8000

# Cambiar puerto en docker-compose.yml
ports:
  - "8001:8000"  # Cambiar 8000 a 8001
```

### Error: "Database connection refused"

```powershell
# Verificar que el servicio db está corriendo
docker-compose ps

# Ver logs de la base de datos
docker-compose logs db

# Reiniciar servicios
docker-compose restart
```

### Resetear Todo (Empezar de Cero)

```powershell
# ⚠️ CUIDADO: Esto borra TODOS los datos
docker-compose down -v
docker-compose up -d --build
docker-compose exec web python manage.py createsuperuser
```

### Ver Variables de Entorno

```powershell
docker-compose exec web env
```

### Limpiar Docker (Liberar Espacio)

```powershell
# Eliminar contenedores parados
docker container prune

# Eliminar imágenes no usadas
docker image prune -a

# Eliminar todo lo no usado
docker system prune -a --volumes
```

---

## 📊 Conectar PgAdmin a PostgreSQL

1. Abrir http://localhost:5050/
2. Login con:
   - Email: `admin@f1analytics.com`
   - Password: `admin`
3. Click derecho en "Servers" → "Create" → "Server"
4. Configurar:
   - **General Tab**:
     - Name: `F1 Analytics DB`
   - **Connection Tab**:
     - Host: `db` (nombre del servicio en Docker)
     - Port: `5432`
     - Database: `f1_analytics_db`
     - Username: `f1_user`
     - Password: `f1_secure_password_2024`
   - Save

---

## 🔐 Seguridad para Producción

**⚠️ IMPORTANTE**: Cambiar estas configuraciones antes de producción:

### En docker-compose.yml:

```yaml
environment:
  - DEBUG=False  # Cambiar a False
  - SECRET_KEY=${DJANGO_SECRET_KEY}  # Usar variable de entorno
  - DB_PASSWORD=${DB_PASSWORD}  # Usar variable de entorno
  - ALLOWED_HOSTS=tudominio.com,www.tudominio.com
```

### Crear archivo .env.production:

```env
DJANGO_SECRET_KEY=tu-secret-key-super-segura-aqui
DB_PASSWORD=password-muy-segura-aqui
DB_NAME=f1_analytics_db
DB_USER=f1_user
DB_HOST=db
DB_PORT=5432
```

### Usar en producción:

```powershell
docker-compose --env-file .env.production up -d
```

---

## 📈 Monitoreo

### Ver Uso de Recursos

```powershell
# Uso de CPU, memoria, etc.
docker stats

# Solo contenedores de F1 Analytics
docker stats f1_analytics_web f1_analytics_db
```

### Logs Persistentes

Los logs se guardan en el volumen `logs_volume`:

```powershell
# Ver logs del volumen
docker-compose exec web cat /app/logs/f1_analytics.log

# Seguir logs en tiempo real
docker-compose exec web tail -f /app/logs/f1_analytics.log
```

---

## 🎯 Ventajas de Docker

✅ **No necesitas instalar**:
- PostgreSQL
- Python (usa el contenedor)
- Dependencias del sistema

✅ **Consistencia**:
- Mismo entorno en desarrollo y producción

✅ **Aislamiento**:
- No contamina tu sistema local

✅ **Portabilidad**:
- Funciona igual en Windows, Mac, Linux

✅ **Fácil cleanup**:
- `docker-compose down -v` elimina todo

---

## 🚀 Deploy en Producción

Para producción, considera:

1. **Docker Swarm** o **Kubernetes** para orquestación
2. **Nginx** como reverse proxy
3. **Redis** para cache y Celery
4. **Volumes externos** para datos persistentes
5. **Secrets management** (Docker secrets, Vault)
6. **Health checks** y auto-restart
7. **Backup automatizado** de base de datos

---

¡Tu aplicación F1 Analytics está lista con Docker! 🏎️💨
