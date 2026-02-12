from django.db import models
from django.core.validators import MinValueValidator


class Season(models.Model):
    """
    Represents an F1 season year.
    """
    year = models.IntegerField(unique=True, validators=[MinValueValidator(1950)])
    is_active = models.BooleanField(default=False, help_text="Currently active/selected season")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year']

    def __str__(self):
        return f"{self.year} Season"


class Constructor(models.Model):
    """
    Represents an F1 constructor (team).
    """
    constructor_id = models.CharField(max_length=100, unique=True, help_text="External API constructor ID")
    name = models.CharField(max_length=255)
    nationality = models.CharField(max_length=100)
    url = models.URLField(blank=True, null=True)
    # Keep season-specific fields for backward compatibility
    car_model = models.CharField(max_length=50, blank=True, null=True, help_text="Car model name for current season")
    car_image_url = models.URLField(blank=True, null=True, help_text="URL to car image")
    team_color = models.CharField(max_length=7, blank=True, null=True, help_text="Team primary color in hex format")
    team_color_secondary = models.CharField(max_length=7, blank=True, null=True, help_text="Team secondary color")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['constructor_id']),
        ]

    def __str__(self):
        return self.name


class ConstructorSeason(models.Model):
    """
    Represents constructor data for a specific season (car model, colors, etc).
    """
    constructor = models.ForeignKey(Constructor, on_delete=models.CASCADE, related_name='season_data')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='constructor_data')
    car_model = models.CharField(max_length=50, blank=True, null=True, help_text="Car model name for the season")
    car_image_url = models.URLField(blank=True, null=True, help_text="URL to car image")
    team_color = models.CharField(max_length=7, blank=True, null=True, help_text="Team primary color in hex format")
    team_color_secondary = models.CharField(max_length=7, blank=True, null=True, help_text="Team secondary color")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-season__year', 'constructor__name']
        unique_together = ['constructor', 'season']
        indexes = [
            models.Index(fields=['season', 'constructor']),
        ]

    def __str__(self):
        return f"{self.constructor.name} - {self.season.year}"


class Driver(models.Model):
    """
    Represents an F1 driver.
    """
    driver_id = models.CharField(max_length=100, unique=True, help_text="External API driver ID")
    number = models.IntegerField(null=True, blank=True, help_text="Permanent driver number")
    code = models.CharField(max_length=3, blank=True, help_text="Three-letter driver code")
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100)
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['driver_id']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class DriverSeason(models.Model):
    """
    Represents a driver's participation in a specific season with a specific team.
    """
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='season_data')
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name='driver_data')
    constructor = models.ForeignKey(Constructor, on_delete=models.CASCADE, related_name='drivers_in_season')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-season__year', 'driver__last_name']
        unique_together = ['driver', 'season', 'constructor']
        indexes = [
            models.Index(fields=['season', 'constructor']),
            models.Index(fields=['driver', 'season']),
        ]

    def __str__(self):
        return f"{self.driver.full_name} - {self.constructor.name} ({self.season.year})"


class Race(models.Model):
    """
    Represents a Formula 1 race event.
    """
    race_id = models.CharField(max_length=100, unique=True, help_text="External API race ID")
    season = models.IntegerField(validators=[MinValueValidator(1950)])
    round = models.IntegerField(validators=[MinValueValidator(1)])
    race_name = models.CharField(max_length=255)
    circuit_id = models.CharField(max_length=100)
    circuit_name = models.CharField(max_length=255)
    locality = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-season', 'round']
        unique_together = ['season', 'round']
        indexes = [
            models.Index(fields=['race_id']),
            models.Index(fields=['season', 'round']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.season} - Round {self.round}: {self.race_name}"


class Result(models.Model):
    """
    Represents the result of a driver in a specific race.
    """
    race = models.ForeignKey(Race, on_delete=models.CASCADE, related_name='results')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='results')
    constructor = models.ForeignKey(Constructor, on_delete=models.CASCADE, related_name='results')
    
    grid_position = models.IntegerField(help_text="Starting grid position")
    final_position = models.IntegerField(null=True, blank=True, help_text="Final race position")
    position_text = models.CharField(max_length=10, help_text="Position text (handles DNF, DSQ, etc)")
    points = models.FloatField(default=0.0)
    laps_completed = models.IntegerField(default=0)
    
    STATUS_CHOICES = [
        ('finished', 'Finished'),
        ('dnf', 'Did Not Finish'),
        ('dsq', 'Disqualified'),
        ('dns', 'Did Not Start'),
        ('retired', 'Retired'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='finished')
    
    fastest_lap = models.IntegerField(null=True, blank=True, help_text="Lap number of fastest lap")
    fastest_lap_time = models.CharField(max_length=20, null=True, blank=True)
    fastest_lap_speed = models.FloatField(null=True, blank=True, help_text="Speed in km/h")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['race', 'final_position']
        unique_together = ['race', 'driver']
        indexes = [
            models.Index(fields=['race', 'final_position']),
            models.Index(fields=['driver', 'race']),
            models.Index(fields=['points']),
        ]

    def __str__(self):
        return f"{self.driver} - {self.race} - P{self.position_text}"


class Lap(models.Model):
    """
    Represents lap time data for a specific driver in a race.
    """
    race = models.ForeignKey(Race, on_delete=models.CASCADE, related_name='laps')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='laps')
    
    lap_number = models.IntegerField(validators=[MinValueValidator(1)])
    position = models.IntegerField(help_text="Position at the end of this lap")
    lap_time = models.CharField(max_length=20, help_text="Lap time in format mm:ss.SSS")
    lap_time_milliseconds = models.IntegerField(null=True, blank=True, help_text="Lap time in milliseconds for easier comparison")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['race', 'lap_number', 'position']
        unique_together = ['race', 'driver', 'lap_number']
        indexes = [
            models.Index(fields=['race', 'lap_number']),
            models.Index(fields=['driver', 'race']),
            models.Index(fields=['lap_time_milliseconds']),
        ]

    def __str__(self):
        return f"{self.driver} - {self.race} - Lap {self.lap_number}: {self.lap_time}"


class ChampionshipStanding(models.Model):
    """
    Stores calculated championship standings (can be regenerated from Results).
    Cached for performance.
    """
    STANDING_TYPE_CHOICES = [
        ('driver', 'Driver Championship'),
        ('constructor', 'Constructor Championship'),
    ]
    
    season = models.IntegerField(validators=[MinValueValidator(1950)])
    standing_type = models.CharField(max_length=20, choices=STANDING_TYPE_CHOICES)
    round = models.IntegerField(validators=[MinValueValidator(0)], help_text="0 means season total")
    
    # These fields are mutually exclusive based on standing_type
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, null=True, blank=True, related_name='standings')
    constructor = models.ForeignKey(Constructor, on_delete=models.CASCADE, null=True, blank=True, related_name='standings')
    
    position = models.IntegerField()
    points = models.FloatField()
    wins = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['season', '-round', 'standing_type', 'position']
        indexes = [
            models.Index(fields=['season', 'standing_type', 'round']),
            models.Index(fields=['driver', 'season']),
            models.Index(fields=['constructor', 'season']),
        ]

    def __str__(self):
        entity = self.driver if self.driver else self.constructor
        return f"{self.season} R{self.round} - P{self.position}: {entity} ({self.points} pts)"
