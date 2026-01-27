# ComputerRunner - Quick Reference

## Brzi Startovi

### Nova Instalacija

```bash
# Linux
chmod +x deploy.sh
sudo ./deploy.sh

# Windows
.\deploy.ps1
```

### Login Problem - Automatski Fix

```bash
# Linux
chmod +x fix-login.sh
./fix-login.sh

# Windows
.\fix-login.ps1
```

### Windows Line Endings Problem (Linux)

```bash
dos2unix *.sh
chmod +x *.sh
# ILI
sed -i 's/\r$//' *.sh
chmod +x *.sh
```

## Docker Komande

### Status

```bash
docker ps                        # Running kontejneri
docker-compose ps                # Svi servisi
docker stats                     # Resursi
```

### Logovi

```bash
docker logs computerrunner_backend -f --tail=100
docker logs computerrunner_frontend -f --tail=50
docker logs computerrunner_db -f --tail=50
docker-compose logs -f          # Svi servisi
```

### Restart

```bash
docker-compose restart           # Restart svih servisa
docker-compose restart backend   # Samo backend
docker-compose down              # Zaustavi sve
docker-compose up -d             # Pokreni sve
docker-compose up -d --build     # Rebuild i pokreni
```

### Kompletni Reset (BRIŠE SVE!)

```bash
docker-compose down -v           # Briše i volumes
docker-compose up -d --build
```

## Administracija

### Kreiranje Admin Korisnika

```bash
docker exec -it computerrunner_backend python
```

```python
from app import app, db
from models import User

with app.app_context():
    admin = User(username='admin', email='admin@example.com', is_admin=True)
    admin.set_password('admin123')
    db.session.add(admin)
    db.session.commit()
    print('Gotovo!')
exit()
```

### Reset Admin Lozinke

```bash
docker exec -it computerrunner_backend python
```

```python
from app import app, db
from models import User

with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    admin.set_password('nova_lozinka')
    db.session.commit()
    print('Gotovo!')
exit()
```

### Dodavanje Novog Korisnika (Programski)

```bash
docker exec -it computerrunner_backend python
```

```python
from app import app, db
from models import User

with app.app_context():
    user = User(username='milan', email='milan@example.com', is_admin=False)
    user.set_password('lozinka123')
    db.session.add(user)
    db.session.commit()
    print('Korisnik milan kreiran!')
exit()
```

## Backup i Restore

### Backup Baze

```bash
# PostgreSQL dump
docker exec computerrunner_db pg_dump -U wol_user wol_db > backup-$(date +%Y%m%d).sql

# Kompresovano
docker exec computerrunner_db pg_dump -U wol_user wol_db | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore Baze

```bash
# Stop backend prvo
docker-compose stop backend

# Restore
cat backup.sql | docker exec -i computerrunner_db psql -U wol_user -d wol_db

# ILI kompresovano
gunzip -c backup.sql.gz | docker exec -i computerrunner_db psql -U wol_user -d wol_db

# Start backend
docker-compose start backend
```

### Export Docker Volume

```bash
# Backup volume
docker run --rm -v computerrunner_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz /data

# Restore volume
docker run --rm -v computerrunner_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-data.tar.gz -C /
```

## Mreža i Portovi

### Provera Portova

```bash
# Linux
sudo lsof -i :80
sudo lsof -i :443
sudo netstat -tlnp | grep -E '80|443'

# Windows
netstat -ano | findstr :80
netstat -ano | findstr :443
```

### Firewall Otvaranje Portova

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

## SSL Sertifikati

### Let's Encrypt (Automatski)

```bash
# Linux
chmod +x get-ssl.sh
./get-ssl.sh your-domain.com your@email.com

# Windows
.\get-ssl.ps1 -Domain "your-domain.com" -Email "your@email.com"
```

### Provera SSL Sertifikata

```bash
# Datum isteka
openssl x509 -in frontend/ssl/cert.pem -noout -dates

# Pun info
openssl x509 -in frontend/ssl/cert.pem -noout -text

# Test sa curl
curl -vI https://localhost
```

### Obnova Sertifikata

```bash
# Automatska obnova (cron job - Linux)
0 3 * * 1 /path/to/get-ssl.sh your-domain.com your@email.com >> /var/log/ssl-renewal.log 2>&1
```

## Wake-on-LAN Testiranje

### Provera MAC Adrese

```bash
# Linux
ip link show
ifconfig

# Windows
ipconfig /all
getmac
```

### Ručno Slanje WoL Paketa (Test)

```bash
# Instaliraj wakeonlan tool
sudo apt-get install wakeonlan   # Debian/Ubuntu
sudo yum install wol              # CentOS/RHEL

# Pošalji WoL paket
wakeonlan AA:BB:CC:DD:EE:FF
# ILI
wol AA:BB:CC:DD:EE:FF
```

### WoL Testiranje iz Backend Kontejnera

```bash
docker exec -it computerrunner_backend python
```

```python
from wol import send_wol_packet

# Pošalji WoL paket
result = send_wol_packet('AA:BB:CC:DD:EE:FF', '255.255.255.255')
print(result)
exit()
```

## Monitoring

### Cron Automatizacija (Linux)

```bash
# Edit crontab
crontab -e

# Primeri:
# Backup svaki dan u 3h ujutru
0 3 * * * docker exec computerrunner_db pg_dump -U wol_user wol_db > /root/backups/cr-$(date +\%Y\%m\%d).sql

# Čišćenje starih backup-a (starijih od 30 dana)
0 4 * * * find /root/backups/ -name "cr-*.sql" -mtime +30 -delete

# Restart aplikacije svake nedelje
0 2 * * 0 cd /path/to/computerrunner && docker-compose restart
```

### Systemd Auto-start (Linux)

```bash
# Kreiraj systemd service
sudo nano /etc/systemd/system/computerrunner.service
```

```ini
[Unit]
Description=ComputerRunner WoL Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/computerrunner
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Enable i start
sudo systemctl daemon-reload
sudo systemctl enable computerrunner
sudo systemctl start computerrunner
sudo systemctl status computerrunner
```

## Performance Tuning

### PostgreSQL Memory Tuning

Edituj `docker-compose.yml`:

```yaml
postgres:
  command: 
    - "postgres"
    - "-c"
    - "max_connections=100"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
    - "-c"
    - "work_mem=16MB"
```

### Docker Resource Limits

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 512M
```

## Troubleshooting

### "Permission denied" za WoL

```bash
# Proveri capabilities
docker inspect computerrunner_backend | grep -A 10 CapAdd

# Trebalo bi da vidite: NET_RAW, NET_ADMIN, NET_BROADCAST
```

### Backend ne može da se poveže sa bazom

```bash
# Proveri da li postgres radi
docker exec computerrunner_db pg_isready -U wol_user

# Proveri logove
docker logs computerrunner_db

# Test konekcije
docker exec computerrunner_db psql -U wol_user -d wol_db -c "SELECT 1"
```

### Frontend vraća 502 Bad Gateway

```bash
# Backend je verovatno down
docker logs computerrunner_backend

# Restart backend
docker-compose restart backend

# Proveri health
curl http://localhost:5000/
```

## Brze Provere

```bash
# Sve u jednoj liniji - status check
docker ps && docker logs computerrunner_backend --tail=10 && curl -s http://localhost/auth/login | grep -q "Пријава" && echo "OK: Aplikacija radi!" || echo "ERROR: Problem sa aplikacijom"

# Provera SECRET_KEY
docker exec computerrunner_backend python -c "from app import app; print('SECRET_KEY:', 'OK' if len(app.config.get('SECRET_KEY', '')) > 10 else 'ERROR')"

# Provera baze
docker exec computerrunner_db psql -U wol_user -d wol_db -c "SELECT COUNT(*) FROM users"
```

---

**Napomena:** Za detaljnu dokumentaciju pogledajte:
- [DEPLOYMENT-README.md](DEPLOYMENT-README.md) - Deployment vodič
- [SERVER-FIX.md](SERVER-FIX.md) - Troubleshooting
- [SSL-SETUP.md](SSL-SETUP.md) - SSL konfiguracija
