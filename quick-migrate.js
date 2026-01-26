/**
 * Quick Migration Script
 * Run from backend folder: cd backend && node ../quick-migrate.js
 */

const fs = require('fs');
const path = require('path');

// Read and execute SQL using backend's existing connection
async function runMigration() {
    console.log('🚀 Quick Migration Starting...\n');

    try {
        // Import backend's database connection
        const { query } = require('./backend/src/database/connection');

        console.log('📄 Reading migration file...');
        const sqlPath = path.join(__dirname, 'admin-migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split into statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`⚙️  Found ${statements.length} SQL statements\n`);

        let executed = 0;
        for (const statement of statements) {
            if (statement.toLowerCase().includes('select')) continue; // Skip verification queries

            try {
                await query(statement);
                executed++;

                if (statement.includes('CREATE TABLE')) {
                    const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                    if (match) console.log(`✅ Table: ${match[1]}`);
                } else if (statement.includes('CREATE INDEX')) {
                    console.log(`✅ Index created`);
                } else if (statement.includes('INSERT')) {
                    // Silent for inserts
                }
            } catch (err) {
                if (!err.message.includes('already exists')) {
                    console.warn(`⚠️  ${err.message}`);
                }
            }
        }

        console.log(`\n✅ Executed ${executed} statements`);

        // Verify
        console.log('\n🔍 Verifying tables...');
        const result = await query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
            ORDER BY name
        `);

        console.log(`✅ ${result.rows.length} admin tables found:`);
        result.rows.forEach(row => console.log(`   - ${row.name}`));

        const settingsCount = await query('SELECT COUNT(*) as count FROM system_settings');
        console.log(`✅ ${settingsCount.rows[0].count} settings in database`);

        console.log('\n🎉 Migration completed!\n');
        console.log('📝 Next: Restart backend server\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\n💡 Alternative: Use DB Browser for SQLite');
        console.error('   Download: https://sqlitebrowser.org/dl/\n');
        process.exit(1);
    }
}

runMigration();
