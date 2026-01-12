/**
 * SQLite Database Connection
 * Simple file-based database - no setup required!
 */

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

const DB_PATH = join(__dirname, '../../data/database.sqlite');

let db: Database | null = null;

export async function initDatabase(): Promise<void> {
  try {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    if (existsSync(DB_PATH)) {
      const buffer = readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      logger.info('✅ SQLite database loaded from file');
    } else {
      db = new SQL.Database();
      logger.info('✅ SQLite database created (new)');
    }

    // Always initialize schema (CREATE TABLE IF NOT EXISTS handles existing tables)
    await initSchema();

    // Save to file
    saveDatabase();
  } catch (error) {
    logger.error('Failed to initialize SQLite database', { error });
    throw error;
  }
}

async function initSchema(): Promise<void> {
  if (!db) return;

  logger.info('Creating database schema...');

  // Create tables (simplified schema for SQLite)
  const schema = `
    -- Tenants
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'OPERATOR', 'VIEWER')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    -- Bots
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT,
      lid TEXT,
      status TEXT DEFAULT 'disconnected' CHECK(status IN ('disconnected', 'connecting', 'connected', 'error')),
      qr_code TEXT,
      qr_expires_at TEXT,
      session_data TEXT,
      config TEXT,
      ai_config TEXT DEFAULT '{"enabled":false}',
      last_connected_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- AI Conversations
    CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        contact_name TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        status TEXT DEFAULT 'active',
        mode TEXT,
        extracted_data TEXT DEFAULT '{}',
        messages TEXT DEFAULT '[]',
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    );

    -- AI Usage Tracking
    CREATE TABLE IF NOT EXISTS ai_usage (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        conversation_id TEXT,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
    );

    -- Keyword Rules
    CREATE TABLE IF NOT EXISTS keyword_rules (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      name TEXT NOT NULL,
      keyword TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains' CHECK(match_type IN ('equals', 'contains', 'regex')),
      scope TEXT DEFAULT 'global' CHECK(scope IN ('global', 'group', 'contact')),
      scope_target TEXT,
      priority INTEGER DEFAULT 10,
      actions TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (bot_id) REFERENCES bots(id)
    );

    -- Event Logs
    CREATE TABLE IF NOT EXISTS event_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      context TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    -- Data Sources (Google Sheets, CSV, etc)
    CREATE TABLE IF NOT EXISTS data_sources (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('google_sheets', 'csv', 'json', 'api')),
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_synced_at TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Reminders
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      schedule TEXT NOT NULL,
      timezone TEXT DEFAULT 'Asia/Jakarta',
      is_active INTEGER DEFAULT 1,
      target_type TEXT NOT NULL CHECK(target_type IN ('group', 'contact', 'broadcast')),
      target_id TEXT NOT NULL,
      data_source_id TEXT,
      pipeline_config TEXT NOT NULL,
      template_config TEXT NOT NULL,
      last_run_at TEXT,
      next_run_at TEXT,
      last_status TEXT CHECK(last_status IN ('success', 'failed', 'skipped')),
      last_error TEXT,
      run_count INTEGER DEFAULT 0,
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
      message_sent TEXT,
      target_id TEXT,
      error_message TEXT,
      execution_time_ms INTEGER,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id)
    );

    -- Messages (for tracking sent/received messages)
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      wa_message_id TEXT,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      source TEXT DEFAULT 'auto_reply' CHECK(source IN ('auto_reply', 'campaign', 'reminder', 'inbound')),
      message_type TEXT NOT NULL CHECK(message_type IN ('text', 'image', 'video', 'audio', 'document')),
      content TEXT,
      media_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id)
    );

    -- WhatsApp Groups
    CREATE TABLE IF NOT EXISTS wa_groups (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      group_jid TEXT NOT NULL,
      group_name TEXT NOT NULL,
      participant_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_synced_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bot_id) REFERENCES bots(id),
      UNIQUE(bot_id, group_jid)
    );

    -- Campaigns
    CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        name TEXT NOT NULL,
        message_template TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        total_contacts INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        FOREIGN KEY (bot_id) REFERENCES bots(id)
    );

    -- Campaign Recipients
    CREATE TABLE IF NOT EXISTS campaign_recipients (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        name TEXT,
        variables TEXT,
        status TEXT DEFAULT 'pending',
        sent_at TEXT,
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Insert default tenant (user will be created by seed script)
    INSERT OR IGNORE INTO tenants (id, name, slug) 
    VALUES ('default-tenant-id', 'Default Tenant', 'default');

    -- NOTE: Default user is created by seed.ts with proper password hash
    -- Removed auto-insert here to prevent dummy hash issues
  `;

  db.run(schema);

  // Activity Logs Table for persistent history
  db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  // MIGRATION: Add source column if it doesn't exist
  try {
    db.run("ALTER TABLE messages ADD COLUMN source TEXT DEFAULT 'auto_reply' CHECK(source IN ('auto_reply', 'campaign', 'reminder', 'inbound'))");
    logger.info('✅ MIGRATION: Added source column to messages table');
  } catch (e) { }

  // MIGRATION: Add ai_config column to bots if it doesn't exist
  try {
    db.run("ALTER TABLE bots ADD COLUMN ai_config TEXT DEFAULT '{\"enabled\":false}'");
    logger.info('✅ MIGRATION: Added ai_config column to bots table');
  } catch (e) { }

  // MIGRATION: Add lid column to bots if it doesn't exist
  try {
    db.run("ALTER TABLE bots ADD COLUMN lid TEXT");
    logger.info('✅ MIGRATION: Added lid column to bots table');
  } catch (e) { }

  // DATA REPAIR: Backfill messages from reminder_logs (for historical charts)
  try {
    db.run(`
        INSERT INTO messages (id, bot_id, direction, source, message_type, content, created_at)
        SELECT 
          'rem-log-' || rl.id, 
          r.bot_id, 
          'outbound', 
          'reminder', 
          'text', 
          rl.message_sent, 
          rl.executed_at
        FROM reminder_logs rl
        JOIN reminders r ON rl.reminder_id = r.id
        WHERE rl.status = 'success'
          AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.id = 'rem-log-' || rl.id)
      `);
    logger.info('✅ DATA REPAIR: Backfilled reminders into messages');
  } catch (e) {
    logger.warn('Failed to backfill reminders', { error: e });
  }

  logger.info('✅ Database schema created');
}

export function saveDatabase(): void {
  if (!db) return;

  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
    logger.debug('Database saved to file');
  } catch (error) {
    logger.error('Failed to save database', { error });
  }
}

// Auto-save every 5 seconds
setInterval(() => {
  saveDatabase();
}, 5000);

export async function query(sql: string, params: any[] = []): Promise<any> {
  if (!db) {
    await initDatabase();
  }

  try {
    const stmt = db!.prepare(sql);
    stmt.bind(params);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    // Save after write operations
    if (sql.trim().toUpperCase().startsWith('INSERT') ||
      sql.trim().toUpperCase().startsWith('UPDATE') ||
      sql.trim().toUpperCase().startsWith('DELETE')) {
      saveDatabase();
    }

    return { rows, rowCount: rows.length };
  } catch (error) {
    logger.error('Query error', { error, sql, params });
    throw error;
  }
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!db) {
    await initDatabase();
  }

  try {
    db!.run('BEGIN TRANSACTION');
    const result = await callback(db);
    db!.run('COMMIT');
    saveDatabase();
    return result;
  } catch (error) {
    db!.run('ROLLBACK');
    throw error;
  }
}

export async function closePool(): Promise<void> {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

// Initialize on import
initDatabase().catch((error) => {
  logger.error('Failed to initialize database on startup', { error });
});

// Helper to log system activity
export async function logActivity(type: 'bot' | 'rule' | 'campaign' | 'message' | 'error', message: string, metadata: any = {}) {
  if (!db) await initDatabase();
  try {
    const stmt = db?.prepare('INSERT INTO activity_logs (type, message, metadata) VALUES (?, ?, ?)');
    stmt?.bind([type, message, JSON.stringify(metadata)]);
    stmt?.step();
    stmt?.free();
    saveDatabase();
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
