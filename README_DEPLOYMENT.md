# ⚡ Brzi Deployment Guide

**Problem koji si imao:** Container nazivi zavise od folder imena. Ako je folder `computer-runner`, Docker Compose pravi kontejnere sa tim prefiksom (npr. `computer-runner-backend-1`, `computer-runner-db-1`).

**Rešenje:** Koristimo `docker compose exec` umesto `docker exec` sa hardcoded imenima. Docker Compose automatski pronalazi pravi kontejner.

---

## 🚀 Na serveru uradi ovo (copy/paste):

### **Automatski deployment (preporučeno):**

```bash
cd /putanja/do/computer-runner  # ili kako god se zove tvoj folder
git pull origin main
chmod +x deploy_v2.sh
./deploy_v2.sh
```

✅ To je SVE! Skripta će:
- Backup-ovati bazu
- Pull kod
- Rebuild kontejnere
- Pokrenuti SVE 5 migracija
- Verifikovati

---

### **Manualno (ako želiš kontrolu):**

```bash
# 1. Uđi u folder (bilo koje ime, nije bitno)
cd /putanja/do/computer-runner

# 2. Backup (OBAVEZNO!)
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U computer_runner computer_runner > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Pull + restart
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# 4. Sačekaj malo
sleep 8

# 5. Migracije (jedna po jedna!)
docker compose -f docker-compose.prod.yml exec backend python migrate_user_computer_preferences.py
docker compose -f docker-compose.prod.yml exec backend python migrate_user_computer_roles.py
docker compose -f docker-compose.prod.yml exec backend python migrate_ssh_auto_login.py
docker compose -f docker-compose.prod.yml exec backend python migrate_created_by.py
docker compose -f docker-compose.prod.yml exec backend python migrate_remove_ssh_terminal_setting.py

# 6. Proveri
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend | tail -20
```

---

## ✅ Verifikacija

```bash
# Proveri kontejnere
docker compose -f docker-compose.prod.yml ps

# Trebalo bi da vidiš 3 kontejnera sa STATUS = Up
```

Otvori browser: `http://tvoj-server-ip:13223`

**Login:** `admin` / `admin123`

Proveri:
- ✅ Dashboard radi
- ✅ Svi računari tu
- ✅ Novi meni: "Podešavanja računara"

---

## 🆕 Šta je novo?

1. **Role system** - Admin može dodeliti role (viewer/operator/owner) svakom korisniku za svaki računar
2. **SSH preferences** - Korisnici mogu uključiti/isključiti SSH auto-login
3. **Live updates** - Socket.IO notifikacije kada admin promeni nešto
4. **Full-width layout** - Iskoristi ceo ekran
5. **Auto-dismiss toasts** - Notifikacije se same sklanjaju posle 5s

---

## 🔥 Ako nešto pukne

### Restore backup:
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d db
sleep 3
cat backup_*.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U computer_runner computer_runner
docker compose -f docker-compose.prod.yml up -d
```

### Proveri grešku:
```bash
docker compose -f docker-compose.prod.yml logs backend | grep -i error
```

### Restart sve:
```bash
docker compose -f docker-compose.prod.yml restart
```

---

## 📋 Korisne komande

### Proveri bazu direktno:
```bash
docker compose -f docker-compose.prod.yml exec db psql -U computer_runner computer_runner
```

U psql:
```sql
-- Proveri računare
SELECT id, name, mac_address FROM computers;

-- Proveri korisnike
SELECT id, username, is_admin FROM users;

-- Proveri role
SELECT user_id, computer_id, role FROM user_computer_preferences;

-- Izađi
\q
```

### Proveri logove live:
```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### Restart samo backend:
```bash
docker compose -f docker-compose.prod.yml restart backend
```

---

## 💡 Zašto je bilo "No such container"?

Docker Compose generiše nazive kontejnera kao:
```
<folder_naziv>-<service_naziv>-<broj>
```

Ako je folder `computer-runner`, kontejneri će biti:
- `computer-runner-db-1`
- `computer-runner-backend-1`
- `computer-runner-frontend-1`

Stare skripte koristile su hardcoded `computer-runner-db` što nije radilo.

**Nova rešenja koriste `docker compose exec service`** što automatski pronalazi pravi kontejner, bez obzira kako se zove folder.

---

**Sve je sada fiksirano i push-ovano na GitHub!** 🎉

Pull-uj kod i pokreni `./deploy_v2.sh` - radiće bez problema.
