#!/bin/bash

# BroBot Auto-Deploy Script
# This script pulls latest changes and restarts the application

set -e  # Exit on error

echo "🚀 Starting BroBot deployment..."

# Navigate to project directory
cd ~/brobot

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Update Backend
echo "🔧 Updating Backend..."
cd backend
npm install
npm run build
pm2 restart brobot-backend

# Update Frontend
echo "🎨 Updating Frontend..."
cd ../frontend
npm install
npm run build
pm2 restart brobot-frontend

# Show status
echo "📊 Application Status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Access your app at: http://YOUR_SERVER_IP:3000"
