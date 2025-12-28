// Quick script to check groups in database
const sqlite3 = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkGroups() {
    try {
        const SQL = await sqlite3();
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');

        if (!fs.existsSync(dbPath)) {
            console.log('❌ Database file not found!');
            return;
        }

        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Check wa_groups table
        console.log('\n📊 Checking wa_groups table...\n');

        const result = db.exec('SELECT * FROM wa_groups');

        if (result.length === 0 || result[0].values.length === 0) {
            console.log('❌ No groups found in database!');
            console.log('\n💡 Try running this in browser console:');
            console.log(`
fetch('http://localhost:3001/api/bots/247e2ad-d231-480a-b5b3-33ce45b9e4ab/sync-groups', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
}).then(r => r.json()).then(console.log)
            `);
        } else {
            console.log(`✅ Found ${result[0].values.length} groups:\n`);
            result[0].values.forEach((row, i) => {
                console.log(`${i + 1}. ${row[3]} (${row[2]})`); // group_name, group_jid
            });
        }

        db.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkGroups();
