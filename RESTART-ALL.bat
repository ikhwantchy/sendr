@echo off
echo ========================================
echo   WA AUTOMATION - COMPLETE RESTART
echo ========================================
echo.

echo [1/6] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ All Node processes stopped
echo.

echo [2/6] Cleaning WhatsApp sessions...
cd backend
if exist sessions (
    echo Found sessions folder, cleaning...
    rmdir /S /Q sessions
    mkdir sessions
    echo ✓ Sessions cleaned
) else (
    echo No sessions folder found
    mkdir sessions
)
echo.

echo [3/6] Checking database...
echo Please ensure MySQL is running!
echo.

echo [4/6] Starting Backend...
start "WA Backend" cmd /k "npm run dev"
echo ✓ Backend starting... (check new window)
timeout /t 5 /nobreak >nul
echo.

echo [5/6] Starting Frontend...
cd ..\frontend
start "WA Frontend" cmd /k "npm run dev"
echo ✓ Frontend starting... (check new window)
echo.

echo [6/6] Done!
echo.
echo ========================================
echo   RESTART COMPLETE!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Check the new terminal windows for logs.
echo Wait 10-15 seconds for everything to start.
echo.
echo Then:
echo 1. Open http://localhost:3000
echo 2. Login
echo 3. Create/Connect bot
echo 4. Scan QR code
echo 5. Try create rule
echo.
pause
