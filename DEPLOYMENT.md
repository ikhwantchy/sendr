# Deployment Guide: BroBot WhatsApp Automation Platform

This guide details how to deploy the BroBot platform to your existing AWS server (running Ubuntu/Debian) alongside your existing applications (`Cucii.my.id`).

## 📋 Prerequisites
- Access to your AWS Server via SSH.
- **Node.js** (v18 or later) installed on the server.
- **PM2** installed globally on the server.
- **Git** installed on the server.
- **Nginx** (already installed on your server).

## 🚀 Step 1: Prepare Your Codebase

1.  **Protect Sensitive Data**:
    Ensure your `.gitignore` in `backend/` includes:
    ```
    .env
    node_modules/
    dist/
    sessions/
    *.sqlite
    *.sqlite-journal
    ```
    *Note: We exclude `sessions/` and database files so they are not overwritten by future deployments/git pulls.*

2.  **Push to GitHub**:
    Ensure all your latest changes are committed and pushed to your repository.
    ```bash
    git add .
    git commit -m "Ready for deployment"
    git push origin main
    ```

## 🛠️ Step 2: Server Setup

Connect to your server:
```bash
ssh user@your-server-ip
```

1.  **Install Node.js 18+** (if not already installed):
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

2.  **Install PM2 (Process Manager)**:
    ```bash
    sudo npm install -g pm2
    ```

3.  **Prepare Directory**:
    Create a folder for your app (e.g., in `/var/www/brobot` or `~/brobot`).
    ```bash
    mkdir -p ~/brobot
    cd ~/brobot
    ```

4.  **Clone Repository**:
    ```bash
    git clone https://github.com/ikhwantchy/BroBot.git .
    # Or your specific repo URL
    ```

## ⚙️ Step 3: Backend Deployment

1.  **Navigate to Backend**:
    ```bash
    cd ~/brobot/backend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create a `.env` file:
    ```bash
    nano .env
    ```
    Paste your production variables:
    ```env
    PORT=3001
    NODE_ENV=production
    JWT_SECRET=your_super_secret_jwt_key
    API_KEY=your_secure_api_key
    GOOGLE_SHEETS_API_KEY=your_google_api_key
    # Database path relative to execution
    DB_PATH=./database.sqlite
    ```

4.  **Build and Setup Database**:
    ```bash
    npm run build
    # Initialize DB (Run migrations)
    npm run migrate
    ```

5.  **Start with PM2**:
    ```bash
    pm2 start dist/index.js --name "brobot-backend"
    ```

## 🎨 Step 4: Frontend Deployment

1.  **Navigate to Frontend**:
    ```bash
    cd ~/brobot/frontend
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create `.env.local`:
    ```bash
    nano .env.local
    ```
    Content (Point to your domain or localhost port):
    ```env
    NEXT_PUBLIC_API_URL=https://wa.cucii.my.id/api
    # Or if running locally without https yet: http://localhost:3001
    ```

4.  **Build Next.js**:
    ```bash
    npm run build
    ```

5.  **Start with PM2**:
    ```bash
    pm2 start npm --name "brobot-frontend" -- start -- -p 3000
    ```

6.  **Save PM2 List** (so it restarts on reboot):
    ```bash
    pm2 save
    pm2 startup
    ```

## 🌐 Step 5: Nginx Configuration (Reverse Proxy)

Since `Cucii.my.id` is already running, we will add a new server block for the bot. You can use a subdomain like `wa.cucii.my.id` or `bot.cucii.my.id`.

1.  **Create Nginx Config**:
    ```bash
    sudo nano /etc/nginx/sites-available/brobot
    ```

2.  **Paste Configuration**:
    Replace `wa.cucii.my.id` with your desired domain.

    ```nginx
    server {
        listen 80;
        server_name wa.cucii.my.id;

        # Frontend (Next.js)
        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
        
        # WhatsApp Socket (if using WebSockets)
        location /socket.io {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
    ```

3.  **Enable Configuration**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/brobot /etc/nginx/sites-enabled/
    ```

4.  **Test & Reload Nginx**:
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

5.  **SSL Setup (HTTPS)** (Optional but Recommended):
    Use Certbot:
    ```bash
    sudo certbot --nginx -d wa.cucii.my.id
    ```

## ✅ Done!
Your application should now be accessible at `http://wa.cucii.my.id`.

### 🔄 Updating in Future
To update the app with new changes:
```bash
cd ~/brobot
git pull origin main

# Update Backend
cd backend
npm install
npm run build
pm2 restart brobot-backend

# Update Frontend
cd ../frontend
npm install
npm run build
pm2 restart brobot-frontend
```
