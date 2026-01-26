/**
 * Admin Panel Migration for SQLite
 * Run with: node run-sqlite-migration.js
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function runMigration() {
    console.log('🚀 Starting admin panel migration (SQLite)...\n');

    // Database path
    const dbPath = path.join(__dirname, '..', 'wa_automation.db');
    console.log(`📁 Database: ${dbPath}\n`);

    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Failed to connect to database:', err.message);
            process.exit(1);
        }
        console.log('✅ Connected to SQLite database!\n');
    });

    // Run migrations
    db.serialize(() => {
        console.log('⚙️  Creating tables...\n');

        // 1. API Keys table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ api_keys:', err.message);
            else console.log('✅ api_keys table created');
        });

        // 2. Audit Logs table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ audit_logs:', err.message);
            else console.log('✅ audit_logs table created');
        });

        // 3. User Invites table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ user_invites:', err.message);
            else console.log('✅ user_invites table created');
        });

        // 4. System Settings table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ system_settings:', err.message);
            else console.log('✅ system_settings table created');
        });

        // 5. System Backups table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ system_backups:', err.message);
            else console.log('✅ system_backups table created');
        });

        // 6. Message Analytics table
        db.run(`
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
        `, (err) => {
            if (err) console.error('❌ message_analytics:', err.message);
            else console.log('✅ message_analytics table created');
        });

        // Insert default settings
        console.log('\n⚙️  Inserting default settings...\n');

        const defaultSettings = [
            // General
            ['general', 'site_name', 'WA Automation Platform', 'string', 'Application name'],
            ['general', 'contact_email', 'admin@example.com', 'string', 'Contact email'],
            ['general', 'timezone', 'Asia/Jakarta', 'string', 'Default timezone'],
            ['general', 'date_format', 'DD/MM/YYYY', 'string', 'Date format'],

            // Email
            ['email', 'smtp_host', '', 'string', 'SMTP server host'],
            ['email', 'smtp_port', '587', 'number', 'SMTP server port'],
            ['email', 'smtp_username', '', 'string', 'SMTP username'],
            ['email', 'smtp_password', '', 'string', 'SMTP password'],
            ['email', 'from_email', 'noreply@example.com', 'string', 'From email address'],
            ['email', 'from_name', 'WA Platform', 'string', 'From name'],

            // WhatsApp
            ['whatsapp', 'max_bots_per_user', '5', 'number', 'Maximum bots per user'],
            ['whatsapp', 'max_reminders_per_bot', '50', 'number', 'Maximum reminders per bot'],
            ['whatsapp', 'message_rate_limit', '30', 'number', 'Messages per minute limit'],
            ['whatsapp', 'session_timeout_hours', '24', 'number', 'Session timeout in hours'],
            ['whatsapp', 'auto_reconnect', 'true', 'boolean', 'Auto-reconnect on disconnect'],

            // Security
            ['security', 'password_min_length', '8', 'number', 'Minimum password length'],
            ['security', 'require_uppercase', 'true', 'boolean', 'Require uppercase in password'],
            ['security', 'require_numbers', 'true', 'boolean', 'Require numbers in password'],
            ['security', 'require_symbols', 'false', 'boolean', 'Require symbols in password'],
            ['security', 'max_login_attempts', '5', 'number', 'Max failed login attempts'],
            ['security', 'lockout_duration_minutes', '30', 'number', 'Account lockout duration'],
            ['security', 'invite_expiry_days', '7', 'number', 'Invite expiry in days'],

            // Advanced
            ['advanced', 'enable_caching', 'true', 'boolean', 'Enable caching'],
            ['advanced', 'cache_ttl_seconds', '3600', 'number', 'Cache TTL in seconds'],
            ['advanced', 'queue_max_jobs', '100', 'number', 'Max queue jobs'],
            ['advanced', 'job_timeout_seconds', '300', 'number', 'Job timeout in seconds'],
            ['advanced', 'log_retention_days', '30', 'number', 'Log retention in days'],
            ['advanced', 'backup_retention_days', '7', 'number', 'Backup retention in days'],
            ['advanced', 'debug_mode', 'false', 'boolean', 'Enable debug mode']
        ];

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO system_settings (category, key, value, data_type, description)
            VALUES (?, ?, ?, ?, ?)
        `);

        defaultSettings.forEach(([category, key, value, data_type, description]) => {
            stmt.run(category, key, value, data_type, description, (err) => {
                if (err) console.error(`❌ Setting ${category}.${key}:`, err.message);
            });
        });

        stmt.finalize(() => {
            console.log(`✅ ${defaultSettings.length} default settings inserted\n`);
        });

        // Create indexes
        console.log('⚙️  Creating indexes...\n');

        db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)', (err) => {
            if (err) console.error('❌ Index audit_logs_user_id:', err.message);
            else console.log('✅ Index created: audit_logs_user_id');
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)', (err) => {
            if (err) console.error('❌ Index audit_logs_created_at:', err.message);
            else console.log('✅ Index created: audit_logs_created_at');
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)', (err) => {
            if (err) console.error('❌ Index api_keys_user_id:', err.message);
            else console.log('✅ Index created: api_keys_user_id');
        });

        // Verify
        setTimeout(() => {
            db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics')
                ORDER BY name
            `, (err, rows) => {
                if (err) {
                    console.error('\n❌ Verification failed:', err.message);
                } else {
                    console.log('\n🔍 Verification:');
                    console.log(`✅ ${rows.length} tables created:`);
                    rows.forEach(row => console.log(`   - ${row.name}`));
                }

                db.get('SELECT COUNT(*) as count FROM system_settings', (err, row) => {
                    if (!err) {
                        console.log(`✅ ${row.count} settings in database`);
                    }

                    console.log('\n🎉 Migration completed successfully!');
                    console.log('\n📝 Next steps:');
                    console.log('   1. Restart your backend server');
                    console.log('   2. Test the admin endpoints');
                    console.log('   3. Access /dashboard/api-keys in frontend\n');

                    db.close();
                });
            });
        }, 1000);
    });
}

// Run migration
runMigration();
