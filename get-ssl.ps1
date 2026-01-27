# PowerShell skripta za dobijanje Let's Encrypt SSL sertifikata
# Upotreba: .\get-ssl.ps1 -Domain "vas-domen.com" -Email "admin@example.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Domain,
    
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "🔐 Dobijanje SSL sertifikata za domen: $Domain" -ForegroundColor Cyan
Write-Host "📧 Email za notifikacije: $Email" -ForegroundColor Cyan

$sslDir = ".\frontend\ssl"

# Kreiranje ssl foldera ako ne postoji
New-Item -ItemType Directory -Force -Path $sslDir | Out-Null

Write-Host "`n⚠️  VAŽNO: Osigurajte da je port 80 dostupan i da DNS pokazuje na ovaj server!" -ForegroundColor Yellow
Write-Host "Pritisnite Enter za nastavak ili Ctrl+C za odustajanje..." -ForegroundColor Yellow
Read-Host

# Zaustavite frontend kontejner da oslobodi port 80
Write-Host "`n⏸️  Zaustavljanje frontend kontejnera..." -ForegroundColor Yellow
docker stop computerrunner_frontend 2>$null

# Dobijanje sertifikata pomoću certbot Docker container-a
Write-Host "`n🚀 Pokretanje certbot-a..." -ForegroundColor Green
docker run -it --rm `
  -v "${PWD}\frontend\ssl:/etc/letsencrypt" `
  -p 80:80 `
  certbot/certbot certonly `
  --standalone `
  --non-interactive `
  --agree-tos `
  --email "$Email" `
  -d "$Domain"

# Provera da li su sertifikati uspešno kreirani
$certPath = "$sslDir\live\$Domain\fullchain.pem"
if (Test-Path $certPath) {
    # Kopiraj sertifikate na pravo mesto
    Copy-Item "$sslDir\live\$Domain\fullchain.pem" "$sslDir\cert.pem" -Force
    Copy-Item "$sslDir\live\$Domain\privkey.pem" "$sslDir\key.pem" -Force
    
    Write-Host "`n✅ SSL sertifikat uspešno dobijen!" -ForegroundColor Green
    Write-Host "📁 Fajlovi: $sslDir\cert.pem i $sslDir\key.pem" -ForegroundColor Green
    
    # Restartuj kontejnere
    Write-Host "`n🔄 Restartovanje Docker kontejnera..." -ForegroundColor Cyan
    docker-compose up -d
    
    Write-Host "`n✨ Gotovo! Pristupite sajtu preko:" -ForegroundColor Green
    Write-Host "   https://$Domain`:13223" -ForegroundColor White
} else {
    Write-Host "`n❌ Greška pri dobijanju sertifikata!" -ForegroundColor Red
    Write-Host "Provera:" -ForegroundColor Yellow
    Write-Host "  1. Da li je port 80 otvoren?" -ForegroundColor White
    Write-Host "  2. Da li DNS pokazuje na ovaj server?" -ForegroundColor White
    Write-Host "  3. Da li je domen validan?" -ForegroundColor White
    
    # Restartuj kontejnere sa starim sertifikatom
    docker-compose up -d
    exit 1
}
