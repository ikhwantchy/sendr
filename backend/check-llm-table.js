const Database = require('better-sqlite3');
const db = new Database('./data/database.sqlite');

// Check if llm_allowed_targets table exists
const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='llm_allowed_targets'
`).all();

console.log('Tables found:', tables);

// If table exists, check columns
if (tables.length > 0) {
    const columns = db.prepare(`PRAGMA table_info(llm_allowed_targets)`).all();
    console.log('\nColumns in llm_allowed_targets:');
    columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
    });
}

db.close();
