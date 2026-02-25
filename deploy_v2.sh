#!/bin/bash
# 🚀 Deployment Script za WOL Manager v2.0
# Autor: Filip Andrić
# Datum: 25. Februar 2026

set -e  # Exit on error

echo "=================================================="
echo "🚀 WOL Manager v2.0 - Deployment Script"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup
echo -e "${YELLOW}[1/7] Kreiranje backup-a baze...${NC}"
BACKUP_FILE="wol_backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec computer-runner-db pg_dump -U computer_runner computer_runner > "$BACKUP_FILE"
if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup kreiran: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))${NC}"
else
    echo -e "${RED}❌ Backup FAILED! Zaustavljam deployment.${NC}"
    exit 1
fi
echo ""

# Step 2: Pull code
echo -e "${YELLOW}[2/7] Pulling novi kod...${NC}"
git pull origin main
echo -e "${GREEN}✅ Kod update-ovan${NC}"
echo ""

# Step 3: Stop containers
echo -e "${YELLOW}[3/7] Zaustavljanje kontejnera...${NC}"
docker compose -f docker-compose.prod.yml down
echo -e "${GREEN}✅ Kontejneri zaustavljeni${NC}"
echo ""

# Step 4: Rebuild and start
echo -e "${YELLOW}[4/7] Rebuild i pokretanje novih kontejnera...${NC}"
docker compose -f docker-compose.prod.yml up -d --build
echo -e "${GREEN}✅ Kontejneri pokrenuti${NC}"
echo ""

# Step 5: Wait for backend
echo -e "${YELLOW}[5/7] Čekam da se backend pokrene...${NC}"
sleep 8
echo -e "${GREEN}✅ Backend ready${NC}"
echo ""

# Step 6: Run migrations
echo -e "${YELLOW}[6/7] Pokretanje migracija baze...${NC}"
echo ""

echo "  → migrate_user_computer_preferences.py"
docker exec computer-runner-backend python migrate_user_computer_preferences.py
echo ""

echo "  → migrate_user_computer_roles.py"
docker exec computer-runner-backend python migrate_user_computer_roles.py
echo ""

echo "  → migrate_ssh_auto_login.py"
docker exec computer-runner-backend python migrate_ssh_auto_login.py
echo ""

echo "  → migrate_created_by.py"
docker exec computer-runner-backend python migrate_created_by.py
echo ""

echo "  → migrate_remove_ssh_terminal_setting.py"
docker exec computer-runner-backend python migrate_remove_ssh_terminal_setting.py
echo ""

echo -e "${GREEN}✅ Sve migracije završene${NC}"
echo ""

# Step 7: Verify
echo -e "${YELLOW}[7/7] Verifikacija...${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

echo "=================================================="
echo -e "${GREEN}🎉 DEPLOYMENT USPEŠAN!${NC}"
echo "=================================================="
echo ""
echo "📝 Backup fajl: $BACKUP_FILE"
echo "🌐 URL: http://$(hostname -I | awk '{print $1}'):13223"
echo "👤 Login: admin / admin123"
echo ""
echo "🆕 Nove funkcionalnosti:"
echo "  - Role-based permissions (viewer/operator/owner)"
echo "  - Per-computer SSH auto-login preferences"
echo "  - Live Socket.IO updates"
echo "  - Full-width responsive layout"
echo ""
echo "📋 Proveri logove:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
echo ""
echo "=================================================="
