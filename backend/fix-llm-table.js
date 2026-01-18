const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function fixTable() {
    try {
        const SQL = await initSqlJs();
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');
        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        console.log('✅ Database loaded');

        // Check columns first
        const columns = db.exec(`PRAGMA table_info(llm_allowed_targets)`);
        console.log('Checking current table...');

        // Perform migration:
        // 1. Rename old table
        // 2. Create new table without UNIQUE constraint
        // 3. Copy data
        // 4. Drop old table

        db.run(`ALTER TABLE llm_allowed_targets RENAME TO llm_allowed_targets_old`);

        db.run(`
            CREATE TABLE llm_allowed_targets (
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
            )
        `);

        db.run(`
            INSERT INTO llm_allowed_targets (
                id, bot_id, target_type, target_jid, target_name, 
                config_name, is_enabled, llm_config, last_used_at, 
                created_at, updated_at
            )
            SELECT 
                id, bot_id, target_type, target_jid, target_name, 
                config_name, is_enabled, llm_config, last_used_at, 
                created_at, updated_at
            FROM llm_allowed_targets_old
        `);

        db.run(`DROP TABLE llm_allowed_targets_old`);

        const data = db.export();
        fs.writeFileSync(dbPath, data);
        console.log('✅ Table migrated successfully (UNIQUE constraint removed)');

        db.close();
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

fixTable();
