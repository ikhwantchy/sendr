@echo off
echo ========================================
echo Switching to SQLite Database
echo ========================================
echo.

echo [1/6] Creating data directory...
if not exist "data" mkdir data
echo OK

echo.
echo [2/6] Updating authRoutes.ts...
powershell -Command "(Get-Content 'src/api/routes/authRoutes.ts') -replace 'from ''../../database/connection''', 'from ''../../database/connection-sqlite''' | Set-Content 'src/api/routes/authRoutes.ts'"
echo OK

echo.
echo [3/6] Updating botRepository.ts...
powershell -Command "(Get-Content 'src/database/repositories/botRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/botRepository.ts'"
echo OK

echo.
echo [4/6] Updating keywordRuleRepository.ts...
powershell -Command "(Get-Content 'src/database/repositories/keywordRuleRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/keywordRuleRepository.ts'"
echo OK

echo.
echo [5/6] Updating eventLogRepository.ts...
powershell -Command "(Get-Content 'src/database/repositories/eventLogRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/eventLogRepository.ts'"
echo OK

echo.
echo [6/6] Updating eventBus.ts...
powershell -Command "(Get-Content 'src/core/events/eventBus.ts') -replace 'from ''../../database/connection''', 'from ''../../database/connection-sqlite''' | Set-Content 'src/core/events/eventBus.ts'"
echo OK

echo.
echo ========================================
echo SUCCESS! SQLite is now active
echo ========================================
echo.
echo Database will be created at:
echo   backend\data\database.sqlite
echo.
echo Next steps:
echo 1. npm run dev
echo 2. Database will be created automatically
echo 3. No configuration needed!
echo.
pause
