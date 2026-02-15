#!/bin/bash
# ===========================================
# Sendr Deploy Script - With Auto Backup
# ===========================================
# Usage: ./deploy.sh
# Run this ON THE SERVER (~/Sendr)
#
# IMPORTANT: Do NOT build on server (OOM).
# Build frontend locally, push .next/ to git.
# This script only pulls and restarts.
# ===========================================

set -e

# Get current directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Sendr Deploy Script"
echo "======================"
echo "   Directory: $DIR"

# Step 1: Backup database BEFORE anything else
echo ""
echo "📦 Step 1: Backing up database..."
BACKUP_DIR="backend/data/backups"
mkdir -p "$BACKUP_DIR"

DB_FILE="backend/data/database.sqlite"
if [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/database_pre-deploy_${TIMESTAMP}.sqlite"
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "   ✅ Backup saved: $BACKUP_FILE"
    echo "   📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    # Keep only last 10 pre-deploy backups
    ls -t "$BACKUP_DIR"/database_pre-deploy_*.sqlite 2>/dev/null | tail -n +11 | xargs -r rm
    echo "   🗑️  Old backups cleaned (keeping last 10)"
else
    echo "   ⚠️  No database file found (first deploy?)"
fi

# Step 2: Pull latest code
echo ""
echo "📥 Step 2: Pulling latest code from GitHub..."
git pull origin main
echo "   ✅ Code updated"

# Step 3: Install dependencies if needed
echo ""
echo "📦 Step 3: Checking dependencies..."
cd backend && npm install --no-audit --no-fund 2>/dev/null && cd ..
echo "   ✅ Dependencies OK"

# Step 4: Restart services
echo ""
echo "🔄 Step 4: Restarting PM2 services..."
npx pm2 restart Sendr-backend Sendr-frontend
echo "   ✅ Services restarted"

# Step 5: Verify
echo ""
echo "📋 Step 5: Verifying..."
sleep 2
npx pm2 status

echo ""
echo "✅ Deploy complete!"
echo ""
echo "📂 Available backups:"
ls -lhS "$BACKUP_DIR"/*.sqlite 2>/dev/null | head -5 || echo "   None"
echo ""
echo "🔧 To restore manually:"
echo "   cp $BACKUP_DIR/<backup_file> $DB_FILE"
echo "   npx pm2 restart Sendr-backend"
