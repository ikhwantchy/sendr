@echo off
echo ========================================
echo UPDATE OWNER ACCOUNT
echo ========================================
echo.
echo IMPORTANT: Edit update-owner.js first!
echo Change email, name, and password.
echo.
pause
echo.

cd backend

echo Updating owner account...
echo.

node update-owner.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to update owner account!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ OWNER ACCOUNT UPDATED!
echo ========================================
echo.
echo You can now login with your new credentials.
echo.
pause
