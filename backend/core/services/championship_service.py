"""
Championship Standings Calculation Service

This service handles all business logic related to calculating
and managing championship standings for drivers and constructors.
"""

import logging
from typing import List, Dict, Tuple
from django.db import transaction
from django.db.models import Sum, Count, Q
from core.models import Result, ChampionshipStanding, Driver, Constructor, Race


logger = logging.getLogger(__name__)


class ChampionshipService:
    """
    Service class for calculating and managing championship standings.
    
    This separates business logic from views and models, following
    clean architecture principles.
    """
    
    @staticmethod
    def calculate_driver_standings(season: int, up_to_round: int = None) -> List[Dict]:
        """
        Calculate driver championship standings for a season.
        
        Args:
            season: The season year
            up_to_round: Calculate up to this round (None = all races)
            
        Returns:
            List of standing dictionaries with driver info and points
        """
        logger.info(f"Calculating driver standings for season {season}, up to round {up_to_round}")
        
        # Build query filters
        filters = Q(race__season=season)
        if up_to_round:
            filters &= Q(race__round__lte=up_to_round)
        
        # Aggregate points and wins per driver
        standings = (
            Result.objects
            .filter(filters)
            .values('driver', 'driver__first_name', 'driver__last_name', 'driver__driver_id')
            .annotate(
                total_points=Sum('points'),
                total_wins=Count('id', filter=Q(final_position=1)),
                races_count=Count('race', distinct=True)
            )
            .order_by('-total_points', '-total_wins')
        )
        
        # Add position
        result = []
        for position, standing in enumerate(standings, start=1):
            result.append({
                'position': position,
                'driver_id': standing['driver'],
                'driver_name': f"{standing['driver__first_name']} {standing['driver__last_name']}",
                'points': standing['total_points'] or 0.0,
                'wins': standing['total_wins'],
                'races': standing['races_count'],
            })
        
        return result
    
    @staticmethod
    def calculate_constructor_standings(season: int, up_to_round: int = None) -> List[Dict]:
        """
        Calculate constructor championship standings for a season.
        
        Args:
            season: The season year
            up_to_round: Calculate up to this round (None = all races)
            
        Returns:
            List of standing dictionaries with constructor info and points
        """
        logger.info(f"Calculating constructor standings for season {season}, up to round {up_to_round}")
        
        # Build query filters
        filters = Q(race__season=season)
        if up_to_round:
            filters &= Q(race__round__lte=up_to_round)
        
        # Aggregate points and wins per constructor
        standings = (
            Result.objects
            .filter(filters)
            .values('constructor', 'constructor__name', 'constructor__constructor_id')
            .annotate(
                total_points=Sum('points'),
                total_wins=Count('id', filter=Q(final_position=1)),
                races_count=Count('race', distinct=True)
            )
            .order_by('-total_points', '-total_wins')
        )
        
        # Add position
        result = []
        for position, standing in enumerate(standings, start=1):
            result.append({
                'position': position,
                'constructor_id': standing['constructor'],
                'constructor_name': standing['constructor__name'],
                'points': standing['total_points'] or 0.0,
                'wins': standing['total_wins'],
                'races': standing['races_count'],
            })
        
        return result
    
    @staticmethod
    @transaction.atomic
    def save_driver_standings(season: int, up_to_round: int = None) -> Tuple[int, int]:
        """
        Calculate and save driver standings to the database.
        
        Args:
            season: The season year
            up_to_round: Calculate up to this round (None = all races)
            
        Returns:
            Tuple of (created_count, updated_count)
        """
        round_num = up_to_round or 0  # 0 means season total
        standings = ChampionshipService.calculate_driver_standings(season, up_to_round)
        
        created = 0
        updated = 0
        
        for standing in standings:
            driver = Driver.objects.get(id=standing['driver_id'])
            
            obj, is_created = ChampionshipStanding.objects.update_or_create(
                season=season,
                standing_type='driver',
                round=round_num,
                driver=driver,
                defaults={
                    'position': standing['position'],
                    'points': standing['points'],
                    'wins': standing['wins'],
                }
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        logger.info(f"Saved driver standings: {created} created, {updated} updated")
        return created, updated
    
    @staticmethod
    @transaction.atomic
    def save_constructor_standings(season: int, up_to_round: int = None) -> Tuple[int, int]:
        """
        Calculate and save constructor standings to the database.
        
        Args:
            season: The season year
            up_to_round: Calculate up to this round (None = all races)
            
        Returns:
            Tuple of (created_count, updated_count)
        """
        round_num = up_to_round or 0  # 0 means season total
        standings = ChampionshipService.calculate_constructor_standings(season, up_to_round)
        
        created = 0
        updated = 0
        
        for standing in standings:
            constructor = Constructor.objects.get(id=standing['constructor_id'])
            
            obj, is_created = ChampionshipStanding.objects.update_or_create(
                season=season,
                standing_type='constructor',
                round=round_num,
                constructor=constructor,
                defaults={
                    'position': standing['position'],
                    'points': standing['points'],
                    'wins': standing['wins'],
                }
            )
            
            if is_created:
                created += 1
            else:
                updated += 1
        
        logger.info(f"Saved constructor standings: {created} created, {updated} updated")
        return created, updated
    
    @staticmethod
    @transaction.atomic
    def recalculate_all_standings(season: int) -> Dict[str, int]:
        """
        Recalculate all standings for a season (all rounds + season total).
        
        Args:
            season: The season year
            
        Returns:
            Dictionary with statistics about created/updated records
        """
        logger.info(f"Recalculating all standings for season {season}")
        
        # Get all races for the season
        races = Race.objects.filter(season=season).order_by('round')
        
        stats = {
            'driver_created': 0,
            'driver_updated': 0,
            'constructor_created': 0,
            'constructor_updated': 0,
        }
        
        # Calculate standings after each round
        for race in races:
            dc, du = ChampionshipService.save_driver_standings(season, race.round)
            cc, cu = ChampionshipService.save_constructor_standings(season, race.round)
            
            stats['driver_created'] += dc
            stats['driver_updated'] += du
            stats['constructor_created'] += cc
            stats['constructor_updated'] += cu
        
        # Calculate season totals (round = 0)
        dc, du = ChampionshipService.save_driver_standings(season)
        cc, cu = ChampionshipService.save_constructor_standings(season)
        
        stats['driver_created'] += dc
        stats['driver_updated'] += du
        stats['constructor_created'] += cc
        stats['constructor_updated'] += cu
        
        logger.info(f"Standings recalculation complete: {stats}")
        return stats
    
    @staticmethod
    def get_driver_position_history(driver_id: int, season: int) -> List[Dict]:
        """
        Get position history for a driver throughout a season.
        
        Args:
            driver_id: Database ID of the driver
            season: The season year
            
        Returns:
            List of standings by round
        """
        standings = (
            ChampionshipStanding.objects
            .filter(
                driver_id=driver_id,
                season=season,
                standing_type='driver',
                round__gt=0  # Exclude season total
            )
            .order_by('round')
            .values('round', 'position', 'points', 'wins')
        )
        
        return list(standings)
    
    @staticmethod
    def get_constructor_position_history(constructor_id: int, season: int) -> List[Dict]:
        """
        Get position history for a constructor throughout a season.
        
        Args:
            constructor_id: Database ID of the constructor
            season: The season year
            
        Returns:
            List of standings by round
        """
        standings = (
            ChampionshipStanding.objects
            .filter(
                constructor_id=constructor_id,
                season=season,
                standing_type='constructor',
                round__gt=0  # Exclude season total
            )
            .order_by('round')
            .values('round', 'position', 'points', 'wins')
        )
        
        return list(standings)
