@echo off
echo ========================================
echo   RESTART FRONTEND (Clear Cache)
echo ========================================
echo.

cd frontend

echo [1/3] Stopping frontend...
taskkill /F /FI "WINDOWTITLE eq WA Frontend*" >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ Frontend stopped
echo.

echo [2/3] Clearing .next cache...
if exist .next (
    rmdir /S /Q .next
    echo ✓ Cache cleared
) else (
    echo No cache found
)
echo.

echo [3/3] Starting frontend...
start "WA Frontend" cmd /k "npm run dev"
echo ✓ Frontend starting...
echo.

echo ========================================
echo   DONE!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo.
echo Wait 10-15 seconds for frontend to start.
echo Then refresh your browser (Ctrl + F5)
echo.
pause
