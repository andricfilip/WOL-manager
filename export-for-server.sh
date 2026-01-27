#!/bin/bash
# Skripta za pakovanje projekta za prebacivanje na server
# Kreira deployment paket sa svim potrebnim fajlovima i Docker images

echo "Kreiranje deployment paketa za server..."

EXPORT_DIR="./deployment-package"
DATE=$(date +%Y%m%d-%H%M%S)
PACKAGE_NAME="computerrunner-$DATE"

# Kreiranje export foldera
echo ""
echo "1. Kreiranje export foldera..."
mkdir -p "$EXPORT_DIR"

# Build Docker images
echo ""
echo "2. Build Docker images..."
docker-compose build

# Export Docker images
echo ""
echo "3. Export Docker images (moze potrajati nekoliko minuta)..."

echo "   Exportovanje backend image..."
docker save -o "$EXPORT_DIR/backend-image.tar" computerrunner-backend

echo "   Exportovanje frontend image..."
docker save -o "$EXPORT_DIR/frontend-image.tar" computerrunner-frontend

echo "   Exportovanje postgres image..."
docker save -o "$EXPORT_DIR/postgres-image.tar" postgres:15-alpine

# Kopiranje svih potrebnih fajlova
echo ""
echo "4. Kopiranje projekata..."

# Kreiranje strukture foldera
mkdir -p "$EXPORT_DIR/backend"
mkdir -p "$EXPORT_DIR/frontend/ssl"

# Kopiranje backend fajlova
echo "   Kopiranje backend fajlova..."
rsync -av --exclude='__pycache__' --exclude='*.pyc' --exclude='instance' ./backend/ "$EXPORT_DIR/backend/" 2>/dev/null || cp -r ./backend/* "$EXPORT_DIR/backend/" 2>/dev/null

# Kopiranje frontend fajlova
echo "   Kopiranje frontend fajlova..."
rsync -av --exclude='node_modules' ./frontend/ "$EXPORT_DIR/frontend/" 2>/dev/null || cp -r ./frontend/* "$EXPORT_DIR/frontend/" 2>/dev/null

# Kopiranje root fajlova
echo "   Kopiranje konfiguracionih fajlova..."
cp docker-compose.yml "$EXPORT_DIR/" 2>/dev/null || true
cp README.md "$EXPORT_DIR/" 2>/dev/null || true
cp SETUP.md "$EXPORT_DIR/" 2>/dev/null || true
cp SSL-SETUP.md "$EXPORT_DIR/" 2>/dev/null || true
cp SERVER-FIX.md "$EXPORT_DIR/" 2>/dev/null || true
cp QUICK-REFERENCE.md "$EXPORT_DIR/" 2>/dev/null || true
cp get-ssl.sh "$EXPORT_DIR/" 2>/dev/null || true
cp fix-login.sh "$EXPORT_DIR/" 2>/dev/null || true
chmod +x "$EXPORT_DIR/get-ssl.sh" 2>/dev/null || true
chmod +x "$EXPORT_DIR/fix-login.sh" 2>/dev/null || true

# deploy.sh je vec kreiran u PowerShell verziji ili ga kreiramo ovde
if [ ! -f "$EXPORT_DIR/deploy.sh" ]; then
    cat > "$EXPORT_DIR/deploy.sh" << 'DEPLOY_EOF'
#!/bin/bash
# Deployment skripta za Linux Server

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
echo "2. Ucitavanje Docker images (moze potrajati)..."
docker load -i backend-image.tar
docker load -i frontend-image.tar
docker load -i postgres-image.tar

echo ""
echo "3. Pokretanje Docker kontejnera..."
docker-compose up -d

echo ""
echo "Cekanje da se servisi pokrenu..."
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
        print('OK: Admin kreiran')
    else:
        print('OK: Admin postoji')
PYEOF

echo ""
echo "5. Status:"
docker ps

echo ""
echo "SUCCESS: Deployment zavrsen!"
echo "URL: http://localhost"
echo "Login: admin / admin123"
echo "VAZNO: Promenite lozinku!"
DEPLOY_EOF
    chmod +x "$EXPORT_DIR/deploy.sh"
fi

# Kompresovanje u tar.gz arhivu
echo ""
echo "5. Kompresovanje deployment paketa..."
tar -czf "$PACKAGE_NAME.tar.gz" -C "$EXPORT_DIR" .

# Veličina paketa
SIZE=$(du -h "$PACKAGE_NAME.tar.gz" | cut -f1)

echo ""
echo "SUCCESS: Deployment paket kreiran!"
echo ""
echo "Paket:"
echo "   Fajl: $PACKAGE_NAME.tar.gz"
echo "   Velicina: $SIZE"
echo ""
echo "Sledeci koraci:"
echo "   1. Kopirajte $PACKAGE_NAME.tar.gz na server"
echo "   2. Raspakujte: tar -xzf $PACKAGE_NAME.tar.gz"
echo "   3. Pokrenite: ./deploy.sh"
echo ""

# Cleanup
echo "Brisanje privremenih fajlova..."
rm -rf "$EXPORT_DIR"

echo ""
echo "Gotovo!"
