#!/bin/bash
# Sendr Deployment Script

set -e

# Get current directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Starting deployment in $DIR..."

# Pull latest changes
echo "📥 Pulling from git..."
git pull origin main

# Backend
echo "🔧 Building Backend..."
cd backend
npm install
npm run build
# Optional: npm run migrate
cd ..

# Frontend
echo "🎨 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# Restart PM2
echo "🔄 Restarting Service..."
pm2 restart all || echo "PM2 process not found, skipping restart."

echo "✅ Done! Application updated."
