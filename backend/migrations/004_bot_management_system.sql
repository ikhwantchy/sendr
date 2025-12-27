-- ============================================
-- BOT MANAGEMENT SYSTEM - DATABASE MIGRATIONS
-- ============================================
-- Phase 1: Core Tables for Multi-Tenant Bot Management
-- with Role-Based Access Control and Feature Permissions
-- ============================================

-- ============================================
-- 1. UPDATE BOTS TABLE
-- ============================================
-- Add new columns for ownership and limits

-- First, check if columns exist and add them if not
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS directly
-- So we'll create a new table and migrate data

-- Backup existing bots table
CREATE TABLE IF NOT EXISTS bots_backup AS SELECT * FROM bots;

-- Drop old table
DROP TABLE IF EXISTS bots;

-- Create new bots table with all columns
CREATE TABLE bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    
    -- NEW: Ownership fields
    owner_id TEXT,                    -- User who owns this bot
    created_by TEXT NOT NULL,         -- Admin who created the bot
    
    -- Connection fields
    status TEXT DEFAULT 'disconnected',
    phone_number TEXT,
    qr_code TEXT,
    qr_expires_at TEXT,
    last_connected_at TEXT,
    
    -- NEW: Bot settings and limits
    max_daily_messages INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT 1,
    
    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Migrate data from backup
INSERT INTO bots (
    id, name, tenant_id, owner_id, created_by, status, phone_number, 
    qr_code, qr_expires_at, last_connected_at, created_at, updated_at
)
SELECT 
    id, name, tenant_id, 
    tenant_id as owner_id,  -- Set owner to tenant for existing bots
    tenant_id as created_by, -- Set creator to tenant for existing bots
    status, phone_number, qr_code, qr_expires_at, last_connected_at,
    created_at, updated_at
FROM bots_backup;

-- Drop backup table
DROP TABLE bots_backup;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bots_owner ON bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_bots_created_by ON bots(created_by);
CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_bots_tenant ON bots(tenant_id);

-- ============================================
-- 2. BOT USERS TABLE (User Access to Bots)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_users (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,        -- Admin who assigned this user
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    
    UNIQUE(bot_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bot_users_bot ON bot_users(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_users_user ON bot_users(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_users_active ON bot_users(is_active);

-- ============================================
-- 3. FEATURES TABLE (Master Feature List)
-- ============================================
CREATE TABLE IF NOT EXISTS features (
    key TEXT PRIMARY KEY,             -- e.g., 'auto_reply'
    name TEXT NOT NULL,               -- e.g., 'Auto Reply'
    description TEXT,
    category TEXT,                    -- e.g., 'automation', 'messaging', 'analytics'
    is_premium BOOLEAN DEFAULT 0,     -- Premium feature flag
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default features
INSERT OR IGNORE INTO features (key, name, description, category, is_premium) VALUES
('auto_reply', 'Auto Reply', 'Automatic message responses based on keywords', 'automation', 0),
('campaigns', 'Broadcast Campaigns', 'Send bulk messages to multiple contacts', 'messaging', 0),
('reminders', 'Scheduled Reminders', 'Schedule messages for groups', 'automation', 0),
('analytics', 'Analytics Dashboard', 'View bot performance and statistics', 'analytics', 1),
('data_sources', 'Data Sources', 'Connect external data sources', 'integration', 1),
('webhooks', 'Webhooks', 'Integrate with external APIs', 'integration', 1),
('ai_responses', 'AI Responses', 'AI-powered automatic responses', 'automation', 1);

-- ============================================
-- 4. BOT FEATURE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bot_feature_permissions (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,        -- Reference to features.key
    is_enabled BOOLEAN DEFAULT 1,
    
    -- Feature-specific limits (optional)
    daily_limit INTEGER,              -- e.g., max 5 campaigns per day
    monthly_limit INTEGER,            -- e.g., max 100 campaigns per month
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_key) REFERENCES features(key) ON DELETE CASCADE,
    
    UNIQUE(bot_id, user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_bot_features_bot ON bot_feature_permissions(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_features_user ON bot_feature_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_features_key ON bot_feature_permissions(feature_key);
CREATE INDEX IF NOT EXISTS idx_bot_features_enabled ON bot_feature_permissions(is_enabled);

-- ============================================
-- 5. FEATURE USAGE TRACKING TABLE
-- ============================================
-- Track daily/monthly usage for features with limits
CREATE TABLE IF NOT EXISTS feature_usage (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    usage_date TEXT NOT NULL,        -- Format: YYYY-MM-DD
    usage_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_key) REFERENCES features(key) ON DELETE CASCADE,
    
    UNIQUE(bot_id, user_id, feature_key, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_bot ON feature_usage(bot_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON feature_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_feature_usage_composite ON feature_usage(bot_id, user_id, feature_key, usage_date);

-- ============================================
-- 6. AUDIT LOG TABLE (Track Permission Changes)
-- ============================================
CREATE TABLE IF NOT EXISTS bot_audit_log (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT,                     -- User affected by the action
    admin_id TEXT NOT NULL,           -- Admin who performed the action
    action TEXT NOT NULL,             -- e.g., 'assign_user', 'update_permission', 'remove_user'
    details TEXT,                     -- JSON string with action details
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_bot ON bot_audit_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON bot_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON bot_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON bot_audit_log(created_at);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Summary:
-- ✅ Updated bots table with ownership and limits
-- ✅ Created bot_users table for user assignments
-- ✅ Created features table with default features
-- ✅ Created bot_feature_permissions table
-- ✅ Created feature_usage table for tracking
-- ✅ Created bot_audit_log for audit trail
-- ============================================
