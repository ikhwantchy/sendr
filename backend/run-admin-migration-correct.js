/**
 * Admin Panel Migration Script - CORRECT VERSION
 * This script applies the admin panel migration to the ACTUAL database location
 */

const fs = require('fs');
const path = require('path');

// CORRECT database path
const DB_PATH = path.join(__dirname, 'data', 'database.sqlite');

console.log('🔍 Admin Panel Migration Script');
console.log('================================\n');
console.log(`📂 Database path: ${DB_PATH}`);

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
    console.error('❌ ERROR: Database file not found!');
    console.error(`   Expected location: ${DB_PATH}`);
    process.exit(1);
}

console.log('✅ Database file found\n');

// Create backup
const backupPath = `${DB_PATH}.backup-${Date.now()}`;
console.log(`💾 Creating backup: ${backupPath}`);
fs.copyFileSync(DB_PATH, backupPath);
console.log('✅ Backup created\n');

// Load sql.js
console.log('📦 Loading sql.js...');
const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
    console.log('✅ sql.js loaded\n');

    // Load database
    console.log('📖 Loading database...');
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);
    console.log('✅ Database loaded\n');

    // Migration SQL
    const migrationSQL = `
-- Admin Panel Migration
-- Tables: api_keys, audit_logs, user_invites, system_settings, system_backups, message_analytics

-- 1. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    rate_limit INTEGER DEFAULT 100,
    ip_whitelist TEXT,
    last_used_at TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. User Invites Table
CREATE TABLE IF NOT EXISTS user_invites (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending',
    invited_by TEXT,
    accepted_by TEXT,
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (accepted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    category TEXT NOT NULL,
    description TEXT,
    data_type TEXT DEFAULT 'string',
    is_public INTEGER DEFAULT 0,
    updated_by TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. System Backups Table
CREATE TABLE IF NOT EXISTS system_backups (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    backup_type TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'completed',
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Message Analytics Table
CREATE TABLE IF NOT EXISTS message_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT NOT NULL,
    date TEXT NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    UNIQUE(bot_id, date)
);

-- Insert Default System Settings
INSERT OR IGNORE INTO system_settings (key, value, category, description, data_type, is_public) VALUES
-- General Settings
('app_name', 'WA Automation Platform', 'general', 'Application name', 'string', 1),
('app_description', 'WhatsApp Business Automation Platform', 'general', 'Application description', 'string', 1),
('app_timezone', 'Asia/Jakarta', 'general', 'Default timezone', 'string', 0),
('app_language', 'id', 'general', 'Default language', 'string', 0),
('maintenance_mode', 'false', 'general', 'Enable maintenance mode', 'boolean', 1),
('registration_enabled', 'false', 'general', 'Allow new user registration', 'boolean', 0),

-- Email Settings
('smtp_host', '', 'email', 'SMTP server host', 'string', 0),
('smtp_port', '587', 'email', 'SMTP server port', 'number', 0),
('smtp_user', '', 'email', 'SMTP username', 'string', 0),
('smtp_pass', '', 'email', 'SMTP password', 'password', 0),
('smtp_from_name', 'WA Automation', 'email', 'Email sender name', 'string', 0),
('smtp_from_email', '', 'email', 'Email sender address', 'string', 0),

-- WhatsApp Settings
('wa_session_timeout', '60000', 'whatsapp', 'Session timeout (ms)', 'number', 0),
('wa_max_retries', '3', 'whatsapp', 'Maximum connection retries', 'number', 0),
('wa_qr_timeout', '60', 'whatsapp', 'QR code timeout (seconds)', 'number', 0),
('wa_message_delay', '1000', 'whatsapp', 'Delay between messages (ms)', 'number', 0),

-- Security Settings
('session_duration', '7d', 'security', 'JWT session duration', 'string', 0),
('password_min_length', '8', 'security', 'Minimum password length', 'number', 0),
('max_login_attempts', '5', 'security', 'Maximum login attempts', 'number', 0),
('lockout_duration', '15', 'security', 'Account lockout duration (minutes)', 'number', 0),
('require_email_verification', 'false', 'security', 'Require email verification', 'boolean', 0),
('two_factor_enabled', 'false', 'security', 'Enable 2FA', 'boolean', 0),

-- Advanced Settings
('log_level', 'info', 'advanced', 'Logging level', 'string', 0),
('log_retention_days', '30', 'advanced', 'Log retention period (days)', 'number', 0),
('backup_enabled', 'true', 'advanced', 'Enable automatic backups', 'boolean', 0),
('backup_frequency', 'daily', 'advanced', 'Backup frequency', 'string', 0),
('backup_retention_days', '7', 'advanced', 'Backup retention period (days)', 'number', 0),
('cache_enabled', 'true', 'advanced', 'Enable caching', 'boolean', 0),
('cache_ttl', '3600', 'advanced', 'Cache TTL (seconds)', 'number', 0),
('rate_limit_enabled', 'true', 'advanced', 'Enable rate limiting', 'boolean', 0),
('rate_limit_window', '900000', 'advanced', 'Rate limit window (ms)', 'number', 0),
('rate_limit_max', '100', 'advanced', 'Max requests per window', 'number', 0),
('analytics_enabled', 'true', 'advanced', 'Enable analytics', 'boolean', 0),
('debug_mode', 'false', 'advanced', 'Enable debug mode', 'boolean', 0);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_message_analytics_bot_date ON message_analytics(bot_id, date);
`;

    console.log('🚀 Executing migration...\n');

    try {
        // Execute the entire migration as one block using db.exec()
        db.exec(migrationSQL);
        console.log('  ✅ All migration statements executed successfully\n');

        console.log('📊 Migration Summary:');
        console.log('   ✅ 6 tables created/verified');
        console.log('   ✅ Default settings inserted');
        console.log('   ✅ Indexes created');

        // Save database
        console.log('\n💾 Saving database...');
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
        console.log('✅ Database saved\n');

        // Verify tables
        console.log('🔍 Verifying tables...');
        const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('api_keys', 'audit_logs', 'user_invites', 'system_settings', 'system_backups', 'message_analytics') ORDER BY name");

        if (result.length > 0 && result[0].values.length > 0) {
            console.log('✅ Tables verified:');
            result[0].values.forEach(row => {
                console.log(`   ✓ ${row[0]}`);
            });
        }

        db.close();

        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!\n');
        console.log('Next steps:');
        console.log('1. Restart your backend server: npm run dev');
        console.log('2. Check your dashboard - data should be back!');
        console.log('3. Test admin panel features\n');

    } catch (error) {
        console.error('\n❌ MIGRATION FAILED!');
        console.error('Error:', error.message);
        console.error('\n📋 Restoring from backup...');

        db.close();
        fs.copyFileSync(backupPath, DB_PATH);
        console.log('✅ Database restored from backup\n');
        process.exit(1);
    }

}).catch(error => {
    console.error('❌ Failed to load sql.js:', error);
    process.exit(1);
});
