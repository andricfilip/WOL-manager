# 🚀 ComputerRunner - Wake-on-LAN Manager v2.0

Sistem za upravljanje računarima preko mreže sa **Wake-on-LAN**, **SSH Remote Shutdown** i **AES-256 enkripcijom**.

## ✨ Funkcionalnosti

### Core Features
- 🔌 **Wake-on-LAN** - Buđenje računara preko mreže
- 🔴 **Remote Shutdown** - Gašenje preko SSH (opciono)
- 🟢 **Real-Time Status** - Automatski monitoring (online/offline)
- 👥 **Multi-User** - Admin/User uloge sa granularnim permisijama
- 🔐 **Sigurnost** - AES-256 enkripcija SSH kredencijala, rate limiting, audit log

### v2.0 New Features ⭐
- 🎨 **Easy Branding** - Prilagođavanje kompanije/loga kroz environment variables (bez editovanja koda!)
- 🔔 **Live Notifications** - Real-time obaveštenja o dodelama/uklanjanjima računara
- 🎯 **Smart Filters** - Auto-submit filteri u istoriji (on-change, debounce search)
- 📊 **Timeline Visualization** - Vizuelna vremenska osa sa online/offline periodima (crveno/zeleno)
- 📱 **Full-Width Layout** - Potpuno responsive dashboard bez praznog prostora
- 🚀 **Deployment Automation** - Automatizovani deployment script sa backup/restore
- 🔄 **Migration System** - Sigurne database migracije za upgrades

## 🛠️ Stack

Flask + PostgreSQL + Socket.IO + Nginx + Docker

---

## 🚀 Brzi Start

### Production Deployment
```bash
# Quick start
docker compose -f docker-compose.prod.yml up -d --build
```

**Admin pristup:** `admin` / `admin123` (promeni nakon prve prijave!)

📖 **Deployment:** [DEPLOY.md](DEPLOY.md) | [QUICK_DEPLOY.md](QUICK_DEPLOY.md)  
🎨 **Branding:** [BRANDING_V2.md](BRANDING_V2.md)  
🔄 **Migrations:** [MIGRATION_v2.md](MIGRATION_v2.md)

---

---

## 🏗️ Arhitektura i Tok Podataka

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Chrome/Firefox)                  │
│  http://localhost:13223 ili http://192.168.1.100            │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP Request
                             ↓
┌─────────────────────────────────────────────────────────────┐
│           Nginx (Frontend Container) :80                     │
│  • Servira HTML/CSS/JS                                      │
│  • Proxy → backend:5000                                     │
│  • Socket.IO WebSocket proxy                                │
└────────────────────────────┬────────────────────────────────┘
                             │ proxy_pass
                             ↓
┌─────────────────────────────────────────────────────────────┐
│           Flask (Backend Container) :5000                    │
│  • REST API (/api/*)                                        │
│  • Wake-on-LAN broadcast (UDP port 9)                      │
│  • SSH shutdown (paramiko)                                  │
│  • Real-time Socket.IO events                              │
└────────────────────────────┬────────────────────────────────┘
                             │ SQL queries
                             ↓
┌─────────────────────────────────────────────────────────────┐
│         PostgreSQL (Database Container) :5432                │
│  • Korisnici, računari, logovi                             │
│  • AES-256 enkriptovane SSH lozinke                        │
└─────────────────────────────────────────────────────────────┘

         ↓ WoL Magic Packet (broadcast)
    
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PC #1       │  │  PC #2       │  │  PC #3       │
│  Offline →   │  │  Online      │  │  Offline →   │
│  Wakes up    │  │  Can shutdown│  │  Wakes up    │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Cloudflare CDN:**
- Font Awesome ikone → Učitava sa `cdnjs.cloudflare.com`
- Socket.IO klijent → Učitava sa `cdn.socket.io`
- ❌ **Ne komunicira** sa tvojim podacima
- ✅ Samo static resursi (CSS/JS biblioteke)

---

## 📦 Production Deployment

### 🐧 Production (Linux Server) - Secure Build

**Proizvodni build NEMA volumes - sve je zapečaćeno u Docker image!**

```bash
# 1. Clone i uđi u folder
git clone <repo-url>
cd WOL-manager

# 2. Edituj docker-compose.prod.yml
nano docker-compose.prod.yml

# 3. Promeni vrednosti označene sa "PROMENI_OVO":
#    a) Generiši SECRET_KEY:
python3 -c "import secrets; print(secrets.token_hex(32))"
#    b) Generiši ENCRYPTION_KEY:
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
#    c) Saznaj IP adresu servera:
hostname -I  # Uzmi prvu IP adresu
#    d) Postavi PostgreSQL lozinku (u postgres i DATABASE_URL)

# 4. Build i pokreni
docker compose -f docker-compose.prod.yml up -d --build
```

**Pristup:** http://IP_SERVERA

**⚠️ Važno:** 
- Production NE koristi `.env` fajl - sve je hardkodovano
- Koristi `network_mode: host` (potrebno za WoL broadcast)
- Sve promenljive direktno u docker-compose.prod.yml fajlu

---

## ⚙️ Detaljno Konfiguracija

### Koje Fajlove Menjati i Kada

#### 1. `.env` Fajl - Glavne Postavke (📝 UVEK MENJAŠ OVO)

**Lokacija:** `WOL-manager/.env`

```bash
# Za Dev: kopiraj template
cp .env.dev .env

# Za Production: kopiraj i izmeni
cp .env.prod .env
nano .env
```

**Sve opcije:**

| Varijabla | Šta je | Dev | Production | Kada menjati |
|-----------|--------|-----|------------|--------------|
| `BACKEND_HOST` | IP backend servera | localhost | **192.168.x.x** | ⚠️ OBAVEZNO za production! Koristi `hostname -I` |
| `HTTP_PORT` | Web port | 13223 | 80 | Ako imaš konflikt portova |
| `HTTPS_PORT` | SSL port | 8443 | 443 | Za SSL |
| `SECRET_KEY` | Flask sesije | default | **GENERIŠI!** | Uvek za production! |
| `ENCRYPTION_KEY` | SSH pass encryption | auto | **GENERIŠI!** | Uvek za production! |
| `POSTGRES_DB` | DB ime | wol_db | wol_db | Retko |
| `POSTGRES_USER` | DB user | wol_user | wol_user | Retko |
| `POSTGRES_PASSWORD` | DB pass | default | **GENERIŠI!** | Uvek za production! |
| `DB_PORT` | PostgreSQL port | 5432 | 5432 | Ako imaš konflikt |

**Kako generisati keys:**
```bash
# SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

#### 2. Docker Compose Fajlovi (❌ RETKO MENJATI)

**`docker-compose.yml`** - Za development (Windows/Mac)
- Bridge network mode
- Port mapiranje: `${HTTP_PORT}:80`
- **Ne menjaš osim ako:**
  - Dodaješ nove servise
  - Menjašš volume paths
  - Custom Docker konfiguracija

**`docker-compose.prod.yml`** - Za production (Linux)
- **Host network mode** (kritično za WoL!)
- `privileged: true` na backend
- **Ne menjaš osim ako:**
  - Dodaješ SSL volume mount
  - Custom healthchecks
  - Dodatne servise

---

### Promena Portova - Korak po Korak

#### Scenario 1: Port 13223 je zauzet (Development)

**Izmeni samo `.env` fajl:**
```bash
nano .env

# Izmeni liniju:
HTTP_PORT=8080    # ili bilo koji slobodan port
HTTPS_PORT=8443   # ovo može ostati
```

**Restart:**
```bash
docker-compose down
docker-compose up -d
```

**Novi pristup:** `http://localhost:8080`

---

#### Scenario 2: Port 80 je zauzet (Production)

**Izmeni samo `.env` fajl:**
```bash
nano .env

# Izmeni liniju:
HTTP_PORT=8080    # custom port
```

**Restart:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**Novi pristup:** `http://IP_SERVERA:8080`

---

#### Scenario 3: Postgres port 5432 zauzet

**Izmeni `.env`:**
```bash
DB_PORT=5433   # novi port
```

**⚠️ Moraš restartovati sve kontejnere** (baza je promenjena):
```bash
docker-compose down -v  # ⚠️ Briše bazu!
docker-compose up -d --build
```

---

### Promena IP Adrese (BACKEND_HOST)

#### Kada trebaš da promeniš:
- ✅ Deploy na novi server
- ✅ IP servera se promenio
- ✅ Koristiš različite mreže (dev → prod)

#### Kako saznati svoj IP:

**Windows:**
```powershell
ipconfig | findstr IPv4
# Rezultat: IPv4 Address. . . . : 192.168.1.50
```

**Linux:**
```bash
ip addr show | grep inet
# ili
hostname -I
```

**Izmeni `.env`:**
```bash
BACKEND_HOST=192.168.1.50  # tvoj server IP
```

**Restart frontend kontejnera:**
```bash
docker-compose restart frontend
```

---

## 🌐 Cloudflare - Šta je i Zašto?

**Cloudflare CDN** se koristi **SAMO** za učitavanje eksternih biblioteka:

### Koje biblioteke:
1. **Font Awesome** (`cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/`)
   - Za ikone: 🔌 ⚡ 🔴 ✅
   
2. **Socket.IO Client** (`cdn.socket.io/4.5.4/socket.io.min.js`)
   - Za real-time status updates

### Zašto Cloudflare?
- ✅ **Brže učitavanje** - globalna CDN mreža
- ✅ **Cached** - biblioteke verovatno već u browser cache-u
- ✅ **Pouzdano** - 99.99% uptime
- ✅ **Besplatno** - public CDN

### Da li moram koristiti internet?
**DA** - za učitavanje ikona i Socket.IO biblioteke.

**Alternativa (offline):**
Ako želiš potpuno offline rad:
1. Downloaduj Font Awesome i Socket.IO lokalno
2. Stavi ih u `frontend/static/`
3. Izmeni `backend/templates/base.html` linije:
   - `<link href="cdnjs...font-awesome">` → `<link href="/static/font-awesome.css">`
   - `<script src="cdn.socket.io">` → `<script src="/static/socket.io.min.js">`

**⚠️ Napomena:** CSP header u `backend/security.py` će također trebati izmenu (ukloni `https://cdn.socket.io` i `https://cdnjs.cloudflare.com`).

---

## ⚙️ Kompletan Primer Konfiguracije

### Primer 1: Dev na Windows (port konflikt)

```bash
# .env
BACKEND_HOST=localhost
HTTP_PORT=9000      # promenjen jer je 13223 zauzet
HTTPS_PORT=9443
SECRET_KEY=dev-default
ENCRYPTION_KEY=dev-key-12345

# Restart
docker-compose down
docker-compose up -d

# Pristup
http://localhost:9000
```

---

### Primer 2: Production na Linux Server

```bash
# .env
BACKEND_HOST=192.168.1.100    # IP tvog servera
HTTP_PORT=80
HTTPS_PORT=443
SECRET_KEY=f3a8b7c5d9e2a1f4b6c8e0d2a4f6b8c0e2a4f6b8c0e2a4f6b8c0e2a4f6b8  # generiši!
ENCRYPTION_KEY=X7qP9mK3vL2nB5jF8hD4gS6wE1rT0uI9oY8pA7sZ6xC5vB4nM3kL2jH1gF=  # generiši!
POSTGRES_PASSWORD=SuperJakaLozinka2026!

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Pristup sa bilo kog računara u mreži
http://192.168.1.100
```

---

### Primer 3: Raspberry Pi sa custom portom

```bash
# .env
BACKEND_HOST=192.168.1.50     # Raspberry Pi IP
HTTP_PORT=8080                # Nginx već koristi 80
HTTPS_PORT=8443
# ... ostale vrednosti kao u Primeru 2

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Pristup
http://192.168.1.50:8080
```

---

## 📋 Fajlovi i Njihove Uloge

| Fajl | Šta radi | Menjaj ako |
|------|----------|-----------|
| `.env` | **Glavna konfiguracija** | ✅ Uvek kad menjat setup |
| `.env.dev` | Template za dev | 🔵 Za backup/share |
| `.env.prod` | Template za prod | 🔵 Za backup/share |
| `docker-compose.yml` | Dev orchestration | ⚠️ Retko (novi servisi) |
| `docker-compose.prod.yml` | Prod orchestration | ⚠️ Retko (SSL, volumes) |
| `backend/config.py` | Flask config | ❌ Ne diraj (koristi env vars) |
| `backend/security.py` | CSP headers | ⚠️ Samo za offline mode |
| `frontend/nginx.conf` | Nginx routing | ❌ Ne diraj (auto config) |

---

## ⚙️ Konfiguracija - Quick Reference

## ⚙️ Konfiguracija - Quick Reference

### Najčešće Izmene

```bash
# 1. Promena porta → Samo .env
HTTP_PORT=8080

# 2. Promena IP → Samo .env
BACKEND_HOST=192.168.1.100

# 3. Novi secrets → Samo .env
SECRET_KEY=...
ENCRYPTION_KEY=...

# 4. Posle SVAKE izmene .env
docker-compose restart

# 5. Potpuni rebuild (ako ima problema)
docker-compose down
docker-compose up -d --build
```

---

## 🔧 SSH Setup (Opciono za Shutdown)

**⚠️ Shutdown dugme se prikazuje samo ako su SSH parametri konfigurisani za računar!**

### Windows

```powershell
# Kao Administrator
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH' -Protocol TCP -LocalPort 22 -Action Allow
```

### Linux

```bash
sudo apt install openssh-server -y
sudo systemctl enable --now ssh
sudo ufw allow 22
```

**Test:** `ssh korisnik@IP`

---

## 📚 Korišćenje

### 1. Prva Prijava
- Login: `admin` / `admin123`
- **Profile → Promeni Lozinku**

### 2. Dodavanje Računara (Admin Panel)
- **Naziv**: Ime računara
- **MAC Adresa**: `AA:BB:CC:DD:EE:FF` (za WoL)
- **IP Adresa**: Za ping status
- **SSH parametri** (opciono za shutdown):
  - SSH Host, Port (22), Username, Password
  - ✅ Ako popuniš SSH - prikazuje se "Ugasi" dugme
  - ❌ Bez SSH - samo "Uključi" dugme

### 3. Upravljanje
- 🟢 **Online** → "Ugasi" (ako ima SSH)
- 🔴 **Offline** → "Uključi" (WoL)
- Status auto-refresh: 30s

---

## 🐳 Docker Komande

```bash
# Pokreni (dev)
docker-compose up -d

# Pokreni (production)
docker-compose -f docker-compose.prod.yml up -d

# Rebuild
docker-compose up -d --build

# Stop
docker-compose down

# Stop + obriši bazu
docker-compose down -v

# Logovi
docker-compose logs -f

# Status
docker-compose ps
```

---

## � Sve o Portovima

### Portovi koje Koristi Aplikacija

| Port | Servis | Ko Sluša | Zašto | Menjaš u |
|------|--------|----------|-------|----------|
| **13223** | HTTP Web (dev) | Nginx → Browser | Razvoj, ne konfliktuje | `.env → HTTP_PORT` |
| **8443** | HTTPS Web (dev) | Nginx → Browser | SSL u dev | `.env → HTTPS_PORT` |
| **80** | HTTP Web (prod) | Nginx → Browser | Standard port | `.env → HTTP_PORT` |
| **443** | HTTPS Web (prod) | Nginx → Browser | SSL u prod | `.env → HTTPS_PORT` |
| **5000** | Backend API | Flask | Interno (Docker) | ❌ Ne menjaj |
| **5432** | PostgreSQL | Database | Interno (Docker) | `.env → DB_PORT` |

### Port Mapping - Kako Radi

```
Browser           Docker Host          Container
   ↓                   ↓                    ↓
:13223  ────────→  :13223  ────────→  nginx:80
                    ↓
                frontend kontejner mapa: HTTP_PORT:80
                    ↓
                nginx proxy_pass → backend:5000
                    ↓
                backend kontejner sluša port 5000
```

### Provera Zauzetih Portova

**Windows:**
```powershell
# Proveri specifičan port
netstat -ano | findstr :13223

# Ako je zauzet, vidi koji proces
tasklist | findstr <PID>
```

**Linux:**
```bash
# Proveri port
sudo lsof -i :80
# ili
sudo netstat -tulpn | grep :80
```

---

## 🔍 Troubleshooting

### Problem: Port je već zauzet

**Greška:**
```
Error: bind: address already in use
```

**Rešenje:**
```bash
# 1. Pronađi koji proces koristi port (Windows)
netstat -ano | findstr :13223

# 2. Ubit proces (ako nije bitan)
taskkill /PID <PID> /F

# 3. ILI promeni port u .env
nano .env
HTTP_PORT=9000  # slobodan port

# 4. Restart
docker-compose restart
```

---

### WoL ne radi

**BIOS:** Omogući "Wake-on-LAN"  
**Windows:** Device Manager → Network Adapter → Power Management → ✅ Allow wake  
**Linux:** `sudo ethtool -s eth0 wol g`

### Status uvek "Offline"

**Windows:** Omogući ICMP ping
```powershell
netsh advfirewall firewall add rule name="ICMP Allow" protocol=icmpv4:8,any dir=in action=allow
```

**Linux:**
```bash
sudo ufw allow from 192.168.1.0/24 to any proto icmp
```

### SSH Shutdown ne radi

1. Test SSH konekciju: `ssh user@IP`
2. Proveri servis:
   - Windows: `Get-Service sshd`
   - Linux: `sudo systemctl status ssh`
3. Proveri SSH kredencijale u aplikaciji

---

## 📊 Dev vs Production

| | Development | Production |
|---|-------------|------------|
| **Compose** | `docker-compose.yml` | `docker-compose.prod.yml` |
| **Network** | Bridge | **Host** (za WoL) |
| **Port** | 13223 | 80 |
| **Keys** | Default | **GENERIŠI!** |
| **OS** | Windows/Mac | Linux |

---

## 🔐 Production Checklist

- [ ] Generiši `SECRET_KEY` i `ENCRYPTION_KEY`
- [ ] Postavi jaku `POSTGRES_PASSWORD`
- [ ] Promeni default admin lozinku
- [ ] Proveri `BACKEND_HOST` IP adresu
- [ ] Koristi `docker-compose.prod.yml`
- [ ] Konfiguriši firewall
- [ ] Setup backup baze

```bash
# Backup
docker exec computerrunner_db pg_dump -U wol_user wol_db > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i computerrunner_db psql -U wol_user wol_db < backup.sql
```

---

## 🎯 Praktični Primeri - Šta Menjati Kada

### 📝 Scenario 1: Deployment na novi server

**Problem:** Instalirao sam na novi server sa IP `192.168.5.100`, ali aplikacija ne radi.

**Rešenje:**
```bash
# 1. Edituj .env
nano .env

# 2. Promeni liniju:
BACKEND_HOST=192.168.5.100

# 3. Restart samo frontend (on koristi BACKEND_HOST)
docker-compose -f docker-compose.prod.yml restart frontend

# 4. Test
curl http://192.168.5.100
```

**Koje fajlove si menjao:** Samo `.env`

---

### 📝 Scenario 2: Port 80 je zauzet (Apache/Nginx na host)

**Problem:** `Error: bind: address already in use 0.0.0.0:80`

**Rešenje:**
```bash
# 1. Proveri ko koristi port 80
sudo lsof -i :80

# 2. Odluči:
#    a) Ugasi drugi servis (Apache/Nginx)
#    b) Promeni WOL Manager port

# Opcija B - Promeni port:
nano .env
HTTP_PORT=8080  # slobodan port

# 3. Restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 4. Novi pristup
http://192.168.1.100:8080
```

**Koje fajlove si menjao:** Samo `.env`

---

### 📝 Scenario 3: Imam više WOL Manager instanci (različite lokacije)

**Problem:** Želim instalaciju na kućnom serveru (192.168.1.50) i poslovnom (10.0.0.20).

**Rešenje - Instance 1 (Kuća):**
```bash
# .env
BACKEND_HOST=192.168.1.50
HTTP_PORT=13223
POSTGRES_PASSWORD=kuca_lozinka_123
DB_PORT=5432

# Deploy
docker-compose up -d
```

**Rešenje - Instance 2 (Posao):**
```bash
# .env
BACKEND_HOST=10.0.0.20
HTTP_PORT=13223
POSTGRES_PASSWORD=posao_lozinka_456
DB_PORT=5433  # ⚠️ Mora biti različit ako je na istom host OS

# Deploy
docker-compose up -d
```

**Koje fajlove si menjao:** Samo `.env` (različit za svaku lokaciju)

---

### 📝 Scenario 4: Offline mode (bez interneta)

**Problem:** Server nema pristup internetu, ne učitava Font Awesome ikone.

**Rešenje:**
```bash
# 1. Downloaduj biblioteke (sa računara koji ima net)
mkdir -p frontend/static/libs
cd frontend/static/libs

wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2
wget https://cdn.socket.io/4.5.4/socket.io.min.js

# 2. Edituj backend/templates/base.html
nano backend/templates/base.html

# Linija ~20: Promeni
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
# U:
<link rel="stylesheet" href="/static/libs/all.min.css">

# Linija ~391: Promeni
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
# U:
<script src="/static/libs/socket.io.min.js">

# 3. Edituj backend/security.py - ukloni CDN iz CSP
nano backend/security.py

# Linija ~35-39: Promeni
"script-src 'self' 'unsafe-inline' https://cdn.socket.io https://cdnjs.cloudflare.com; "
# U:
"script-src 'self' 'unsafe-inline'; "

# 4. Rebuild
docker-compose down
docker-compose up -d --build
```

**Koje fajlove si menjao:** 
- `frontend/static/libs/` (dodao fajlove)
- `backend/templates/base.html` (promenio linkove)
- `backend/security.py` (uklonio CDN iz CSP)

---

### 📝 Scenario 5: Želim HTTPS sa SSL certifikatom

**Problem:** Imam Let's Encrypt certifikat, kako ga koristim?

**Rešenje:**
```bash
# 1. Kopiraj certifikate
mkdir -p frontend/ssl
cp /etc/letsencrypt/live/tvoj-domen.com/fullchain.pem frontend/ssl/cert.pem
cp /etc/letsencrypt/live/tvoj-domen.com/privkey.pem frontend/ssl/key.pem

# 2. Edituj frontend/nginx.conf
nano frontend/nginx.conf

# Dodaj server block za HTTPS (linija ~40):
server {
    listen 443 ssl;
    server_name tvoj-domen.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... ostali location blokovi kao u HTTP
}

# 3. Edituj .env
nano .env
SESSION_COOKIE_SECURE=true  # omogući secure cookies

# 4. Restart
docker-compose -f docker-compose.prod.yml restart frontend

# 5. Pristup
https://tvoj-domen.com
```

**Koje fajlove si menjao:**
- `frontend/ssl/` (dodao certifikate)
- `frontend/nginx.conf` (dodao SSL server block)
- `.env` (SESSION_COOKIE_SECURE=true)

---

## 🆘 Najčešća Pitanja

**Q: Šta je BACKEND_HOST i zašto je bitan?**  
A: IP adresa na kojoj frontend (nginx) može da nađe backend (Flask). U dev je `localhost`, u prod mora biti IP servera.

**Q: Koji port koristi WoL?**  
A: WoL koristi UDP port 9 za Magic Packet. Ne menjaš ovo nigde, automatski je.

**Q: Zašto production koristi `network_mode: host`?**  
A: WoL broadcast ne radi kroz Docker bridge network. Host mode omogućava direktan pristup host mrežnom interfejsu.

**Q: Da li mogu koristiti PostgreSQL na host-u umesto kontejnera?**  
A: Da, promeni `DATABASE_URL` u `.env`:
```bash
DATABASE_URL=postgresql://user:pass@host.docker.internal:5432/dbname
```

**Q: Kako da uvek pristupam sa domenskim imenom?**  
A: Dodaj u `/etc/hosts` (Linux) ili `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
192.168.1.100  wol-manager.local
```
Pristup: `http://wol-manager.local:13223`

---

## 📋 Licence

MIT
