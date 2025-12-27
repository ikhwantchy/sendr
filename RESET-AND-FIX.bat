@echo off
cls
echo ========================================
echo   AUTO RESET DATABASE - FIXED SCHEMA
echo ========================================
echo.
echo This will automatically:
echo 1. Delete old database
echo 2. Backend will create new one with FIXED schema
echo.
pause
echo.
echo [1/2] Deleting old database...
if exist "backend\data\database.sqlite" (
    del /f /q "backend\data\database.sqlite"
    echo ✅ Database deleted!
) else (
    echo ⚠️  Database file not found (already deleted?)
)
echo.
echo [2/2] Database will be recreated on next backend start
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. RESTART BACKEND:
echo    - Stop backend (Ctrl+C)
echo    - Run: npm run dev
echo    - Wait for "SQLite database loaded"
echo.
echo 2. REFRESH BROWSER (F5)
echo.
echo 3. CREATE NEW BOT
echo    - Name: Test Bot
echo    - Click Create
echo.
echo 4. CONNECT TO WHATSAPP
echo    - Click Manage
echo    - Click Connect to WhatsApp
echo    - Scan QR with phone
echo.
echo 5. CREATE RULE (will work now!)
echo    - Go to Rules
echo    - Click Create Rule
echo    - Fill form
echo    - Click Create
echo    - ✅ SUCCESS!
echo.
echo 6. TEST AUTO-REPLY
echo    - Send message to bot
echo    - Bot will reply!
echo.
echo ========================================
echo   Database reset complete!
echo ========================================
echo.
echo RESTART BACKEND NOW!
echo.
pause
