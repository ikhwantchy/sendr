#!/bin/bash

# BroBot Domain Setup Script
# Usage: ./setup-domain.sh brobot.them.my.id

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-domain.sh <domain>"
    exit 1
fi

echo "🚀 Setting up BroBot for domain: $DOMAIN"

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx config
echo "⚙️ Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/brobot > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
echo "🔗 Enabling site..."
sudo ln -sf /etc/nginx/sites-available/brobot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot
echo "🔒 Installing Certbot for SSL..."
sudo apt install certbot python3-certbot-nginx -y

echo ""
echo "✅ Nginx setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Add DNS A Record: $DOMAIN → $(curl -s ifconfig.me)"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Run: sudo certbot --nginx -d $DOMAIN"
echo "4. Update frontend .env: NEXT_PUBLIC_API_URL=https://$DOMAIN/api"
echo "5. Rebuild frontend: cd ~/brobot/frontend && npm run build && pm2 restart frontend"
echo ""
echo "🌐 Your site will be available at: https://$DOMAIN"
