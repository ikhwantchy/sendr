const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'wa_automation.db');
const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '011_update_campaigns_v2.sql');

console.log('🚀 Running migration:', migrationPath);
console.log('📁 Database:', dbPath);

const db = new sqlite3.Database(dbPath);

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

db.serialize(() => {
    // Split by semicolon but handle potential issues with triggers/functions if any (simplified here)
    const statements = migrationSql.split(';').filter(s => s.trim());

    statements.forEach(stmt => {
        db.run(stmt, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('⚠️ Column already exists, skipping...');
                } else {
                    console.error('❌ Error executing statement:', stmt);
                    console.error('❌ Error message:', err.message);
                }
            } else {
                console.log('✅ Executed successfully:', stmt.substring(0, 50) + '...');
            }
        });
    });
});

db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err.message);
    } else {
        console.log('🎉 Migration finished!');
    }
});
