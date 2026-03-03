#!/usr/bin/env pwsh
# Build images and package for server deployment
# Output: dist/  - upload these 3 files to your server, no source code needed

$ErrorActionPreference = "Stop"
$dist = "$PSScriptRoot\dist"

Write-Host "`n=== WoL Manager - Build for Server ===" -ForegroundColor Cyan

# --- 1. Build images ---
Write-Host "`n[1/4] Building Docker images..." -ForegroundColor Yellow
docker compose -f "$PSScriptRoot\docker-compose.angular.yml" build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

# --- 2. Create output dir ---
Write-Host "`n[2/4] Preparing dist/ folder..." -ForegroundColor Yellow
Remove-Item $dist -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dist | Out-Null

# --- 3. Save images as tar ---
Write-Host "`n[3/4] Saving images (this may take a minute)..." -ForegroundColor Yellow

Write-Host "  -> wol-backend.tar" -ForegroundColor Gray
docker save wol-manager-backend:latest -o "$dist\wol-backend.tar"

Write-Host "  -> wol-frontend.tar" -ForegroundColor Gray
docker save wol-manager-frontend:latest -o "$dist\wol-frontend.tar"

# --- 4. Copy compose file ---
Write-Host "`n[4/4] Copying deployment files..." -ForegroundColor Yellow
Copy-Item "$PSScriptRoot\docker-compose.server.yml" "$dist\docker-compose.server.yml"

# --- Done ---
$backendSize  = [math]::Round((Get-Item "$dist\wol-backend.tar").Length / 1MB, 1)
$frontendSize = [math]::Round((Get-Item "$dist\wol-frontend.tar").Length / 1MB, 1)

Write-Host "`n=== Done! Upload these files to your server ===" -ForegroundColor Green
Write-Host ""
Write-Host "  dist/" -ForegroundColor White
Write-Host "    wol-backend.tar         ($backendSize MB)" -ForegroundColor Gray
Write-Host "    wol-frontend.tar        ($frontendSize MB)" -ForegroundColor Gray
Write-Host "    docker-compose.server.yml" -ForegroundColor Gray
Write-Host ""
Write-Host "Then on the server run:" -ForegroundColor Cyan
Write-Host "  docker load < wol-backend.tar" -ForegroundColor White
Write-Host "  docker load < wol-frontend.tar" -ForegroundColor White
Write-Host "  docker compose -f docker-compose.server.yml up -d" -ForegroundColor White
Write-Host ""
