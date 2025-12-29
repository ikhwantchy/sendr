@echo off
echo ========================================
echo   CREATE KEYWORD_RULES TABLE
echo ========================================
echo.

cd backend

echo Creating keyword_rules table...
echo.

node -e "const fs = require('fs'); const sql = fs.readFileSync('migrations/009_create_keyword_rules.sql', 'utf8'); console.log('SQL to execute:'); console.log(sql); console.log('\n\nCopy the SQL above and run it manually in your database tool.');"

echo.
echo ========================================
echo   MANUAL STEPS REQUIRED:
echo ========================================
echo.
echo 1. Stop backend (Ctrl+C in backend terminal)
echo 2. Delete data/wa-automation.db
echo 3. Restart backend (npm run dev)
echo 4. Backend will recreate database with all tables
echo 5. Try create rule again
echo.
pause
