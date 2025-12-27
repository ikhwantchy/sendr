@echo off
cls
echo ========================================
echo   FINAL FIX - DELETE DATABASE
echo ========================================
echo.
echo Current database location:
echo backend\data\database.sqlite
echo.
echo Checking if file exists...
if exist "backend\data\database.sqlite" (
    echo.
    echo [FOUND] Database file exists!
    echo.
    echo This file MUST be deleted to fix the schema.
    echo.
    echo Press any key to DELETE the database...
    pause
    echo.
    echo Deleting database...
    del /f /q "backend\data\database.sqlite"
    if exist "backend\data\database.sqlite" (
        echo.
        echo [ERROR] Failed to delete! File might be locked.
        echo.
        echo Please:
        echo 1. Stop backend (Ctrl+C)
        echo 2. Run this script again
        echo.
    ) else (
        echo.
        echo [SUCCESS] Database deleted!
        echo.
        echo ========================================
        echo   NEXT STEPS:
        echo ========================================
        echo.
        echo 1. Restart backend:
        echo    cd backend
        echo    npm run dev
        echo.
        echo 2. Wait for: "SQLite database loaded"
        echo.
        echo 3. Refresh browser (F5)
        echo.
        echo 4. Create bot and connect
        echo.
        echo 5. Create rules (will work!)
        echo.
        echo ========================================
    )
) else (
    echo.
    echo [NOT FOUND] Database file doesn't exist yet.
    echo.
    echo This is GOOD! Backend will create new one with correct schema.
    echo.
    echo Just restart backend:
    echo   cd backend
    echo   npm run dev
    echo.
)
echo.
pause
