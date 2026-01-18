
const SQL = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkBackup() {
    try {
        const SQL_MODULE = await SQL();
        const backupPath = 'data/database.sqlite.backup';
        if (!fs.existsSync(backupPath)) {
            console.log('Backup not found');
            return;
        }
        const buffer = fs.readFileSync(backupPath);
        const db = new SQL_MODULE.Database(buffer);
        const result = db.exec('SELECT * FROM bots WHERE name = "BYU" OR id = "81d4aa4e-b2e8-4e9d-a89b-328a7015e5f3"');
        console.log('--- Backup Bots ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

checkBackup();
