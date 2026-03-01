-- ============================================================
-- Migration 016: WABA (Meta Cloud API) Support
-- ============================================================

-- 1. Add adapter_type and Meta credentials to bots table
ALTER TABLE bots ADD COLUMN adapter_type TEXT NOT NULL DEFAULT 'baileys';
ALTER TABLE bots ADD COLUMN meta_phone_number_id TEXT;
ALTER TABLE bots ADD COLUMN meta_access_token TEXT;
ALTER TABLE bots ADD COLUMN meta_waba_id TEXT;
ALTER TABLE bots ADD COLUMN meta_app_secret TEXT;
ALTER TABLE bots ADD COLUMN meta_business_id TEXT;

-- 2. Add campaign_type support to campaigns
ALTER TABLE campaigns ADD COLUMN campaign_type TEXT NOT NULL DEFAULT 'freetext';
-- 'freetext' = pesan bebas (Baileys/WA Web)
-- 'template'  = Meta Template Message (WABA resmi)
ALTER TABLE campaigns ADD COLUMN template_name TEXT;
ALTER TABLE campaigns ADD COLUMN template_language TEXT DEFAULT 'id';
ALTER TABLE campaigns ADD COLUMN template_components_json TEXT;

-- 3. Message templates table (for WABA approved templates)
CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'id',
    category TEXT NOT NULL DEFAULT 'MARKETING',
    status TEXT NOT NULL DEFAULT 'PENDING',
    components_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);
