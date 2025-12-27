const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');

try {
    const db = new Database(dbPath, { readonly: true });

    console.log('========================================');
    console.log('  DATABASE SCHEMA CHECK');
    console.log('========================================');
    console.log('');
    console.log('Database file:', dbPath);
    console.log('');

    // Get keyword_rules schema
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='keyword_rules'").get();

    if (schema) {
        console.log('keyword_rules table schema:');
        console.log('');
        console.log(schema.sql);
        console.log('');
        console.log('========================================');
        console.log('  CHECKING COLUMNS:');
        console.log('========================================');
        console.log('');

        const hasMetadata = schema.sql.includes('metadata');
        const hasCreatedBy = schema.sql.includes('created_by');

        console.log('✓ metadata column:', hasMetadata ? '✅ EXISTS' : '❌ MISSING');
        console.log('✓ created_by column:', hasCreatedBy ? '✅ EXISTS' : '❌ MISSING');
        console.log('');

        if (!hasMetadata || !hasCreatedBy) {
            console.log('========================================');
            console.log('  ❌ SCHEMA IS INCOMPLETE!');
            console.log('========================================');
            console.log('');
            console.log('Database needs to be deleted and recreated!');
            console.log('');
        } else {
            console.log('========================================');
            console.log('  ✅ SCHEMA IS CORRECT!');
            console.log('========================================');
            console.log('');
        }
    } else {
        console.log('❌ keyword_rules table NOT FOUND!');
        console.log('');
    }

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}
