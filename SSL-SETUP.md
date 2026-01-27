# SSL Sertifikat Setup

## Automatsko Dobijanje Pravog SSL Sertifikata (Let's Encrypt)

### Preduslov
1. **Javna IP adresa** - Server mora biti dostupan sa interneta
2. **Domen** - Morate imati domen koji pokazuje na vaš server (DNS A record)
3. **Port 80 otvoren** - Mora biti otvoren na routeru/firewall-u privremeno

### Windows PowerShell Metoda (Preporučeno)

```powershell
# 1. Proverite da DNS pokazuje na vas server
nslookup vas-domen.com

# 2. Pokrenite skriptu
.\get-ssl.ps1 -Domain "vas-domen.com" -Email "vas@email.com"

# Skripta ce automatski:
# - Zaustaviti frontend kontejner
# - Dobiti SSL sertifikat od Let's Encrypt
# - Kopirati sertifikate
# - Restartovati kontejnere
```

### Linux/Mac Bash Metoda

```bash
# 1. Napravite skriptu izvrsnom
chmod +x get-ssl.sh

# 2. Pokrenite skriptu
./get-ssl.sh vas-domen.com vas@email.com
```

### Ručna Metoda (Alternativa)

Ako ne želite da koristite automatsku skriptu:

```powershell
# 1. Zaustavite frontend
docker stop computerrunner_frontend

# 2. Dobijte sertifikat
docker run -it --rm `
  -v ${PWD}\frontend\ssl:/etc/letsencrypt `
  -p 80:80 `
  certbot/certbot certonly `
  --standalone `
  -d vas-domen.com `
  -m vas@email.com `
  --agree-tos

# 3. Kopirajte sertifikate
Copy-Item "frontend\ssl\live\vas-domen.com\fullchain.pem" "frontend\ssl\cert.pem"
Copy-Item "frontend\ssl\live\vas-domen.com\privkey.pem" "frontend\ssl\key.pem"

# 4. Restartujte kontejnere
docker-compose up -d
```

---

## Testiranje Bez Pravog Domena (Self-Signed za razvoj)

Ako nemate domen, možete kreirati self-signed sertifikat za testiranje:

```powershell
docker run --rm -v ${PWD}\frontend\ssl:/certs alpine/openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/key.pem -out /certs/cert.pem -subj "/C=RS/ST=Serbia/L=Belgrade/O=ComputerRunner/CN=localhost"
```

**Napomena:** Self-signed sertifikat će i dalje pokazivati upozorenje u browseru.

---

## Automatsko Obnavljanje Sertifikata

Let's Encrypt sertifikati traju 90 dana. Za automatsko obnavljanje:

### Kreiranje Cron Job-a (Linux)

```bash
# Dodajte u crontab (crontab -e)
0 3 * * 1 /path/to/ComputerRunner/renew-ssl.sh
```

### Windows Task Scheduler

1. Otvorite Task Scheduler
2. Kreirajte novi task: "SSL Renewal"
3. Trigger: Nedeljno
4. Akcija: Pokrenite `renew-ssl.ps1`

### Skripta za Obnavljanje (renew-ssl.sh)

```bash
#!/bin/bash
cd /path/to/ComputerRunner

docker stop computerrunner_frontend

docker run -it --rm \
  -v "${PWD}/frontend/ssl:/etc/letsencrypt" \
  -p 80:80 \
  certbot/certbot renew

docker start computerrunner_frontend
```

---

## Verifikacija SSL Sertifikata

Posle dobijanja sertifikata, proverite:

```powershell
# Provera validnosti sertifikata
openssl x509 -in frontend\ssl\cert.pem -text -noout

# Provera datuma isteka
openssl x509 -in frontend\ssl\cert.pem -noout -dates

# Online provera
# Otvorite: https://www.ssllabs.com/ssltest/
# Unesite: https://vas-domen.com:13223
```

---

## Troubleshooting

### Greška: "Port 80 zauzet"
```powershell
# Zaustavite frontend privremeno
docker stop computerrunner_frontend
# Pokušajte ponovo
```

### Greška: "DNS nije pronađen"
```powershell
# Proverite DNS
nslookup vas-domen.com

# DNS A record mora pokazivati na vašu javnu IP
```

### Greška: "Rate limit prekoračen"
Let's Encrypt ima limit: 5 pokušaja po nedelji po domenu
- Sačekajte 7 dana
- Ili koristite `--staging` flag za testiranje

### Browser i dalje pokazuje upozorenje
1. Proverite da li ste koristili pravi domen (ne localhost)
2. Očistite browser cache (Ctrl+Shift+Delete)
3. Proverite da sertifikat nije self-signed

---

## Produkcione Preporuke

1. **Koristite pravi domen** - ne localhost ili IP adresu
2. **Otvorite samo potrebne portove** - 13223 za HTTPS
3. **Zatvorite port 80** - posle dobijanja sertifikata (ili redirect na HTTPS)
4. **Automatsko obnavljanje** - postavi cron/task scheduler
5. **Monitoring** - praćenje isteka sertifikata

---

## Status Provera

```powershell
# Provera trenutnih portova
netstat -ano | findstr ":13223"

# Provera sertifikata
ls frontend\ssl\

# Provera Nginx konfiguracije
docker exec computerrunner_frontend nginx -t

# Provera logova
docker logs computerrunner_frontend --tail=50
```

---

**Napomena:** Za prvi put, preporučuje se da testirate sa `--staging` flag-om da ne potrošite rate limit.
