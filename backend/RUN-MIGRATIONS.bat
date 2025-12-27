@echo off
echo ========================================
echo  RUNNING DATABASE MIGRATIONS
echo ========================================
echo.

echo Building TypeScript...
call npm run build

echo.
echo Running migrations...
node migrate.js

echo.
echo ========================================
echo  DONE!
echo ========================================
pause
