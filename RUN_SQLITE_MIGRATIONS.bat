@echo off
echo ========================================
echo RUNNING SQLITE MIGRATIONS
echo Multi-User Access System
echo ========================================
echo.

cd backend

echo [1/2] Running SQLite migrations...
node migrate-sqlite.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Migration failed!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ MIGRATIONS COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Next steps:
echo 1. Start backend: npm run dev
echo 2. Start frontend: cd frontend ^&^& npm run dev
echo 3. Login and test Users page
echo.
pause
