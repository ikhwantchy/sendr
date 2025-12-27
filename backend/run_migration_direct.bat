@echo off
echo Running migration directly via psql...

set PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe
set PGPASSWORD=111111

echo Creating database if not exists...
"%PSQL_PATH%" -h localhost -p 5432 -U postgres -c "CREATE DATABASE wa_automation;" 2>nul

echo.
echo Running schema migration...
"%PSQL_PATH%" -h localhost -p 5432 -U postgres -d wa_automation -f src\database\schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Migration completed!
    echo ========================================
    echo.
    echo Database 'wa_automation' is ready!
    echo.
    echo You can now start the backend:
    echo   npm run dev
    echo.
) else (
    echo.
    echo ERROR: Migration failed!
    echo Try creating the database via pgAdmin first.
    echo.
)

pause
