"""
URL configuration for f1_analytics project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def api_root(request):
    """Root endpoint with API information"""
    return JsonResponse({
        'message': 'F1 Analytics Platform API',
        'version': '1.0',
        'endpoints': {
            'api': '/api/v1/',
            'admin': '/admin/',
            'drivers': '/api/v1/drivers/',
            'constructors': '/api/v1/constructors/',
            'races': '/api/v1/races/',
            'standings': '/api/v1/championship-standings/',
            'seasons': '/api/v1/seasons/',
        },
        'documentation': 'https://github.com/AgustinReyLaje/F1-proyect-agustin',
        'frontend': 'http://localhost:3000'
    })

urlpatterns = [
    path('', api_root, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]
