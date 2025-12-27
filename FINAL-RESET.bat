@echo off
cls
echo ========================================
echo   FINAL SCHEMA FIX - RESET DATABASE
echo ========================================
echo.
echo FIXED: Added created_by column to keyword_rules
echo.
echo This will:
echo 1. Delete old database
echo 2. Backend will create new one with COMPLETE schema
echo.
pause
echo.
echo [1/3] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo [2/3] Deleting old database...
if exist "backend\data\database.sqlite" (
    del /f /q "backend\data\database.sqlite"
    echo ✅ Database deleted!
) else (
    echo ℹ️  Database file not found (already deleted)
)
echo.
echo [3/3] Database will be recreated on next backend start
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. START BACKEND:
echo    cd backend
echo    npm run dev
echo.
echo 2. WAIT FOR:
echo    "✅ SQLite database loaded"
echo.
echo 3. REFRESH BROWSER (F5)
echo.
echo 4. CREATE BOT
echo.
echo 5. CONNECT TO WHATSAPP
echo.
echo 6. CREATE RULE (will work now!)
echo.
echo ========================================
echo   Schema is now COMPLETE!
echo ========================================
echo.
echo Columns added:
echo - keyword_rules.metadata ✅
echo - keyword_rules.created_by ✅
echo - bots.qr_code ✅
echo - bots.qr_expires_at ✅
echo - bots.last_connected_at ✅
echo.
echo ========================================
pause
