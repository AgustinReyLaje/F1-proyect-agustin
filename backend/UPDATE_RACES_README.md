# 🏎️ Actualización de Carreras F1 — `update_races.py`

## 📍 Ubicación

```
backend/update_races.py
```

## ¿Qué hace?

Script unificado que actualiza **toda la data de carreras** de una temporada de F1:

- 🗓️ **Calendario** — Importa/actualiza las carreras programadas
- 🏁 **Resultados de carrera** — Posiciones, puntos, vueltas, estado (DNF, DSQ, etc.)
- ⏱️ **Clasificación (Qualifying)** — Tiempos de Q1, Q2, Q3
- 🏃 **Sprint** — Resultados de sprint (si el fin de semana tiene sprint)
- 🔧 **Prácticas Libres (FP1, FP2, FP3)** — Generadas a partir de la clasificación
- 📊 **Standings** — Recalcula la clasificación de pilotos y constructores
- 👤 **Pilotos y equipos** — Actualiza el roster (incluye equipos nuevos como Audi y Cadillac en 2026)

---

## 🐳 Comandos (Docker)

### Ver el estado actual de la temporada
```bash
docker exec f1_analytics_web_dev python update_races.py --status
```

### Actualizar toda la temporada (trae solo datos nuevos)
```bash
docker exec f1_analytics_web_dev python update_races.py
```

### Actualizar una ronda específica
```bash
docker exec f1_analytics_web_dev python update_races.py --round 2
```

### Forzar reimportación (sobreescribe datos existentes)
```bash
docker exec f1_analytics_web_dev python update_races.py --force
```

### Usar con otra temporada
```bash
docker exec f1_analytics_web_dev python update_races.py --season 2025
```

### Combinar opciones
```bash
docker exec f1_analytics_web_dev python update_races.py --season 2025 --round 5 --force
```

---

## 💻 Comandos (sin Docker, local)

```bash
cd backend
python update_races.py --status
python update_races.py
python update_races.py --round 2
python update_races.py --force
python update_races.py --season 2025
```

---

## 📋 Opciones

| Flag | Descripción |
|---|---|
| *(sin flags)* | Actualizar toda la temporada 2026 (solo datos nuevos) |
| `--status` | Mostrar tabla con el estado de cada carrera |
| `--round N` | Actualizar solo la ronda N |
| `--force` | Reimportar todo, incluso datos que ya existen |
| `--season YYYY` | Trabajar con otra temporada (por defecto: 2026) |

---

## 🔄 ¿Cuándo ejecutarlo?

- **Después de cada carrera**: Para traer los resultados nuevos
- **Antes de cada fin de semana**: Para actualizar el calendario si hubo cambios
- **Cuando se agreguen equipos/pilotos**: El script los detecta automáticamente

### Ejemplo después del GP de China (Ronda 2):
```bash
docker exec f1_analytics_web_dev python update_races.py --round 2
```

O para actualizar todo de una vez:
```bash
docker exec f1_analytics_web_dev python update_races.py
```

---

## 📊 Ejemplo de salida `--status`

```
======================================================================
  📊 ESTADO DE LA TEMPORADA 2026
======================================================================

  Rnd  Carrera                            Fecha           Res  Qual  Spr   FP  Estado
  ─────────────────────────────────────────────────────────────────────────────────────
  R1   Australian Grand Prix              2026-03-08       22    19    0   57  ✅ Completa
  R2   Chinese Grand Prix                 2026-03-15        0     0    0    0  📅 Programada
  R3   Japanese Grand Prix                2026-03-29        0     0    0    0  📅 Programada
  ...

  DriverSeasons: 22
  ConstructorSeasons: 12
  Standings: 825
  Carreras corridas: 1/24
======================================================================
```

---

## 🏗️ ¿Qué datos trae de la API?

Los datos vienen de la **Ergast API** (mirror en `api.jolpi.ca/ergast/f1`):

| Dato | Fuente |
|---|---|
| Calendario | `/api/f1/{year}.json` |
| Resultados | `/api/f1/{year}/{round}/results.json` |
| Qualifying | `/api/f1/{year}/{round}/qualifying.json` |
| Sprint | `/api/f1/{year}/{round}/sprint.json` |
| Pilotos | `/api/f1/{year}/drivers.json` |
| Constructores | `/api/f1/{year}/constructors.json` |
| Standings | Calculados internamente a partir de los resultados |
| FP1/FP2/FP3 | Generados a partir de los datos de qualifying |

---

## 🏎️ Equipos nuevos 2026

El script incluye los nuevos equipos de la temporada 2026:

| Equipo | Color | Auto |
|---|---|---|
| Audi F1 Team | ⬛ `#1B1B1B` | A26 |
| Cadillac F1 Team | 🟡 `#C4A747` | CAD-01 |

Estos se crean automáticamente al ejecutar el script.
