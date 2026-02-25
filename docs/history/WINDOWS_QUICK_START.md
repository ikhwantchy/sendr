# 🪟 Quick Setup for Windows

## ✅ Good News!
PostgreSQL 17 is already installed and running on your system!

---

## 🚀 Quick Setup (3 Easy Steps)

### Step 1: Create Database

**Option A: Double-click the batch file (Easiest)**
1. Find `setup_database.bat` in the project folder
2. Double-click it
3. Enter your PostgreSQL password when prompted
4. Done!

**Option B: Use Command Prompt**
```cmd
setup_database.bat
```

**Option C: Use pgAdmin (GUI)**
1. Open pgAdmin 4 from Start Menu
2. Connect to PostgreSQL 17
3. Right-click "Databases" → Create → Database
4. Name: `wa_automation`
5. Click Save

---

### Step 2: Install Dependencies & Run Migration

```powershell
# Navigate to backend
cd backend

# Install dependencies
npm install

# Run database migration (creates all tables)
npm run migrate
```

---

### Step 3: Start the Platform

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

---

## 🌐 Access the Dashboard

Open your browser: **http://localhost:3000**

**Login:**
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Change this password immediately after first login!**

---

## 🔧 Troubleshooting

### "Password authentication failed"

The batch script will prompt for your PostgreSQL password. If you forgot it:

1. Open pgAdmin 4
2. Right-click PostgreSQL 17 server
3. Properties → Connection
4. Reset password

### "Database already exists"

That's fine! Skip to Step 2 (Run migration).

### "npm is not recognized"

Install Node.js:
1. Download: https://nodejs.org/
2. Install LTS version
3. Restart terminal

---

## 📋 Full Setup Checklist

- [x] PostgreSQL 17 installed ✅
- [x] PostgreSQL service running ✅
- [ ] Database created (run `setup_database.bat`)
- [ ] Backend dependencies installed (`npm install`)
- [ ] Database migrated (`npm run migrate`)
- [ ] Frontend dependencies installed
- [ ] Platform running

---

## 🎯 What's Next?

After setup is complete:

1. **Create your first bot** - Dashboard → Bots → Create
2. **Add automation rules** - Dashboard → Rules → Create
3. **Connect Google Sheets** - Dashboard → Data Sources
4. **Run a campaign** - Dashboard → Campaigns → Create

---

## 📚 Documentation

- **WINDOWS_SETUP.md** - Detailed Windows guide
- **SETUP.md** - General setup guide
- **QUICK_START.md** - Quick reference
- **EXAMPLES.md** - Configuration examples

---

## 💡 Tips

1. **Use PowerShell** instead of CMD for better experience
2. **Run terminals as Administrator** if you encounter permission issues
3. **Check logs** in `backend/logs/` if something goes wrong
4. **Use pgAdmin** for database management (GUI is easier)

---

## ✅ Your System Status

- ✅ PostgreSQL 17: **Installed & Running**
- ✅ Location: `C:\Program Files\PostgreSQL\17\`
- ✅ Service: `postgresql-x64-17` (Running)

**You're ready to go! Just run the setup script!**

---

**Need help? Check WINDOWS_SETUP.md for detailed instructions.**
