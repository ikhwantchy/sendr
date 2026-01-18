import { Database } from 'better-sqlite3';

export function up(db: Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS llm_allowed_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_id INTEGER NOT NULL,
            target_type TEXT NOT NULL CHECK(target_type IN ('group', 'contact')),
            target_jid TEXT NOT NULL,
            target_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
            UNIQUE(bot_id, target_jid)
        );

        CREATE INDEX IF NOT EXISTS idx_llm_allowed_targets_bot_id 
            ON llm_allowed_targets(bot_id);
        
        CREATE INDEX IF NOT EXISTS idx_llm_allowed_targets_target_jid 
            ON llm_allowed_targets(target_jid);
    `);

    console.log('✅ Migration 009: Created llm_allowed_targets table');
}

export function down(db: Database): void {
    db.exec(`
        DROP INDEX IF EXISTS idx_llm_allowed_targets_target_jid;
        DROP INDEX IF EXISTS idx_llm_allowed_targets_bot_id;
        DROP TABLE IF EXISTS llm_allowed_targets;
    `);

    console.log('✅ Migration 009: Dropped llm_allowed_targets table');
}
