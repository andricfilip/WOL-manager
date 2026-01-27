# Rešenje Problema sa Loginom na Serveru

## Problem 1: Login ne radi - ostajete na login stranici
## Problem 2: Bash skripte ne rade na Linux-u ("$'\r': command not found")

## Problem 1: Login Sesija

### Uzrok
Flask **session** ne radi pravilno bez stabilnog `SECRET_KEY` environment varijable.

### Rešenje

#### Brzi Fix - Koristi fix-login skriptu:

```bash
# Linux
chmod +x fix-login.sh
./fix-login.sh
```

Ova skripta će automatski proveriti i popraviti SECRET_KEY.

#### Ručno Rešenje:

1. **Ažurirajte docker-compose.yml**

Proverite da u `backend` sekciji imate:

```yaml
backend:
  environment:
    - FLASK_ENV=production
    - SECRET_KEY=CR-WoL-SecretKey-2026-ChangeThisInProduction-89afd7b3c4e5
    - DATABASE_URL=postgresql://wol_user:wol_password@postgres:5432/wol_db
    - SESSION_COOKIE_SECURE=false
    - SESSION_COOKIE_HTTPONLY=true
    - SESSION_COOKIE_SAMESITE=Lax
```

2. **Rebuild i Pokretanje**

```bash
docker-compose down
docker-compose up -d --build
```

## Problem 2: Windows Line Endings na Linux Serveru

### Simptomi

```
./deploy.sh: line 3: $'\r': command not found
syntax error: unexpected end of file
```

### Uzrok

Windows koristi CRLF (`\r\n`) line endings, Linux koristi LF (`\n`). Emojis u skriptama takođe mogu praviti probleme.

### Rešenje

#### Opcija 1: dos2unix (Najlakše)

```bash
# Instaliraj dos2unix
sudo apt-get install dos2unix   # Debian/Ubuntu
sudo yum install dos2unix        # CentOS/RHEL

# Konvertuj skripte
dos2unix deploy.sh
dos2unix fix-login.sh
dos2unix get-ssl.sh

# Napravi izvršnim
chmod +x deploy.sh fix-login.sh get-ssl.sh

# Pokretanje
./deploy.sh
```

#### Opcija 2: sed (Bez instalacije)

```bash
# Ukloni \r karaktere
sed -i 's/\r$//' deploy.sh
sed -i 's/\r$//' fix-login.sh
sed -i 's/\r$//' get-ssl.sh

# Napravi izvršnim
chmod +x deploy.sh fix-login.sh get-ssl.sh

# Pokretanje
./deploy.sh
```

#### Opcija 3: Ručno Prepravljanje (Ako prethodne ne rade)

```bash
# Kreiraj novu deploy.sh skriptu direktno na Linux-u
cat > deploy.sh << 'SCRIPT_EOF'
#!/bin/bash
echo "ComputerRunner - Server Deployment"
echo "==================================="

echo ""
echo "1. Provera Docker instalacije..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker nije instaliran!"
    exit 1
fi

echo "OK: Docker je instaliran"

echo ""
echo "2. Ucitavanje Docker images..."
docker load -i backend-image.tar
docker load -i frontend-image.tar  
docker load -i postgres-image.tar

echo ""
echo "3. Pokretanje kontejnera..."
docker-compose up -d

sleep 15

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
        print('Admin kreiran: admin / admin123')
    else:
        print('Admin vec postoji')
PYEOF

echo ""
echo "5. Status:"
docker ps

echo ""
echo "SUCCESS!"
echo "URL: http://localhost"
echo "Login: admin / admin123"
SCRIPT_EOF

chmod +x deploy.sh
./deploy.sh
```

### 3. Provera

Otvorite browser i:

1. Idite na `http://SERVER-IP`
2. Login: `admin` / `admin123`
3. Trebalo bi da vas redirectuje na Dashboard

Ako i dalje ne radi, nastavite sa troubleshooting-om ispod.

## Troubleshooting Checklist

### 1. Provera da li kontejneri rade

```bash
docker ps
```

Trebalo bi da vidite 3 kontejnera: `computerrunner_frontend`, `computerrunner_backend`, `computerrunner_db`

### 2. Provera logova

```bash
# Backend logovi (najvažnije za login probleme)
docker logs computerrunner_backend --tail=100 -f

# Tražite greške kao:
# - KeyError: 'SECRET_KEY'
# - RuntimeError: The session is unavailable
# - sqlalchemy errors
```

### 3. Provera SECRET_KEY

```bash
docker exec computerrunner_backend python -c "from app import app; print('SECRET_KEY:', app.config.get('SECRET_KEY'))"
```

Trebalo bi da vidite SECRET_KEY vrednost, ne `None`.

### 4. Provera mreže

```bash
# Testiranje backend API-ja direktno
curl http://localhost:5000/

# Testiranje login stranice kroz Nginx
curl http://localhost/auth/login
```

Oba zahteva bi trebalo da vrate HTML (status 200 ili 302).

### 5. Reset baze (ako ništa ne pomaže)

**UPOZORENJE: Ovo briše sve podatke!**

```bash
docker-compose down -v
docker-compose up -d --build

# Sačekajte 20 sekundi, pa kreirajte admin korisnika ponovo
docker exec -it computerrunner_backend python << 'EOF'
from app import app, db
from models import User

with app.app_context():
    db.create_all()
    admin = User(username='admin', email='admin@example.com', is_admin=True)
    admin.set_password('admin123')
    db.session.add(admin)
    db.session.commit()
    print('Admin kreiran!')
EOF
```

## Dodatne Session Postavke

Ako koristite **HTTPS (port 13223)**, promenite:

```yaml
- SESSION_COOKIE_SECURE=true  # Samo za HTTPS
```

Ako koristite **različite domene** (npr. server.com i www.server.com):

```yaml
- SESSION_COOKIE_DOMAIN=.server.com  # Sa tačkom na početku
```

## Za Produkciju: Promeni SECRET_KEY!

**NIKAD** nemojte koristiti default SECRET_KEY u produkciji! Generišite jedinstven:

```bash
# Linux/Mac
python -c "import secrets; print(secrets.token_hex(32))"

# Windows PowerShell
python -c "import secrets; print(secrets.token_hex(32))"
```

Kopirajte output i stavite u `docker-compose.yml`:

```yaml
- SECRET_KEY=vaš-generisani-ključ-ovde
```

Restartujte:

```bash
docker-compose down
docker-compose up -d
```

## Debugging: Testiranje Session-a

Uđite u backend kontejner:

```bash
docker exec -it computerrunner_backend python
```

Testirajte:

```python
from app import app
print(app.config['SECRET_KEY'])  # Mora biti postavljen!
print(app.config['SESSION_COOKIE_HTTPONLY'])  # True
print(app.config['SESSION_COOKIE_SAMESITE'])  # 'Lax'
```

Pritisnite `Ctrl+D` za izlaz.

## Promena Admin Lozinke Nakon Logina

```bash
docker exec -it computerrunner_backend python
```

```python
from app import app, db
from models import User

with app.app_context():
    admin = User.query.filter_by(username='admin').first()
    if admin:
        admin.set_password('nova_bezbedna_lozinka')
        db.session.commit()
        print('✅ Lozinka promenjena!')
    else:
        print('❌ Admin korisnik ne postoji')
```

---

**Napomena:** Ova izmena je već uključena u najnoviju verziju deployment paketa. Ako ste koristili stariji paket, ažurirajte `docker-compose.yml` ručno.
