# ComputerRunner - Server Quick Start

## 🚨 NAJČEŠĆI PROBLEM: Bash Skripte ne Rade

### Simptomi
```
./deploy.sh: line 3: $'\r': command not found
syntax error: unexpected end of file
```

### INSTANT FIX (1 komanda):
```bash
dos2unix *.sh && chmod +x *.sh && ./deploy.sh
```

Ako `dos2unix` nije instaliran:
```bash
sed -i 's/\r$//' *.sh && chmod +x *.sh && ./deploy.sh
```

---

## ⚡ Brzi Start (Linux Server)

### 1. Kopiraj i Raspakuj

```bash
# Upload ZIP/TAR na server, pa:
tar -xzf computerrunner-*.tar.gz    # ili unzip za ZIP
cd computerrunner-*                 # ili deployment-package
```

### 2. Popravi Line Endings (OBAVEZNO!)

```bash
# Opcija A - dos2unix (najbolje)
sudo apt-get install dos2unix -y
dos2unix *.sh
chmod +x *.sh

# Opcija B - sed (bez instalacije)
sed -i 's/\r$//' *.sh
chmod +x *.sh
```

### 3. Deploy

```bash
sudo ./deploy.sh
```

---

## 🔐 Login Problem

Ako ostajete na login stranici:

```bash
./fix-login.sh
```

---

## 📍 Pristup Aplikaciji

- **HTTP:** http://SERVER-IP:13224
- **HTTPS:** https://SERVER-IP:13223

**Login:**
- Korisnik: `admin`
- Lozinka: `admin123`

**⚠️ ODMAH PROMENITE LOZINKU!**

---

## 🔥 Firewall (Ako sajt nije dostupan sa druge mašine)

```bash
# Ubuntu/Debian
sudo ufw allow 13224/tcp
sudo ufw allow 13223/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=13224/tcp
sudo firewall-cmd --permanent --add-port=13223/tcp
sudo firewall-cmd --reload
```

---

## 📊 Provera Statusa

```bash
docker ps                        # Trebalo bi 3 kontejnera
docker logs computerrunner_backend --tail=50
curl http://localhost:13224      # Trebalo bi HTML odgovor
```

---

## 🆘 Problemi?

### Backend ne radi
```bash
docker logs computerrunner_backend -f
docker-compose restart backend
```

### Baza ne radi
```bash
docker logs computerrunner_db
docker exec computerrunner_db pg_isready -U wol_user
```

### Kompletni Reset (BRIŠE SVE!)
```bash
docker-compose down -v
docker-compose up -d --build
```

Kreira admin ponovo:
```bash
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

---

## 📚 Detaljne Dokumentacije

- **SERVER-FIX.md** - Troubleshooting i rešavanje problema
- **QUICK-REFERENCE.md** - Sve korisne komande
- **SSL-SETUP.md** - SSL sertifikati za HTTPS
- **DEPLOYMENT-README.md** - Kompletan deployment vodič

---

## ✅ Checklist za Produkciju

- [ ] Promenjena admin lozinka
- [ ] Promenjeni SECRET_KEY u docker-compose.yml
- [ ] Firewall otvoren (portovi 13224, 13223)
- [ ] SSL sertifikat postavljen (./get-ssl.sh)
- [ ] Backup skripta (cron job)
- [ ] Testiran Wake-on-LAN sa stvarnim računarima

---

**Pitanja?** Pogledaj **QUICK-REFERENCE.md** za sve komande!
