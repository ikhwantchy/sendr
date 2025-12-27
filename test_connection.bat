@echo off
echo ========================================
echo PostgreSQL Connection Tester
echo ========================================
echo.

set PSQL_PATH=C:\Program Files\PostgreSQL\17\bin\psql.exe

echo Testing different connection methods...
echo.

echo [Test 1] localhost:5432
set PGPASSWORD=111111
"%PSQL_PATH%" -h localhost -p 5432 -U postgres -d postgres -c "SELECT version();" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: localhost:5432 works!
    echo Use: DB_HOST=localhost DB_PORT=5432
    goto :end
)
echo FAILED: localhost:5432

echo.
echo [Test 2] localhost:5433
set PGPASSWORD=111111
"%PSQL_PATH%" -h localhost -p 5433 -U postgres -d postgres -c "SELECT version();" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: localhost:5433 works!
    echo Use: DB_HOST=localhost DB_PORT=5433
    goto :end
)
echo FAILED: localhost:5433

echo.
echo [Test 3] 127.0.0.1:5432
set PGPASSWORD=111111
"%PSQL_PATH%" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "SELECT version();" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: 127.0.0.1:5432 works!
    echo Use: DB_HOST=127.0.0.1 DB_PORT=5432
    goto :end
)
echo FAILED: 127.0.0.1:5432

echo.
echo [Test 4] 127.0.0.1:5433
set PGPASSWORD=111111
"%PSQL_PATH%" -h 127.0.0.1 -p 5433 -U postgres -d postgres -c "SELECT version();" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: 127.0.0.1:5433 works!
    echo Use: DB_HOST=127.0.0.1 DB_PORT=5433
    goto :end
)
echo FAILED: 127.0.0.1:5433

echo.
echo ========================================
echo All tests failed!
echo ========================================
echo.
echo Possible issues:
echo 1. Wrong password
echo 2. PostgreSQL not accepting TCP connections
echo 3. pg_hba.conf needs to be updated
echo.
echo Try creating database via pgAdmin instead!

:end
echo.
pause
