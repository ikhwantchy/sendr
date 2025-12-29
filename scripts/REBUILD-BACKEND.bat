@echo off
cls
echo ========================================
echo   REBUILD BACKEND - FIX DISCONNECT
echo ========================================
echo.
echo FIXING: Disconnect detection issue
echo.
echo Changes:
echo - WebSocket state checking
echo - Proper disconnect detection
echo - Clear phone_number on disconnect
echo - Better logging
echo.
echo ========================================
echo   REBUILDING...
echo ========================================
echo.

cd backend

echo Building TypeScript...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   BUILD FAILED!
    echo ========================================
    echo.
    echo Please check the error above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   BUILD SUCCESS!
echo ========================================
echo.
echo Now RESTART your backend:
echo.
echo 1. Stop backend (Ctrl+C in backend terminal)
echo 2. Run: npm run dev
echo 3. Test disconnect functionality
echo.
echo ========================================
pause
