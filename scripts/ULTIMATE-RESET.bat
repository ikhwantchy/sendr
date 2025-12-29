@echo off
cls
echo ========================================
echo   ULTIMATE FIX - COMPLETE RESET
echo ========================================
echo.
echo PROBLEM IDENTIFIED:
echo - Database file keeps getting recreated
echo - Backend is using OLD CODE (cached)
echo.
echo SOLUTION:
echo 1. Kill ALL node processes
echo 2. Delete database
echo 3. Clear node cache
echo 4. Restart backend with FRESH code
echo.
pause
echo.
echo [1/5] Killing ALL node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 3 /nobreak >nul
echo ✅ Done
echo.
echo [2/5] Deleting database...
if exist "backend\data\database.sqlite" (
    del /f /q "backend\data\database.sqlite"
    echo ✅ Database deleted
) else (
    echo ℹ️  Database already deleted
)
echo.
echo [3/5] Clearing node_modules cache...
if exist "backend\node_modules\.cache" (
    rmdir /s /q "backend\node_modules\.cache"
    echo ✅ Cache cleared
) else (
    echo ℹ️  No cache to clear
)
echo.
echo [4/5] Deleting dist folder...
if exist "backend\dist" (
    rmdir /s /q "backend\dist"
    echo ✅ Dist deleted
) else (
    echo ℹ️  No dist folder
)
echo.
echo [5/5] Ready to restart!
echo.
echo ========================================
echo   NEXT STEPS (IMPORTANT!):
echo ========================================
echo.
echo 1. OPEN NEW TERMINAL (important!)
echo.
echo 2. RUN:
echo    cd backend
echo    npm run dev
echo.
echo 3. WAIT FOR:
echo    "✅ SQLite database loaded"
echo.
echo 4. CHECK LOGS FOR:
echo    "CREATE TABLE IF NOT EXISTS keyword_rules"
echo    Should show: metadata TEXT, created_by TEXT
echo.
echo 5. REFRESH BROWSER (F5)
echo.
echo 6. CREATE BOT ^& CONNECT
echo.
echo 7. CREATE RULE (will work!)
echo.
echo ========================================
echo   All processes killed!
echo   All caches cleared!
echo   Ready for fresh start!
echo ========================================
echo.
pause
