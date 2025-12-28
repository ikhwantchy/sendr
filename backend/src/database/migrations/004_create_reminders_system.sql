-- Reminders System Migration
-- Creates tables for flexible reminder system with data sources

-- Data Sources Table (Google Sheets, CSV, etc)
CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('google_sheets', 'csv', 'json', 'api')),
  config TEXT NOT NULL, -- JSON: spreadsheet_id, sheets, columns, credentials
  is_active INTEGER DEFAULT 1,
  last_synced_at TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Scheduling
  schedule TEXT NOT NULL, -- Cron expression
  timezone TEXT DEFAULT 'Asia/Jakarta',
  is_active INTEGER DEFAULT 1,
  
  -- Target
  target_type TEXT NOT NULL CHECK(target_type IN ('group', 'contact', 'broadcast')),
  target_id TEXT NOT NULL, -- WhatsApp JID or broadcast list ID
  
  -- Data Pipeline Configuration
  data_source_id TEXT,
  pipeline_config TEXT NOT NULL, -- JSON: filters, transformations, aggregations
  
  -- Message Template
  template_config TEXT NOT NULL, -- JSON: header, sections, footer, formatting
  
  -- Execution Tracking
  last_run_at TEXT,
  next_run_at TEXT,
  last_status TEXT CHECK(last_status IN ('success', 'failed', 'skipped')),
  last_error TEXT,
  run_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (bot_id) REFERENCES bots(id),
  FOREIGN KEY (data_source_id) REFERENCES data_sources(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Reminder Execution Logs
CREATE TABLE IF NOT EXISTS reminder_logs (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'skipped')),
  message_sent TEXT, -- The actual message that was sent
  target_id TEXT, -- Who received it
  error_message TEXT,
  execution_time_ms INTEGER,
  
  FOREIGN KEY (reminder_id) REFERENCES reminders(id)
);

-- WhatsApp Groups Table (for target selection)
CREATE TABLE IF NOT EXISTS wa_groups (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  group_jid TEXT NOT NULL, -- WhatsApp group JID
  group_name TEXT NOT NULL,
  participant_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  last_synced_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (bot_id) REFERENCES bots(id),
  UNIQUE(bot_id, group_jid)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active);
CREATE INDEX IF NOT EXISTS idx_reminders_next_run ON reminders(next_run_at);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_wa_groups_bot_id ON wa_groups(bot_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_tenant_id ON data_sources(tenant_id);
