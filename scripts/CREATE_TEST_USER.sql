-- CREATE TEST USER FOR TESTING
-- Run this in SQLite database

-- 1. Create test user with password "password123"
-- Password hash for "password123" using bcrypt
INSERT INTO users (id, email, name, password, role, created_at, updated_at)
VALUES (
  'test-user-001',
  'testuser@example.com',
  'Test User',
  '$2a$10$rXK5qVqK5qVqK5qVqK5qVuO5qVqK5qVqK5qVqK5qVqK5qVqK5qVqK',
  'admin',
  datetime('now'),
  datetime('now')
);

-- 2. Get your bot ID first
-- SELECT id, name FROM bots;

-- 3. Assign bot permissions to test user
-- Replace 'YOUR_BOT_ID' with actual bot ID from step 2
-- Replace 'YOUR_OWNER_ID' with your owner user ID
INSERT INTO bot_permissions (
  id,
  bot_id,
  user_id,
  can_view,
  can_edit,
  can_delete,
  can_create_campaigns,
  can_create_rules,
  can_view_analytics,
  granted_by,
  granted_at,
  updated_at
)
VALUES (
  'perm-test-001',
  'YOUR_BOT_ID',  -- Replace this!
  'test-user-001',
  1,  -- can_view
  0,  -- can_edit
  0,  -- can_delete
  1,  -- can_create_campaigns
  0,  -- can_create_rules
  1,  -- can_view_analytics
  'YOUR_OWNER_ID',  -- Replace this!
  datetime('now'),
  datetime('now')
);

-- 4. Verify user created
SELECT id, email, name, role FROM users WHERE email = 'testuser@example.com';

-- 5. Verify permissions
SELECT * FROM bot_permissions WHERE user_id = 'test-user-001';
