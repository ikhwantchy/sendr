@echo off
echo ========================================
echo   CHECK DATABASE - Bot List
echo ========================================
echo.
echo Checking if bot exists in database...
echo.
cd backend
node -e "const sqlite = require('sql.js'); const fs = require('fs'); sqlite().then(SQL => { const db = new SQL.Database(fs.readFileSync('./data/database.sqlite')); const result = db.exec('SELECT id, name, status, created_at FROM bots'); console.log('Bots in database:'); console.log(JSON.stringify(result, null, 2)); db.close(); });"
echo.
echo ========================================
pause
