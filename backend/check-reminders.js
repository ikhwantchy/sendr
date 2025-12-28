// Check reminders in database
const sqlite3 = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkReminders() {
    try {
        const SQL = await sqlite3();
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');

        if (!fs.existsSync(dbPath)) {
            console.log('❌ Database file not found!');
            return;
        }

        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Check reminders table
        console.log('\n📊 Checking reminders table...\n');

        const result = db.exec('SELECT * FROM reminders');

        if (result.length === 0 || result[0].values.length === 0) {
            console.log('❌ No reminders found in database!');
        } else {
            console.log(`✅ Found ${result[0].values.length} reminders:\n`);

            // Get column names
            const columns = result[0].columns;

            result[0].values.forEach((row, i) => {
                console.log(`\n${i + 1}. Reminder:`);
                columns.forEach((col, j) => {
                    console.log(`   ${col}: ${row[j]}`);
                });
            });
        }

        db.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkReminders();
