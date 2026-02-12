# 🚀 Quick Start Script para F1 Analytics Platform

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "F1 Analytics Platform - Quick Start" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  No se encontró archivo .env" -ForegroundColor Yellow
    Write-Host "📝 Creando .env desde .env.example..." -ForegroundColor Green
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Archivo .env creado. Por favor edítalo con tus credenciales." -ForegroundColor Green
    Write-Host ""
}

# Check if venv exists
if (-Not (Test-Path "venv")) {
    Write-Host "📦 Creando entorno virtual..." -ForegroundColor Green
    python -m venv venv
    Write-Host "✅ Entorno virtual creado" -ForegroundColor Green
}

# Activate venv
Write-Host "🔄 Activando entorno virtual..." -ForegroundColor Green
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📦 Instalando dependencias..." -ForegroundColor Green
pip install -r requirements.txt -q

# Check migrations
Write-Host "🔍 Verificando migraciones..." -ForegroundColor Green
python manage.py makemigrations

# Run migrations
Write-Host "📊 Ejecutando migraciones..." -ForegroundColor Green
python manage.py migrate

# Create superuser prompt
Write-Host ""
Write-Host "👤 ¿Deseas crear un superusuario? (s/n)" -ForegroundColor Cyan
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    python manage.py createsuperuser
}

# Import data prompt
Write-Host ""
Write-Host "📥 ¿Deseas importar datos de F1 2024? (s/n)" -ForegroundColor Cyan
$response = Read-Host
if ($response -eq "s" -or $response -eq "S") {
    Write-Host "⏳ Importando datos (esto puede tardar unos minutos)..." -ForegroundColor Yellow
    python manage.py import_f1_data --season 2024 --calculate-standings
}

Write-Host ""
Write-Host "✅ ¡Setup completado!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Para iniciar el servidor ejecuta:" -ForegroundColor Cyan
Write-Host "   python manage.py runserver" -ForegroundColor White
Write-Host ""
Write-Host "📚 URLs importantes:" -ForegroundColor Cyan
Write-Host "   API: http://localhost:8000/api/v1/" -ForegroundColor White
Write-Host "   Admin: http://localhost:8000/admin/" -ForegroundColor White
Write-Host ""
