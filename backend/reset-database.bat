@echo off
echo ========================================
echo Reset SQLite Database
echo ========================================
echo.

echo Deleting old database...
if exist "data\database.sqlite" (
    del "data\database.sqlite"
    echo OK: Old database deleted
) else (
    echo INFO: No database file found
)

echo.
echo Database will be recreated on next backend start.
echo.
echo Next step:
echo 1. Restart backend (Ctrl+C then npm run dev)
echo 2. New database with correct schema will be created
echo.
pause
