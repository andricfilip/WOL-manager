# Logo Setup

## 📁 Folder za logo fajlove

**Ovde stavi logo tvoje kompanije:**
- `imi_logo.png` - Glavni logo (preporučeno: 200x60px, PNG sa transparentnim pozadinom)

## 🎨 Logo Specifikacije

**Format:** PNG, SVG ili WebP  
**Dimenzije:** 200x60px (aspect ratio 3:1)  
**Pozadina:** Providna (transparent)  
**Max visina u navbar-u:** 32px (automatski skaliranje)

**Podržani formati:**
- `.png` - Preporučeno za fotografije/slike sa transparentnošću
- `.webp` - Manji fajl, moderne browsere
- `.svg` - Vektorska grafika, najbolja skalabilnost

## ⚙️ Automatska Konfiguracija

Logo se automatski koristi u aplikaciji:
- Mountovano u Nginx kao `/images/imi_logo.png`
- `LOGO_URL` u docker-compose.prod.yml pokazuje na `/images/imi_logo.png`
- Prikazuje se u navbar-u umesto default ikonice

## 📝 Kako dodati logo:

1. **Stavi logo fajl u ovaj folder:**
   ```bash
   cp /path/to/your/logo.png frontend/images/imi_logo.png
   # ili
   cp /path/to/your/logo.webp frontend/images/company_logo.webp
   ```

2. **Ažuriraj LOGO_URL u docker-compose.prod.yml:**
   ```yaml
   - LOGO_URL=/images/imi_logo.png
   # ili
   - LOGO_URL=/images/company_logo.webp
   ```

3. **Restart kontejnera (OBAVEZNO!):**
   ```bash
   docker compose -f docker-compose.prod.yml restart frontend
   # ili
   ./update_deploy.sh
   ```

4. **Refresh browser** (Ctrl+Shift+R)

Logo će se automatski prikazati!

**Napomena:** Možeš koristiti bilo koji naziv fajla (npr. `my_logo.png`, `brand.webp`), samo ga referenciši u `LOGO_URL`.

## 🗑️ Brisanje loga (vraćanje na default ikonicu):

```bash
# 1. Obriši logo fajl
rm frontend/images/imi_logo.png

# 2. Restart kontejnera (OBAVEZNO!)
docker compose -f docker-compose.prod.yml restart frontend

# 3. Hard refresh browser (Ctrl+Shift+R)
```

Aplikacija će automatski prikazati default ikonicu ako logo ne postoji ili se ne učita.

## ⚠️ Važno:

- **Restart kontejnera je OBAVEZAN** nakon bilo kakve promene loga (dodavanje/izmena/brisanje)
- Docker volume se mountuje pri startu kontejnera, pa promene van kontejnera nisu vidljive dok se ne restartuje
- Uvek hard refresh browser (`Ctrl+Shift+R`) posle promene da očistiš keš
- Ako logo fajl ne postoji ili ne može da se učita, aplikacija automatski koristi default ikonicu (fallback)

---

**Primer logo fajla:** Možeš koristiti bilo koji PNG/SVG logo sa transparentnom pozadinom.
