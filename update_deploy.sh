#!/bin/bash
# WOL Manager - Quick Update Deployment
# ======================================
# Koristi se za update postojeće instalacije (BEZ database migracija)
# Samo pull-uje novi kod i restartuje kontejnere

set -e

echo "🚀 WOL Manager - Quick Update"
echo "=============================="
echo ""

# 1. Pull latest changes
echo "📥 Pulling latest code from Git..."
git pull

echo ""

# 2. Rebuild and restart containers
echo "🔨 Rebuilding and restarting containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""

# 3. Show status
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Update završen!"
echo ""
echo "Pristup aplikaciji:"
echo "  - Frontend: http://$(hostname -I | awk '{print $1}'):13223"
echo "  - Backend API: http://localhost:5000"
echo ""
echo "📋 Proveri logove ako ima problema:"
echo "  docker compose -f docker-compose.prod.yml logs -f backend"
