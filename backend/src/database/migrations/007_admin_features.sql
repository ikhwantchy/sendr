-- Migration 007: Admin Panel Features
-- Created: 2026-01-23
-- Description: Add tables for API Keys, Audit Logs, User Invites, and System Settings

-- ============================================
-- 1. API KEYS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key
    key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display (sk_live_abc...)
    permissions JSONB DEFAULT '{"read": true, "write": false, "admin": false}'::jsonb,
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    ip_whitelist TEXT[], -- Array of allowed IPs (NULL = all IPs allowed)
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    request_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- ============================================
-- 2. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'user.login', 'bot.create', 'reminder.execute', etc.
    action_category VARCHAR(50) NOT NULL, -- 'user', 'bot', 'reminder', 'system', 'api'
    resource_type VARCHAR(50), -- 'bot', 'reminder', 'user', etc.
    resource_id VARCHAR(255), -- ID of affected resource
    description TEXT NOT NULL,
    metadata JSONB, -- Additional context (old values, new values, etc.)
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'warning'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================
-- 3. USER INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'revoked'
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_invites_email ON user_invites(email);
CREATE INDEX idx_user_invites_token ON user_invites(token);
CREATE INDEX idx_user_invites_status ON user_invites(status);
CREATE INDEX idx_user_invites_invited_by ON user_invites(invited_by);

-- ============================================
-- 4. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'general', 'email', 'whatsapp', 'security', 'advanced'
    key VARCHAR(100) NOT NULL,
    value TEXT,
    value_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can non-admin users see this?
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- ============================================
-- 5. SYSTEM BACKUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT, -- Size in bytes
    backup_type VARCHAR(20) DEFAULT 'manual', -- 'manual', 'scheduled'
    status VARCHAR(20) DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_backups_created_at ON system_backups(created_at DESC);
CREATE INDEX idx_system_backups_status ON system_backups(status);

-- ============================================
-- 6. MESSAGE ANALYTICS TABLE (Aggregated Stats)
-- ============================================
CREATE TABLE IF NOT EXISTS message_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_sent INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    avg_delivery_time_ms INTEGER, -- Average delivery time in milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, bot_id, user_id)
);

CREATE INDEX idx_message_analytics_date ON message_analytics(date DESC);
CREATE INDEX idx_message_analytics_bot_id ON message_analytics(bot_id);
CREATE INDEX idx_message_analytics_user_id ON message_analytics(user_id);

-- ============================================
-- 7. ADD COLUMNS TO EXISTING TABLES (Safe)
-- ============================================

-- Add invite-related columns to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='invited_by') THEN
        ALTER TABLE users ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='invite_accepted_at') THEN
        ALTER TABLE users ADD COLUMN invite_accepted_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_login_ip') THEN
        ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- 8. INSERT DEFAULT SYSTEM SETTINGS
-- ============================================
INSERT INTO system_settings (category, key, value, value_type, description, is_public) VALUES
-- General Settings
('general', 'site_name', 'WA Automation Platform', 'string', 'Site name displayed in UI', true),
('general', 'contact_email', 'admin@example.com', 'string', 'Contact email for support', true),
('general', 'timezone', 'Asia/Jakarta', 'string', 'Default timezone', true),
('general', 'date_format', 'DD/MM/YYYY', 'string', 'Date format', true),

-- Email Settings
('email', 'smtp_host', '', 'string', 'SMTP server host', false),
('email', 'smtp_port', '587', 'number', 'SMTP server port', false),
('email', 'smtp_username', '', 'string', 'SMTP username', false),
('email', 'smtp_password', '', 'string', 'SMTP password (encrypted)', false),
('email', 'from_email', 'noreply@example.com', 'string', 'From email address', false),
('email', 'from_name', 'WA Platform', 'string', 'From name', false),

-- WhatsApp Settings
('whatsapp', 'max_bots_per_user', '5', 'number', 'Maximum bots per user', false),
('whatsapp', 'max_reminders_per_bot', '50', 'number', 'Maximum reminders per bot', false),
('whatsapp', 'message_rate_limit', '30', 'number', 'Messages per minute', false),
('whatsapp', 'session_timeout_hours', '24', 'number', 'Session timeout in hours', false),
('whatsapp', 'auto_reconnect', 'true', 'boolean', 'Enable auto-reconnect', false),

-- Security Settings
('security', 'password_min_length', '8', 'number', 'Minimum password length', false),
('security', 'require_uppercase', 'true', 'boolean', 'Require uppercase in password', false),
('security', 'require_numbers', 'true', 'boolean', 'Require numbers in password', false),
('security', 'require_symbols', 'false', 'boolean', 'Require symbols in password', false),
('security', 'password_expiry_days', '90', 'number', 'Password expiration in days (0 = never)', false),
('security', 'max_login_attempts', '5', 'number', 'Max failed login attempts', false),
('security', 'lockout_duration_minutes', '30', 'number', 'Account lockout duration', false),
('security', 'invite_expiry_days', '7', 'number', 'Invite token expiry in days', false),

-- Advanced Settings
('advanced', 'enable_caching', 'true', 'boolean', 'Enable caching', false),
('advanced', 'cache_ttl_seconds', '3600', 'number', 'Cache TTL in seconds', false),
('advanced', 'queue_max_jobs', '100', 'number', 'Max concurrent queue jobs', false),
('advanced', 'job_timeout_seconds', '300', 'number', 'Job timeout in seconds', false),
('advanced', 'log_retention_days', '30', 'number', 'Audit log retention in days', false),
('advanced', 'backup_retention_days', '7', 'number', 'Backup retention in days', false),
('advanced', 'debug_mode', 'false', 'boolean', 'Enable debug mode', false)

ON CONFLICT (category, key) DO NOTHING;

-- ============================================
-- 9. CREATE FUNCTIONS FOR CLEANUP
-- ============================================

-- Function to clean old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs() RETURNS void AS $$
DECLARE
    retention_days INTEGER;
BEGIN
    SELECT value::INTEGER INTO retention_days 
    FROM system_settings 
    WHERE category = 'advanced' AND key = 'log_retention_days';
    
    IF retention_days IS NULL THEN
        retention_days := 30;
    END IF;
    
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups() RETURNS void AS $$
DECLARE
    retention_days INTEGER;
BEGIN
    SELECT value::INTEGER INTO retention_days 
    FROM system_settings 
    WHERE category = 'advanced' AND key = 'backup_retention_days';
    
    IF retention_days IS NULL THEN
        retention_days := 7;
    END IF;
    
    DELETE FROM system_backups 
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites() RETURNS void AS $$
BEGIN
    UPDATE user_invites 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
