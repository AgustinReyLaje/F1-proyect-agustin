# ⚠️ Nota Importante sobre la API de Ergast

## Problema Actual

La **Ergast Developer API** (http://ergast.com/mrd/) que usábamos como fuente de datos **ya no está disponible**. El proyecto cerró sus servicios en 2024.

## ✅ Soluciones Alternativas

### Opción 1: OpenF1 API (Recomendado)

OpenF1 es una API moderna y gratuita de F1:

- **URL**: https://openf1.org/
- **Documentación**: https://openf1.org/#introduction
- **Características**: Datos en tiempo real, telemetría, posiciones, etc.
- **Gratis**: Sin límites de rate

**Para implementar OpenF1:**
```python
# En f1_api_service.py
base_url = "https://api.openf1.org/v1"

# Endpoints disponibles:
# /drivers?session_key=9158
# /sessions?year=2024
# /meetings?year=2024
```

### Opción 2: Jolpica F1 API

Un fork comunitario de Ergast API:

- **URL**: http://api.jolpi.ca/ergast/f1/
- **Compatible**: Misma estructura que Ergast
- **Mantenido**: Por la comunidad

**Para usar Jolpica:** Cambiar en `.env`:
```env
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1
```

### Opción 3: Wikipedia Motorsport API

- **URL**: https://motorsport.api.wikimedia.org/
- **Datos**: Históricos y actuales
- **Mantenimiento**: Wikimedia Foundation

### Opción 4: Datos de Ejemplo (Desarrollo)

He creado fixtures con datos de muestra para desarrollar y probar:

```powershell
# Cargar datos de ejemplo
docker-compose exec backend python manage.py loaddata sample_f1_data.json
```

## 🔧 Cómo Actualizar la API

### 1. Cambiar la URL base

Edita [.env](.env):
```env
# Opción Jolpica (más compatible)
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1

# O usa datos locales de muestra
# (desactiva la importación automática)
```

### 2. Reiniciar servicios

```powershell
docker-compose restart backend
```

### 3. Probar nueva API

```powershell
docker-compose exec backend python -c "
import requests
url = 'http://api.jolpi.ca/ergast/f1/2024/drivers.json'
r = requests.get(url)
print(f'Status: {r.status_code}')
print('Working!' if r.status_code == 200 else 'Failed')
"
```

### 4. Importar datos

```powershell
docker-compose exec backend python manage.py import_f1_data --season 2024 --calculate-standings
```

## 📊 Usar Datos de Muestra (Sin API Externa)

Si prefieres no depender de APIs externas, puedes:

### 1. Cargar fixtures de ejemplo:

```powershell
docker-compose exec backend python manage.py loaddata fixtures/sample_2024.json
```

### 2. Crear tus propios datos:

Usa el Django Admin (http://localhost:8000/admin/) para agregar:
- Drivers
- Constructors
- Races
- Results

## 🚀 Implementar OpenF1 (Futuro)

OpenF1 es la solución más moderna. Requiere adaptar el servicio:

```python
# core/services/openf1_service.py (nuevo archivo)
class OpenF1Service:
    def __init__(self):
        self.base_url = "https://api.openf1.org/v1"
    
    def fetch_drivers(self, year: int):
        # Implementación específica para OpenF1
        pass
    
    def fetch_sessions(self, year: int):
        # Sessions = Races en OpenF1
        pass
```

## 📝 Estado Actual del Proyecto

- ✅ Backend funcionando (Django + PostgreSQL)
- ✅ Frontend funcionando (Next.js)
- ✅ Modelos de datos listos
- ✅ Service Layer implementado
- ⚠️ API externa pendiente de actualización
- ✅ Puedes usar datos manuales mientras tanto

## 🎯 Próximos Pasos

1. **Opción rápida**: Usar Jolpica API (compatible con código actual)
2. **Opción desarrollo**: Cargar datos de muestra y usar Django Admin
3. **Opción futura**: Implementar integración con OpenF1

## 📚 Referencias

- [OpenF1 Documentation](https://openf1.org/)
- [Jolpica F1 API (Ergast fork)](http://api.jolpi.ca/)
- [Why Ergast closed](https://www.reddit.com/r/formula1/comments/18qgj3g/ergast_developer_api_to_shut_down_in_early_2024/)

---

**Contacto**: Si necesitas ayuda para implementar alguna API alternativa, avísame!
