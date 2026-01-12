import { query, closePool } from './src/database/connection';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
    try {
        console.log('🚀 Applying AI Migration...');

        // 1. Add ai_config column (if not exists)
        try {
            await query('ALTER TABLE bots ADD COLUMN ai_config TEXT DEFAULT \'{"enabled":false}\'');
            console.log('✅ Added ai_config column to bots table');
        } catch (e: any) {
            if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
                console.log('ℹ️ ai_config column already exists');
            } else {
                console.error('❌ Failed to add ai_config column:', e.message);
            }
        }

        // 2. Create ai_conversations table
        await query(`
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
            )
        `);
        console.log('✅ Created ai_conversations table');

        // 3. Create ai_usage table
        await query(`
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
            )
        `);
        console.log('✅ Created ai_usage table');

        console.log('\n✨ Database updated successfully! Refresh your dashboard.');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await closePool();
    }
}

applyMigration();
