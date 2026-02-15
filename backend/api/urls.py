from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SeasonViewSet, DriverViewSet, DriverSeasonViewSet, ConstructorViewSet, ConstructorSeasonViewSet,
    RaceViewSet, ResultViewSet, LapViewSet, ChampionshipStandingViewSet,
    QualifyingViewSet, SprintViewSet
)

router = DefaultRouter()
router.register(r'seasons', SeasonViewSet, basename='season')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'driver-seasons', DriverSeasonViewSet, basename='driver-season')
router.register(r'constructors', ConstructorViewSet, basename='constructor')
router.register(r'constructor-seasons', ConstructorSeasonViewSet, basename='constructor-season')
router.register(r'races', RaceViewSet, basename='race')
router.register(r'results', ResultViewSet, basename='result')
router.register(r'laps', LapViewSet, basename='lap')
router.register(r'standings', ChampionshipStandingViewSet, basename='standing')
router.register(r'qualifying', QualifyingViewSet, basename='qualifying')
router.register(r'sprint', SprintViewSet, basename='sprint')

urlpatterns = [
    path('', include(router.urls)),
]
