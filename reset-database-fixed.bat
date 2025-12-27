@echo off
cls
echo ========================================
echo   RESET DATABASE - FIXED SCHEMA
echo ========================================
echo.
echo This will:
echo 1. Delete old database
echo 2. Create new database with FIXED schema
echo 3. Add metadata column to keyword_rules
echo 4. Add qr_code, qr_expires_at to bots
echo.
echo WARNING: All data will be lost!
echo.
pause
echo.
echo Deleting old database...
del /f /q backend\data\database.sqlite 2>nul
echo.
echo Database deleted!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. RESTART BACKEND:
echo    cd backend
echo    npm run dev
echo.
echo 2. REFRESH BROWSER (F5)
echo.
echo 3. CREATE NEW BOT
echo.
echo 4. CONNECT & SCAN QR
echo.
echo 5. CREATE RULES (will work now!)
echo.
echo ========================================
echo   Database reset complete!
echo ========================================
pause
