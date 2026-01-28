# WOL Manager - Wake-on-LAN Manager

Upravljanje računarima i daljinsko buđenje preko Wake-on-LAN (WoL) protokola.

## Funkcionalnosti

- 🔐 **Autentifikacija** - Sigurno prijavljivanje korisnika
- 👥 **Admin/User role** - Različita prava pristupa
- 💻 **Upravljanje računarima** - Dodavanje, izmena i brisanje računara
- 🔌 **Wake-on-LAN** - Slanje WoL paketa za buđenje računara
- 🟢 **Status Monitoring** - Real-time praćenje da li je računar online/offline
- 📝 **Logovanje** - Praćenje svih WoL akcija
- 📱 **Responsive Design** - Radi na desktop i mobilnim uređajima
- 🐳 **Docker** - Jednostavno postavljanje sa Docker kontejnerima

## Tehnologije

- **Backend**: Flask (Python) + PostgreSQL
- **Frontend**: HTML/CSS/JavaScript + Nginx
- **Authentication**: Flask-Login
- **Status Check**: ICMP Ping (cross-platform)

## Instalacija (Docker)

### 1. Preuzmi kod
```bash
git clone <repo-url>
cd WOL-manager
```

### 2. Podigni kontejnere
```bash
docker-compose up -d --build
```

**To je sve!** Automatski:
- ✅ Kreira PostgreSQL bazu
- ✅ Primenjuje migracije (dodaje kolone za status)
- ✅ **Kreira admin nalog** (username: `admin`, password: `admin123`)
- ✅ Pokreće Flask backend
- ✅ Pokreće Nginx frontend

### 3. Prijavi se
```
http://localhost:8080   # ili http://IP-SERVERA:8080

Username: admin
Password: admin123
```

⚠️ **VAŽNO**: Promeni lozinku odmah nakon prve prijave!

### Promena porta

Uredi `docker-compose.yml` i promeni portove po želji:

```yaml
frontend:
  ports:
    - "8080:80"    # Promeni 8080 na željeni port (npr. 3000:80)
    - "8443:443"   # HTTPS port
```

Zatim restartuj:
```bash
docker-compose down
docker-compose up -d
```

## Korišćenje

### Prva prijava
1. Otvori `http://localhost` (ili IP adresa servera)
2. Prijavi se sa:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Idi na **Profile** → Promeni lozinku

### Admin panel
1. Login sa admin nalogom
2. **Admin panel** → Dodaj računar
3. Unesi: naziv, MAC adresu, **IP adresu** (za status monitoring)
4. Dodeli korisnike računaru

### User dashboard
1. Login sa user nalogom
2. Vidi dodeljene računare
3. Prati status (🟢 Online / 🔴 Offline)
4. Klikni **Probudi** za slanje WoL paketa

### Status Monitoring
- Automatska provera svakih 30 sekundi
- Manuelna provera dugmetom "Proveri Status"
- Prikazuje: Online, Offline, Nepoznato

## Konfiguracija

### Portovi

Frontend možeš gadjati na bilo kom portu:
- **HTTP**: Port `8080` (promeni u docker-compose.yml)
- **HTTPS**: Port `8443` (promeni u docker-compose.yml)

**Primer**: Za port 3000, promeni u `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3000:80"    # Sada: http://localhost:3000
```

Backend je na portu `5000` (host network, potrebno za WoL).

### Promena lozinki (docker-compose.yml)
```yaml
environment:
  - SECRET_KEY=<generisi-random-key>
  - DATABASE_URL=postgresql://wol_user:<nova-lozinka>@localhost:5432/wol_db
```

### Generisanje SECRET_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Važne napomene

### Network Setup
- **Backend** je na `host` network mode - **OBAVEZNO** za WoL broadcast i ping
- **Frontend** je na bridge network sa port mappingom - možeš menjati portove
- **PostgreSQL** je na bridge network - dostupan na portu 5432

Ova konfiguracija omogućava:
- ✅ WoL paketi idu direktno na lokalnu mrežu
- ✅ Ping radi za prave IP adrese lokalnih računara
- ✅ Frontend se može podesiti na bilo koji port

### Za Status Monitoring:
- ⚠️ Računari MORAJU imati IP adresu
- ⚠️ Firewall mora dozvoliti ICMP (ping)
- 💡 Preporučene su statičke IP adrese

### Za Wake-on-LAN:
- ⚠️ Omogući WoL u BIOS-u računara
- ⚠️ Omogući WoL u mrežnoj kartici (Device Manager)
- ⚠️ Računar mora biti na istoj lokalnoj mreži

## Korisne Docker komande

```bash
# Pogledi logove
docker-compose logs -f backend

# Zaustavi kontejnere
docker-compose down

# Zaustavi i obriši podatke
docker-compose down -v

# Rebuild nakon izmena
docker-compose up -d --build

# Pristupi PostgreSQL bazi
docker exec -it computerrunner_db psql -U wol_user -d wol_db
```

## Troubleshooting

### WoL ne radi?
- Proveri da li je WoL omogućen u BIOS-u
- Verifikuj MAC adresu
- Proveri da su računari na istoj mreži

### Status je uvek "Offline"?
- Proveri da li je IP adresa tačna
- Proveri firewall na ciljnom računaru:
  - **Windows**: `netsh advfirewall firewall add rule name="ICMP Allow" protocol=icmpv4:8,any dir=in action=allow`
  - **Linux**: `sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT`

### Docker problemi?
```bash
# Proveri logove
docker-compose logs -f

# Restart servisa
docker-compose restart

# Rebuild images
docker-compose down
docker-compose up -d --build
```

## License

MIT
