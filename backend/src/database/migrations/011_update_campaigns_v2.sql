-- Add delay, image_url, and scheduled_at to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delay INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS scheduled_at TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'specific';
