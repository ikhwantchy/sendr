# 🪟 Windows Setup Guide

## PostgreSQL Installation & Setup for Windows

### Step 1: Install PostgreSQL

**Option A: Download PostgreSQL Installer (Recommended)**

1. **Download PostgreSQL:**
   - Go to: https://www.postgresql.org/download/windows/
   - Download the latest version (14 or higher)
   - Or direct link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Click "Next" through the wizard
   - **IMPORTANT:** Remember the password you set for the `postgres` user
   - Default port: 5432 (keep this)
   - Install all components (PostgreSQL Server, pgAdmin, Command Line Tools)

3. **Complete Installation:**
   - Click "Finish"
   - PostgreSQL will start automatically

**Option B: Use Docker (Easier Alternative)**

If you have Docker Desktop installed:

```powershell
# Pull PostgreSQL image
docker pull postgres:14-alpine

# Run PostgreSQL container
docker run --name wa-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14-alpine

# Verify it's running
docker ps
```

---

### Step 2: Create Database

**Option A: Using pgAdmin (GUI - Easiest)**

1. **Open pgAdmin:**
   - Search for "pgAdmin" in Windows Start Menu
   - Launch pgAdmin 4

2. **Connect to Server:**
   - Expand "Servers" in left panel
   - Click "PostgreSQL 14" (or your version)
   - Enter the password you set during installation

3. **Create Database:**
   - Right-click "Databases"
   - Select "Create" → "Database..."
   - Database name: `wa_automation`
   - Owner: `postgres`
   - Click "Save"

**Option B: Using SQL Shell (psql)**

1. **Open SQL Shell:**
   - Search for "SQL Shell (psql)" in Windows Start Menu
   - Launch it

2. **Connect (press Enter for defaults):**
   ```
   Server [localhost]:        (press Enter)
   Database [postgres]:       (press Enter)
   Port [5432]:              (press Enter)
   Username [postgres]:       (press Enter)
   Password:                 (enter your password)
   ```

3. **Create Database:**
   ```sql
   CREATE DATABASE wa_automation;
   \q
   ```

**Option C: Using Command Prompt**

1. **Add PostgreSQL to PATH:**
   - Open System Environment Variables
   - Add to PATH: `C:\Program Files\PostgreSQL\14\bin`
   - Restart Command Prompt

2. **Create Database:**
   ```cmd
   psql -U postgres -c "CREATE DATABASE wa_automation;"
   ```

**Option D: Using PowerShell (Direct)**

```powershell
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\14\bin"

# Create database
.\psql.exe -U postgres -c "CREATE DATABASE wa_automation;"
```

---

### Step 3: Run Database Migration

Once the database is created:

```powershell
# Navigate to backend directory
cd "C:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform\backend"

# Install dependencies (if not done)
npm install

# Run migration
npm run migrate
```

---

### Step 4: Verify Database

**Using pgAdmin:**
1. Refresh the Databases list
2. You should see `wa_automation`
3. Expand it → Schemas → public → Tables
4. You should see 11 tables (tenants, users, bots, etc.)

**Using psql:**
```sql
-- Connect to database
\c wa_automation

-- List tables
\dt

-- View tenants
SELECT * FROM tenants;

-- Exit
\q
```

---

## Alternative: Use Docker for Everything

If you prefer Docker (no PostgreSQL installation needed):

### Step 1: Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop/
- Install and restart Windows
- Start Docker Desktop

### Step 2: Use Docker Compose

```powershell
# Navigate to project root
cd "C:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform"

# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# The database will be created automatically!
```

This is the **EASIEST** option - everything runs in containers!

---

## Troubleshooting

### "psql is not recognized"

**Solution 1: Add to PATH**
1. Find PostgreSQL installation directory (usually `C:\Program Files\PostgreSQL\14\bin`)
2. Add to System PATH:
   - Windows Key → Search "Environment Variables"
   - Click "Environment Variables"
   - Under "System variables", find "Path"
   - Click "Edit" → "New"
   - Add: `C:\Program Files\PostgreSQL\14\bin`
   - Click "OK" on all dialogs
   - **Restart Command Prompt/PowerShell**

**Solution 2: Use Full Path**
```powershell
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE wa_automation;"
```

**Solution 3: Use pgAdmin (GUI)**
- No PATH needed, just use the GUI!

### "password authentication failed"

- You're using the wrong password
- Reset it using pgAdmin or during reinstallation

### "could not connect to server"

- PostgreSQL service is not running
- Start it:
  - Windows Key → Search "Services"
  - Find "postgresql-x64-14"
  - Right-click → Start

---

## Quick Setup Summary

**Easiest Path (Docker):**
```powershell
# Install Docker Desktop, then:
cd "C:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform"
docker-compose up -d
```

**Traditional Path (PostgreSQL Installed):**
```powershell
# 1. Install PostgreSQL from website
# 2. Open pgAdmin → Create database "wa_automation"
# 3. Run migration:
cd backend
npm install
npm run migrate
```

---

## Next Steps

After database is created and migrated:

```powershell
# Start backend
cd backend
npm run dev

# Start frontend (new terminal)
cd frontend
npm run dev

# Access dashboard
# http://localhost:3000
```

---

## Need Help?

**Check if PostgreSQL is installed:**
```powershell
# Try to find psql
where.exe psql

# Check if service is running
Get-Service -Name postgresql*
```

**Check if Docker is available:**
```powershell
docker --version
docker-compose --version
```

Choose the method that works best for your setup!
