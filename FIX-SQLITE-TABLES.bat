@echo off
echo ========================================
echo  FIXING SQLITE TABLES
echo ========================================
echo.

cd backend

echo Creating campaigns and reminders tables...
echo.

sqlite3 data/database.sqlite "CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, bot_id TEXT NOT NULL, name TEXT NOT NULL, message_template TEXT NOT NULL, target_type TEXT NOT NULL, target_contacts TEXT, status TEXT DEFAULT 'draft', total_contacts INTEGER DEFAULT 0, sent_count INTEGER DEFAULT 0, failed_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), started_at TEXT, completed_at TEXT);"

sqlite3 data/database.sqlite "CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, bot_id TEXT NOT NULL, name TEXT NOT NULL, message TEXT NOT NULL, recipient TEXT NOT NULL, recipient_type TEXT DEFAULT 'phone', schedule_type TEXT NOT NULL, schedule_config TEXT NOT NULL, next_run_at TEXT, last_run_at TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);"

sqlite3 data/database.sqlite "CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at);"

echo.
echo ========================================
echo  VERIFYING TABLES
echo ========================================
echo.

echo Tables in database:
sqlite3 data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';"

echo.
echo ========================================
echo  DONE!
echo ========================================
echo.
echo Tables created successfully!
echo.
echo Next steps:
echo 1. Restart backend: npm run dev
echo 2. Test Campaign creation
echo 3. Test Reminder creation
echo.
pause
