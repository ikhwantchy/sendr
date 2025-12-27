@echo off
echo ========================================
echo  RUNNING SQLITE MIGRATIONS
echo ========================================
echo.

cd backend

echo Running migration: 001_campaign_reminder.sql
sqlite3 data/database.sqlite < migrations/001_campaign_reminder.sql

echo.
echo ========================================
echo  VERIFYING TABLES
echo ========================================
echo.

echo Tables created:
sqlite3 data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo.
echo ========================================
echo  SUCCESS!
echo ========================================
echo.
echo Next steps:
echo 1. Restart backend: npm run dev
echo 2. Test Campaign with CSV upload
echo 3. Test Reminder with group selection
echo.
pause
