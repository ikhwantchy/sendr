const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('Running keyword_rules migration...');

try {
    // Open database
    const db = new Database(path.join(__dirname, 'data', 'wa-automation.db'));

    // Read migration file
    const migration = fs.readFileSync(
        path.join(__dirname, 'migrations', '009_create_keyword_rules.sql'),
        'utf8'
    );

    // Execute migration
    db.exec(migration);

    console.log('✅ Migration completed successfully!');

    // Verify table was created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='keyword_rules'").all();
    console.log('Tables found:', tables);

    db.close();
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}
