-- Migration 013: Telegram Settings
-- Created: 2026-01-27
-- Description: Add Telegram Bot Token and Admin Chat ID to system settings

INSERT INTO system_settings (category, key, value, value_type, description, is_public) VALUES
('telegram', 'bot_token', '', 'string', 'Telegram Bot Token for system alerts', false),
('telegram', 'admin_chat_id', '', 'string', 'Global Admin Chat ID for centralized alerts', false),
('telegram', 'enable_alerts', 'true', 'boolean', 'Enable or disable system-wide Telegram alerts', true)
ON CONFLICT (category, key) DO UPDATE SET
    description = EXCLUDED.description,
    is_public = EXCLUDED.is_public;
