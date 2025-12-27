# 🔴 CAMPAIGN ERROR - TABLE NOT FOUND!

## ⚠️ **PROBLEM:**

Backend error: **"no such table: campaigns"**

The database migration didn't create the campaigns table!

---

## ✅ **QUICK FIX:**

Run the SQLite migration script:

```bash
cd backend
node migrate-sqlite.js
```

**This will:**
- Create `campaigns` table
- Create `reminders` table
- Add all necessary columns
- Create indexes

---

## 🚀 **AFTER MIGRATION:**

1. **Restart backend:**
```bash
npm run dev
```

2. **Test campaign creation**
3. **Should work!** ✅

---

## 📝 **WHAT HAPPENED:**

The `migrate-sqlite.js` script exists but wasn't run!

**Check if tables exist:**
```bash
sqlite3 backend/data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';"
```

**Should see:**
- bots
- keyword_rules
- event_logs
- **campaigns** ← Missing!
- **reminders** ← Missing!

---

## 🔧 **ALTERNATIVE FIX:**

If `migrate-sqlite.js` doesn't work, manually create tables:

```bash
sqlite3 backend/data/database.sqlite
```

Then paste:
```sql
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_contacts TEXT,
    status TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    schedule_config TEXT NOT NULL,
    next_run_at TEXT,
    last_run_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at);
```

Type `.exit` to quit.

---

## 🎯 **RECOMMENDED:**

**Just run the migration script:**

```bash
cd backend
node migrate-sqlite.js
```

**Then restart backend!**

---

**Run migration sekarang!** 🚀
