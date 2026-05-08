# Docker Quickstart (2026)

## Prerequisitos
- Docker Desktop activo
- Puertos libres: 3000, 8000, 5432

## 1. Entrar a la carpeta docker

```powershell
cd c:\Users\agusr\OneDrive\Escritorio\F1Agustin\docker
```

## 2. Levantar entorno de desarrollo

```powershell
docker compose -f docker-compose.dev.yml up -d --build
```

## 3. Verificar estado

```powershell
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f
```

## 4. Crear superusuario

```powershell
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

## 5. Importar datos

```powershell
docker compose -f docker-compose.dev.yml exec backend python manage.py import_f1_data --season 2026 --calculate-standings
```

## 6. URLs
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1/
- Admin: http://localhost:8000/admin/

## Comandos útiles

```powershell
# Parar
docker compose -f docker-compose.dev.yml down

# Reiniciar
docker compose -f docker-compose.dev.yml restart

# Migrations
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Shell Django
docker compose -f docker-compose.dev.yml exec backend python manage.py shell
```

## Producción local (sin hot reload)

```powershell
docker compose -f docker-compose.yml up -d --build
```

## PgAdmin opcional

```powershell
docker compose -f docker-compose.yml --profile tools up -d pgadmin
```
