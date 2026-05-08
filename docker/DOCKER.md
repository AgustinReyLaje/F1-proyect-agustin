# Docker Guide - F1 Analytics

## Estructura
- `docker-compose.dev.yml`: desarrollo con hot reload
- `docker-compose.yml`: imagenes de runtime (estilo produccion)

## Variables recomendadas
Puedes crear un `.env` en `docker/` para sobreescribir defaults.

Ejemplo:

```env
POSTGRES_DB=f1_analytics_db
POSTGRES_USER=f1_user
POSTGRES_PASSWORD=f1_secure_password_2026
SECRET_KEY=change-me
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,backend
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://frontend:3000
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
PGADMIN_DEFAULT_EMAIL=admin@f1analytics.com
PGADMIN_DEFAULT_PASSWORD=admin
```

## Desarrollo

```powershell
cd docker
docker compose -f docker-compose.dev.yml up -d --build
```

### Comandos Django

```powershell
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.dev.yml exec backend python manage.py import_f1_data --season 2026 --calculate-standings
```

### Logs y estado

```powershell
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

## Runtime local (sin hot reload)

```powershell
cd docker
docker compose -f docker-compose.yml up -d --build
```

## PgAdmin (opcional)

```powershell
docker compose -f docker-compose.yml --profile tools up -d pgadmin
```

## URLs
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Admin Django: http://localhost:8000/admin/
- PgAdmin: http://localhost:5050

## Solucion de problemas

### Reinicio limpio

```powershell
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

### Ver contenedores

```powershell
docker ps
```

### Limpiar recursos Docker no usados

```powershell
docker system prune -a
```
