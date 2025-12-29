# Setup Guide - WhatsApp Automation Platform

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed
- Redis 7+ installed (optional for development)

### Step 1: Clone & Install

```bash
# Navigate to project
cd "WA Automation Platform"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Setup Database

```bash
# Create PostgreSQL database
createdb wa_automation

# Or using psql:
psql -U postgres
CREATE DATABASE wa_automation;
\q

# Run migrations
cd backend
npm run migrate
```

The migration will:
- Create all tables
- Add indexes
- Create default tenant
- Create admin user (email: admin@example.com, password: admin123)

### Step 3: Configure Environment

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Optional: Google Sheets
GOOGLE_SHEETS_API_KEY=your-api-key
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Access Dashboard

Open browser: `http://localhost:3000`

**Default Login:**
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the default password immediately!

---

## 🐳 Docker Setup (Recommended for Production)

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 3001)
- Frontend Dashboard (port 3000)

### Environment Variables for Docker

Create `.env` file in root:

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GOOGLE_SHEETS_API_KEY=your-api-key-if-needed
```

---

## 📋 Detailed Setup Steps

### 1. Database Setup

#### Option A: Using Migration Script

```bash
cd backend
npm run migrate
```

#### Option B: Manual SQL

```bash
psql -U postgres -d wa_automation -f src/database/schema.sql
```

#### Verify Database

```bash
psql -U postgres -d wa_automation

# List tables
\dt

# Check tenants
SELECT * FROM tenants;

# Check users
SELECT id, email, role FROM users;
```

### 2. Redis Setup (Optional for Development)

Redis is used for:
- Session caching
- Data source caching
- Job queues

**Install Redis:**

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Download from: https://github.com/microsoftarchive/redis/releases

**Test Redis:**
```bash
redis-cli ping
# Should return: PONG
```

### 3. WhatsApp Setup

The platform uses `whatsapp-web.js` which requires:

1. **Chromium** (installed automatically)
2. **Session storage** (created automatically in `backend/sessions/`)

**First Bot Connection:**

1. Create a bot in dashboard
2. Click "Connect"
3. Scan QR code with WhatsApp
4. Wait for "Connected" status

**Session Persistence:**

Sessions are saved in `backend/sessions/` directory. Keep this directory backed up to avoid re-scanning QR codes.

### 4. Google Sheets Integration (Optional)

To use Google Sheets as data sources:

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com
   - Create new project

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" > "Library"
   - Search "Google Sheets API"
   - Click "Enable"

3. **Create API Key**
   - Go to "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

4. **Add to .env**
   ```env
   GOOGLE_SHEETS_API_KEY=your-api-key-here
   ```

5. **Make Spreadsheet Public**
   - Open your Google Sheet
   - Click "Share"
   - Change to "Anyone with the link can view"

---

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

### 2. Test Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "OWNER"
    }
  }
}
```

### 3. Test Event System

Create a test file `backend/test-events.ts`:

```typescript
import { eventBus } from './src/core/events/eventBus';
import { EventType } from './src/core/events/types';

// Subscribe to event
eventBus.subscribe(EventType.MESSAGE_RECEIVED, async (event) => {
  console.log('Event received:', event);
});

// Emit event
await eventBus.emit(
  EventType.MESSAGE_RECEIVED,
  {
    tenant_id: 'test-tenant',
    bot_id: 'test-bot',
    channel: 'wa',
    group_id: null,
    contact_id: 'test-contact',
    message: 'Hello',
    timestamp: new Date().toISOString(),
  },
  {
    wa_message_id: 'test-123',
    from: 'test@c.us',
    to: 'bot@c.us',
    message_type: 'text',
    content: 'Hello',
    is_group: false,
  }
);
```

Run:
```bash
npx tsx backend/test-events.ts
```

---

## 🔧 Troubleshooting

### Database Connection Failed

**Error:** `ECONNREFUSED ::1:5432`

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Try `DB_HOST=127.0.0.1` instead of `localhost`

### WhatsApp QR Code Not Generating

**Error:** `QR code generation timeout`

**Solution:**
1. Check Chromium installation
2. Ensure `sessions` directory is writable
3. Check firewall/antivirus blocking Chromium

### Redis Connection Failed

**Error:** `ECONNREFUSED ::1:6379`

**Solution:**
1. Start Redis: `redis-server`
2. Or disable Redis caching (set `REDIS_HOST=` empty)

### Port Already in Use

**Error:** `EADDRINUSE :::3001`

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### Frontend Can't Connect to Backend

**Error:** `Network Error`

**Solution:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
3. Check CORS settings in backend

---

## 📦 Production Deployment

### 1. Build Applications

**Backend:**
```bash
cd backend
npm run build
```

**Frontend:**
```bash
cd frontend
npm run build
```

### 2. Environment Variables

**Production .env:**
```env
NODE_ENV=production
PORT=3001

# Database (use production credentials)
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=your-db-user
DB_PASSWORD=strong-password
DB_SSL=true

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password

# JWT (MUST be strong and secret!)
JWT_SECRET=generate-a-strong-random-secret-min-32-chars

# Google Sheets
GOOGLE_SHEETS_API_KEY=your-api-key

# CORS
CORS_ORIGIN=https://your-domain.com
```

### 3. Start Production

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm start
```

### 4. Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start dist/index.js --name wa-backend

# Start frontend
cd frontend
pm2 start npm --name wa-frontend -- start

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

### 5. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/wa-automation

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/wa-automation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (min 32 chars)
- [ ] Enable database SSL in production
- [ ] Use environment variables (never commit secrets)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use strong database passwords

---

## 📊 Monitoring

### Logs

**Backend logs:**
```bash
tail -f backend/logs/app.log
tail -f backend/logs/error.log
```

**PM2 logs:**
```bash
pm2 logs wa-backend
pm2 logs wa-frontend
```

### Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Event logs count
SELECT event_type, COUNT(*) 
FROM event_logs 
GROUP BY event_type 
ORDER BY COUNT(*) DESC;
```

---

## 🎯 Next Steps

1. **Create Your First Bot**
   - Go to Dashboard > Bots
   - Click "Create Bot"
   - Connect with QR code

2. **Add Automation Rules**
   - Go to Rules
   - Create keyword-based replies

3. **Setup Data Sources**
   - Connect Google Sheets
   - Map columns to variables

4. **Run a Campaign**
   - Go to Campaigns
   - Create broadcast message

5. **Invite Team Members**
   - Go to Users (OWNER only)
   - Invite with roles

---

## 📚 Additional Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Event Reference](./EVENTS.md)

---

**Need Help?**

Check the troubleshooting section or review the architecture documentation for detailed explanations of how each component works.

---

**Built with ❤️ by Anti-Gravity**
