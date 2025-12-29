@echo off
echo ========================================
echo MULTI-USER ACCESS - COMPREHENSIVE TEST
echo ========================================
echo.

echo [STEP 1] Running Migrations...
cd backend
call npm run migrate
if %errorlevel% neq 0 (
    echo [ERROR] Migrations failed!
    pause
    exit /b 1
)
echo [SUCCESS] Migrations completed!
echo.

echo [STEP 2] Starting Backend...
echo Please open a NEW terminal and run: cd backend ^&^& npm run dev
echo.
echo Press any key when backend is running...
pause

echo [STEP 3] Testing Backend API...
echo.
echo Testing Health Check...
curl http://localhost:3001/health
echo.
echo.

echo [STEP 4] Login Test
echo Please login manually and copy your token
echo Run this command with your credentials:
echo curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}"
echo.
echo Press any key when you have your token...
pause

echo.
echo [STEP 5] Test User Stats
set /p TOKEN="Enter your token: "
echo.
curl -H "Authorization: Bearer %TOKEN%" http://localhost:3001/api/users/stats
echo.
echo.

echo [STEP 6] Test List Users
curl -H "Authorization: Bearer %TOKEN%" http://localhost:3001/api/users
echo.
echo.

echo [STEP 7] Frontend Testing
echo Please open a NEW terminal and run: cd frontend ^&^& npm run dev
echo Then open browser to http://localhost:3000/login
echo.
echo Manual checks:
echo - Login with owner account
echo - Check sidebar for "Users" menu
echo - Click "Users" menu
echo - Verify page loads
echo - Check stats display
echo - Check user list
echo.

echo ========================================
echo TESTING COMPLETE!
echo ========================================
echo.
echo Check TESTING_GUIDE.md for detailed results
pause
