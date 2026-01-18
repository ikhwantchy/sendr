-- Migration 010: Update LLM Allowed Targets for Table UI
-- Add columns for custom name, status, and enhanced config

ALTER TABLE llm_allowed_targets ADD COLUMN config_name TEXT;
ALTER TABLE llm_allowed_targets ADD COLUMN is_enabled INTEGER DEFAULT 1;
ALTER TABLE llm_allowed_targets ADD COLUMN llm_config TEXT DEFAULT '{}';
ALTER TABLE llm_allowed_targets ADD COLUMN last_used_at TIMESTAMP;

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_llm_allowed_targets_enabled 
    ON llm_allowed_targets(is_enabled);
