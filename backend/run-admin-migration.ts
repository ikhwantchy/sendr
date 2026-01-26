/**
 * Admin Panel Migration for SQLite
 * Uses existing database connection
 */

import { query } from './src/database/connection';

async function runMigration() {
    console.log('🚀 Starting admin panel migration (SQLite)...\n');

    try {
        // 1. API Keys table
        console.log('Creating api_keys table...');
        await query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                key_prefix TEXT NOT NULL,
                permissions TEXT DEFAULT '{}',
                rate_limit INTEGER DEFAULT 1000,
                ip_whitelist TEXT,
                last_used_at TEXT,
                request_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                expires_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ api_keys created\n');

        // 2. Audit Logs table
        console.log('Creating audit_logs table...');
        await query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                user_id TEXT,
                action_type TEXT NOT NULL,
                action_category TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                description TEXT,
                metadata TEXT,
                ip_address TEXT,
                user_agent TEXT,
                status TEXT DEFAULT 'success',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ audit_logs created\n');

        // 3. User Invites table
        console.log('Creating user_invites table...');
        await query(`
            CREATE TABLE IF NOT EXISTS user_invites (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                email TEXT NOT NULL UNIQUE,
                token TEXT NOT NULL UNIQUE,
                role TEXT DEFAULT 'user',
                invited_by TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                expires_at TEXT NOT NULL,
                accepted_at TEXT,
                accepted_by TEXT,
                revoked_at TEXT,
                revoked_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ user_invites created\n');

        // 4. System Settings table
        console.log('Creating system_settings table...');
        await query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                category TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                data_type TEXT DEFAULT 'string',
                description TEXT,
                is_public INTEGER DEFAULT 0,
                updated_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(category, key),
                FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ system_settings created\n');

        // 5. System Backups table
        console.log('Creating system_backups table...');
        await query(`
            CREATE TABLE IF NOT EXISTS system_backups (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                backup_type TEXT DEFAULT 'manual',
                status TEXT DEFAULT 'completed',
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ system_backups created\n');

        // 6. Message Analytics table
        console.log('Creating message_analytics table...');
        await query(`
            CREATE TABLE IF NOT EXISTS message_analytics (
                id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
                date TEXT NOT NULL,
                bot_id TEXT,
                message_type TEXT,
                total_messages INTEGER DEFAULT 0,
                successful_messages INTEGER DEFAULT 0,
                failed_messages INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, bot_id, message_type),
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ message_analytics created\n');

        // Insert default settings
        console.log('Inserting default settings...\n');

        const defaultSettings = [
            ['general', 'site_name', 'WA Automation Platform', 'string', 'Application name'],
            ['general', 'contact_email', 'admin@example.com', 'string', 'Contact email'],
            ['general', 'timezone', 'Asia/Jakarta', 'string', 'Default timezone'],
            ['general', 'date_format', 'DD/MM/YYYY', 'string', 'Date format'],
            ['email', 'smtp_host', '', 'string', 'SMTP server host'],
            ['email', 'smtp_port', '587', 'number', 'SMTP server port'],
            ['email', 'smtp_username', '', 'string', 'SMTP username'],
            ['email', 'smtp_password', '', 'string', 'SMTP password'],
            ['email', 'from_email', 'noreply@example.com', 'string', 'From email address'],
            ['email', 'from_name', 'WA Platform', 'string', 'From name'],
            ['whatsapp', 'max_bots_per_user', '5', 'number', 'Maximum bots per user'],
            ['whatsapp', 'max_reminders_per_bot', '50', 'number', 'Maximum reminders per bot'],
            ['whatsapp', 'message_rate_limit', '30', 'number', 'Messages per minute limit'],
            ['whatsapp', 'session_timeout_hours', '24', 'number', 'Session timeout in hours'],
            ['whatsapp', 'auto_reconnect', 'true', 'boolean', 'Auto-reconnect on disconnect'],
            ['security', 'password_min_length', '8', 'number', 'Minimum password length'],
            ['security', 'require_uppercase', 'true', 'boolean', 'Require uppercase in password'],
            ['security', 'require_numbers', 'true', 'boolean', 'Require numbers in password'],
            ['security', 'require_symbols', 'false', 'boolean', 'Require symbols in password'],
            ['security', 'max_login_attempts', '5', 'number', 'Max failed login attempts'],
            ['security', 'lockout_duration_minutes', '30', 'number', 'Account lockout duration'],
            ['security', 'invite_expiry_days', '7', 'number', 'Invite expiry in days'],
            ['advanced', 'enable_caching', 'true', 'boolean', 'Enable caching'],
            ['advanced', 'cache_ttl_seconds', '3600', 'number', 'Cache TTL in seconds'],
            ['advanced', 'queue_max_jobs', '100', 'number', 'Max queue jobs'],
            ['advanced', 'job_timeout_seconds', '300', 'number', 'Job timeout in seconds'],
            ['advanced', 'log_retention_days', '30', 'number', 'Log retention in days'],
            ['advanced', 'backup_retention_days', '7', 'number', 'Backup retention in days'],
            ['advanced', 'debug_mode', 'false', 'boolean', 'Enable debug mode']
        ];

        for (const [category, key, value, data_type, description] of defaultSettings) {
            await query(`
                INSERT OR IGNORE INTO system_settings (category, key, value, data_type, description)
                VALUES (?, ?, ?, ?, ?)
            `, [category, key, value, data_type, description]);
        }

        console.log(`✅ ${defaultSettings.length} default settings inserted\n`);

        // Create indexes
        console.log('Creating indexes...\n');
        await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
        await query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
        await query('CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)');
        console.log('✅ Indexes created\n');

        // Verify
        const tables = await query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
            ORDER BY name
        `);

        console.log('🔍 Verification:');
        console.log(`✅ ${tables.rows.length} tables created:`);
        tables.rows.forEach((row: any) => console.log(`   - ${row.name}`));

        const settingsCount = await query('SELECT COUNT(*) as count FROM system_settings');
        console.log(`✅ ${settingsCount.rows[0].count} settings in database\n`);

        console.log('🎉 Migration completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Test the admin endpoints');
        console.log('   3. Access /dashboard/api-keys in frontend\n');

        process.exit(0);

    } catch (error: any) {
        console.error('\n❌ Migration failed!');
        console.error('Error:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n💡 Tables already exist. This is normal if you ran migration before.');
            console.log('   You can safely ignore this error.\n');
            process.exit(0);
        } else {
            console.error('\nFull error:', error);
            process.exit(1);
        }
    }
}

// Run migration
runMigration();
