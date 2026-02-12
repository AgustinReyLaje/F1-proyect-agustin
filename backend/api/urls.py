from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SeasonViewSet, DriverViewSet, ConstructorViewSet, RaceViewSet,
    ResultViewSet, LapViewSet, ChampionshipStandingViewSet
)

router = DefaultRouter()
router.register(r'seasons', SeasonViewSet, basename='season')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'constructors', ConstructorViewSet, basename='constructor')
router.register(r'races', RaceViewSet, basename='race')
router.register(r'results', ResultViewSet, basename='result')
router.register(r'laps', LapViewSet, basename='lap')
router.register(r'standings', ChampionshipStandingViewSet, basename='standing')

urlpatterns = [
    path('', include(router.urls)),
]
