#!/usr/bin/env pwsh
# Local development startup script
# Starts PostgreSQL via Docker, then Flask backend on port 5000
# Angular dev server runs separately: cd angular-frontend && npm start

Write-Host "=== WoL Manager - Local Dev Setup ===" -ForegroundColor Cyan

# --- 1. Start PostgreSQL via Docker ---
Write-Host "`n[1/3] Starting PostgreSQL container..." -ForegroundColor Yellow
docker run -d --name wol_db_dev `
    -e POSTGRES_DB=wol_db `
    -e POSTGRES_USER=wol_user `
    -e POSTGRES_PASSWORD=wol_password `
    -p 5432:5432 `
    postgres:15-alpine 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  -> PostgreSQL already running or failed to start (checking...)" -ForegroundColor Gray
    docker start wol_db_dev 2>$null
}

# Wait for DB
Write-Host "  -> Waiting for database..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# --- 2. Set environment variables for Flask ---
Write-Host "`n[2/3] Configuring Flask environment..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://wol_user:wol_password@localhost:5432/wol_db"
$env:SECRET_KEY = "dev-secret-key-local-only"
$env:FLASK_ENV = "development"
$env:PORT = "5000"
$env:SESSION_COOKIE_SECURE = "false"
$env:SESSION_COOKIE_HTTPONLY = "true"
$env:SESSION_COOKIE_SAMESITE = "Lax"

# --- 3. Run Flask backend ---
Write-Host "`n[3/3] Starting Flask backend on http://localhost:5000 ..." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop`n" -ForegroundColor Gray

Set-Location "$PSScriptRoot\backend"
python docker-entrypoint.py
