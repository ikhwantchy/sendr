-- Migration: Create user_invitations table
-- Description: Store user invitations sent by owners
-- Created: 2025-12-23

CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_invitations_token (token),
    INDEX idx_invitations_email (email),
    INDEX idx_invitations_invited_by (invited_by)
);

-- Comments
COMMENT ON TABLE user_invitations IS 'Stores user invitation tokens and metadata';
COMMENT ON COLUMN user_invitations.role IS 'Role to assign when invitation is accepted (admin, user)';
COMMENT ON COLUMN user_invitations.token IS 'Unique token for invitation link';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation expiration timestamp (typically 7 days)';
COMMENT ON COLUMN user_invitations.accepted_at IS 'Timestamp when invitation was accepted (null if pending)';
