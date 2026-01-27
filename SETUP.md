# ComputerRunner - Setup Guide

## Quick Start with Docker Compose

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Step 1: Clone the Repository
```bash
cd ComputerRunner
```

### Step 2: Start the Application
```bash
docker-compose up -d
```

This will:
- Build the Flask backend
- Build the Nginx frontend
- Start all services
- Create the database

### Step 3: Create Admin User
```bash
docker-compose exec backend python << 'EOF'
from app import app, db
from models import User

with app.app_context():
    db.create_all()
    
    # Check if admin already exists
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            email='admin@example.com',
            is_admin=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print('✓ Admin user created: admin / admin123')
    else:
        print('✓ Admin user already exists')
EOF
```

### Step 4: Access the Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000

### Step 5: Login
- Username: `admin`
- Password: `admin123`

**IMPORTANT**: Change the admin password after first login!

---

## Local Development Setup

### Prerequisites
- Python 3.9+
- pip
- Virtual environment (optional but recommended)

### Step 1: Create Virtual Environment
```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Initialize Database
```bash
python << 'EOF'
from app import app, db
from models import User

with app.app_context():
    db.create_all()
    
    admin = User(
        username='admin',
        email='admin@example.com',
        is_admin=True
    )
    admin.set_password('admin123')
    db.session.add(admin)
    db.session.commit()
    print('Database initialized!')
EOF
```

### Step 4: Run the Backend
```bash
python app.py
```

Backend will run on: http://localhost:5000

### Step 5: Serve Frontend (in another terminal)
```bash
cd frontend
python -m http.server 8000
```

Frontend will run on: http://localhost:8000

### Step 6: Login
- Username: `admin`
- Password: `admin123`

---

## Production Deployment

### Checklist
- [ ] Change SECRET_KEY in .env
- [ ] Change admin password
- [ ] Use PostgreSQL instead of SQLite
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Configure logging
- [ ] Set up monitoring

### Recommended Server Setup

#### Using Nginx Reverse Proxy
```nginx
upstream flask_app {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://flask_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### Using Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

#### Using PostgreSQL
1. Install PostgreSQL
2. Create database:
```sql
CREATE DATABASE computerrunner;
CREATE USER admin WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE computerrunner TO admin;
```

3. Update config.py:
```python
SQLALCHEMY_DATABASE_URI = 'postgresql://admin:password@localhost/computerrunner'
```

---

## Prebacivanje na Drugu Mašinu (Migration)

### Metoda 1: Export/Import PostgreSQL Volume (Preporučeno)

#### Korak 1: Na STAROJ mašini - Export baze podataka
```bash
# Zaustavite kontejnere
docker-compose down

# Kreirajte backup PostgreSQL volume-a
docker run --rm \
  -v computerrunner_postgres_data:/data \
  -v ${PWD}:/backup \
  alpine tar czf /backup/database-backup.tar.gz -C /data .

# Alternativno na Windows PowerShell:
docker run --rm -v computerrunner_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/database-backup.tar.gz -C /data .
```

#### Korak 2: Kopirajte fajlove na novu mašinu
Prebacite sledeće fajlove/foldere na novu mašinu:
- Ceo `ComputerRunner` folder (sa svim kodom)
- `database-backup.tar.gz` fajl

#### Korak 3: Na NOVOJ mašini - Import baze podataka
```bash
# Pozicionirajte se u ComputerRunner folder
cd ComputerRunner

# Kreirajte PostgreSQL volume
docker volume create computerrunner_postgres_data

# Importujte backup u volume
docker run --rm \
  -v computerrunner_postgres_data:/data \
  -v ${PWD}:/backup \
  alpine tar xzf /backup/database-backup.tar.gz -C /data

# Na Windows PowerShell:
docker run --rm -v computerrunner_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/database-backup.tar.gz -C /data

# Pokrenite aplikaciju
docker-compose up -d
```

### Metoda 2: PostgreSQL Dump (SQL Export)

#### Korak 1: Na STAROJ mašini - Kreirajte SQL dump
```bash
# Export PostgreSQL baze u SQL fajl
docker exec computerrunner_db pg_dump -U wol_user wol_db > database-dump.sql
```

#### Korak 2: Na NOVOJ mašini - Importujte SQL dump
```bash
# Kopirajte database-dump.sql na novu mašinu
# Pokrenite kontejnere
docker-compose up -d

# Sačekajte da se PostgreSQL pokrene (10-15 sekundi)
Start-Sleep -Seconds 15

# Importujte SQL dump
cat database-dump.sql | docker exec -i computerrunner_db psql -U wol_user -d wol_db

# Na Windows PowerShell:
Get-Content database-dump.sql | docker exec -i computerrunner_db psql -U wol_user -d wol_db
```

### Metoda 3: Kompletna Migracija sa Docker Volumes

#### Korak 1: Backup SVIH podataka
```bash
# Na staroj mašini
docker-compose down

# Backup celog volume sistema
docker run --rm \
  -v computerrunner_postgres_data:/postgres \
  -v ${PWD}/backups:/backup \
  alpine tar czf /backup/full-backup-$(date +%Y%m%d).tar.gz -C /postgres .
```

#### Korak 2: Transfer
1. Arhivirajte ceo `ComputerRunner` folder
2. Prebacite `full-backup-YYYYMMDD.tar.gz` fajl
3. Kopirajte sve na novu mašinu

#### Korak 3: Restore na novoj mašini
```bash
cd ComputerRunner

# Kreirajte volume
docker volume create computerrunner_postgres_data

# Restore backup
docker run --rm \
  -v computerrunner_postgres_data:/postgres \
  -v ${PWD}/backups:/backup \
  alpine tar xzf /backup/full-backup-YYYYMMDD.tar.gz -C /postgres

# Pokrenite aplikaciju
docker-compose up -d
```

### Verifikacija Nakon Migracije

```bash
# Proverite status kontejnera
docker ps

# Proverite da li se možete prijaviti
# Otvorite http://localhost sa admin/admin123

# Proverite logove ako ima problema
docker-compose logs -f

# Proverite bazu podataka
docker exec -it computerrunner_db psql -U wol_user -d wol_db -c "SELECT username, email, is_admin FROM \"user\";"
```

### Česta Pitanja (FAQ)

**Q: Da li mogu koristiti istu bazu na različitim OS-ima (Windows/Linux/Mac)?**  
A: Da! PostgreSQL volume je kompatibilan između različitih operativnih sistema.

**Q: Šta ako zaboravim da exportujem bazu?**  
A: Možete pristupiti direktno Docker volume-u:
```bash
docker volume inspect computerrunner_postgres_data
# Kopirajte 'Mountpoint' putanju i ručno backup-ujte fajlove
```

**Q: Koliko prostora zauzima backup?**  
A: Zavisno od broja korisnika i računara, tipično 1-50 MB (kompresovano).

**Q: Mogu li imati više backup-a?**  
A: Da, dodajte datum u ime fajla:
```bash
tar czf database-backup-$(date +%Y%m%d-%H%M%S).tar.gz
```

### Automatski Backup Script (Opciono)

Kreirajte `backup.sh` fajl:
```bash
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

docker run --rm \
  -v computerrunner_postgres_data:/data \
  -v ${PWD}/$BACKUP_DIR:/backup \
  alpine tar czf /backup/db-backup-$DATE.tar.gz -C /data .

echo "✓ Backup kreiran: $BACKUP_DIR/db-backup-$DATE.tar.gz"

# Čuvaj samo poslednjih 7 backup-a
ls -t $BACKUP_DIR/db-backup-*.tar.gz | tail -n +8 | xargs -r rm

echo "✓ Stari backup-i obrisani (čuvam poslednjih 7)"
```

Pokrenite:
```bash
chmod +x backup.sh
./backup.sh
```

---

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
docker-compose logs -f
```

**Rebuild everything:**
```bash
docker-compose down
docker-compose up --build
```

### Database Issues

**Reset database:**
```bash
docker-compose exec backend rm wol.db
docker-compose exec backend python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### WoL Issues

1. **Ensure WoL is enabled on target computer BIOS**
2. **Verify MAC address format**: `XX:XX:XX:XX:XX:XX`
3. **Check network connectivity**
4. **Check firewall rules for UDP port 9**

### Login Issues

1. **Clear browser cookies**
2. **Reset database and create new admin user**
3. **Check Flask SECRET_KEY is set**

---

## Maintenance

### Regular Tasks

**Daily**: Monitor application logs
**Weekly**: Check database size
**Monthly**: Review user activity, update dependencies
**Quarterly**: Security audit, test backups

### Backup Strategy

```bash
# Backup database
docker-compose exec backend cp wol.db /backup/wol_$(date +%Y%m%d).db

# Restore database
docker-compose exec backend cp /backup/wol_20250127.db wol.db
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose up --build -d

# Run migrations
docker-compose exec backend flask db upgrade
```

---

## Security Hardening

### 1. Change Default Credentials
```bash
# Change admin password after login
```

### 2. Set Strong SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Enable HTTPS
- Get SSL certificate (Let's Encrypt)
- Configure in nginx.conf
- Redirect HTTP to HTTPS

### 4. Configure Firewall
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw deny 5000/tcp   # Block direct backend access
```

### 5. Database Security
- Use strong passwords
- Restrict network access
- Regular backups with encryption

---

## Getting Help

1. Check logs: `docker-compose logs`
2. Review error messages
3. Test components individually
4. Check documentation in README.md
5. Verify network connectivity

---

**Version**: 1.0.0  
**Last Updated**: January 27, 2026


