# 🚀 CARA MUDAH RUN MIGRATION

**PowerShell execution policy blocked? No problem!**

---

## ✅ CARA PALING MUDAH (2 MENIT)

### **OPTION 1: Pakai DB Browser for SQLite (RECOMMENDED)**

1. **Download DB Browser** (jika belum punya):
   - https://sqlitebrowser.org/dl/
   - Install & buka

2. **Open Database:**
   - File → Open Database
   - Pilih: `wa_automation.db` (di root folder project)

3. **Run Migration:**
   - Tab "Execute SQL"
   - Open file: `admin-migration.sql`
   - Klik "Execute All" (▶️ button)

4. **Verify:**
   - Tab "Database Structure"
   - Lihat tables: `api_keys`, `audit_logs`, `user_invites`, dll
   - ✅ Done!

---

### **OPTION 2: Pakai VS Code Extension**

1. **Install Extension:**
   - Buka VS Code
   - Install: "SQLite Viewer" atau "SQLite"

2. **Open Database:**
   - Right-click `wa_automation.db`
   - "Open Database"

3. **Run SQL:**
   - Copy isi `admin-migration.sql`
   - Paste ke SQL query window
   - Execute

---

### **OPTION 3: Command Line (jika sqlite3 installed)**

```bash
cd "C:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform"
sqlite3 wa_automation.db < admin-migration.sql
```

---

## ✅ AFTER MIGRATION

### **1. Verify Tables Created**

Open database dan check:
```sql
SELECT name FROM sqlite_master 
WHERE type='table' 
AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
ORDER BY name;
```

Should return 6 tables!

---

### **2. Restart Backend**

```bash
cd backend
npm run dev
```

---

### **3. Test API**

```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"healthy",...}
```

---

### **4. Access Frontend**

1. Start frontend: `cd frontend && npm run dev`
2. Login ke dashboard
3. Navigate to: `http://localhost:3000/dashboard/api-keys`
4. ✅ Admin panel ready!

---

## 📁 FILES LOCATION

- **Migration SQL:** `admin-migration.sql` (root folder)
- **Database:** `wa_automation.db` (root folder)
- **Backend:** `backend/` folder
- **Frontend:** `frontend/` folder

---

## 🎯 WHAT YOU'LL GET

After migration:
- ✅ 6 new tables
- ✅ 29 default settings
- ✅ 3 indexes
- ✅ 40+ API endpoints ready
- ✅ Admin panel functional

---

## ⚠️ TROUBLESHOOTING

### **"Table already exists"**
- Normal! Tables sudah ada
- Migration safe to run multiple times
- Uses `CREATE TABLE IF NOT EXISTS`

### **"Database locked"**
- Close backend server
- Close any DB browser
- Try again

### **"Cannot find database"**
- Make sure you're in project root
- Check if `wa_automation.db` exists
- If not, run backend once to create it

---

## 🎉 READY!

**Recommended:** Use DB Browser for SQLite (Option 1)
**Time needed:** 2 minutes
**Difficulty:** Easy!

**After migration → Restart backend → Test → Enjoy!** 🚀
