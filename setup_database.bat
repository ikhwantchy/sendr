@echo off
echo ========================================
echo WA Automation Platform - Database Setup
echo ========================================
echo.

REM Set PostgreSQL path
set PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe

echo Checking PostgreSQL installation...
if not exist "%PSQL_PATH%" (
    echo ERROR: PostgreSQL not found at %PSQL_PATH%
    echo Please install PostgreSQL or update the path in this script.
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.
echo Creating database 'wa_automation'...
echo You will be prompted for the PostgreSQL password.
echo.

REM Create database
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE wa_automation;"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Database created successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. cd backend
    echo 2. npm install
    echo 3. npm run migrate
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Failed to create database
    echo ========================================
    echo.
    echo Possible reasons:
    echo - Wrong password
    echo - Database already exists
    echo - PostgreSQL service not running
    echo.
)

pause
