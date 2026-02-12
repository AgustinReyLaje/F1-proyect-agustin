"""
Django management command to import F1 data from the Ergast API.

Usage:
    python manage.py import_f1_data --season 2024
    python manage.py import_f1_data --season 2024 --round 1
    python manage.py import_f1_data --season 2024 --calculate-standings
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from core.services.f1_api_service import F1DataService, F1APIError
from core.services.championship_service import ChampionshipService
from core.models import Driver, Constructor, Race, Result
from datetime import datetime
import logging


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Import F1 data from Ergast API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--season',
            type=int,
            required=True,
            help='Season year to import (e.g., 2024)'
        )
        parser.add_argument(
            '--round',
            type=int,
            help='Specific round to import (optional)'
        )
        parser.add_argument(
            '--drivers',
            action='store_true',
            help='Import only drivers'
        )
        parser.add_argument(
            '--constructors',
            action='store_true',
            help='Import only constructors'
        )
        parser.add_argument(
            '--races',
            action='store_true',
            help='Import only races'
        )
        parser.add_argument(
            '--calculate-standings',
            action='store_true',
            help='Calculate championship standings after import'
        )
        parser.add_argument(
            '--recalculate-all',
            action='store_true',
            help='Recalculate all standings for the season'
        )

    def handle(self, *args, **options):
        season = options['season']
        round_num = options.get('round')
        calculate_standings = options.get('calculate_standings', False)
        recalculate_all = options.get('recalculate_all', False)
        
        service = F1DataService()
        
        try:
            # Handle recalculate-all flag
            if recalculate_all:
                self.stdout.write(f'Recalculating all standings for season {season}...')
                stats = ChampionshipService.recalculate_all_standings(season)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Recalculated standings:\n'
                        f'  - Drivers: {stats["driver_created"]} created, {stats["driver_updated"]} updated\n'
                        f'  - Constructors: {stats["constructor_created"]} created, {stats["constructor_updated"]} updated'
                    )
                )
                return
            
            # If specific flags are set, only import those
            import_all = not any([
                options['drivers'],
                options['constructors'],
                options['races']
            ])
            
            if import_all or options['drivers']:
                self.import_drivers(service, season)
            
            if import_all or options['constructors']:
                self.import_constructors(service, season)
            
            if import_all or options['races']:
                self.import_races(service, season, round_num)
            
            # Calculate standings if requested
            if calculate_standings:
                self.calculate_standings(season, round_num)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully imported F1 data for season {season}')
            )
            
        except F1APIError as e:
            raise CommandError(f'Failed to fetch data from API: {str(e)}')
        except Exception as e:
            logger.exception("Unexpected error during import")
            raise CommandError(f'Unexpected error: {str(e)}')

    def import_drivers(self, service: F1DataService, season: int):
        """Import drivers for the specified season"""
        self.stdout.write(f'Importing drivers for season {season}...')
        
        drivers_data = service.fetch_drivers(season)
        imported = 0
        
        for driver_data in drivers_data:
            driver, created = Driver.objects.update_or_create(
                driver_id=driver_data['driverId'],
                defaults={
                    'number': driver_data.get('permanentNumber'),
                    'code': driver_data.get('code', ''),
                    'first_name': driver_data['givenName'],
                    'last_name': driver_data['familyName'],
                    'date_of_birth': driver_data.get('dateOfBirth'),
                    'nationality': driver_data['nationality'],
                    'url': driver_data.get('url', ''),
                }
            )
            if created:
                imported += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Imported {imported} new drivers (total: {len(drivers_data)})')
        )

    def import_constructors(self, service: F1DataService, season: int):
        """Import constructors for the specified season"""
        self.stdout.write(f'Importing constructors for season {season}...')
        
        constructors_data = service.fetch_constructors(season)
        imported = 0
        
        for constructor_data in constructors_data:
            constructor, created = Constructor.objects.update_or_create(
                constructor_id=constructor_data['constructorId'],
                defaults={
                    'name': constructor_data['name'],
                    'nationality': constructor_data['nationality'],
                    'url': constructor_data.get('url', ''),
                }
            )
            if created:
                imported += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'  ✓ Imported {imported} new constructors (total: {len(constructors_data)})')
        )

    def import_races(self, service: F1DataService, season: int, round_num: int = None):
        """Import races and results for the specified season"""
        self.stdout.write(f'Importing races for season {season}...')
        
        races_data = service.fetch_races(season)
        
        if round_num:
            races_data = [r for r in races_data if int(r['round']) == round_num]
        
        imported_races = 0
        imported_results = 0
        
        for race_data in races_data:
            race, created = self._import_race(race_data, season)
            if created:
                imported_races += 1
            
            # Import results for this race
            results_count = self._import_results(
                service, 
                season, 
                int(race_data['round']), 
                race
            )
            imported_results += results_count
        
        self.stdout.write(
            self.style.SUCCESS(
                f'  ✓ Imported {imported_races} new races and {imported_results} results'
            )
        )

    def _import_race(self, race_data: dict, season: int) -> tuple:
        """Import a single race"""
        circuit = race_data['Circuit']
        
        # Parse time if available
        race_time = None
        if 'time' in race_data:
            try:
                race_time = datetime.strptime(race_data['time'], '%H:%M:%SZ').time()
            except ValueError:
                pass
        
        race, created = Race.objects.update_or_create(
            race_id=f"{season}_{race_data['round']}",
            defaults={
                'season': season,
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
        
        return race, created

    def _import_results(self, service: F1DataService, season: int, round_num: int, race: Race) -> int:
        """Import results for a specific race"""
        results_data = service.fetch_race_results(season, round_num)
        imported = 0
        
        for result_data in results_data:
            try:
                driver = Driver.objects.get(driver_id=result_data['Driver']['driverId'])
                constructor = Constructor.objects.get(
                    constructor_id=result_data['Constructor']['constructorId']
                )
                
                # Parse status
                status = 'finished'
                status_text = result_data.get('status', '').lower()
                if 'retire' in status_text or 'engine' in status_text or 'collision' in status_text:
                    status = 'retired'
                elif 'disqualif' in status_text:
                    status = 'dsq'
                
                result, created = Result.objects.update_or_create(
                    race=race,
                    driver=driver,
                    defaults={
                        'constructor': constructor,
                        'grid_position': int(result_data['grid']),
                        'final_position': int(result_data['position']) if result_data.get('position') else None,
                        'position_text': result_data.get('positionText', 'N/A'),
                        'points': float(result_data.get('points', 0)),
                        'laps_completed': int(result_data.get('laps', 0)),
                        'status': status,
                        'fastest_lap': result_data.get('FastestLap', {}).get('lap'),
                        'fastest_lap_time': result_data.get('FastestLap', {}).get('Time', {}).get('time'),
                        'fastest_lap_speed': result_data.get('FastestLap', {}).get('AverageSpeed', {}).get('speed'),
                    }
                )
                
                if created:
                    imported += 1
                    
            except (Driver.DoesNotExist, Constructor.DoesNotExist) as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠ Skipping result: {str(e)}')
                )
                continue
        
        return imported

    def calculate_standings(self, season: int, round_num: int = None):
        """Calculate championship standings"""
        self.stdout.write(f'Calculating championship standings...')
        
        try:
            if round_num:
                # Calculate standings for specific round
                dc, du = ChampionshipService.save_driver_standings(season, round_num)
                cc, cu = ChampionshipService.save_constructor_standings(season, round_num)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Calculated standings for round {round_num}:\n'
                        f'    - Drivers: {dc} created, {du} updated\n'
                        f'    - Constructors: {cc} created, {cu} updated'
                    )
                )
            else:
                # Recalculate all standings for the season
                stats = ChampionshipService.recalculate_all_standings(season)
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ Recalculated all standings:\n'
                        f'    - Drivers: {stats["driver_created"]} created, {stats["driver_updated"]} updated\n'
                        f'    - Constructors: {stats["constructor_created"]} created, {stats["constructor_updated"]} updated'
                    )
                )
        except Exception as e:
            logger.exception("Error calculating standings")
            self.stdout.write(
                self.style.ERROR(f'  ✗ Failed to calculate standings: {str(e)}')
            )
