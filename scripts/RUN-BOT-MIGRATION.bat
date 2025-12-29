@echo off
cls
echo ========================================
echo   BOT MANAGEMENT SYSTEM - MIGRATION
echo ========================================
echo.
echo This will create new tables for:
echo - Bot ownership and user assignment
echo - Feature permissions system
echo - Usage tracking and limits
echo - Audit logging
echo.
echo ========================================
echo   RUNNING MIGRATION...
echo ========================================
echo.

cd backend

echo Applying migration: 004_bot_management_system.sql
node -e "const db = require('./dist/database/connection').db; const fs = require('fs'); const sql = fs.readFileSync('./migrations/004_bot_management_system.sql', 'utf8'); db.exec(sql); console.log('✅ Migration completed successfully!');"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   MIGRATION FAILED!
    echo ========================================
    echo.
    echo Please check the error above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   MIGRATION SUCCESS!
echo ========================================
echo.
echo New tables created:
echo ✅ bots (updated with ownership fields)
echo ✅ bot_users
echo ✅ features
echo ✅ bot_feature_permissions
echo ✅ feature_usage
echo ✅ bot_audit_log
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Restart backend: npm run dev
echo 2. Test the new tables
echo 3. Continue with Phase 2 implementation
echo.
echo ========================================
pause
