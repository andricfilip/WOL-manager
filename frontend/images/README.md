# Logo Setup

## 📁 Folder za logo fajlove

**Ovde stavi logo tvoje kompanije:**
- `imi_logo.png` - Glavni logo (preporučeno: 200x60px, PNG sa transparentnim pozadinom)

## 🎨 Logo Specifikacije

**Format:** PNG ili SVG  
**Dimenzije:** 200x60px (aspect ratio 3:1)  
**Pozadina:** Providna (transparent)  
**Max visina u navbar-u:** 32px (automatski skaliranje)

## ⚙️ Automatska Konfiguracija

Logo se automatski koristi u aplikaciji:
- Mountovano u Nginx kao `/images/imi_logo.png`
- `LOGO_URL` u docker-compose.prod.yml pokazuje na `/images/imi_logo.png`
- Prikazuje se u navbar-u umesto default ikonice

## 📝 Kako dodati logo:

1. **Stavi logo fajl u ovaj folder:**
   ```bash
   cp /path/to/your/logo.png frontend/images/imi_logo.png
   ```

2. **Redeploy aplikaciju:**
   ```bash
   ./update_deploy.sh
   ```

3. **Refresh browser** (Ctrl+Shift+R)

Logo će se automatski prikazati!

---

**Primer logo fajla:** Možeš koristiti bilo koji PNG/SVG logo sa transparentnom pozadinom.
