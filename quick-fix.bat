@echo off
echo ====================================
echo QUICK FIX: Reset DB and Restart
echo ====================================
echo.

REM Delete old database
if exist "backend\data\database.sqlite" (
    echo [1/3] Deleting old database...
    del /F "backend\data\database.sqlite"
    echo     Done!
) else (
    echo [1/3] No old database found
)

echo.
echo [2/3] Database will be recreated on next backend start
echo.
echo [3/3] NEXT STEPS:
echo     1. Stop backend (Ctrl+C in backend terminal)
echo     2. Run: npm run dev
echo     3. Refresh browser
echo.
echo ====================================
echo READY! Restart backend now!
echo ====================================
pause
