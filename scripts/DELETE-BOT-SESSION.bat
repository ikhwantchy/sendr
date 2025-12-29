@echo off
echo ========================================
echo   DELETE BOT SESSION - FRESH START
echo ========================================
echo.

set BOT_ID=6d6dde74-f923-41b9-94eb-1d17c8a475e4

echo Deleting session for bot: %BOT_ID%
echo.

cd /d "%~dp0"

if exist "backend\sessions\session-%BOT_ID%" (
    echo Found session folder, deleting...
    rmdir /s /q "backend\sessions\session-%BOT_ID%"
    echo Session deleted!
) else (
    echo No session folder found
)

echo.
echo ========================================
echo   SESSION DELETED!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Go to dashboard: http://localhost:5173
echo 2. Click "Connect to WhatsApp"
echo 3. Scan NEW QR code
echo 4. Bot will connect fresh!
echo.
pause
