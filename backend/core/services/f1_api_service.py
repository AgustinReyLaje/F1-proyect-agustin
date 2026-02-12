"""
F1 Data Fetching Service

This service handles fetching data from the Ergast Developer API.
API Documentation: http://ergast.com/mrd/

Rate Limiting: 4 requests per second, 200 per hour
"""

import requests
import time
from typing import Dict, List, Optional
from django.conf import settings
from core.models import Driver, Constructor, Race, Result


class F1APIError(Exception):
    """Custom exception for F1 API errors"""
    pass


class F1DataService:
    """
    Service class for fetching Formula 1 data from Ergast API.
    """
    
    def __init__(self):
        self.base_url = settings.F1_API_BASE_URL
        self.rate_limit = settings.F1_API_RATE_LIMIT
        self.last_request_time = 0
    
    def _rate_limit_wait(self):
        """Implement rate limiting to avoid hitting API limits"""
        elapsed = time.time() - self.last_request_time
        min_interval = 1.0 / self.rate_limit
        
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        
        self.last_request_time = time.time()
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make a request to the F1 API with rate limiting.
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            JSON response data
            
        Raises:
            F1APIError: If the API request fails
        """
        self._rate_limit_wait()
        
        url = f"{self.base_url}/{endpoint}.json"
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            # Check if response is JSON
            content_type = response.headers.get('Content-Type', '')
            if 'application/json' not in content_type:
                raise F1APIError(
                    f"API returned non-JSON response. Content-Type: {content_type}. "
                    f"The Ergast API might be unavailable. URL: {url}"
                )
            
            data = response.json()
            return data
            
        except requests.exceptions.JSONDecodeError as e:
            raise F1APIError(
                f"Invalid JSON response from API. URL: {url}. Error: {str(e)}. "
                f"Response preview: {response.text[:200]}"
            )
        except requests.exceptions.RequestException as e:
            raise F1APIError(f"API request failed: {str(e)}. URL: {url}")
    
    def fetch_drivers(self, season: Optional[int] = None) -> List[Dict]:
        """
        Fetch drivers for a specific season or all drivers.
        
        Args:
            season: Year of the season (optional)
            
        Returns:
            List of driver dictionaries
        """
        endpoint = f"{season}/drivers" if season else "drivers"
        data = self._make_request(endpoint, params={"limit": 1000})
        
        try:
            return data['MRData']['DriverTable']['Drivers']
        except KeyError:
            return []
    
    def fetch_constructors(self, season: Optional[int] = None) -> List[Dict]:
        """
        Fetch constructors for a specific season or all constructors.
        
        Args:
            season: Year of the season (optional)
            
        Returns:
            List of constructor dictionaries
        """
        endpoint = f"{season}/constructors" if season else "constructors"
        data = self._make_request(endpoint, params={"limit": 1000})
        
        try:
            return data['MRData']['ConstructorTable']['Constructors']
        except KeyError:
            return []
    
    def fetch_races(self, season: int) -> List[Dict]:
        """
        Fetch all races for a specific season.
        
        Args:
            season: Year of the season
            
        Returns:
            List of race dictionaries
        """
        endpoint = f"{season}"
        data = self._make_request(endpoint)
        
        try:
            return data['MRData']['RaceTable']['Races']
        except KeyError:
            return []
    
    def fetch_race_results(self, season: int, round_number: int) -> List[Dict]:
        """
        Fetch results for a specific race.
        
        Args:
            season: Year of the season
            round_number: Round number of the race
            
        Returns:
            List of result dictionaries
        """
        endpoint = f"{season}/{round_number}/results"
        data = self._make_request(endpoint)
        
        try:
            races = data['MRData']['RaceTable']['Races']
            if races:
                return races[0].get('Results', [])
            return []
        except KeyError:
            return []
    
    def fetch_lap_times(self, season: int, round_number: int, lap: Optional[int] = None) -> List[Dict]:
        """
        Fetch lap times for a specific race.
        
        Args:
            season: Year of the season
            round_number: Round number of the race
            lap: Specific lap number (optional, fetches all if not provided)
            
        Returns:
            List of lap time dictionaries
        """
        if lap:
            endpoint = f"{season}/{round_number}/laps/{lap}"
        else:
            endpoint = f"{season}/{round_number}/laps"
        
        data = self._make_request(endpoint, params={"limit": 10000})
        
        try:
            races = data['MRData']['RaceTable']['Races']
            if races:
                return races[0].get('Laps', [])
            return []
        except KeyError:
            return []
    
    def fetch_driver_standings(self, season: int, round_number: Optional[int] = None) -> List[Dict]:
        """
        Fetch driver championship standings.
        
        Args:
            season: Year of the season
            round_number: Round number (optional, fetches final standings if not provided)
            
        Returns:
            List of standing dictionaries
        """
        if round_number:
            endpoint = f"{season}/{round_number}/driverStandings"
        else:
            endpoint = f"{season}/driverStandings"
        
        data = self._make_request(endpoint)
        
        try:
            standings_lists = data['MRData']['StandingsTable']['StandingsLists']
            if standings_lists:
                return standings_lists[0].get('DriverStandings', [])
            return []
        except KeyError:
            return []
    
    def fetch_constructor_standings(self, season: int, round_number: Optional[int] = None) -> List[Dict]:
        """
        Fetch constructor championship standings.
        
        Args:
            season: Year of the season
            round_number: Round number (optional, fetches final standings if not provided)
            
        Returns:
            List of standing dictionaries
        """
        if round_number:
            endpoint = f"{season}/{round_number}/constructorStandings"
        else:
            endpoint = f"{season}/constructorStandings"
        
        data = self._make_request(endpoint)
        
        try:
            standings_lists = data['MRData']['StandingsTable']['StandingsLists']
            if standings_lists:
                return standings_lists[0].get('ConstructorStandings', [])
            return []
        except KeyError:
            return []


# Example usage in management commands or views:
"""
from core.services.f1_api_service import F1DataService

service = F1DataService()

# Fetch 2024 drivers
drivers = service.fetch_drivers(season=2024)

# Fetch all races for 2024
races = service.fetch_races(season=2024)

# Fetch results for a specific race
results = service.fetch_race_results(season=2024, round_number=1)

# Fetch driver standings
standings = service.fetch_driver_standings(season=2024)
"""
