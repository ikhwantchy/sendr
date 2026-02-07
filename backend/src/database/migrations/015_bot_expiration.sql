-- =====================================================
-- Bot Expiration Feature
-- Adds expires_at column to bots table for subscription management
-- =====================================================

-- Add expires_at column to bots table
ALTER TABLE bots ADD COLUMN expires_at TIMESTAMP NULL;

-- Add expired_reason column to track why bot was expired
ALTER TABLE bots ADD COLUMN expired_reason TEXT NULL;

-- Create index for efficient expired bot queries
CREATE INDEX IF NOT EXISTS idx_bots_expires_at ON bots(expires_at);

-- =====================================================
-- COMMENTS
-- =====================================================
-- expires_at: NULL means no expiration (unlimited)
-- expired_reason: Optional message shown to user when bot expires
