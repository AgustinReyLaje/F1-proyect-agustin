# 🚀 F1 Analytics - Inicio Rápido

## ✅ Proyecto Configurado Exitosamente

Todos los cambios de arquitectura limpia han sido aplicados:

- ✅ PostgreSQL configurado (settings.py)
- ✅ Service Layer implementado (ChampionshipService)
- ✅ Variables de entorno (.env)
- ✅ Logging configurado
- ✅ REST Framework con throttling
- ✅ Management commands actualizados

---

## 🐳 Opción 1: Docker (RECOMENDADO - Más Fácil)

La forma **más simple** de correr todo el proyecto con PostgreSQL incluido:

### Inicio con Docker

```powershell
# Levantar todos los servicios (Django + PostgreSQL)
docker-compose up -d --build

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Importar datos de F1
docker-compose exec web python manage.py import_f1_data --season 2024 --calculate-standings

# Ver en el navegador
# API: http://localhost:8000/api/v1/
# Admin: http://localhost:8000/admin/
# PgAdmin: http://localhost:5050/
```

**📚 Ver guía completa: [DOCKER.md](DOCKER.md)**

---

## 🐍 Opción 2: Inicio Rápido con SQLite (Sin Docker)

Si quieres empezar **sin Docker** y sin configurar PostgreSQL:

### 1. Ejecutar Setup Automático

```powershell
.\setup.ps1
```

O manualmente:

```powershell
# Activar entorno virtual
.\venv\Scripts\Activate

# Instalar dependencias (si aún no está hecho)
pip install -r requirements.txt

# Crear migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### 2. Usar SQLite Temporalmente

Edita [f1_analytics/settings.py](f1_analytics/settings.py#L87) y **comenta PostgreSQL**, descomenta SQLite:

```python
# Desarrollo con SQLite (temporal)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Producción con PostgreSQL (comentar para desarrollo)
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.postgresql',
#         ...
#     }
# }
```

### 3. Importar Datos

```powershell
python manage.py import_f1_data --season 2024 --calculate-standings
```

---

## 🐘 Opción 2: Configurar PostgreSQL (Producción)

### 1. Instalar PostgreSQL

Descarga e instala desde: https://www.postgresql.org/download/windows/

### 2. Crear Base de Datos

```sql
-- Abrir pgAdmin o psql
CREATE DATABASE f1_analytics_db;
CREATE USER f1_user WITH PASSWORD 'tu_password_segura';
GRANT ALL PRIVILEGES ON DATABASE f1_analytics_db TO f1_user;
```

### 3. Configurar .env

Edita [.env](.env) con tus credenciales:

```env
DB_NAME=f1_analytics_db
DB_USER=f1_user
DB_PASSWORD=tu_password_segura
DB_HOST=localhost
DB_PORT=5432
```

### 4. Ejecutar Migraciones

```powershell
python manage.py migrate
python manage.py createsuperuser
```

### 5. Importar Datos

```powershell
python manage.py import_f1_data --season 2024 --calculate-standings
```

---

## 📊 Comandos Disponibles

### Gestión de Datos

```powershell
# Importar temporada completa
python manage.py import_f1_data --season 2024

# Importar round específico
python manage.py import_f1_data --season 2024 --round 5

# Importar con cálculo de standings
python manage.py import_f1_data --season 2024 --calculate-standings

# Recalcular todos los standings
python manage.py import_f1_data --season 2024 --recalculate-all

# Solo pilotos y constructores
python manage.py import_f1_data --season 2024 --drivers --constructors
```

### Servidor de Desarrollo

```powershell
# Iniciar servidor
python manage.py runserver

# Especificar puerto
python manage.py runserver 8080

# Accesible desde red
python manage.py runserver 0.0.0.0:8000
```

### Base de Datos

```powershell
# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Ver SQL de migración
python manage.py sqlmigrate core 0001

# Resetear base de datos (¡CUIDADO!)
python manage.py flush
```

---

## 🌐 URLs Importantes

- **API Base**: http://localhost:8000/api/v1/
- **Admin Panel**: http://localhost:8000/admin/
- **API Drivers**: http://localhost:8000/api/v1/drivers/
- **API Races**: http://localhost:8000/api/v1/races/
- **API Standings**: http://localhost:8000/api/v1/standings/

---

## 🧪 Probar la API

### Con el navegador:
Abre http://localhost:8000/api/v1/ y navega por los endpoints

### Con PowerShell:
```powershell
# Listar pilotos
Invoke-WebRequest http://localhost:8000/api/v1/drivers/ | Select-Object -Expand Content

# Filtrar por nacionalidad
Invoke-WebRequest "http://localhost:8000/api/v1/drivers/?nationality=British" | Select-Object -Expand Content

# Standings de 2024
Invoke-WebRequest "http://localhost:8000/api/v1/standings/?season=2024&standing_type=driver" | Select-Object -Expand Content
```

---

## 📚 Documentación

- **[README.md](README.md)** - Visión general del proyecto
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guía completa de deployment
- **[QUICKSTART.md](QUICKSTART.md)** - Guía de inicio rápido detallada

---

## 🔧 Solución de Problemas

### Error: "No module named 'decouple'"
```powershell
pip install python-decouple
```

### Error: "No module named 'psycopg2'"
```powershell
pip install psycopg2-binary
```

### Error: PostgreSQL connection refused
- Verifica que PostgreSQL esté corriendo
- Usa SQLite temporalmente (ver Opción 1)
- Verifica credenciales en .env

### Logs del sistema
Ver: `logs/f1_analytics.log`

---

## ✨ Próximos Pasos

1. ✅ Proyecto configurado con arquitectura limpia
2. ⏳ Configurar PostgreSQL (o usar SQLite)
3. ⏳ Importar datos de F1
4. ⏳ Explorar la API
5. ⏳ Desarrollar frontend
6. ⏳ Implementar ML para predicciones

---

**¡Todo listo para empezar a desarrollar! 🚀**
