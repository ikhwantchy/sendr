@echo off
echo ========================================
echo   RESET DATABASE - FIX KEYWORD_RULES
echo ========================================
echo.

echo [WARNING] This will delete all data!
echo.
set /p confirm="Type YES to continue: "

if not "%confirm%"=="YES" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo [1/3] Stopping backend...
taskkill /F /FI "WINDOWTITLE eq *backend*" >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✓ Backend stopped
echo.

echo [2/3] Deleting old database...
cd backend
if exist data\wa-automation.db (
    del /F data\wa-automation.db
    echo ✓ Database deleted
) else (
    echo No database found
)
echo.

echo [3/3] Starting backend (will recreate database)...
start "WA Backend" cmd /k "npm run dev"
echo ✓ Backend starting...
echo.

echo ========================================
echo   DONE!
echo ========================================
echo.
echo Wait 10 seconds for backend to start.
echo Backend will automatically create all tables.
echo.
echo Then try create rule again!
echo.
pause
