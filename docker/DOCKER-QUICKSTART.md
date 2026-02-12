# 🐳 Guía de Inicio Rápido - Docker

## ✅ Prerequisitos

- ✅ Docker Desktop instalado y corriendo
- ✅ 8GB RAM disponible
- ✅ Puertos libres: **3000**, **8000**, **5432**

## 🚀 Pasos de Instalación

### 1️⃣ Clonar o Navegar al Proyecto

```powershell
cd c:\Users\agusr\OneDrive\Escritorio\F1Agustin
```

### 2️⃣ Levantar Todos los Servicios

```powershell
docker-compose up -d --build
```

Esto construirá e iniciará:
- 🗄️ **PostgreSQL** (puerto 5432)
- 🔧 **Backend Django** (puerto 8000)
- 🎨 **Frontend Next.js** (puerto 3000)

### 3️⃣ Esperar a que los servicios estén listos

```powershell
# Ver logs en tiempo real
docker-compose logs -f

# Espera a ver mensajes como:
# backend  | Server is running at http://0.0.0.0:8000
# frontend | ready - started server on 0.0.0.0:3000
```

### 4️⃣ Crear Superusuario (Admin)

```powershell
docker-compose exec backend python manage.py createsuperuser
```

Ingresa:
- Username: `admin`
- Email: `admin@f1analytics.com`
- Password: (tu password segura)

### 5️⃣ Importar Datos de F1

```powershell
# Importar temporada 2024 completa con clasificación
docker-compose exec backend python manage.py import_f1_data --season 2024 --calculate-standings
```

⏳ Esto tomará unos minutos...

### 6️⃣ ¡Listo! Accede a las Aplicaciones

| Servicio | URL | Descripción |
|----------|-----|-------------|
| 🎨 **Frontend** | http://localhost:3000 | Aplicación web principal |
| 🔧 **Backend API** | http://localhost:8000/api/v1/ | REST API |
| ⚙️ **Django Admin** | http://localhost:8000/admin/ | Panel de administración |
| 🗄️ **PgAdmin** | http://localhost:5050 | Gestión de base de datos (opcional) |

## 📊 Verificar que Todo Funciona

```powershell
# Ver estado de contenedores
docker-compose ps

# Deberías ver:
NAME                      STATUS
f1_analytics_backend      Up (healthy)
f1_analytics_db           Up (healthy)
f1_analytics_frontend     Up
```

## 🎯 Probar la API

### Desde PowerShell:

```powershell
# Obtener pilotos
Invoke-WebRequest http://localhost:8000/api/v1/drivers/ | Select-Object -Expand Content

# Obtener clasificación 2024
Invoke-WebRequest "http://localhost:8000/api/v1/standings/?season=2024&standing_type=driver" | Select-Object -Expand Content
```

### Desde el navegador:
- http://localhost:8000/api/v1/drivers/
- http://localhost:8000/api/v1/standings/?season=2024

## 🛠️ Comandos Útiles

### Gestión diaria

```powershell
# Iniciar servicios
docker-compose up -d

# Parar servicios
docker-compose down

# Ver logs
docker-compose logs -f

# Ver logs de un solo servicio
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar un servicio
docker-compose restart backend
docker-compose restart frontend
```

### Comandos de Django en Docker

```powershell
# Ejecutar migraciones
docker-compose exec backend python manage.py migrate

# Crear superusuario
docker-compose exec backend python manage.py createsuperuser

# Abrir shell de Django
docker-compose exec backend python manage.py shell

# Ver datos importados
docker-compose exec backend python manage.py dbshell
```

### Importar más datos

```powershell
# Importar temporadas anteriores
docker-compose exec backend python manage.py import_f1_data --season 2023 --calculate-standings
docker-compose exec backend python manage.py import_f1_data --season 2022 --calculate-standings

# Importar un round específico
docker-compose exec backend python manage.py import_f1_data --season 2024 --round 5

# Recalcular clasificación
docker-compose exec backend python manage.py import_f1_data --season 2024 --recalculate-all
```

## 🐛 Troubleshooting

### ❌ Puerto 8000 ya está en uso

```powershell
# Ver qué está usando el puerto
netstat -ano | findstr :8000

# Matar el proceso o cambiar el puerto en docker-compose.yml
```

### ❌ Backend no se conecta a la DB

```powershell
# Verificar que PostgreSQL esté corriendo
docker-compose ps db

# Ver logs de la base de datos
docker-compose logs db

# Reiniciar la base de datos
docker-compose restart db
```

### ❌ Frontend muestra error de conexión

```powershell
# Verificar que el backend esté corriendo
docker-compose ps backend

# Verificar logs del frontend
docker-compose logs frontend

# Reiniciar frontend
docker-compose restart frontend
```

### ❌ Contenedores se reinician constantemente

```powershell
# Ver logs para identificar el problema
docker-compose logs -f

# Reconstruir desde cero
docker-compose down -v
docker-compose up -d --build
```

## 🔄 Actualizar el Proyecto

```powershell
# Traer últimos cambios
git pull

# Reconstruir contenedores
docker-compose up -d --build

# Ejecutar nuevas migraciones
docker-compose exec backend python manage.py migrate
```

## 🧹 Limpiar Todo

```powershell
# Parar y eliminar contenedores (mantiene datos)
docker-compose down

# Parar y eliminar TODO incluyendo la base de datos (⚠️ CUIDADO)
docker-compose down -v

# Limpiar imágenes y caché de Docker
docker system prune -a
```

## 📚 Más Información

- 📘 **[DOCKER.md](DOCKER.md)** - Guía completa de Docker
- 📗 **[README.md](README.md)** - Documentación del proyecto
- 📙 **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guía de deployment
- 📕 **[frontend/README.md](frontend/README.md)** - Documentación del frontend

## 🎉 ¡Listo!

Tu plataforma F1 Analytics está corriendo en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/v1/

¡Disfruta analizando datos de F1! 🏎️💨
