"use strict";
/**
 * SQLite Database Connection
 * Simple file-based database - no setup required!
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDatabase = initDatabase;
exports.saveDatabase = saveDatabase;
exports.query = query;
exports.transaction = transaction;
exports.closePool = closePool;
exports.logActivity = logActivity;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = require("fs");
const path_1 = require("path");
const logger_1 = require("../utils/logger");
// Use process.cwd() to ensure consistent path whether running from tsx or compiled JS
const DB_PATH = (0, path_1.join)(process.cwd(), 'data/database.sqlite');
// Internal raw instance
let _db = null;
exports.db = {
    prepare(sql) {
        if (!_db)
            throw new Error("Database not initialized");
        return {
            run: (...params) => {
                // Handle argument spreading similar to better-sqlite3
                const stmt = _db.prepare(sql);
                try {
                    stmt.bind(params);
                    stmt.step(); // Execute
                    const changes = _db.getRowsModified();
                    // Get last ID safely
                    let lastId = 0;
                    try {
                        const idRes = _db.exec("SELECT last_insert_rowid()");
                        if (idRes.length > 0 && idRes[0].values.length > 0) {
                            lastId = idRes[0].values[0][0];
                        }
                    }
                    catch (e) { }
                    stmt.free();
                    if (isWriteQuery(sql))
                        saveDatabase();
                    return { changes, lastInsertRowid: lastId };
                }
                catch (e) {
                    stmt.free();
                    throw e;
                }
            },
            get: (...params) => {
                const stmt = _db.prepare(sql);
                try {
                    stmt.bind(params);
                    const res = stmt.step() ? stmt.getAsObject() : undefined;
                    stmt.free();
                    return res;
                }
                catch (e) {
                    stmt.free();
                    throw e;
                }
            },
            all: (...params) => {
                const stmt = _db.prepare(sql);
                try {
                    stmt.bind(params);
                    const rows = [];
                    while (stmt.step()) {
                        rows.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return rows;
                }
                catch (e) {
                    stmt.free();
                    throw e;
                }
            }
        };
    },
    transaction: (fn) => {
        return (...args) => {
            if (!_db)
                throw new Error("DB not init");
            _db.run("BEGIN TRANSACTION");
            try {
                const result = fn(...args);
                _db.run("COMMIT");
                saveDatabase();
                return result;
            }
            catch (e) {
                _db.run("ROLLBACK");
                throw e;
            }
        };
    },
    exec: (sql) => {
        if (!_db)
            throw new Error("DB not init");
        _db.run(sql);
        saveDatabase();
    },
    // Property to allow check
    get open() { return !!_db; }
};
function isWriteQuery(sql) {
    const s = sql.trim().toUpperCase();
    return s.startsWith('INSERT') || s.startsWith('UPDATE') || s.startsWith('DELETE') || s.startsWith('CREATE') || s.startsWith('DROP') || s.startsWith('ALTER');
}
let _initPromise = null;
async function initDatabase() {
    if (_db)
        return;
    if (_initPromise)
        return _initPromise;
    _initPromise = (async () => {
        try {
            const SQL = await (0, sql_js_1.default)();
            // Load existing database or create new one
            if ((0, fs_1.existsSync)(DB_PATH)) {
                const buffer = (0, fs_1.readFileSync)(DB_PATH);
                _db = new SQL.Database(buffer);
                logger_1.logger.info('✅ SQLite database loaded from file');
            }
            else {
                _db = new SQL.Database();
                logger_1.logger.info('✅ SQLite database created (new)');
            }
            // Always initialize schema
            await initSchema();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize SQLite database', { error });
            _initPromise = null;
            throw error;
        }
    })();
    return _initPromise;
}
// ... initSchema and others (copy paste from previous, no changes needed inside strings)
async function initSchema() {
    if (!_db)
        return;
    logger_1.logger.info('Creating database schema...');
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
      role TEXT NOT NULL CHECK(role IN ('OWNER', 'ADMIN', 'OPERATOR', 'USER', 'VIEWER')),
      permissions TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      last_login_at TEXT,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      telegram_chat_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    -- User Sessions
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP,
      is_revoked INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Security Logs
    CREATE TABLE IF NOT EXISTS security_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Bots
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone_number TEXT,
      lid TEXT,
      status TEXT DEFAULT 'disconnected' CHECK(status IN ('disconnected', 'connecting', 'connected', 'error')),
      is_paused INTEGER DEFAULT 0,
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

    -- LLM Allowed Targets
    CREATE TABLE IF NOT EXISTS llm_allowed_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bot_id TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK(target_type IN ('group', 'contact')),
        target_jid TEXT NOT NULL,
        target_name TEXT,
        config_name TEXT,
        is_enabled INTEGER DEFAULT 1,
        llm_config TEXT DEFAULT '{}',
        last_used_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
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
        delay_preset TEXT DEFAULT 'moderate',
        anti_spam_config TEXT,
        contact_source TEXT DEFAULT 'manual',
        sheets_url TEXT,
        sheets_tab TEXT,
        image_url TEXT,
        scheduled_at TEXT,
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
        wa_message_id TEXT,
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Bot Permissions
    CREATE TABLE IF NOT EXISTS bot_permissions (
        user_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        can_view INTEGER DEFAULT 1,
        can_edit INTEGER DEFAULT 0,
        can_delete INTEGER DEFAULT 0,
        can_create_campaigns INTEGER DEFAULT 0,
        can_create_rules INTEGER DEFAULT 0,
        can_view_analytics INTEGER DEFAULT 0,
        can_use_reminders INTEGER DEFAULT 0,
        can_use_ai INTEGER DEFAULT 0,
        can_manage_contacts INTEGER DEFAULT 0,
        can_manage_datasources INTEGER DEFAULT 0,
        granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, bot_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
    );

    -- Insert default tenant
    INSERT OR IGNORE INTO tenants (id, name, slug) 
    VALUES ('default-tenant-id', 'Default Tenant', 'default');
  `;
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    for (const statement of statements) {
        try {
            _db.run(statement);
        }
        catch (e) {
            logger_1.logger.error('Failed to execute schema statement', { statement: statement.substring(0, 50), error: e });
        }
    }
    // Activity Logs Table for persistent history
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
     `);
    }
    catch (e) { }
    // Audit Logs Table (Admin Panel)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT DEFAULT 'default-tenant-id',
            user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            category TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            status TEXT DEFAULT 'success',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
     `);
    }
    catch (e) { }
    // API Keys Table (Admin Panel)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            key_prefix TEXT NOT NULL,
            permissions TEXT DEFAULT '{"read": true, "write": false, "admin": false}',
            rate_limit INTEGER DEFAULT 1000,
            ip_whitelist TEXT,
            expires_at TEXT,
            last_used_at TEXT,
            request_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
     `);
    }
    catch (e) { }
    // User Invites Table (Admin Panel)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS user_invites (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL DEFAULT 'USER',
            invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
            expires_at TEXT NOT NULL,
            accepted_at TEXT,
            status TEXT DEFAULT 'pending',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
     `);
    }
    catch (e) { }
    // Add missing columns to user_invites (migration)
    try {
        _db.run(`ALTER TABLE user_invites ADD COLUMN status TEXT DEFAULT 'pending'`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE user_invites ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
    }
    catch (e) { }
    // System Settings Table (Admin Panel)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
            id TEXT,
            category TEXT NOT NULL DEFAULT 'general',
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            data_type TEXT DEFAULT 'string',
            description TEXT,
            is_public INTEGER DEFAULT 0,
            updated_by TEXT REFERENCES users(id),
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
     `);
    }
    catch (e) { }
    // Add missing columns to system_settings (migration)
    try {
        _db.run(`ALTER TABLE system_settings ADD COLUMN id TEXT`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE system_settings ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE system_settings ADD COLUMN data_type TEXT DEFAULT 'string'`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE system_settings ADD COLUMN is_public INTEGER DEFAULT 0`);
    }
    catch (e) { }
    // AI Sheet Updaters Table (AI Assistant - supports update, create, smart modes)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS ai_sheet_updaters (
            id TEXT PRIMARY KEY,
            bot_id TEXT NOT NULL,
            name TEXT NOT NULL,
            spreadsheet_url TEXT NOT NULL,
            spreadsheet_id TEXT,
            sheet_name TEXT NOT NULL,
            match_column TEXT NOT NULL,
            update_column TEXT NOT NULL,
            ai_instructions TEXT,
            value_mappings TEXT NOT NULL DEFAULT '[]',
            is_enabled INTEGER DEFAULT 1,
            target_jids TEXT,
            mode TEXT DEFAULT 'update',
            column_schema TEXT,
            trigger_keywords TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
        )
     `);
    }
    catch (e) { }
    // Add new columns to existing ai_sheet_updaters table (for migration)
    try {
        _db.run(`ALTER TABLE ai_sheet_updaters ADD COLUMN mode TEXT DEFAULT 'update'`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE ai_sheet_updaters ADD COLUMN column_schema TEXT`);
    }
    catch (e) { }
    try {
        _db.run(`ALTER TABLE ai_sheet_updaters ADD COLUMN trigger_keywords TEXT`);
    }
    catch (e) { }
    // AI Sheet Update Logs Table
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS ai_sheet_update_logs (
            id TEXT PRIMARY KEY,
            config_id TEXT NOT NULL,
            phone TEXT NOT NULL,
            message TEXT,
            classification TEXT,
            mapped_value TEXT,
            confidence REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (config_id) REFERENCES ai_sheet_updaters(id) ON DELETE CASCADE
        )
     `);
    }
    catch (e) { }
    // Create indexes for AI Sheet Updater
    try {
        _db.run(`CREATE INDEX IF NOT EXISTS idx_ai_sheet_updaters_bot_id ON ai_sheet_updaters(bot_id)`);
        _db.run(`CREATE INDEX IF NOT EXISTS idx_ai_sheet_updaters_enabled ON ai_sheet_updaters(is_enabled)`);
        _db.run(`CREATE INDEX IF NOT EXISTS idx_ai_sheet_update_logs_config ON ai_sheet_update_logs(config_id)`);
        _db.run(`CREATE INDEX IF NOT EXISTS idx_ai_sheet_update_logs_phone ON ai_sheet_update_logs(phone)`);
    }
    catch (e) { }
    // LID to Phone Mapping Table (for WhatsApp LID resolution)
    try {
        _db.run(`
        CREATE TABLE IF NOT EXISTS lid_phone_mappings (
            id TEXT PRIMARY KEY,
            bot_id TEXT NOT NULL,
            lid TEXT NOT NULL,
            phone TEXT NOT NULL,
            name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
            UNIQUE(bot_id, lid)
        )
     `);
        _db.run(`CREATE INDEX IF NOT EXISTS idx_lid_phone_mappings_bot_lid ON lid_phone_mappings(bot_id, lid)`);
        _db.run(`CREATE INDEX IF NOT EXISTS idx_lid_phone_mappings_phone ON lid_phone_mappings(phone)`);
    }
    catch (e) { }
    // Apply migrations manually here
    const migrations = [
        "ALTER TABLE messages ADD COLUMN source TEXT DEFAULT 'auto_reply' CHECK(source IN ('auto_reply', 'campaign', 'reminder', 'inbound'))",
        "ALTER TABLE bots ADD COLUMN ai_config TEXT DEFAULT '{\\\"enabled\\\":false}'",
        "ALTER TABLE bots ADD COLUMN lid TEXT",
        "ALTER TABLE bot_permissions ADD COLUMN can_use_reminders INTEGER DEFAULT 0",
        "ALTER TABLE bot_permissions ADD COLUMN can_use_ai INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN two_factor_secret TEXT",
        "ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN telegram_chat_id TEXT",
        "ALTER TABLE campaigns ADD COLUMN delay_preset TEXT DEFAULT 'moderate'",
        "ALTER TABLE campaigns ADD COLUMN anti_spam_config TEXT",
        "ALTER TABLE campaigns ADD COLUMN contact_source TEXT DEFAULT 'manual'",
        "ALTER TABLE campaigns ADD COLUMN sheets_url TEXT",
        "ALTER TABLE campaigns ADD COLUMN sheets_tab TEXT",
        "ALTER TABLE campaigns ADD COLUMN image_url TEXT",
        "ALTER TABLE campaigns ADD COLUMN scheduled_at TEXT",
        "ALTER TABLE bot_permissions ADD COLUMN can_manage_contacts INTEGER DEFAULT 0",
        "ALTER TABLE bot_permissions ADD COLUMN can_manage_datasources INTEGER DEFAULT 0",
        "ALTER TABLE bots ADD COLUMN is_paused INTEGER DEFAULT 0",
        "ALTER TABLE campaign_recipients ADD COLUMN wa_message_id TEXT",
        "ALTER TABLE tenants ADD COLUMN google_service_account TEXT",
        "ALTER TABLE tenants ADD COLUMN settings TEXT DEFAULT '{}'"
    ];
    for (const sql of migrations) {
        try {
            _db.run(sql);
        }
        catch (e) { }
    }
    saveDatabase();
    logger_1.logger.info('✅ Database schema initialized');
}
function saveDatabase() {
    if (!_db)
        return;
    try {
        const { mkdirSync } = require('fs');
        const { dirname } = require('path');
        // Ensure directory exists
        const dir = dirname(DB_PATH);
        if (!(0, fs_1.existsSync)(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        const data = _db.export();
        const buffer = Buffer.from(data);
        (0, fs_1.writeFileSync)(DB_PATH, buffer);
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to save database to disk', { error });
    }
}
async function query(sql, params = []) {
    if (!_db)
        await initDatabase();
    try {
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        if (isWriteQuery(sql))
            saveDatabase();
        return { rows, rowCount: rows.length };
    }
    catch (e) {
        logger_1.logger.error('Query error', { error: e, sql });
        throw e;
    }
}
async function transaction(callback) {
    if (!_db)
        await initDatabase();
    try {
        _db.run('BEGIN TRANSACTION');
        // Callback expects db-like object. We pass our wrapper 'db'
        const result = await callback(exports.db);
        _db.run('COMMIT');
        saveDatabase();
        return result;
    }
    catch (error) {
        _db.run('ROLLBACK');
        throw error;
    }
}
async function closePool() {
    if (_db) {
        saveDatabase();
        _db.close();
        _db = null;
        logger_1.logger.info('Database closed');
    }
}
initDatabase().catch(console.error);
async function logActivity(type, message, metadata = {}) {
    if (!_db)
        await initDatabase();
    try {
        const stmt = _db?.prepare('INSERT INTO activity_logs (type, message, metadata) VALUES (?, ?, ?)');
        stmt?.bind([type, message, JSON.stringify(metadata)]);
        stmt?.step();
        stmt?.free();
        saveDatabase();
    }
    catch (error) { }
}
//# sourceMappingURL=connection-sqlite.js.map