-- Migration: Add role column to users table
-- Description: Add role field to support owner/admin/user roles
-- Created: 2025-12-23

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'owner';
    END IF;
END $$;

-- Update existing users to owner role (first user is owner)
UPDATE users SET role = 'owner' WHERE role IS NULL OR role = '';

-- Add index
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comments
COMMENT ON COLUMN users.role IS 'User role: owner (super admin), admin (can manage assigned bots), user (limited access)';
