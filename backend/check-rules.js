const Database = require('better-sqlite3');
const path = require('path');

console.log('=== CHECKING KEYWORD_RULES TABLE ===\n');

try {
    // Try to load sql.js instead
    const initSqlJs = require('sql.js');
    const fs = require('fs');

    const dbPath = path.join(__dirname, 'data', 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
        console.log('❌ Database file not found at:', dbPath);
        process.exit(1);
    }

    initSqlJs().then(SQL => {
        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Check if table exists
        const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='keyword_rules'");

        if (tables.length === 0 || tables[0].values.length === 0) {
            console.log('❌ keyword_rules table does not exist!');
            db.close();
            process.exit(1);
        }

        console.log('✅ keyword_rules table exists\n');

        // Get all rules
        const result = db.exec(`
            SELECT 
                id,
                name,
                keyword,
                match_type,
                scope,
                is_active,
                actions,
                created_at
            FROM keyword_rules 
            ORDER BY created_at DESC
        `);

        if (result.length === 0 || result[0].values.length === 0) {
            console.log('📋 No rules found in database\n');
        } else {
            console.log('📋 Rules in database:\n');
            const columns = result[0].columns;
            const rows = result[0].values;

            rows.forEach((row, index) => {
                console.log(`Rule #${index + 1}:`);
                columns.forEach((col, i) => {
                    console.log(`  ${col}: ${row[i]}`);
                });
                console.log('');
            });
        }

        db.close();
    }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });

} catch (error) {
    console.error('❌ Error loading database:', error.message);
    console.log('\nTrying alternative method...\n');

    // Alternative: just read the file and show info
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'data', 'database.sqlite');

    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log('Database file found:');
        console.log('  Path:', dbPath);
        console.log('  Size:', stats.size, 'bytes');
        console.log('  Modified:', stats.mtime);
        console.log('\nPlease check database manually or install better-sqlite3');
    } else {
        console.log('❌ Database file not found');
    }
}
