# ComputerRunner - Deployment Paket

## 📦 Sadržaj Paketa

Kada raspakujete ZIP fajl, dobijate:

- **backend/** - Flask backend aplikacija
- **frontend/** - Nginx frontend sa SSL podrškom
- **backend-image.tar** - Docker image za backend (~2-3 GB)
- **frontend-image.tar** - Docker image za frontend (~50 MB)
- **postgres-image.tar** - Docker image za PostgreSQL (~80 MB)
- **docker-compose.yml** - Konfiguracija za Docker Compose
- **deploy.ps1** - Automatska deployment skripta za Windows
- **deploy.sh** - Automatska deployment skripta za Linux/Mac
- **get-ssl.ps1** - Skripta za SSL sertifikat (Windows)
- **get-ssl.sh** - Skripta za SSL sertifikat (Linux/Mac)
- **SSL-SETUP.md** - Detaljno uputstvo za SSL sertifikate
- **DEPLOYMENT-README.md** - Ovaj fajl

## 🚀 Brzo Pokretanje

### ⚠️ VAŽNO: Login Problem na Serveru

Ako nakon deployment-a **login ne radi** (ostajete na login stranici), pokrenite:

```powershell
# Windows
.\fix-login.ps1

# Linux
chmod +x fix-login.sh
./fix-login.sh
```

Ili pogledajte detalje: [SERVER-FIX.md](SERVER-FIX.md)

### Windows Server

1. Kopirajte ZIP fajl na server
2. Raspakujte ga (desni klik → Extract All)
3. Otvorite PowerShell **kao Administrator** u folderu
4. Pokrenite:

```powershell
.\deploy.ps1
```

Skripta će automatski:
- Proveriti Docker instalaciju
- Učitati sve Docker images
- Pokrenuti kontejnere
- Kreirati admin korisnika

### Linux/Mac Server

1. Kopirajte ZIP fajl na server
2. Raspakujte:

```bash
unzip computerrunner-*.zip -d computerrunner
cd computerrunner
```

3. Napravite skriptu izvršnom i pokrenite:

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

## 🔐 Prvi Login

Nakon uspešnog deployment-a:

- **URL:** `http://IP-ADRESA-SERVERA` ili `https://IP-ADRESA-SERVERA`
- **Korisnik:** `admin`
- **Lozinka:** `admin123`

### ⚠️ VEOMA VAŽNO: Promena Admin Lozinke

**ODMAH nakon prvog logina:**

1. Kliknite na "Профил" u meniju
2. U sekciji "Промени Лозинку" unesite novu bezbednu lozinku
3. Kliknite "Сачувај"

## 🌐 Konfiguracija Mreže

### Otvaranje Portova na Firewall-u

**Windows Server:**

```powershell
# HTTP port 80
New-NetFirewallRule -DisplayName "ComputerRunner HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# HTTPS port 443
New-NetFirewallRule -DisplayName "ComputerRunner HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

**Linux Server:**

```bash
# UFW firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ili iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## 🔒 SSL Sertifikat (HTTPS bez Upozorenja)

Trenutno aplikacija koristi **self-signed** SSL sertifikat, što znači da će browseri prikazivati upozorenje.

### Za Produkciju: Let's Encrypt (Besplatno & Bez Upozorenja)

**Preduslov:** Imate domen (npr. `wol.vasadomena.com`) koji pokazuje na server.

**Windows:**

```powershell
.\get-ssl.ps1 -Domain "wol.vasadomena.com" -Email "vas@email.com"
```

**Linux:**

```bash
chmod +x get-ssl.sh
./get-ssl.sh wol.vasadomena.com vas@email.com
```

Detaljno uputstvo: **SSL-SETUP.md**

## 💻 Dodavanje Računara

1. Prijavite se kao admin
2. Kliknite "Рачунари" → "Додај Рачунар"
3. Unesite:
   - **Име:** Naziv računara (npr. "Radna Stanica 1")
   - **MAC адреса:** Format `AA:BB:CC:DD:EE:FF` ili `AA-BB-CC-DD-EE-FF`
   - **IP адреса:** (opciono) Broadcast adresa mreže
   - **Опис:** (opciono) Kratak opis
   - **Додељени корисници:** Izaberite korisnike koji mogu da bude ovaj računar

### Kako Pronaći MAC Adresu?

**Windows:**

```cmd
ipconfig /all
```

Tražite "Physical Address" mrežne kartice.

**Linux:**

```bash
ip link show
```

ili

```bash
ifconfig
```

Tražite "HWaddr" ili "ether".

## 👥 Upravljanje Korisnicima

### Dodavanje Novog Korisnika

1. Admin panel → "Корисници" → "Додај Корисника"
2. Popunite formu:
   - Korisničko ime
   - Email
   - Lozinka
   - (Opciono) Označite kao Admin

### Brisanje Korisnika

1. "Корисници" → Kliknite crveni **X** pored korisnika
2. Potvrdite brisanje

### Dodela Računara Korisniku

Jedan računar može biti dodeljen **više korisnika**:

1. "Рачунари" → "Измени" pored računara
2. U sekciji "Додељени корисници" označite korisnike
3. Sačuvajte

## 📊 Praćenje i Logovi

### Status Kontejnera

```powershell
# Windows/Linux
docker ps
```

### Logovi Backend-a

```powershell
docker logs computerrunner_backend -f --tail=100
```

### Logovi Frontend-a

```powershell
docker logs computerrunner_frontend -f --tail=100
```

### Logovi Baze Podataka

```powershell
docker logs computerrunner_db -f --tail=100
```

## 🗄️ Backup i Restore

### Backup Baze Podataka

**Windows:**

```powershell
docker exec computerrunner_db pg_dump -U wol_user wol_db > backup-$(Get-Date -Format "yyyyMMdd-HHmmss").sql
```

**Linux:**

```bash
docker exec computerrunner_db pg_dump -U wol_user wol_db > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore Baze Podataka

```powershell
# Zaustavi backend
docker-compose stop backend

# Restore
Get-Content backup.sql | docker exec -i computerrunner_db psql -U wol_user -d wol_db

# Pokreni backend ponovo
docker-compose start backend
```

### Automatski Backup (Linux Cron)

```bash
# Kreiraj skriptu
nano /root/backup-computerrunner.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups/computerrunner"
mkdir -p "$BACKUP_DIR"
docker exec computerrunner_db pg_dump -U wol_user wol_db > "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
# Čuvaj samo backup-e iz poslednjih 30 dana
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
```

```bash
# Napravi izvršnom
chmod +x /root/backup-computerrunner.sh

# Dodaj u cron (svaki dan u 3 ujutru)
crontab -e
# Dodaj liniju:
0 3 * * * /root/backup-computerrunner.sh
```

## 🔄 Ažuriranje Aplikacije

1. Kopirajte novu verziju fajlova na server
2. Zaustavite kontejnere:

```powershell
docker-compose down
```

3. Rebuild images (ako ima izmena):

```powershell
docker-compose build
```

4. Pokrenite ponovo:

```powershell
docker-compose up -d
```

**Napomena:** PostgreSQL volume (`postgres_data`) ostaje sačuvan, tako da nećete izgubiti podatke.

## 🛠️ Troubleshooting

### Kontejneri se ne pokreću

```powershell
# Proveri logove
docker-compose logs

# Restart svih servisa
docker-compose restart
```

### Port 80 je već zauzet

```powershell
# Windows - proveri šta koristi port 80
netstat -ano | findstr :80

# Linux
sudo lsof -i :80

# Ako je IIS ili Apache, zaustavite ih ili promenite port u docker-compose.yml
```

### Backend ne može da se poveže sa bazom

```powershell
# Proveri da li je postgres kontejner pokrenut
docker ps | findstr postgres

# Restart postgres
docker-compose restart postgres

# Proveri logove
docker logs computerrunner_db
```

### Wake-on-LAN ne radi

Provera na računaru koji treba da se probudi:

1. **BIOS postavke:** Omogućite "Wake on LAN" ili "PXE Boot"
2. **Windows:** Network Adapter Settings → Advanced → Wake on Magic Packet: **Enabled**
3. **Firewall:** Ne blokira UDP port 9
4. **Ista mreža:** Server i računar moraju biti na istoj lokalnoj mreži

### Reset Admin Lozinke

```powershell
docker exec -it computerrunner_backend python
```

```python
from app import app, db
from models import User

with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    admin.set_password('nova_lozinka')
    db.session.commit()
    print('Lozinka promenjena!')
```

Pritisnite `Ctrl+Z` pa `Enter` da izađete.

### Potpuni Reset (Briše SVE podatke!)

```powershell
# UPOZORENJE: Ovo briše kompletnu bazu!
docker-compose down -v
docker-compose up -d

# Ponovo kreirajte admin korisnika
.\deploy.ps1  # ili samo admin kreiranje deo
```

## 📈 Performanse

### Optimizacija za Veliki Broj Korisnika

Editujte `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  
  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    command: postgres -c max_connections=100 -c shared_buffers=256MB
```

Restartujte:

```powershell
docker-compose down
docker-compose up -d
```

## 🆘 Podrška

### Provera Verzije

```powershell
docker images | findstr computerrunner
```

### Dodatni Resursi

- **SSL Setup:** `SSL-SETUP.md`
- **Docker dokumentacija:** https://docs.docker.com/
- **PostgreSQL dokumentacija:** https://www.postgresql.org/docs/

### Česta Pitanja

**Q: Može li aplikacija da radi bez interneta?**  
A: Da, nakon deployment-a radi potpuno offline (osim Let's Encrypt sertifikata).

**Q: Koliko korisnika/računara može podržati?**  
A: Sa default postavkama: 100+ korisnika, 500+ računara. Za više, optimizujte resurse.

**Q: Da li mogu koristiti drugi port umesto 80/443?**  
A: Da, izmenite `ports:` sekciju u `docker-compose.yml`.

**Q: Kako prebaciti na drugu mašinu?**  
A: Backup baze (pg_dump), kopirajte na novu mašinu, restore.

---

**Verzija:** 1.0  
**Datum:** Januar 2026  
**Autor:** ComputerRunner Team
