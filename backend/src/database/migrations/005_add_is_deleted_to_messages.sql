-- Add is_deleted column to messages table
ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
