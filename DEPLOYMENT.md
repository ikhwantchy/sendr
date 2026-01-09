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
*Use this method if you have a domain (e.g., `bot.yoursite.com`) and want to run this app alongside existing apps on Port 80/443.*

1.  **Create Nginx Config**:
    ```bash
    sudo nano /etc/nginx/sites-available/brobot
    ```

2.  **Paste Configuration**:
    Replace `wa.yourdomain.com` with your actual domain/subdomain.

    ```nginx
    server {
        listen 80;
        server_name wa.yourdomain.com; # CHANGE THIS

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
    ```bash
    sudo certbot --nginx -d wa.yourdomain.com
    ```

## 🚪 Alternative: Direct Port Access (No Domain)
*Use this method if you don't have a domain yet or just want to test using the Server IP.*

1.  **Open Ports in AWS Security Group**:
    - Go to AWS Console > EC2 > Security Groups.
    - Edit Inbound Rules for your instance.
    - Add Custom TCP Rule for Port **3000** (Frontend) and **3001** (Backend).
    - Source: `0.0.0.0/0` (Anywhere).

2.  **Update Frontend Environment**:
    Edit `frontend/.env.local` to point to the IP address:
    ```env
    NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api
    ```
    *Rebuild frontend after changing this (`npm run build`).*

3.  **Access App**:
    - Frontend: `http://YOUR_SERVER_IP:3000`
    - Backend: `http://YOUR_SERVER_IP:3001`

## ✅ Done!
Your application should now be accessible at `http://wa.cucii.my.id`.

---

## 🔄 Auto-Deployment Setup

### Method 1: GitHub Actions (Recommended)
**Otomatis deploy setiap kali push ke GitHub!**

#### Setup GitHub Secrets:
1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AWS_HOST` | Your server IP address | e.g., `13.123.45.67` |
| `AWS_USERNAME` | SSH username | Usually `ubuntu` or `ec2-user` |
| `AWS_SSH_KEY` | Your private SSH key | Full content of your `.pem` file |

#### Setup SSH Key on Server:
```bash
# On your local machine, copy your public key
cat ~/.ssh/id_rsa.pub

# On AWS server, add it to authorized_keys
ssh user@your-server-ip
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key, save and exit

# Set permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### How it Works:
- ✅ Push code to GitHub → Auto-deploy triggered
- ✅ Server pulls latest changes
- ✅ Installs dependencies
- ✅ Builds backend & frontend
- ✅ Restarts PM2 processes
- ✅ Preview langsung tersedia di IP server!

**Workflow file sudah dibuat di:** `.github/workflows/deploy.yml`

---

### Method 2: Manual Deploy Script
**Untuk deploy manual dari server**

1. **Upload script ke server:**
   ```bash
   # From local machine
   scp deploy.sh user@your-server-ip:~/brobot/
   ```

2. **Make it executable:**
   ```bash
   # On server
   ssh user@your-server-ip
   cd ~/brobot
   chmod +x deploy.sh
   ```

3. **Run deployment:**
   ```bash
   ./deploy.sh
   ```

---

### 🎯 Workflow Setelah Setup:

#### Dari Local (Development):
```bash
# 1. Buat perubahan di code
# 2. Test di localhost jika perlu
# 3. Commit & Push
git add .
git commit -m "Update feature X"
git push origin main

# 4. GitHub Actions otomatis deploy ke server
# 5. Tunggu 1-2 menit
# 6. Preview langsung di: http://YOUR_SERVER_IP:3000
```

#### Manual Update (Tanpa GitHub Actions):
```bash
# SSH ke server
ssh user@your-server-ip

# Run deploy script
cd ~/brobot
./deploy.sh
```

---

### 📝 Monitoring Deployment:

**Check GitHub Actions:**
- Go to: Repository → **Actions** tab
- See deployment progress in real-time

**Check Server Status:**
```bash
# SSH to server
ssh user@your-server-ip

# Check PM2 status
pm2 status

# Check logs
pm2 logs brobot-backend --lines 50
pm2 logs brobot-frontend --lines 50

# Restart if needed
pm2 restart all
```

---

### 🔧 Troubleshooting:

**Deployment Failed?**
```bash
# Check GitHub Actions logs in Actions tab

# Or manually check on server:
ssh user@your-server-ip
cd ~/brobot
git status
git pull origin main
pm2 status
```

**Port not accessible?**
- Check AWS Security Group (Ports 3000, 3001 must be open)
- Check Nginx configuration if using reverse proxy

**Build errors?**
```bash
# Clear cache and rebuild
cd ~/brobot/backend
rm -rf node_modules dist
npm install
npm run build

cd ~/brobot/frontend
rm -rf node_modules .next
npm install
npm run build
```
