# ✅ FIX SQLITE TABLES - SIMPLE GUIDE

## 🚀 **QUICK FIX (2 MINUTES):**

### **Step 1: Run Batch Script**

**Double-click this file:**
```
FIX-SQLITE-TABLES.bat
```

**What it does:**
- Creates `campaigns` table
- Creates `reminders` table
- Creates indexes
- Verifies tables exist

**You'll see:**
```
Creating campaigns and reminders tables...
Tables in database:
bots
keyword_rules
event_logs
campaigns       ← NEW!
reminders       ← NEW!
DONE!
```

---

### **Step 2: Restart Backend**

```bash
cd backend
npm run dev
```

**Look for:**
```
✅ SQLite database loaded
✅ Reminder scheduler started
🚀 Server running on port 3001
```

---

### **Step 3: Test Campaign**

1. Go to `http://localhost:3000/dashboard/campaigns`
2. Click "New Campaign"
3. Fill form & create
4. **Should work now!** ✅

---

### **Step 4: Test Reminder**

1. Go to `http://localhost:3000/dashboard/reminders`
2. Click "New Reminder"
3. Fill form & create
4. **Should work now!** ✅

---

## ⚠️ **IF BATCH SCRIPT FAILS:**

### **Manual Method:**

**Open Command Prompt:**
```bash
cd "c:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform\backend"
```

**Run each command:**

```bash
sqlite3 data/database.sqlite "CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, bot_id TEXT NOT NULL, name TEXT NOT NULL, message_template TEXT NOT NULL, target_type TEXT NOT NULL, target_contacts TEXT, status TEXT DEFAULT 'draft', total_contacts INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), started_at TEXT, completed_at TEXT);"

sqlite3 data/database.sqlite "CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, bot_id TEXT NOT NULL, name TEXT NOT NULL, message TEXT NOT NULL, recipient TEXT NOT NULL, recipient_type TEXT DEFAULT 'phone', schedule_type TEXT NOT NULL, schedule_config TEXT NOT NULL, next_run_at TEXT, last_run_at TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);"
```

---

## ✅ **VERIFY TABLES CREATED:**

```bash
sqlite3 data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';"
```

**Should see:**
- bots
- keyword_rules
- event_logs
- **campaigns** ← NEW!
- **reminders** ← NEW!

---

## 🎯 **AFTER TABLES CREATED:**

1. **Restart backend**
2. **Test Campaign** - Should work! ✅
3. **Test Reminder** - Should work! ✅
4. **No more "table not found" errors!** ✅

---

## 📝 **WHAT WAS THE PROBLEM?**

**Before:**
- Migration script (`migrate-sqlite.js`) not running
- Tables never created
- Backend errors: "no such table: campaigns"

**After:**
- Tables created manually
- Backend can access tables
- Features work! ✅

---

## 🎉 **NEXT STEPS:**

After tables are created:

1. **Test Campaign with Excel upload**
2. **Fix Reminder for GROUPS** (not individuals)
3. **Test everything works**

---

**Run `FIX-SQLITE-TABLES.bat` now!** 🚀

Then restart backend and test!
