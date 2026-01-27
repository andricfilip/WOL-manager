# Skripta za pakovanje projekta za prebacivanje na server
# Kreira deployment paket sa svim potrebnim fajlovima i Docker images

Write-Host "Kreiranje deployment paketa za server..." -ForegroundColor Cyan

$exportDir = ".\deployment-package"
$date = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "computerrunner-$date"

# Kreiranje export foldera
Write-Host "`n1. Kreiranje export foldera..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null

# Build Docker images ako nisu već buildirani
Write-Host "`n2. Build Docker images..." -ForegroundColor Yellow
docker-compose build

# Export Docker images
Write-Host "`n3. Export Docker images (moze potrajati nekoliko minuta)..." -ForegroundColor Yellow

Write-Host "   Exportovanje backend image..." -ForegroundColor Gray
docker save -o "$exportDir\backend-image.tar" computerrunner-backend

Write-Host "   Exportovanje frontend image..." -ForegroundColor Gray
docker save -o "$exportDir\frontend-image.tar" computerrunner-frontend

Write-Host "   Exportovanje postgres image..." -ForegroundColor Gray
docker save -o "$exportDir\postgres-image.tar" postgres:15-alpine

# Kopiranje svih potrebnih fajlova
Write-Host "`n4. Kopiranje projekata..." -ForegroundColor Yellow

# Kreiranje strukture foldera
$folders = @("backend", "frontend", "frontend\ssl")
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path "$exportDir\$folder" | Out-Null
}

# Kopiranje backend fajlova
Write-Host "   Kopiranje backend fajlova..." -ForegroundColor Gray
Copy-Item ".\backend\*" -Destination "$exportDir\backend\" -Recurse -Force -Exclude "__pycache__","*.pyc","instance"

# Kopiranje frontend fajlova
Write-Host "   Kopiranje frontend fajlova..." -ForegroundColor Gray
Copy-Item ".\frontend\*" -Destination "$exportDir\frontend\" -Recurse -Force -Exclude "node_modules"

# Kopiranje root fajlova
Write-Host "   Kopiranje konfiguracionih fajlova..." -ForegroundColor Gray
Copy-Item ".\docker-compose.yml" -Destination "$exportDir\" -Force
Copy-Item ".\README.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\SETUP.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\SSL-SETUP.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\SERVER-FIX.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\SERVER-QUICKSTART.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\QUICK-REFERENCE.md" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\get-ssl.ps1" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\get-ssl.sh" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\fix-login.ps1" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue
Copy-Item ".\fix-login.sh" -Destination "$exportDir\" -Force -ErrorAction SilentlyContinue

# Kreiranje deployment skripte za server
Write-Host "`n5. Kreiranje deployment skripta..." -ForegroundColor Yellow

# PowerShell skripta za Windows server
@'
# Deployment skripta za Windows Server
# Pokreni kao Administrator

Write-Host "🚀 ComputerRunner - Server Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Provera Docker instalacije
Write-Host "`n1️⃣  Provera Docker instalacije..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker nije instaliran!" -ForegroundColor Red
    Write-Host "Instalirajte Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker je instaliran" -ForegroundColor Green

# Load Docker images
Write-Host "`n2️⃣  Učitavanje Docker images (može potrajati nekoliko minuta)..." -ForegroundColor Yellow

Write-Host "   Učitavanje backend image..." -ForegroundColor Gray
docker load -i backend-image.tar

Write-Host "   Učitavanje frontend image..." -ForegroundColor Gray
docker load -i frontend-image.tar

Write-Host "   Učitavanje postgres image..." -ForegroundColor Gray
docker load -i postgres-image.tar

# Pokretanje kontejnera
Write-Host "`n3️⃣  Pokretanje Docker kontejnera..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`n⏳ Čekanje da se servisi pokrenu..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Kreiranje admin korisnika
Write-Host "`n4. Kreiranje admin korisnika..." -ForegroundColor Yellow
docker exec -it computerrunner_backend python -c "from app import app, db; from models import User; app.app_context().push(); db.create_all(); admin = User.query.filter_by(username='admin').first() or User(username='admin', email='admin@example.com', is_admin=True); admin.set_password('admin123') if not admin.id else None; db.session.add(admin); db.session.commit(); print('Admin ready')"

# Status provera
Write-Host "`n5. Status kontejnera..." -ForegroundColor Yellow
docker ps

Write-Host "`n✅ Deployment završen!" -ForegroundColor Green
Write-Host "`n📍 Pristupite aplikaciji:" -ForegroundColor Cyan
Write-Host "   HTTP:  http://localhost" -ForegroundColor White
Write-Host "   HTTPS: https://localhost:13223" -ForegroundColor White
Write-Host "`n🔑 Login:" -ForegroundColor Cyan
Write-Host "   Korisnik: admin" -ForegroundColor White
Write-Host "   Lozinka: admin123" -ForegroundColor White
Write-Host "`n⚠️  PROMENITE ADMIN LOZINKU!" -ForegroundColor Yellow
'@ | Out-File -FilePath "$exportDir\deploy.ps1" -Encoding UTF8

# Bash skripta za Linux server - BEZ emojis zbog kompatibilnosti
$deployShContent = @"
#!/bin/bash
# Deployment skripta za Linux Server

echo "ComputerRunner - Server Deployment"
echo "==================================="

# Provera Docker instalacije
echo ""
echo "1. Provera Docker instalacije..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker nije instaliran!"
    echo "Instalirajte Docker: https://docs.docker.com/engine/install/"
    exit 1
fi
echo "OK: Docker je instaliran"

# Load Docker images
echo ""
echo "2. Ucitavanje Docker images (moze potrajati nekoliko minuta)..."

echo "   Ucitavanje backend image..."
docker load -i backend-image.tar

echo "   Ucitavanje frontend image..."
docker load -i frontend-image.tar

echo "   Ucitavanje postgres image..."
docker load -i postgres-image.tar

# Pokretanje kontejnera
echo ""
echo "3. Pokretanje Docker kontejnera..."
docker-compose up -d

echo ""
echo "Cekanje da se servisi pokrenu..."
sleep 15

# Kreiranje admin korisnika
echo ""
echo "4. Kreiranje admin korisnika..."
docker exec -it computerrunner_backend python << 'PYEOF'
from app import app, db
from models import User

with app.app_context():
    db.create_all()
    
    if not User.query.filter_by(username='admin').first():
        admin = User(username='admin', email='admin@example.com', is_admin=True)
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('OK: Admin korisnik kreiran: admin / admin123')
    else:
        print('OK: Admin korisnik vec postoji')
PYEOF

# Status provera
echo ""
echo "5. Status kontejnera..."
docker ps

echo ""
echo "SUCCESS: Deployment zavrsen!"
echo ""
echo "Pristupite aplikaciji:"
echo "   HTTP:  http://localhost"
echo "   HTTPS: https://localhost:13223"
echo ""
echo "Login:"
echo "   Korisnik: admin"
echo "   Lozinka: admin123"
echo ""
echo "VAZNO: PROMENITE ADMIN LOZINKU!"
"@

# Konvertuj u LF line endings i sacuvaj
$deployShContent -replace "`r`n", "`n" | Out-File -FilePath "$exportDir\deploy.sh" -Encoding ASCII -NoNewline
Add-Content -Path "$exportDir\deploy.sh" -Value "`n" -Encoding ASCII -NoNewline

# Kreiranje README za deployment
@'
# ComputerRunner - Deployment Paket

## 📦 Sadržaj Paketa

- `backend/` - Flask backend aplikacija
- `frontend/` - Nginx frontend
- `backend-image.tar` - Docker image za backend (2-3 GB)
- `frontend-image.tar` - Docker image za frontend (~50 MB)
- `postgres-image.tar` - Docker image za PostgreSQL (~80 MB)
- `docker-compose.yml` - Konfiguracija za Docker Compose
- `deploy.ps1` - Deployment skripta za Windows
- `deploy.sh` - Deployment skripta za Linux
- `SSL-SETUP.md` - Uputstvo za SSL sertifikate

## 🚀 Deployment na Server

### Windows Server

1. Kopirajte ceo folder `deployment-package` na server
2. Otvorite PowerShell kao Administrator
3. Pokrenite:
   ```powershell
   cd deployment-package
   .\deploy.ps1
   ```

### Linux Server

1. Kopirajte ceo folder `deployment-package` na server
2. Napravite skriptu izvrsnom:
   ```bash
   chmod +x deploy.sh
   ```
3. Pokrenite:
   ```bash
   sudo ./deploy.sh
   ```

## 🔐 Prvi Login

- URL: `http://server-ip` ili `https://server-ip:13223`
- Korisnik: `admin`
- Lozinka: `admin123`

**⚠️ VAŽNO:** Odmah promenite admin lozinku!

## 📝 Konfiguracija Poslije Deployementa

### 1. SSL Sertifikat (Za HTTPS bez upozorenja)

```powershell
# Windows
.\get-ssl.ps1 -Domain "vas-domen.com" -Email "vas@email.com"

# Linux
./get-ssl.sh vas-domen.com vas@email.com
```

Više detalja u `SSL-SETUP.md`

### 2. Otvaranje Portova na Firewall-u

```powershell
# Windows
New-NetFirewallRule -DisplayName "ComputerRunner HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "ComputerRunner HTTPS" -Direction Inbound -LocalPort 13223 -Protocol TCP -Action Allow

# Linux
sudo ufw allow 80/tcp
sudo ufw allow 13223/tcp
```

### 3. Promena Admin Lozinke

1. Prijavite se kao admin
2. Idite na "Profil"
3. Kliknite "Promeni Lozinku"

## 🔄 Ažuriranje Aplikacije

```powershell
# Zaustavite kontejnere
docker-compose down

# Kopirajte nove fajlove

# Pokrenite ponovo
docker-compose up -d --build
```

## 🗄️ Backup Baze Podataka

```powershell
# Export
docker exec computerrunner_db pg_dump -U wol_user wol_db > backup.sql

# Import
cat backup.sql | docker exec -i computerrunner_db psql -U wol_user -d wol_db
```

## 📊 Monitoring

```powershell
# Status kontejnera
docker ps

# Logovi
docker-compose logs -f

# Logovi samo backend-a
docker logs computerrunner_backend --tail=100 -f
```

## 🛠️ Troubleshooting

### Kontejneri se ne pokreću
```powershell
docker-compose logs
```

### Port je zauzet
```powershell
# Windows
netstat -ano | findstr :80

# Linux
sudo lsof -i :80
```

### Reset baze podataka
```powershell
docker-compose down -v
docker-compose up -d
# Ponovo kreirajte admin korisnika
```

## 📞 Pomoć

Za dodatnu pomoć, pogledajte:
- `SETUP.md` - Detaljna dokumentacija
- `SSL-SETUP.md` - SSL konfiguracija
- GitHub Issues (ako dostupno)

---

**Verzija:** 1.0.0
**Datum:** Generated on %%DATE%%
'@ | Out-File -FilePath "$exportDir\DEPLOYMENT-README.md" -Encoding UTF8

# Dodavanje datuma u README
(Get-Content "$exportDir\DEPLOYMENT-README.md") -replace '%%DATE%%', (Get-Date -Format "yyyy-MM-dd HH:mm:ss") | Set-Content "$exportDir\DEPLOYMENT-README.md"

# Kompresovanje u ZIP arhivu
Write-Host "`n6. Kompresovanje deployment paketa..." -ForegroundColor Yellow
$zipPath = ".\$packageName.zip"
Compress-Archive -Path "$exportDir\*" -DestinationPath $zipPath -Force

# Veličina paketa
$size = (Get-Item $zipPath).Length / 1MB
$sizeFormatted = [math]::Round($size, 2)

Write-Host "`n✅ Deployment paket kreiran!" -ForegroundColor Green
Write-Host "`n📦 Paket:" -ForegroundColor Cyan
Write-Host "   Fajl: $zipPath" -ForegroundColor White
Write-Host "   Veličina: $sizeFormatted MB" -ForegroundColor White
Write-Host "`n📋 Sledeći koraci:" -ForegroundColor Cyan
Write-Host "   1. Kopirajte $zipPath na server" -ForegroundColor White
Write-Host "   2. Raspakujte ZIP fajl" -ForegroundColor White
Write-Host "   3. Pokrenite deploy.ps1 (Windows) ili deploy.sh (Linux)" -ForegroundColor White
Write-Host "`n📄 Dokumentacija: deployment-package\DEPLOYMENT-README.md" -ForegroundColor Yellow

# Cleanup temporary folder
Write-Host "`nBrisanje privremenih fajlova..." -ForegroundColor Yellow
Remove-Item -Path $exportDir -Recurse -Force

Write-Host "`nGotovo!" -ForegroundColor Green
