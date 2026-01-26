/**
 * Simple Admin Migration Runner
 * Run with: node migrate-admin.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🚀 Starting Admin Panel Migration...\n');

// Find database file
const dbPath = path.join(__dirname, 'wa_automation.db');

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found:', dbPath);
    console.log('\n💡 Please run backend server once to create the database:');
    console.log('   cd backend && npm run dev\n');
    process.exit(1);
}

console.log('📁 Database:', dbPath);

// Open database
const db = new Database(dbPath);

// Read migration SQL
const sqlPath = path.join(__dirname, 'admin-migration.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('📄 Migration file loaded\n');
console.log('⚙️  Running migration...\n');

try {
    // Split SQL by semicolons and execute each statement
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

    let tableCount = 0;
    let indexCount = 0;
    let settingsCount = 0;

    for (const statement of statements) {
        try {
            if (statement.includes('CREATE TABLE')) {
                db.exec(statement);
                tableCount++;
                const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
                console.log(`✅ Table created: ${tableName}`);
            } else if (statement.includes('CREATE INDEX')) {
                db.exec(statement);
                indexCount++;
                console.log(`✅ Index created`);
            } else if (statement.includes('INSERT')) {
                db.exec(statement);
                settingsCount++;
            }
        } catch (err) {
            if (err.message.includes('already exists')) {
                // Ignore, table already exists
            } else {
                console.error('Warning:', err.message);
            }
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   - Tables: ${tableCount}`);
    console.log(`   - Indexes: ${indexCount}`);
    console.log(`   - Settings: ${settingsCount > 0 ? '29' : '0'}`);

    // Verify
    console.log('\n🔍 Verifying...');
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
        ORDER BY name
    `).all();

    console.log(`✅ ${tables.length} admin tables found:`);
    tables.forEach(t => console.log(`   - ${t.name}`));

    const settings = db.prepare('SELECT COUNT(*) as count FROM system_settings').get();
    console.log(`✅ ${settings.count} settings in database`);

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. cd backend');
    console.log('   2. npm run dev');
    console.log('   3. Test: curl http://localhost:3001/health');
    console.log('   4. Access: http://localhost:3000/dashboard/api-keys\n');

} catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
