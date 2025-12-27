# ⚠️ DATABASE CONNECTION ISSUE

## **PROBLEM:**
Migration failed with: `password authentication failed for user "postgres"`

This means your PostgreSQL database credentials in `.env` are incorrect.

---

## **SOLUTION:**

### **OPTION 1: Fix PostgreSQL Credentials**

Edit `backend/.env` and update:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_POSTGRES_PASSWORD
```

Then run:
```bash
node migrate.js
```

---

### **OPTION 2: Use Existing Database (If Already Running)**

If your backend is already running with the correct database, the tables might already exist!

**Check if backend is running:**
```bash
npm run dev
```

If it starts successfully, your database connection is working!

Then manually run these SQL commands in your PostgreSQL:

```sql
-- Update campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_contacts INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'custom')),
    schedule_config TEXT,
    next_run_at TIMESTAMP NOT NULL,
    last_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at ON reminders(next_run_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_schedule_type ON reminders(schedule_type);
```

---

### **OPTION 3: Skip Migration (If Backend Already Running)**

If your backend is already running successfully, you can skip the migration and manually add the tables via SQL client (pgAdmin, DBeaver, etc).

---

## **NEXT STEPS:**

1. **Fix database credentials** in `.env`
2. **OR** run SQL manually in PostgreSQL
3. **Then restart backend:**
   ```bash
   npm run dev
   ```

4. **Verify logs show:**
   ```
   ✅ Message queue initialized
   ✅ Reminder scheduler started
   🚀 Server running on port 3001
   ```

5. **TEST AUTO-REPLY:**
   - Send "halo" to bot
   - Should reply "Ya, Halo!"

---

**What's your database password?** 
Or is the backend already running successfully?
