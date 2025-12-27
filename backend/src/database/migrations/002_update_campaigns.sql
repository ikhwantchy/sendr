-- Add campaign tracking fields
-- Migration: Update campaigns table

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_contacts INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);
