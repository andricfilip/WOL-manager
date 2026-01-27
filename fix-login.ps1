# Quick Fix za Login Problem na Serveru
# Pokreni ako login ne radi nakon prebacivanja na server

Write-Host "Resavanje login problema..." -ForegroundColor Cyan

# Provera Docker instalacije
Write-Host "`n1. Provera Docker statusa..." -ForegroundColor Yellow
docker --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker nije instaliran ili ne radi!" -ForegroundColor Red
    exit 1
}

# Zaustavljanje kontejnera
Write-Host "`n2. Zaustavljanje kontejnera..." -ForegroundColor Yellow
docker-compose down

# Provera docker-compose.yml
Write-Host "`n3. Provera SECRET_KEY konfiguracije..." -ForegroundColor Yellow
$composeContent = Get-Content docker-compose.yml -Raw

if ($composeContent -match "SECRET_KEY=your-secret-key-change-in-production") {
    Write-Host "UPOZORENJE: Koristite default SECRET_KEY!" -ForegroundColor Red
    Write-Host "Generisanje novog SECRET_KEY..." -ForegroundColor Yellow
    
    $newKey = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | % {[char]$_})
    $newKey = "CR-WoL-SecretKey-2026-$newKey"
    
    $composeContent = $composeContent -replace "SECRET_KEY=your-secret-key-change-in-production", "SECRET_KEY=$newKey"
    $composeContent | Set-Content docker-compose.yml
    
    Write-Host "Novi SECRET_KEY postavljen!" -ForegroundColor Green
}

# Rebuild i pokretanje
Write-Host "`n4. Rebuild i pokretanje (moze potrajati)..." -ForegroundColor Yellow
docker-compose up -d --build

# Cekanje da servisi postanu healthy
Write-Host "`n5. Cekanje da servisi postanu aktivni..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Status
Write-Host "`n6. Status kontejnera:" -ForegroundColor Yellow
docker ps

# Test konekcije
Write-Host "`n7. Testiranje login stranice..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:13224/auth/login" -Method GET -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "Login stranica dostupna!" -ForegroundColor Green
    }
} catch {
    Write-Host "Login stranica nedostupna! Proverite logove." -ForegroundColor Red
    Write-Host "Komanda: docker logs computerrunner_backend --tail=50" -ForegroundColor Yellow
}

# Provera SECRET_KEY u backend-u
Write-Host "`n8. Provera SECRET_KEY u backend kontejneru..." -ForegroundColor Yellow
docker exec computerrunner_backend python -c "from app import app; print('SECRET_KEY:', 'POSTAVLJEN' if app.config.get('SECRET_KEY') else 'NIJE POSTAVLJEN')"

Write-Host "`nGotovo!" -ForegroundColor Green
Write-Host "`nPokusajte login ponovo: http://localhost:13224" -ForegroundColor Cyan
Write-Host "Korisnik: admin" -ForegroundColor White
Write-Host "Lozinka: admin123" -ForegroundColor White
Write-Host "`nAko jos uvek ne radi, pogledajte logove:" -ForegroundColor Yellow
Write-Host "docker logs computerrunner_backend -f" -ForegroundColor White
