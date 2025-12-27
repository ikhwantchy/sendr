@echo off
echo ========================================
echo CREATE TEST USER
echo ========================================
echo.

cd backend

echo Creating test user...
echo.

node create-test-user.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to create test user!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ TEST USER READY!
echo ========================================
echo.
echo Login with:
echo   Email:    testuser@example.com
echo   Password: password123
echo.
pause
