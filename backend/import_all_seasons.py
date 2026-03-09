"""
Master F1 Data Import Script — Seasons 2000 to 2026
====================================================

Imports ALL data from the Ergast API (jolpi.ca mirror):
  - Season records
  - Drivers & Constructors
  - Races
  - Race Results (with proper status mapping)
  - Qualifying (Q1/Q2/Q3 from 2006+)
  - Sprint Results (2021+)
  - DriverSeason relationships
  - ConstructorSeason (with historical team colors)
  - Championship Standings (calculated from results)

Usage:
    python import_all_seasons.py                  # Import all 2000-2025
    python import_all_seasons.py 2005             # Import single season
    python import_all_seasons.py 2010 2015        # Import range
    python import_all_seasons.py --skip-existing   # Skip seasons already in DB
"""

import os
import sys
import time
import traceback
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'f1_analytics.settings')
django.setup()

from datetime import datetime
from django.db import transaction
from django.db.models import Q
from core.models import (
    Season, Driver, Constructor, ConstructorSeason, DriverSeason,
    Race, Result, Qualifying, Sprint, ChampionshipStanding
)
from core.services.f1_api_service import F1DataService, F1APIError
from core.services.championship_service import ChampionshipService

# ─────────────────── Historical Team Colors ───────────────────
# Maps constructor_id → {color, secondary} for all known teams across eras
TEAM_COLORS = {
    # Current teams (2024-2026)
    'red_bull':           {'color': '#3671C6', 'secondary': '#FFD700'},
    'ferrari':            {'color': '#E8002D', 'secondary': '#FFEB3B'},
    'mercedes':           {'color': '#27F4D2', 'secondary': '#000000'},
    'mclaren':            {'color': '#FF8000', 'secondary': '#000000'},
    'aston_martin':       {'color': '#229971', 'secondary': '#CEDC00'},
    'alpine':             {'color': '#FF87BC', 'secondary': '#0093CC'},
    'williams':           {'color': '#64C4FF', 'secondary': '#041E42'},
    'rb':                 {'color': '#6692FF', 'secondary': '#FFFFFF'},
    'racing_bulls':       {'color': '#6692FF', 'secondary': '#FFFFFF'},
    'stake':              {'color': '#52E252', 'secondary': '#000000'},
    'haas':               {'color': '#B6BABD', 'secondary': '#E10600'},
    'sauber':             {'color': '#52E252', 'secondary': '#000000'},
    'audi':               {'color': '#1B1B1B', 'secondary': '#E10032'},
    'cadillac':           {'color': '#C4A747', 'secondary': '#1C1C1C'},
    # Recent teams (2019-2023)
    'alphatauri':         {'color': '#4E7C9B', 'secondary': '#FFFFFF'},
    'alfa':               {'color': '#C92D4B', 'secondary': '#000000'},
    'racing_point':       {'color': '#F596C8', 'secondary': '#FFFFFF'},
    'renault':            {'color': '#FFF500', 'secondary': '#000000'},
    'toro_rosso':         {'color': '#469BFF', 'secondary': '#C8102E'},
    # 2010s teams
    'force_india':        {'color': '#F596C8', 'secondary': '#FF8000'},
    'manor':              {'color': '#ED1A3B', 'secondary': '#FFFFFF'},
    'marussia':           {'color': '#ED1A3B', 'secondary': '#000000'},
    'lotus_f1':           {'color': '#FFB800', 'secondary': '#000000'},
    'caterham':           {'color': '#005030', 'secondary': '#FFD700'},
    'hrt':                {'color': '#808080', 'secondary': '#B22222'},
    # 2000s teams
    'brawn':              {'color': '#B0D44A', 'secondary': '#FFFFFF'},
    'toyota':             {'color': '#CC0000', 'secondary': '#FFFFFF'},
    'bmw_sauber':         {'color': '#0066B1', 'secondary': '#FFFFFF'},
    'honda':              {'color': '#FFFFFF', 'secondary': '#CC0000'},
    'super_aguri':        {'color': '#FFFFFF', 'secondary': '#CC0000'},
    'spyker':             {'color': '#FF6600', 'secondary': '#C0C0C0'},
    'midland':            {'color': '#CC0000', 'secondary': '#C6C013'},
    'jordan':             {'color': '#F5D706', 'secondary': '#000000'},
    'minardi':            {'color': '#000000', 'secondary': '#FFD700'},
    'jaguar':             {'color': '#006633', 'secondary': '#C0C0C0'},
    'bar':                {'color': '#FFFFFF', 'secondary': '#CC0000'},
    'prost':              {'color': '#0033CC', 'secondary': '#CC0000'},
    'arrows':             {'color': '#FF6600', 'secondary': '#000000'},
    'benetton':           {'color': '#00A550', 'secondary': '#FFD700'},
    'stewart':            {'color': '#FFFFFF', 'secondary': '#006341'},
    'tyrrell':            {'color': '#0000CC', 'secondary': '#FFFFFF'},
    'lola':               {'color': '#CC0000', 'secondary': '#FFFFFF'},
    # Catch-all for any historical teams
    'lotus':              {'color': '#FFB800', 'secondary': '#000000'},
    'virgin':             {'color': '#ED1A3B', 'secondary': '#000000'},
    'hispania':           {'color': '#808080', 'secondary': '#B22222'},
    'mugello':            {'color': '#808080', 'secondary': '#808080'},
}

# Historical car model names per constructor per year
CAR_MODELS = {
    'red_bull':      {2026: 'RB22', 2025: 'RB21', 2024: 'RB20', 2023: 'RB19', 2022: 'RB18', 2021: 'RB16B', 2020: 'RB16', 2019: 'RB15', 2018: 'RB14', 2017: 'RB13', 2016: 'RB12', 2015: 'RB11', 2014: 'RB10', 2013: 'RB9', 2012: 'RB8', 2011: 'RB7', 2010: 'RB6', 2009: 'RB5', 2008: 'RB4', 2007: 'RB3', 2006: 'RB2', 2005: 'RB1'},
    'ferrari':       {2026: 'SF-26', 2025: 'SF-25', 2024: 'SF-24', 2023: 'SF-23', 2022: 'F1-75', 2021: 'SF21', 2020: 'SF1000', 2019: 'SF90', 2018: 'SF71H', 2017: 'SF70H', 2016: 'SF16-H', 2015: 'SF15-T', 2014: 'F14 T', 2013: 'F138', 2012: 'F2012', 2011: 'F150', 2010: 'F10', 2009: 'F60', 2008: 'F2008', 2007: 'F2007', 2006: 'F248', 2005: 'F2005', 2004: 'F2004', 2003: 'F2003-GA', 2002: 'F2002', 2001: 'F2001', 2000: 'F1-2000'},
    'mercedes':      {2026: 'W17', 2025: 'W16', 2024: 'W15', 2023: 'W14', 2022: 'W13', 2021: 'W12', 2020: 'W11', 2019: 'W10', 2018: 'W09', 2017: 'W08', 2016: 'W07', 2015: 'W06', 2014: 'W05', 2013: 'W04', 2012: 'W03', 2011: 'W02', 2010: 'W01'},
    'mclaren':       {2026: 'MCL40', 2025: 'MCL39', 2024: 'MCL38', 2023: 'MCL60', 2022: 'MCL36', 2021: 'MCL35M', 2020: 'MCL35', 2019: 'MCL34', 2018: 'MCL33', 2017: 'MCL32', 2016: 'MP4-31', 2015: 'MP4-30', 2014: 'MP4-29', 2013: 'MP4-28', 2012: 'MP4-27', 2011: 'MP4-26', 2010: 'MP4-25', 2009: 'MP4-24', 2008: 'MP4-23', 2007: 'MP4-22', 2006: 'MP4-21', 2005: 'MP4-20', 2004: 'MP4-19', 2003: 'MP4-17D', 2002: 'MP4-17', 2001: 'MP4-16', 2000: 'MP4-15'},
    'williams':      {2026: 'FW48', 2025: 'FW47', 2024: 'FW46', 2023: 'FW45', 2022: 'FW44', 2021: 'FW43B', 2020: 'FW43', 2019: 'FW42', 2018: 'FW41', 2017: 'FW40', 2016: 'FW38', 2015: 'FW37', 2014: 'FW36', 2013: 'FW35', 2012: 'FW34', 2011: 'FW33', 2010: 'FW32', 2009: 'FW31', 2008: 'FW30', 2007: 'FW29', 2006: 'FW28', 2005: 'FW27', 2004: 'FW26', 2003: 'FW25', 2002: 'FW24', 2001: 'FW23', 2000: 'FW22'},
    'alpine':        {2026: 'A526', 2025: 'A525', 2024: 'A524', 2023: 'A523', 2022: 'A522', 2021: 'A521'},
    'aston_martin':  {2026: 'AMR26', 2025: 'AMR25', 2024: 'AMR24', 2023: 'AMR23', 2022: 'AMR22', 2021: 'AMR21'},
    'rb':            {2025: 'VCARB 02', 2024: 'VCARB 01'},
    'racing_bulls':  {2026: 'VCARB 03'},
    'haas':          {2026: 'VF-26', 2025: 'VF-25', 2024: 'VF-24', 2023: 'VF-23', 2022: 'VF-22', 2021: 'VF-21', 2020: 'VF-20', 2019: 'VF-19', 2018: 'VF-18', 2017: 'VF-17', 2016: 'VF-16'},
    'stake':         {2024: 'C44'},
    'sauber':        {2025: 'C45', 2023: 'C43', 2022: 'C42', 2019: 'C38', 2018: 'C37', 2017: 'C36', 2016: 'C35', 2015: 'C34', 2014: 'C33', 2013: 'C32', 2012: 'C31', 2011: 'C30', 2010: 'C29', 2009: 'C28', 2008: 'C27', 2007: 'C26', 2006: 'C25', 2005: 'C24', 2004: 'C23', 2003: 'C22', 2002: 'C21', 2001: 'C20', 2000: 'C19'},
    'audi':          {2026: 'A26'},
    'cadillac':      {2026: 'CAD-01'},
    'alphatauri':    {2023: 'AT04', 2022: 'AT03', 2021: 'AT02', 2020: 'AT01'},
    'alfa':          {2023: 'C43', 2022: 'C42', 2021: 'C41', 2020: 'C39', 2019: 'C38'},
    'toro_rosso':    {2019: 'STR14', 2018: 'STR13', 2017: 'STR12', 2016: 'STR11', 2015: 'STR10', 2014: 'STR9', 2013: 'STR8', 2012: 'STR7', 2011: 'STR6', 2010: 'STR5', 2009: 'STR4', 2008: 'STR3', 2007: 'STR2', 2006: 'STR1'},
    'renault':       {2020: 'RS20', 2019: 'RS19', 2018: 'RS18', 2017: 'RS17', 2016: 'RS16', 2009: 'R29', 2008: 'R28', 2007: 'R27', 2006: 'R26', 2005: 'R25', 2004: 'R24', 2003: 'R23', 2002: 'R202', 2001: 'R201', 2000: 'R20'},
    'racing_point':  {2020: 'RP20', 2019: 'RP19'},
    'force_india':   {2018: 'VJM11', 2017: 'VJM10', 2016: 'VJM09', 2015: 'VJM08', 2014: 'VJM07', 2013: 'VJM06', 2012: 'VJM05', 2011: 'VJM04', 2010: 'VJM03', 2009: 'VJM02', 2008: 'VJM01'},
    'brawn':         {2009: 'BGP 001'},
    'toyota':        {2009: 'TF109', 2008: 'TF108', 2007: 'TF107', 2006: 'TF106', 2005: 'TF105', 2004: 'TF104', 2003: 'TF103', 2002: 'TF102'},
    'bmw_sauber':    {2009: 'F1.09', 2008: 'F1.08', 2007: 'F1.07', 2006: 'F1.06'},
    'honda':         {2008: 'RA108', 2007: 'RA107', 2006: 'RA106'},
    'super_aguri':   {2008: 'SA08', 2007: 'SA07', 2006: 'SA06'},
    'spyker':        {2007: 'F8-VII'},
    'midland':       {2006: 'M16'},
    'jordan':        {2005: 'EJ15', 2004: 'EJ14', 2003: 'EJ13', 2002: 'EJ12', 2001: 'EJ11', 2000: 'EJ10'},
    'minardi':       {2005: 'PS05', 2004: 'PS04B', 2003: 'PS03', 2002: 'PS02', 2001: 'PS01', 2000: 'M02'},
    'jaguar':        {2004: 'R5', 2003: 'R4', 2002: 'R3', 2001: 'R2', 2000: 'R1'},
    'bar':           {2005: 'BAR 007', 2004: 'BAR 006', 2003: 'BAR 005', 2002: 'BAR 004', 2001: 'BAR 003', 2000: 'BAR 002'},
    'prost':         {2001: 'AP04', 2000: 'AP03'},
    'arrows':        {2002: 'A23', 2001: 'A22', 2000: 'A21'},
    'benetton':      {2001: 'B201', 2000: 'B200'},
    'manor':         {2016: 'MRT05'},
    'marussia':      {2015: 'MR03', 2014: 'MR03', 2013: 'MR02', 2012: 'MR01', 2011: 'MVR-02', 2010: 'VR-01'},
    'lotus_f1':      {2015: 'E23', 2014: 'E22', 2013: 'E21', 2012: 'E20'},
    'caterham':      {2014: 'CT05', 2013: 'CT03', 2012: 'CT01'},
    'hrt':           {2012: 'F112', 2011: 'F111', 2010: 'F110'},
    'virgin':        {2011: 'MVR-02', 2010: 'VR-01'},
}


def parse_status(status_text: str) -> str:
    """Map Ergast API status text to our model status choices."""
    if not status_text:
        return 'finished'
    
    status_lower = status_text.lower().strip()
    
    # Finished variations
    if status_lower in ('finished', '+1 lap', '+2 laps', '+3 laps', '+4 laps',
                        '+5 laps', '+6 laps', '+7 laps', '+8 laps', '+9 laps',
                        '+10 laps', '+11 laps', '+12 laps'):
        return 'finished'
    
    # Lapped — check for "+N Lap" pattern
    if status_lower.startswith('+') and 'lap' in status_lower:
        return 'finished'
    
    # DSQ
    if 'disqualif' in status_lower or 'excluded' in status_lower or 'irregular' in status_lower:
        return 'dsq'
    
    # DNS 
    if 'not start' in status_lower or status_lower == 'dns' or 'withdrew' in status_lower:
        return 'dns'
    
    # Everything else is a retirement
    return 'retired'


def get_retirement_reason(status_text: str) -> str:
    """Extract retirement reason from Ergast status text."""
    if not status_text:
        return ''
    
    status = parse_status(status_text)
    if status == 'finished':
        return ''
    
    # The status text IS the reason (Engine, Gearbox, Collision, etc.)
    return status_text


# ─────────────────── Main Import Functions ───────────────────

class MultiSeasonImporter:
    def __init__(self):
        self.service = F1DataService()
        self.stats = {
            'seasons_created': 0,
            'drivers_created': 0,
            'constructors_created': 0,
            'races_created': 0,
            'results_created': 0,
            'results_updated': 0,
            'qualifying_created': 0,
            'qualifying_updated': 0,
            'sprints_created': 0,
            'sprints_updated': 0,
            'driver_seasons_created': 0,
            'constructor_seasons_created': 0,
            'standings_created': 0,
            'errors': [],
        }
    
    def import_season(self, year: int, skip_existing: bool = False):
        """Import all data for a single season."""
        print(f"\n{'='*70}")
        print(f"  SEASON {year}")
        print(f"{'='*70}")
        
        # Step 1: Create Season record
        season_obj, created = Season.objects.get_or_create(
            year=year,
            defaults={'is_active': (year == 2026)}
        )
        if created:
            self.stats['seasons_created'] += 1
            print(f"  [+] Created Season {year}")
        else:
            print(f"  [=] Season {year} exists")
        
        # Step 2: Import drivers
        self._import_drivers(year)
        
        # Step 3: Import constructors
        self._import_constructors(year)
        
        # Step 4: Import races + results
        races = self._import_races(year, skip_existing)
        
        # Step 5: Import qualifying
        self._import_qualifying(year, races)
        
        # Step 6: Import sprints (2021+)
        if year >= 2021:
            self._import_sprints(year, races)
        
        # Step 7: Create DriverSeason entries
        self._create_driver_seasons(year, season_obj)
        
        # Step 8: Create ConstructorSeason entries
        self._create_constructor_seasons(year, season_obj)
        
        # Step 9: Calculate championship standings
        self._calculate_standings(year)
        
        print(f"\n  ✅ Season {year} complete!")
    
    def _import_drivers(self, year: int):
        """Import all drivers who participated in this season."""
        print(f"\n  📋 Importing drivers for {year}...")
        try:
            drivers_data = self.service.fetch_drivers(year)
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
            print(f"     ✓ {created_count} new drivers ({len(drivers_data)} total)")
        except Exception as e:
            print(f"     ✗ Error importing drivers: {e}")
            self.stats['errors'].append(f"Drivers {year}: {e}")
    
    def _import_constructors(self, year: int):
        """Import all constructors for this season."""
        print(f"  🏭 Importing constructors for {year}...")
        try:
            constructors_data = self.service.fetch_constructors(year)
            created_count = 0
            for c in constructors_data:
                # Set team colors from our color dictionary
                colors = TEAM_COLORS.get(c['constructorId'], {})
                _, created = Constructor.objects.update_or_create(
                    constructor_id=c['constructorId'],
                    defaults={
                        'name': c['name'],
                        'nationality': c['nationality'],
                        'url': c.get('url', ''),
                        'team_color': colors.get('color'),
                        'team_color_secondary': colors.get('secondary'),
                    }
                )
                if created:
                    created_count += 1
                    self.stats['constructors_created'] += 1
            print(f"     ✓ {created_count} new constructors ({len(constructors_data)} total)")
        except Exception as e:
            print(f"     ✗ Error importing constructors: {e}")
            self.stats['errors'].append(f"Constructors {year}: {e}")
    
    def _import_races(self, year: int, skip_existing: bool) -> list:
        """Import all races and results for this season."""
        print(f"  🏁 Importing races for {year}...")
        try:
            races_data = self.service.fetch_races(year)
        except Exception as e:
            print(f"     ✗ Error fetching races: {e}")
            self.stats['errors'].append(f"Races {year}: {e}")
            return []
        
        race_objects = []
        for race_data in races_data:
            try:
                race = self._import_single_race(race_data, year)
                race_objects.append(race)
                
                # Check if we should skip results import
                if skip_existing:
                    existing = Result.objects.filter(race=race).count()
                    if existing > 0:
                        print(f"     = Round {race.round}: {race.race_name} (skipped, {existing} results exist)")
                        continue
                
                # Import results 
                self._import_results(year, int(race_data['round']), race)
                
            except Exception as e:
                print(f"     ✗ Error on round {race_data.get('round', '?')}: {e}")
                self.stats['errors'].append(f"Race {year} R{race_data.get('round', '?')}: {e}")
        
        print(f"     ✓ {len(race_objects)} races processed")
        return race_objects
    
    def _import_single_race(self, race_data: dict, year: int) -> Race:
        """Import a single race record."""
        circuit = race_data['Circuit']
        
        race_time = None
        if 'time' in race_data:
            try:
                race_time = datetime.strptime(race_data['time'], '%H:%M:%SZ').time()
            except ValueError:
                pass
        
        race, created = Race.objects.update_or_create(
            race_id=f"{year}_{race_data['round']}",
            defaults={
                'season': year,
                'round': int(race_data['round']),
                'race_name': race_data['raceName'],
                'circuit_id': circuit['circuitId'],
                'circuit_name': circuit['circuitName'],
                'locality': circuit['Location']['locality'],
                'country': circuit['Location']['country'],
                'date': race_data['date'],
                'time': race_time,
                'url': race_data.get('url', ''),
            }
        )
        if created:
            self.stats['races_created'] += 1
        return race
    
    def _import_results(self, year: int, round_num: int, race: Race):
        """Import race results for a specific race."""
        try:
            results_data = self.service.fetch_race_results(year, round_num)
        except Exception as e:
            print(f"       ✗ Error fetching results R{round_num}: {e}")
            self.stats['errors'].append(f"Results {year} R{round_num}: {e}")
            return
        
        created_count = 0
        updated_count = 0
        
        for result_data in results_data:
            try:
                driver = Driver.objects.get(driver_id=result_data['Driver']['driverId'])
                constructor = Constructor.objects.get(
                    constructor_id=result_data['Constructor']['constructorId']
                )
                
                status_text = result_data.get('status', '')
                status = parse_status(status_text)
                retirement_reason = get_retirement_reason(status_text)
                
                # Handle position 
                final_pos = None
                try:
                    final_pos = int(result_data['position'])
                except (ValueError, KeyError, TypeError):
                    pass
                
                result, created = Result.objects.update_or_create(
                    race=race,
                    driver=driver,
                    defaults={
                        'constructor': constructor,
                        'grid_position': int(result_data.get('grid', 0)),
                        'final_position': final_pos,
                        'position_text': result_data.get('positionText', 'N/A'),
                        'points': float(result_data.get('points', 0)),
                        'laps_completed': int(result_data.get('laps', 0)),
                        'status': status,
                        'retirement_reason': retirement_reason if status in ('retired', 'dsq', 'dns', 'dnf') else '',
                        'fastest_lap': result_data.get('FastestLap', {}).get('lap'),
                        'fastest_lap_time': result_data.get('FastestLap', {}).get('Time', {}).get('time'),
                        'fastest_lap_speed': result_data.get('FastestLap', {}).get('AverageSpeed', {}).get('speed'),
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                    
            except (Driver.DoesNotExist, Constructor.DoesNotExist) as e:
                continue
            except Exception as e:
                self.stats['errors'].append(f"Result {year} R{round_num} {result_data.get('Driver', {}).get('driverId', '?')}: {e}")
        
        self.stats['results_created'] += created_count
        self.stats['results_updated'] += updated_count
        print(f"     Round {race.round}: {race.race_name} — {created_count + updated_count} results")
    
    def _import_qualifying(self, year: int, races: list):
        """Import qualifying data for all races in a season."""
        print(f"  ⏱️  Importing qualifying for {year}...")
        
        total_created = 0
        total_updated = 0
        skipped = 0
        
        for race in races:
            try:
                api_qualifying = self.service.fetch_qualifying(year, race.round)
                
                if not api_qualifying:
                    skipped += 1
                    continue
                
                for q_data in api_qualifying:
                    driver_id = q_data.get('Driver', {}).get('driverId', '')
                    constructor_id = q_data.get('Constructor', {}).get('constructorId', '')
                    
                    try:
                        driver = Driver.objects.get(driver_id=driver_id)
                        constructor = Constructor.objects.get(constructor_id=constructor_id)
                    except (Driver.DoesNotExist, Constructor.DoesNotExist):
                        continue
                    
                    qualifying, created = Qualifying.objects.update_or_create(
                        race=race,
                        driver=driver,
                        defaults={
                            'constructor': constructor,
                            'position': int(q_data.get('position', 0)),
                            'q1_time': q_data.get('Q1') or None,
                            'q2_time': q_data.get('Q2') or None,
                            'q3_time': q_data.get('Q3') or None,
                        }
                    )
                    if created:
                        total_created += 1
                    else:
                        total_updated += 1
                        
            except Exception as e:
                self.stats['errors'].append(f"Qualifying {year} R{race.round}: {e}")
        
        self.stats['qualifying_created'] += total_created
        self.stats['qualifying_updated'] += total_updated
        print(f"     ✓ {total_created} created, {total_updated} updated, {skipped} races without qualifying data")
    
    def _import_sprints(self, year: int, races: list):
        """Import sprint race results (2021+)."""
        print(f"  🏃 Importing sprints for {year}...")
        
        total_created = 0
        total_updated = 0
        sprint_races = 0
        
        for race in races:
            try:
                sprint_data = self.service.fetch_sprint(year, race.round)
                
                if not sprint_data:
                    continue
                
                sprint_races += 1
                
                for s_data in sprint_data:
                    driver_id = s_data.get('Driver', {}).get('driverId', '')
                    constructor_id = s_data.get('Constructor', {}).get('constructorId', '')
                    
                    try:
                        driver = Driver.objects.get(driver_id=driver_id)
                        constructor = Constructor.objects.get(constructor_id=constructor_id)
                    except (Driver.DoesNotExist, Constructor.DoesNotExist):
                        continue
                    
                    status_text = s_data.get('status', '')
                    status = parse_status(status_text)
                    
                    final_pos = None
                    try:
                        final_pos = int(s_data['position'])
                    except (ValueError, KeyError, TypeError):
                        pass
                    
                    sprint, created = Sprint.objects.update_or_create(
                        race=race,
                        driver=driver,
                        defaults={
                            'constructor': constructor,
                            'grid_position': int(s_data.get('grid', 0)),
                            'final_position': final_pos,
                            'position_text': s_data.get('positionText', 'N/A'),
                            'points': float(s_data.get('points', 0)),
                            'laps_completed': int(s_data.get('laps', 0)),
                            'status': status,
                            'retirement_reason': get_retirement_reason(status_text) if status != 'finished' else '',
                            'fastest_lap_time': s_data.get('FastestLap', {}).get('Time', {}).get('time'),
                        }
                    )
                    if created:
                        total_created += 1
                    else:
                        total_updated += 1
                        
            except F1APIError:
                # Sprint endpoint returns 4xx for non-sprint races — expected
                continue
            except Exception as e:
                self.stats['errors'].append(f"Sprint {year} R{race.round}: {e}")
        
        self.stats['sprints_created'] += total_created
        self.stats['sprints_updated'] += total_updated
        print(f"     ✓ {sprint_races} sprint races, {total_created} created, {total_updated} updated")
    
    def _create_driver_seasons(self, year: int, season_obj: Season):
        """Create DriverSeason entries based on imported results."""
        print(f"  👤 Creating DriverSeason entries for {year}...")
        
        drivers_in_season = Result.objects.filter(
            race__season=year
        ).values_list('driver', flat=True).distinct()
        
        created_count = 0
        for driver_id in drivers_in_season:
            driver = Driver.objects.get(id=driver_id)
            latest_result = Result.objects.filter(
                race__season=year,
                driver=driver
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
        
        print(f"     ✓ {created_count} new DriverSeason entries")
    
    def _create_constructor_seasons(self, year: int, season_obj: Season):
        """Create ConstructorSeason entries with team colors and car models."""
        print(f"  🏎️  Creating ConstructorSeason entries for {year}...")
        
        constructors_in_season = Result.objects.filter(
            race__season=year
        ).values_list('constructor', flat=True).distinct()
        
        created_count = 0
        for constructor_id in constructors_in_season:
            constructor = Constructor.objects.get(id=constructor_id)
            
            colors = TEAM_COLORS.get(constructor.constructor_id, {})
            car_models = CAR_MODELS.get(constructor.constructor_id, {})
            car_model = car_models.get(year)
            
            _, created = ConstructorSeason.objects.update_or_create(
                constructor=constructor,
                season=season_obj,
                defaults={
                    'car_model': car_model,
                    'team_color': colors.get('color'),
                    'team_color_secondary': colors.get('secondary'),
                }
            )
            if created:
                created_count += 1
                self.stats['constructor_seasons_created'] += 1
        
        print(f"     ✓ {created_count} new ConstructorSeason entries")
    
    def _calculate_standings(self, year: int):
        """Calculate championship standings from results."""
        print(f"  📊 Calculating standings for {year}...")
        try:
            stats = ChampionshipService.recalculate_all_standings(year)
            total = (stats['driver_created'] + stats['driver_updated'] +
                     stats['constructor_created'] + stats['constructor_updated'])
            self.stats['standings_created'] += total
            print(f"     ✓ Drivers: {stats['driver_created']}+{stats['driver_updated']}, "
                  f"Constructors: {stats['constructor_created']}+{stats['constructor_updated']}")
        except Exception as e:
            print(f"     ✗ Error calculating standings: {e}")
            self.stats['errors'].append(f"Standings {year}: {e}")
    
    def print_summary(self):
        """Print final import summary."""
        print("\n" + "=" * 70)
        print("  IMPORT COMPLETE — SUMMARY")
        print("=" * 70)
        print(f"  Seasons created:            {self.stats['seasons_created']}")
        print(f"  Drivers created:            {self.stats['drivers_created']}")
        print(f"  Constructors created:       {self.stats['constructors_created']}")
        print(f"  Races created:              {self.stats['races_created']}")
        print(f"  Results created/updated:    {self.stats['results_created']} / {self.stats['results_updated']}")
        print(f"  Qualifying created/updated: {self.stats['qualifying_created']} / {self.stats['qualifying_updated']}")
        print(f"  Sprints created/updated:    {self.stats['sprints_created']} / {self.stats['sprints_updated']}")
        print(f"  DriverSeason entries:       {self.stats['driver_seasons_created']}")
        print(f"  ConstructorSeason entries:  {self.stats['constructor_seasons_created']}")
        print(f"  Standings entries:          {self.stats['standings_created']}")
        
        if self.stats['errors']:
            print(f"\n  ⚠️  ERRORS ({len(self.stats['errors'])}):")
            for err in self.stats['errors'][:20]:
                print(f"    - {err}")
            if len(self.stats['errors']) > 20:
                print(f"    ... and {len(self.stats['errors']) - 20} more")
        else:
            print(f"\n  ✅ No errors!")
        print("=" * 70)


def main():
    start_time = time.time()
    
    # Parse args
    args = sys.argv[1:]
    skip_existing = '--skip-existing' in args
    args = [a for a in args if not a.startswith('--')]
    
    if len(args) == 0:
        start_year, end_year = 2000, 2026
    elif len(args) == 1:
        start_year = end_year = int(args[0])
    elif len(args) == 2:
        start_year, end_year = int(args[0]), int(args[1])
    else:
        print("Usage: python import_all_seasons.py [start_year] [end_year] [--skip-existing]")
        sys.exit(1)
    
    print("=" * 70)
    print(f"  F1 DATA IMPORT — Seasons {start_year} to {end_year}")
    print(f"  Skip existing: {skip_existing}")
    print("=" * 70)
    
    importer = MultiSeasonImporter()
    
    for year in range(start_year, end_year + 1):
        try:
            importer.import_season(year, skip_existing=skip_existing)
        except Exception as e:
            print(f"\n  ✗ FATAL ERROR on season {year}: {e}")
            traceback.print_exc()
            importer.stats['errors'].append(f"FATAL {year}: {e}")
    
    elapsed = time.time() - start_time
    importer.print_summary()
    print(f"\n  Total time: {elapsed/60:.1f} minutes")


if __name__ == '__main__':
    main()
