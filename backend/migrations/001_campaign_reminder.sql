-- ========================================
-- SQLITE MIGRATIONS FOR CAMPAIGN & REMINDER
-- ========================================

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT
);

-- 2. CAMPAIGN RECIPIENTS (for tracking)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    name TEXT,
    variables TEXT,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- 3. WA_GROUPS TABLE (for group discovery)
CREATE TABLE IF NOT EXISTS wa_groups (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bot_id, group_id)
);

-- 4. REMINDERS TABLE (GROUP-BASED ONLY)
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    group_id TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    schedule_config TEXT NOT NULL,
    next_run_at TEXT,
    last_run_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES wa_groups(id) ON DELETE CASCADE
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_wa_groups_bot_id ON wa_groups(bot_id);
CREATE INDEX IF NOT EXISTS idx_wa_groups_active ON wa_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
CREATE INDEX IF NOT EXISTS idx_reminders_group_id ON reminders(group_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at);
