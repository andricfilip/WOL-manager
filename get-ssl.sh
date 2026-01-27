#!/bin/bash
# Automatsko dobijanje Let's Encrypt SSL sertifikata

# Parametri
DOMAIN=${1:-"vas-domen.com"}
EMAIL=${2:-"admin@example.com"}
SSL_DIR="./frontend/ssl"

echo "🔐 Dobijanje SSL sertifikata za domen: $DOMAIN"
echo "📧 Email za notifikacije: $EMAIL"

# Kreiranje ssl foldera ako ne postoji
mkdir -p $SSL_DIR

# Korišćenje certbot Docker container-a za dobijanje sertifikata
docker run -it --rm \
  -v "${PWD}/frontend/ssl:/etc/letsencrypt" \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN"

# Kopiraj sertifikate na pravo mesto
if [ -f "$SSL_DIR/live/$DOMAIN/fullchain.pem" ]; then
    cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/key.pem"
    echo "✅ SSL sertifikat uspešno dobijen!"
    echo "📁 Fajlovi: $SSL_DIR/cert.pem i $SSL_DIR/key.pem"
else
    echo "❌ Greška pri dobijanju sertifikata"
    exit 1
fi

echo ""
echo "🔄 Restartujte Docker kontejnere:"
echo "   docker-compose restart frontend"
