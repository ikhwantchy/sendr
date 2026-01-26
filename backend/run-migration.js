/**
 * Run Admin Panel Migration
 * This script runs the 007_admin_features.sql migration
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
    console.log('🚀 Starting admin panel migration...\n');

    // Read database config from .env
    require('dotenv').config();

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'wa_automation',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        // Connect to database
        console.log('📡 Connecting to database...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Read migration file
        const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '007_admin_features.sql');
        console.log('📄 Reading migration file...');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded!\n');

        // Run migration
        console.log('⚙️  Running migration...');
        await client.query(sql);
        console.log('✅ Migration completed successfully!\n');

        // Verify tables created
        console.log('🔍 Verifying tables...');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
            ORDER BY table_name
        `);

        console.log('✅ Tables created:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Count default settings
        const settingsCount = await client.query('SELECT COUNT(*) FROM system_settings');
        console.log(`\n✅ Default settings inserted: ${settingsCount.rows[0].count}`);

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Test the admin endpoints');
        console.log('   3. Access /dashboard/api-keys in frontend\n');

    } catch (error) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n💡 Tables already exist. This is normal if you ran migration before.');
            console.log('   You can safely ignore this error.\n');
        } else {
            console.error('\nFull error:', error);
            process.exit(1);
        }
    } finally {
        await client.end();
        console.log('👋 Database connection closed.');
    }
}

// Run migration
runMigration();
