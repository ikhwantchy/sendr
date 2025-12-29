@echo off
setlocal enabledelayedexpansion

echo ========================================
echo WA Automation - Quick Setup
echo ========================================
echo.

REM PostgreSQL path
set PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe
set ENV_FILE=backend\.env

echo [1/5] Checking PostgreSQL...
if not exist "%PSQL_PATH%" (
    echo ERROR: PostgreSQL not found!
    pause
    exit /b 1
)
echo OK: PostgreSQL found

echo.
echo [2/5] Testing connection...
echo Trying with empty password first...

REM Test with empty password
set PGPASSWORD=
"%PSQL_PATH%" -U postgres -c "SELECT 1;" >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo OK: Connection successful with empty password
    set DB_PASS=
    goto :create_db
)

echo Empty password failed. Please enter your PostgreSQL password:
set /p DB_PASS="Password: "

REM Test with provided password
set PGPASSWORD=!DB_PASS!
"%PSQL_PATH%" -U postgres -c "SELECT 1;" >nul 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Wrong password!
    pause
    exit /b 1
)

echo OK: Connection successful

:create_db
echo.
echo [3/5] Creating database...
set PGPASSWORD=!DB_PASS!
"%PSQL_PATH%" -U postgres -c "CREATE DATABASE wa_automation;" 2>nul

if %ERRORLEVEL% EQU 0 (
    echo OK: Database created
) else (
    echo INFO: Database might already exist, continuing...
)

echo.
echo [4/5] Updating .env file...

if not exist "%ENV_FILE%" (
    echo Creating .env from .env.example...
    copy backend\.env.example "%ENV_FILE%" >nul
)

REM Update password in .env
powershell -Command "(Get-Content '%ENV_FILE%') -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=!DB_PASS!' | Set-Content '%ENV_FILE%'"
echo OK: .env updated

echo.
echo [5/5] Running migration...
cd backend
call npm run migrate

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Setup complete!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. cd backend
    echo 2. npm run dev
    echo.
    echo In another terminal:
    echo 1. cd frontend
    echo 2. npm install
    echo 3. npm run dev
    echo.
    echo Then open: http://localhost:3000
    echo.
) else (
    echo.
    echo ERROR: Migration failed!
    echo Check the error above.
    echo.
)

cd ..
pause
