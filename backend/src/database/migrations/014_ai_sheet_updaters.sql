-- AI Sheet Updater Tables
-- For automatic spreadsheet updates based on AI-classified responses

-- Main configuration table
CREATE TABLE IF NOT EXISTS ai_sheet_updaters (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    spreadsheet_url TEXT NOT NULL,
    spreadsheet_id TEXT,
    sheet_name TEXT NOT NULL,
    match_column TEXT NOT NULL,
    update_column TEXT NOT NULL,
    ai_instructions TEXT,
    value_mappings TEXT NOT NULL DEFAULT '[]',
    is_enabled INTEGER DEFAULT 1,
    target_jids TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_sheet_updaters_bot_id ON ai_sheet_updaters(bot_id);
CREATE INDEX IF NOT EXISTS idx_ai_sheet_updaters_enabled ON ai_sheet_updaters(is_enabled);

-- Update logs table
CREATE TABLE IF NOT EXISTS ai_sheet_update_logs (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    classification TEXT,
    mapped_value TEXT,
    confidence REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES ai_sheet_updaters(id) ON DELETE CASCADE
);

-- Create index for logs
CREATE INDEX IF NOT EXISTS idx_ai_sheet_update_logs_config ON ai_sheet_update_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_ai_sheet_update_logs_phone ON ai_sheet_update_logs(phone);
CREATE INDEX IF NOT EXISTS idx_ai_sheet_update_logs_created ON ai_sheet_update_logs(created_at);
