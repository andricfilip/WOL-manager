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

**Logo je BUILDAN u Docker image tokom build procesa:**
- Logo se kopira iz `frontend/images/` u Docker image
- **NIJE mountovan** sa host sistema (ne može se menjati spolja)
- Za promenu loga potreban je **rebuild kontejnera**
- Prikazuje se u navbar-u umesto default ikonice
- Automatski fallback na ikonicu ako logo ne postoji

**Prednosti:**
- ✅ Logo je zapečaćen u image - sigurnost
- ✅ Ne može se obrisati spolja bez rebuilda
- ✅ Konzistentno kroz sve kontejnere
- ✅ Brže učitavanje (interno u kontejneru)

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

3. **Rebuild kontejnera (OBAVEZNO!):**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   # ili
   ./update_deploy.sh
   ```

4. **Refresh browser** (Ctrl+Shift+R)

Logo će biti BUILDAN u Docker image!

**Napomena:** Možeš koristiti bilo koji naziv fajla (npr. `my_logo.png`, `brand.webp`), samo ga referenciši u `LOGO_URL`.

## 🗑️ Brisanje loga (vraćanje na default ikonicu):

```bash
# 1. Obriši logo fajl
rm frontend/images/imi_logo.png

# 2. Rebuild kontejnera (OBAVEZNO!)
docker compose -f docker-compose.prod.yml up -d --build frontend

# 3. Hard refresh browser (Ctrl+Shift+R)
```

Aplikacija će automatski prikazati default ikonicu ako logo ne postoji ili se ne učita.

## ⚠️ Važno:

- **Rebuild je OBAVEZAN** posle bilo kakve promene loga (dodavanje/izmena/brisanje)
- Logo se **kopira u Docker image** tokom build procesa, ne mountuje se sa hosta
- Logo je **zapečaćen u image** - ne može se menjati spolja bez rebuilda
- Ovo daje **sigurnost** - niko ne može promeniti logo bez ponovnog build-a
- Uvek hard refresh browser (`Ctrl+Shift+R`) posle rebuilda da očistiš keš
- Ako logo fajl ne postoji ili ne može da se učita, aplikacija automatski koristi default ikonicu (fallback)

---

**Primer logo fajla:** Možeš koristiti bilo koji PNG/SVG logo sa transparentnom pozadinom.
