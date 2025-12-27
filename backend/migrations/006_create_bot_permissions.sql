-- Migration: Create bot_permissions table
-- Description: Store user permissions for each bot
-- Created: 2025-12-23

CREATE TABLE IF NOT EXISTS bot_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permissions
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_create_campaigns BOOLEAN DEFAULT true,
    can_create_rules BOOLEAN DEFAULT false,
    can_view_analytics BOOLEAN DEFAULT true,
    
    -- Metadata
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure unique bot-user combination
    UNIQUE(bot_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_bot_permissions_user ON bot_permissions(user_id);
CREATE INDEX idx_bot_permissions_bot ON bot_permissions(bot_id);
CREATE INDEX idx_bot_permissions_granted_by ON bot_permissions(granted_by);

-- Comments
COMMENT ON TABLE bot_permissions IS 'Stores granular permissions for users on specific bots';
COMMENT ON COLUMN bot_permissions.can_view IS 'User can view bot details and analytics';
COMMENT ON COLUMN bot_permissions.can_edit IS 'User can edit bot settings';
COMMENT ON COLUMN bot_permissions.can_delete IS 'User can delete the bot';
COMMENT ON COLUMN bot_permissions.can_create_campaigns IS 'User can create campaigns for this bot';
COMMENT ON COLUMN bot_permissions.can_create_rules IS 'User can create automation rules for this bot';
COMMENT ON COLUMN bot_permissions.can_view_analytics IS 'User can view analytics for this bot';
