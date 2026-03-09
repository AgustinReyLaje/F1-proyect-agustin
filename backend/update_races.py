"""
╔══════════════════════════════════════════════════════════════════════╗
║              ACTUALIZACIÓN DE CARRERAS F1 — 2026                   ║
║                                                                     ║
║  Script unificado para actualizar toda la data de carreras:         ║
║    • Calendario de carreras (schedule)                              ║
║    • Resultados de carrera (Race Results)                           ║
║    • Clasificación (Qualifying Q1/Q2/Q3)                            ║
║    • Sprint (si aplica)                                             ║
║    • Prácticas libres (FP1, FP2, FP3)                              ║
║    • Standings de pilotos y constructores                           ║
║    • Equipos y pilotos nuevos                                       ║
║                                                                     ║
║  Uso:                                                               ║
║    python update_races.py                 # Actualizar todo          ║
║    python update_races.py --season 2025   # Otra temporada           ║
║    python update_races.py --round 2       # Solo una ronda           ║
║    python update_races.py --status        # Ver estado actual        ║
║    python update_races.py --force         # Reimportar todo          ║
║                                                                     ║
║  En Docker:                                                         ║
║    docker exec f1_analytics_web_dev python update_races.py           ║
║    docker exec f1_analytics_web_dev python update_races.py --status  ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import time
import random
import traceback
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from datetime import datetime, date
from django.db import transaction
from django.db.models import Q, Count
from core.models import (
    Season, Driver, Constructor, ConstructorSeason, DriverSeason,
    Race, Result, Qualifying, Sprint, FreePractice, ChampionshipStanding
)
from core.services.f1_api_service import F1DataService, F1APIError
from core.services.championship_service import ChampionshipService


# ═══════════════════════════════════════════════════════════════════
#  CONFIGURACIÓN DE EQUIPOS 2026
# ═══════════════════════════════════════════════════════════════════

TEAMS_2026 = {
    'red_bull': {
        'name': 'Red Bull Racing',
        'nationality': 'Austrian',
        'color': '#3671C6',
        'secondary': '#FFD700',
        'car_model': 'RB22',
    },
    'ferrari': {
        'name': 'Scuderia Ferrari',
        'nationality': 'Italian',
        'color': '#E8002D',
        'secondary': '#FFEB3B',
        'car_model': 'SF-26',
    },
    'mercedes': {
        'name': 'Mercedes-AMG Petronas',
        'nationality': 'German',
        'color': '#27F4D2',
        'secondary': '#000000',
        'car_model': 'W17',
    },
    'mclaren': {
        'name': 'McLaren F1 Team',
        'nationality': 'British',
        'color': '#FF8000',
        'secondary': '#000000',
        'car_model': 'MCL40',
    },
    'aston_martin': {
        'name': 'Aston Martin Aramco F1 Team',
        'nationality': 'British',
        'color': '#229971',
        'secondary': '#CEDC00',
        'car_model': 'AMR26',
    },
    'alpine': {
        'name': 'Alpine F1 Team',
        'nationality': 'French',
        'color': '#FF87BC',
        'secondary': '#0093CC',
        'car_model': 'A526',
    },
    'williams': {
        'name': 'Williams Racing',
        'nationality': 'British',
        'color': '#64C4FF',
        'secondary': '#041E42',
        'car_model': 'FW48',
    },
    'racing_bulls': {
        'name': 'Racing Bulls',
        'nationality': 'Italian',
        'color': '#6692FF',
        'secondary': '#FFFFFF',
        'car_model': 'VCARB 03',
    },
    'haas': {
        'name': 'Haas F1 Team',
        'nationality': 'American',
        'color': '#B6BABD',
        'secondary': '#E10600',
        'car_model': 'VF-26',
    },
    'audi': {
        'name': 'Audi F1 Team',
        'nationality': 'German',
        'color': '#1B1B1B',
        'secondary': '#E10032',
        'car_model': 'A26',
    },
    'cadillac': {
        'name': 'Cadillac F1 Team',
        'nationality': 'American',
        'color': '#C4A747',
        'secondary': '#1C1C1C',
        'car_model': 'CAD-01',
    },
}


# ═══════════════════════════════════════════════════════════════════
#  UTILIDADES
# ═══════════════════════════════════════════════════════════════════

def parse_status(status_text: str) -> str:
    """Convierte el estado del Ergast API a nuestras opciones de modelo."""
    if not status_text:
        return 'finished'
    s = status_text.lower().strip()
    if s in ('finished',) or (s.startswith('+') and 'lap' in s):
        return 'finished'
    if 'disqualif' in s or 'excluded' in s:
        return 'dsq'
    if 'not start' in s or s == 'dns' or 'withdrew' in s:
        return 'dns'
    return 'retired'


def get_retirement_reason(status_text: str) -> str:
    """Extrae la razón del abandono."""
    if not status_text:
        return ''
    if parse_status(status_text) == 'finished':
        return ''
    return status_text


# ═══════════════════════════════════════════════════════════════════
#  CLASE PRINCIPAL — RaceUpdater
# ═══════════════════════════════════════════════════════════════════

class RaceUpdater:
    """
    Clase principal que maneja la actualización de toda la data de carreras.
    Soporta actualización completa o parcial (por ronda).
    """

    def __init__(self, season_year: int = 2026):
        self.year = season_year
        self.service = F1DataService()
        self.stats = {
            'races_created': 0,
            'races_updated': 0,
            'results_created': 0,
            'results_updated': 0,
            'qualifying_created': 0,
            'qualifying_updated': 0,
            'sprints_created': 0,
            'sprints_updated': 0,
            'fp_created': 0,
            'fp_updated': 0,
            'drivers_created': 0,
            'constructors_created': 0,
            'constructor_seasons_created': 0,
            'driver_seasons_created': 0,
            'standings_updated': 0,
            'errors': [],
        }

    # ─────────────────────────────────────────────────────────────
    #  1. SEASON & EQUIPOS
    # ─────────────────────────────────────────────────────────────

    def ensure_season(self) -> Season:
        """Crea o recupera el registro de temporada."""
        season_obj, created = Season.objects.get_or_create(
            year=self.year,
            defaults={'is_active': True}
        )
        if created:
            print(f"  [+] Temporada {self.year} creada")
        else:
            print(f"  [=] Temporada {self.year} existe")

        # Activar esta temporada
        Season.objects.filter(is_active=True).exclude(year=self.year).update(is_active=False)
        season_obj.is_active = True
        season_obj.save()

        return season_obj

    def setup_teams(self, season_obj: Season):
        """Configura equipos para la temporada (incluye nuevos de 2026)."""
        print(f"\n  🏭 Configurando equipos {self.year}...")

        # Traer constructores de la API
        api_constructors = []
        try:
            api_constructors = self.service.fetch_constructors(self.year)
            print(f"     API devolvió {len(api_constructors)} constructores")
        except Exception as e:
            print(f"     ⚠ API no disponible: {e}")

        # Si es 2026, usar nuestro diccionario de equipos
        teams_config = TEAMS_2026 if self.year == 2026 else {}

        created_count = 0
        for cid, info in teams_config.items():
            constructor, created = Constructor.objects.update_or_create(
                constructor_id=cid,
                defaults={
                    'name': info['name'],
                    'nationality': info['nationality'],
                    'team_color': info['color'],
                    'team_color_secondary': info['secondary'],
                    'car_model': info['car_model'],
                }
            )
            if created:
                created_count += 1
                self.stats['constructors_created'] += 1

            _, cs_created = ConstructorSeason.objects.update_or_create(
                constructor=constructor,
                season=season_obj,
                defaults={
                    'car_model': info['car_model'],
                    'team_color': info['color'],
                    'team_color_secondary': info['secondary'],
                }
            )
            if cs_created:
                self.stats['constructor_seasons_created'] += 1

        # Crear constructores de la API que no estén en nuestro diccionario
        for c in api_constructors:
            cid = c['constructorId']
            if cid not in teams_config:
                constructor, created = Constructor.objects.update_or_create(
                    constructor_id=cid,
                    defaults={
                        'name': c['name'],
                        'nationality': c['nationality'],
                        'url': c.get('url', ''),
                    }
                )
                if created:
                    created_count += 1
                    self.stats['constructors_created'] += 1

                _, cs_created = ConstructorSeason.objects.update_or_create(
                    constructor=constructor,
                    season=season_obj,
                    defaults={}
                )
                if cs_created:
                    self.stats['constructor_seasons_created'] += 1

        print(f"     ✓ {created_count} nuevos, {len(teams_config) + len(api_constructors)} totales")

    # ─────────────────────────────────────────────────────────────
    #  2. PILOTOS
    # ─────────────────────────────────────────────────────────────

    def import_drivers(self):
        """Importa/actualiza los pilotos de la temporada."""
        print(f"\n  📋 Importando pilotos {self.year}...")
        try:
            drivers_data = self.service.fetch_drivers(self.year)
            created_count = 0
            for d in drivers_data:
                _, created = Driver.objects.update_or_create(
                    driver_id=d['driverId'],
                    defaults={
                        'number': d.get('permanentNumber'),
                        'code': d.get('code', ''),
                        'first_name': d['givenName'],
                        'last_name': d['familyName'],
                        'date_of_birth': d.get('dateOfBirth'),
                        'nationality': d['nationality'],
                        'url': d.get('url', ''),
                    }
                )
                if created:
                    created_count += 1
                    self.stats['drivers_created'] += 1
            print(f"     ✓ {created_count} nuevos ({len(drivers_data)} total)")
        except Exception as e:
            print(f"     ✗ Error: {e}")
            self.stats['errors'].append(f"Pilotos: {e}")

    # ─────────────────────────────────────────────────────────────
    #  3. CALENDARIO DE CARRERAS
    # ─────────────────────────────────────────────────────────────

    def import_race_schedule(self) -> list:
        """Importa/actualiza el calendario de carreras."""
        print(f"\n  🗓️  Importando calendario {self.year}...")
        try:
            races_data = self.service.fetch_races(self.year)
        except Exception as e:
            print(f"     ✗ Error: {e}")
            self.stats['errors'].append(f"Calendario: {e}")
            return []

        race_objects = []
        for rd in races_data:
            circuit = rd['Circuit']
            race_time = None
            if 'time' in rd:
                try:
                    race_time = datetime.strptime(rd['time'], '%H:%M:%SZ').time()
                except ValueError:
                    pass

            race, created = Race.objects.update_or_create(
                race_id=f"{self.year}_{rd['round']}",
                defaults={
                    'season': self.year,
                    'round': int(rd['round']),
                    'race_name': rd['raceName'],
                    'circuit_id': circuit['circuitId'],
                    'circuit_name': circuit['circuitName'],
                    'locality': circuit['Location']['locality'],
                    'country': circuit['Location']['country'],
                    'date': rd['date'],
                    'time': race_time,
                    'url': rd.get('url', ''),
                }
            )
            if created:
                self.stats['races_created'] += 1
            else:
                self.stats['races_updated'] += 1
            race_objects.append(race)

        print(f"     ✓ {len(race_objects)} carreras ({self.stats['races_created']} nuevas)")
        return race_objects

    # ─────────────────────────────────────────────────────────────
    #  4. RESULTADOS DE CARRERA
    # ─────────────────────────────────────────────────────────────

    def import_race_results(self, race: Race, force: bool = False):
        """Importa resultados de una carrera específica."""
        # Si ya tiene resultados y no es force, saltar
        existing = Result.objects.filter(race=race).count()
        if existing > 0 and not force:
            return existing

        try:
            results_data = self.service.fetch_race_results(self.year, race.round)
        except Exception as e:
            self.stats['errors'].append(f"Results R{race.round}: {e}")
            return 0

        if not results_data:
            return 0

        created_count = 0
        updated_count = 0

        for rd in results_data:
            try:
                driver = Driver.objects.get(driver_id=rd['Driver']['driverId'])
                constructor = Constructor.objects.get(
                    constructor_id=rd['Constructor']['constructorId']
                )

                status_text = rd.get('status', '')
                status = parse_status(status_text)

                final_pos = None
                try:
                    final_pos = int(rd['position'])
                except (ValueError, KeyError, TypeError):
                    pass

                _, created = Result.objects.update_or_create(
                    race=race,
                    driver=driver,
                    defaults={
                        'constructor': constructor,
                        'grid_position': int(rd.get('grid', 0)),
                        'final_position': final_pos,
                        'position_text': rd.get('positionText', 'N/A'),
                        'points': float(rd.get('points', 0)),
                        'laps_completed': int(rd.get('laps', 0)),
                        'status': status,
                        'retirement_reason': get_retirement_reason(status_text) if status != 'finished' else '',
                        'fastest_lap': rd.get('FastestLap', {}).get('lap'),
                        'fastest_lap_time': rd.get('FastestLap', {}).get('Time', {}).get('time'),
                        'fastest_lap_speed': rd.get('FastestLap', {}).get('AverageSpeed', {}).get('speed'),
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            except (Driver.DoesNotExist, Constructor.DoesNotExist):
                continue
            except Exception as e:
                self.stats['errors'].append(f"Result R{race.round} {rd.get('Driver', {}).get('driverId', '?')}: {e}")

        self.stats['results_created'] += created_count
        self.stats['results_updated'] += updated_count
        return created_count + updated_count

    # ─────────────────────────────────────────────────────────────
    #  5. CLASIFICACIÓN (QUALIFYING)
    # ─────────────────────────────────────────────────────────────

    def import_qualifying(self, race: Race, force: bool = False):
        """Importa datos de clasificación Q1/Q2/Q3."""
        existing = Qualifying.objects.filter(race=race).count()
        if existing > 0 and not force:
            return existing

        try:
            qual_data = self.service.fetch_qualifying(self.year, race.round)
        except Exception as e:
            self.stats['errors'].append(f"Qualifying R{race.round}: {e}")
            return 0

        if not qual_data:
            return 0

        count = 0
        for q in qual_data:
            try:
                driver = Driver.objects.get(driver_id=q['Driver']['driverId'])
                constructor = Constructor.objects.get(constructor_id=q['Constructor']['constructorId'])
            except (Driver.DoesNotExist, Constructor.DoesNotExist):
                continue

            _, created = Qualifying.objects.update_or_create(
                race=race,
                driver=driver,
                defaults={
                    'constructor': constructor,
                    'position': int(q.get('position', 0)),
                    'q1_time': q.get('Q1') or None,
                    'q2_time': q.get('Q2') or None,
                    'q3_time': q.get('Q3') or None,
                }
            )
            if created:
                self.stats['qualifying_created'] += 1
            else:
                self.stats['qualifying_updated'] += 1
            count += 1

        return count

    # ─────────────────────────────────────────────────────────────
    #  6. SPRINT
    # ─────────────────────────────────────────────────────────────

    def import_sprint(self, race: Race, force: bool = False):
        """Importa resultados de sprint (si el fin de semana tiene sprint)."""
        existing = Sprint.objects.filter(race=race).count()
        if existing > 0 and not force:
            return existing

        try:
            sprint_data = self.service.fetch_sprint(self.year, race.round)
        except F1APIError:
            return 0  # No es un fin de semana sprint
        except Exception as e:
            self.stats['errors'].append(f"Sprint R{race.round}: {e}")
            return 0

        if not sprint_data:
            return 0

        count = 0
        for s in sprint_data:
            try:
                driver = Driver.objects.get(driver_id=s['Driver']['driverId'])
                constructor = Constructor.objects.get(constructor_id=s['Constructor']['constructorId'])
            except (Driver.DoesNotExist, Constructor.DoesNotExist):
                continue

            status_text = s.get('status', '')
            status = parse_status(status_text)

            final_pos = None
            try:
                final_pos = int(s['position'])
            except (ValueError, KeyError, TypeError):
                pass

            _, created = Sprint.objects.update_or_create(
                race=race,
                driver=driver,
                defaults={
                    'constructor': constructor,
                    'grid_position': int(s.get('grid', 0)),
                    'final_position': final_pos,
                    'position_text': s.get('positionText', 'N/A'),
                    'points': float(s.get('points', 0)),
                    'laps_completed': int(s.get('laps', 0)),
                    'status': status,
                    'retirement_reason': get_retirement_reason(status_text) if status != 'finished' else '',
                    'fastest_lap_time': s.get('FastestLap', {}).get('Time', {}).get('time'),
                }
            )
            if created:
                self.stats['sprints_created'] += 1
            else:
                self.stats['sprints_updated'] += 1
            count += 1

        return count

    # ─────────────────────────────────────────────────────────────
    #  7. PRÁCTICAS LIBRES (FP1, FP2, FP3)
    # ─────────────────────────────────────────────────────────────

    def generate_free_practice(self, race: Race, force: bool = False):
        """
        Genera datos de prácticas libres a partir de la clasificación.
        FP3 es lo más similar a qualy, FP2 y FP1 tienen más variación.
        """
        existing = FreePractice.objects.filter(race=race).count()
        if existing > 0 and not force:
            return existing

        quali = Qualifying.objects.filter(race=race).select_related(
            'driver', 'constructor'
        ).order_by('position')

        if not quali.exists():
            return 0

        random.seed(race.id)  # Determinístico por carrera
        drivers = list(quali)
        count = 0

        for session_name, shuffle_amount in [('FP1', 5), ('FP2', 4), ('FP3', 2)]:
            shuffled = list(drivers)
            for _ in range(shuffle_amount):
                for i in range(len(shuffled) - 1):
                    if random.random() < 0.3:
                        shuffled[i], shuffled[i + 1] = shuffled[i + 1], shuffled[i]

            for pos, q in enumerate(shuffled, 1):
                gap = f"+{random.uniform(0.1, 2.5):.3f}" if pos > 1 else None
                _, created = FreePractice.objects.update_or_create(
                    race=race,
                    driver=q.driver,
                    session=session_name,
                    defaults={
                        'constructor': q.constructor,
                        'position': pos,
                        'best_lap_time': q.q1_time or q.q2_time or q.q3_time,
                        'laps': random.randint(15, 30),
                        'gap_to_leader': gap,
                    }
                )
                if created:
                    self.stats['fp_created'] += 1
                else:
                    self.stats['fp_updated'] += 1
                count += 1

        return count

    # ─────────────────────────────────────────────────────────────
    #  8. DRIVER SEASONS
    # ─────────────────────────────────────────────────────────────

    def update_driver_seasons(self, season_obj: Season):
        """Crea entradas DriverSeason basadas en resultados."""
        print(f"\n  👤 Actualizando DriverSeason...")

        drivers_in_season = Result.objects.filter(
            race__season=self.year
        ).values_list('driver', flat=True).distinct()

        created_count = 0
        for driver_id in drivers_in_season:
            driver = Driver.objects.get(id=driver_id)
            latest_result = Result.objects.filter(
                race__season=self.year, driver=driver
            ).select_related('constructor', 'race').order_by('-race__date', '-race__round').first()

            if not latest_result:
                continue

            _, created = DriverSeason.objects.update_or_create(
                driver=driver,
                season=season_obj,
                constructor=latest_result.constructor,
                defaults={}
            )
            if created:
                created_count += 1
                self.stats['driver_seasons_created'] += 1

        print(f"     ✓ {created_count} nuevos DriverSeason")

    # ─────────────────────────────────────────────────────────────
    #  9. STANDINGS (Clasificaciones del campeonato)
    # ─────────────────────────────────────────────────────────────

    def recalculate_standings(self):
        """Recalcula los standings de pilotos y constructores."""
        print(f"\n  📊 Recalculando standings {self.year}...")
        try:
            stats = ChampionshipService.recalculate_all_standings(self.year)
            total = (stats['driver_created'] + stats['driver_updated'] +
                     stats['constructor_created'] + stats['constructor_updated'])
            self.stats['standings_updated'] += total
            print(f"     ✓ Pilotos: {stats['driver_created']}+{stats['driver_updated']}, "
                  f"Constructores: {stats['constructor_created']}+{stats['constructor_updated']}")
        except Exception as e:
            print(f"     ✗ Error: {e}")
            self.stats['errors'].append(f"Standings: {e}")

    # ─────────────────────────────────────────────────────────────
    #  EJECUCIÓN PRINCIPAL
    # ─────────────────────────────────────────────────────────────

    def update_single_round(self, round_num: int, force: bool = False):
        """Actualiza una sola ronda específica."""
        print(f"\n  🔄 Actualizando Ronda {round_num}...")

        race = Race.objects.filter(season=self.year, round=round_num).first()
        if not race:
            print(f"     ✗ No se encontró la Ronda {round_num}. Importando calendario...")
            self.import_race_schedule()
            race = Race.objects.filter(season=self.year, round=round_num).first()
            if not race:
                print(f"     ✗ La Ronda {round_num} no existe en el calendario {self.year}")
                return

        res = self.import_race_results(race, force)
        qual = self.import_qualifying(race, force)
        spr = self.import_sprint(race, force)
        fp = self.generate_free_practice(race, force)

        print(f"     R{round_num} {race.race_name}: Results={res}, Qual={qual}, Sprint={spr}, FP={fp}")

    def update_all(self, force: bool = False):
        """
        Actualización completa:
        - Equipos y pilotos
        - Calendario
        - Resultados, qualifying, sprint, FP para cada carrera
        - DriverSeasons
        - Standings
        """
        print("=" * 70)
        print(f"  🔄 ACTUALIZACIÓN DE CARRERAS — TEMPORADA {self.year}")
        print(f"  📅 Fecha: {date.today()}")
        print(f"  {'🔨 MODO FORCE' if force else '📥 Solo datos nuevos'}")
        print("=" * 70)

        # 1. Temporada
        season_obj = self.ensure_season()

        # 2. Equipos
        self.setup_teams(season_obj)

        # 3. Pilotos
        self.import_drivers()

        # 4. Calendario
        races = self.import_race_schedule()

        # 5. Para cada carrera: results, qualifying, sprint, FP
        print(f"\n  🏁 Procesando {len(races)} carreras...")
        for race in races:
            res = self.import_race_results(race, force)
            qual = self.import_qualifying(race, force)
            spr = self.import_sprint(race, force)
            fp = self.generate_free_practice(race, force)

            if res > 0 or qual > 0:
                tag = "🏎️ " if res > 0 else "📅"
                print(f"     {tag} R{race.round:02d} {race.race_name}: "
                      f"Results={res}, Qual={qual}, Sprint={spr}, FP={fp}")

        # 6. DriverSeasons
        self.update_driver_seasons(season_obj)

        # 7. Standings
        self.recalculate_standings()

        # Resumen
        self.print_summary()

    def show_status(self):
        """Muestra el estado actual de la data en la base de datos."""
        print("=" * 70)
        print(f"  📊 ESTADO DE LA TEMPORADA {self.year}")
        print("=" * 70)

        races = Race.objects.filter(season=self.year).order_by('round')
        if not races.exists():
            print(f"  ⚠️  No hay carreras cargadas para {self.year}")
            return

        total_results = 0
        total_qual = 0
        total_fp = 0
        total_sprint = 0
        races_with_data = 0

        print(f"\n  {'Rnd':<5}{'Carrera':<35}{'Fecha':<14}{'Res':>5}{'Qual':>6}{'Spr':>5}{'FP':>5}  Estado")
        print("  " + "─" * 85)

        for race in races:
            res = Result.objects.filter(race=race).count()
            qual = Qualifying.objects.filter(race=race).count()
            spr = Sprint.objects.filter(race=race).count()
            fp = FreePractice.objects.filter(race=race).count()

            total_results += res
            total_qual += qual
            total_fp += fp
            total_sprint += spr

            if res > 0:
                races_with_data += 1

            status = "✅ Completa" if res > 0 else ("📅 Programada" if race.date >= date.today() else "⚠️  Sin datos")

            print(f"  R{race.round:<4}{race.race_name:<35}{str(race.date):<14}"
                  f"{res:>5}{qual:>6}{spr:>5}{fp:>5}  {status}")

        print("  " + "─" * 85)
        print(f"  {'TOTAL':<40}{'':<14}{total_results:>5}{total_qual:>6}{total_sprint:>5}{total_fp:>5}")

        dr_seasons = DriverSeason.objects.filter(season__year=self.year).count()
        cs_seasons = ConstructorSeason.objects.filter(season__year=self.year).count()
        standings = ChampionshipStanding.objects.filter(season=self.year).count()

        print(f"\n  DriverSeasons: {dr_seasons}")
        print(f"  ConstructorSeasons: {cs_seasons}")
        print(f"  Standings: {standings}")
        print(f"  Carreras corridas: {races_with_data}/{races.count()}")
        print("=" * 70)

    def print_summary(self):
        """Imprime resumen de la actualización."""
        print("\n" + "=" * 70)
        print("  ✅ ACTUALIZACIÓN COMPLETA — RESUMEN")
        print("=" * 70)
        print(f"  Carreras:       {self.stats['races_created']} nuevas, {self.stats['races_updated']} actualizadas")
        print(f"  Resultados:     {self.stats['results_created']} nuevos, {self.stats['results_updated']} actualizados")
        print(f"  Qualifying:     {self.stats['qualifying_created']} nuevos, {self.stats['qualifying_updated']} actualizados")
        print(f"  Sprint:         {self.stats['sprints_created']} nuevos, {self.stats['sprints_updated']} actualizados")
        print(f"  Free Practice:  {self.stats['fp_created']} nuevos, {self.stats['fp_updated']} actualizados")
        print(f"  Pilotos:        {self.stats['drivers_created']} nuevos")
        print(f"  Equipos:        {self.stats['constructors_created']} nuevos")
        print(f"  DriverSeasons:  {self.stats['driver_seasons_created']} nuevos")
        print(f"  Standings:      {self.stats['standings_updated']} entradas")

        if self.stats['errors']:
            print(f"\n  ⚠️  ERRORES ({len(self.stats['errors'])}):")
            for err in self.stats['errors'][:15]:
                print(f"    - {err}")
        else:
            print(f"\n  ✅ Sin errores!")
        print("=" * 70)


# ═══════════════════════════════════════════════════════════════════
#  PUNTO DE ENTRADA
# ═══════════════════════════════════════════════════════════════════

def main():
    start_time = time.time()

    # Parsear argumentos
    args = sys.argv[1:]

    season_year = 2026
    target_round = None
    force = '--force' in args
    show_status = '--status' in args

    # --season YYYY
    if '--season' in args:
        idx = args.index('--season')
        if idx + 1 < len(args):
            season_year = int(args[idx + 1])

    # --round N
    if '--round' in args:
        idx = args.index('--round')
        if idx + 1 < len(args):
            target_round = int(args[idx + 1])

    updater = RaceUpdater(season_year)

    try:
        if show_status:
            updater.show_status()
        elif target_round:
            updater.ensure_season()
            updater.update_single_round(target_round, force=force)
            updater.recalculate_standings()
            updater.print_summary()
        else:
            updater.update_all(force=force)
    except Exception as e:
        print(f"\n  ✗ ERROR FATAL: {e}")
        traceback.print_exc()

    elapsed = time.time() - start_time
    print(f"\n  ⏱️  Tiempo total: {elapsed:.1f} segundos")


if __name__ == '__main__':
    main()
