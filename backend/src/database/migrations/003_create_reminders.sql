-- Create reminders table
-- Migration: Add reminders support

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'custom')),
    schedule_config TEXT, -- JSON config for recurring schedules
    next_run_at TIMESTAMP NOT NULL,
    last_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at ON reminders(next_run_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_schedule_type ON reminders(schedule_type);

-- Index for scheduler queries (active reminders due to run)
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(is_active, next_run_at) 
WHERE is_active = true;
