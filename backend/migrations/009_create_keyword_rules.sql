-- ============================================
-- CREATE KEYWORD_RULES TABLE
-- ============================================
-- This table stores auto-reply rules for bots

CREATE TABLE IF NOT EXISTS keyword_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    bot_id TEXT NOT NULL,
    name TEXT,
    keyword TEXT NOT NULL,
    match_type TEXT DEFAULT 'contains' CHECK(match_type IN ('exact', 'contains', 'starts_with', 'ends_with')),
    scope TEXT DEFAULT 'all' CHECK(scope IN ('all', 'group', 'private')),
    scope_target TEXT,
    priority INTEGER DEFAULT 0,
    actions TEXT NOT NULL,  -- JSON string
    metadata TEXT DEFAULT '{}',  -- JSON string
    created_by TEXT DEFAULT '00000000-0000-0000-0000-000000000001',
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_keyword_rules_bot ON keyword_rules(bot_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_keyword ON keyword_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_active ON keyword_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_priority ON keyword_rules(priority);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
