#!/bin/bash
# Quick Fix za Login Problem na Serveru
# Pokreni ako login ne radi nakon prebacivanja na server

echo "Resavanje login problema..."

# Provera Docker instalacije
echo ""
echo "1. Provera Docker statusa..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker nije instaliran!"
    exit 1
fi
docker --version

# Zaustavljanje kontejnera
echo ""
echo "2. Zaustavljanje kontejnera..."
docker-compose down

# Provera docker-compose.yml
echo ""
echo "3. Provera SECRET_KEY konfiguracije..."
if grep -q "SECRET_KEY=your-secret-key-change-in-production" docker-compose.yml; then
    echo "UPOZORENJE: Koristite default SECRET_KEY!"
    echo "Generisanje novog SECRET_KEY..."
    
    NEW_KEY=$(python3 -c "import secrets; print('CR-WoL-SecretKey-2026-' + secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        sed -i '' "s|SECRET_KEY=your-secret-key-change-in-production|SECRET_KEY=CR-WoL-SecretKey-2026-$NEW_KEY|g" docker-compose.yml
    else
        # Linux
        sed -i "s|SECRET_KEY=your-secret-key-change-in-production|SECRET_KEY=CR-WoL-SecretKey-2026-$NEW_KEY|g" docker-compose.yml
    fi
    
    echo "Novi SECRET_KEY postavljen!"
fi

# Rebuild i pokretanje
echo ""
echo "4. Rebuild i pokretanje (moze potrajati)..."
docker-compose up -d --build

# Cekanje da servisi postanu healthy
echo ""
echo "5. Cekanje da servisi postanu aktivni..."
sleep 15

# Status
echo ""
echo "6. Status kontejnera:"
docker ps

# Test konekcije
echo ""
echo "7. Testiranje login stranice..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13224/auth/login 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "OK: Login stranica dostupna!"
else
    echo "UPOZORENJE: Login stranica nedostupna! HTTP kod: $HTTP_CODE"
    echo "Proverite logove: docker logs computerrunner_backend --tail=50"
fi

# Provera SECRET_KEY u backend-u
echo ""
echo "8. Provera SECRET_KEY u backend kontejneru..."
docker exec computerrunner_backend python -c "from app import app; print('SECRET_KEY:', 'POSTAVLJEN' if app.config.get('SECRET_KEY') else 'NIJE POSTAVLJEN')" 2>/dev/null || echo "Ne mogu da proverim SECRET_KEY"

echo ""
echo "Gotovo!"
echo ""
echo "Pokusajte login ponovo: http://localhost:13224"
echo "Korisnik: admin"
echo "Lozinka: admin123"
echo ""
echo "Ako jos uvek ne radi, pogledajte logove:"
echo "docker logs computerrunner_backend -f"
