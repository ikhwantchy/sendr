/**
 * Database Migration Script
 * Run: npx tsx migrate.ts
 */

import { pool } from './src/database/connection';
import { logger } from './src/utils/logger';

async function runMigrations() {
    try {
        logger.info('Starting database migrations...');

        // Migration 1: Update campaigns table
        logger.info('[1/2] Updating campaigns table...');

        await pool.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS total_contacts INTEGER DEFAULT 0
        `);

        await pool.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0
        `);

        await pool.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0
        `);

        await pool.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS started_at TIMESTAMP
        `);

        await pool.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_status 
            ON campaigns(status)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id 
            ON campaigns(bot_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at 
            ON campaigns(scheduled_at)
        `);

        logger.info('✅ Campaigns table updated');

        // Migration 2: Create reminders table
        logger.info('[2/2] Creating reminders table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                bot_id TEXT NOT NULL,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                recipient TEXT NOT NULL,
                schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'custom')),
                schedule_config TEXT,
                next_run_at TIMESTAMP NOT NULL,
                last_run_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reminders_bot_id 
            ON reminders(bot_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at 
            ON reminders(next_run_at)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reminders_is_active 
            ON reminders(is_active)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reminders_schedule_type 
            ON reminders(schedule_type)
        `);

        logger.info('✅ Reminders table created');

        logger.info('🎉 All migrations completed successfully!');
        process.exit(0);
    } catch (error: any) {
        logger.error('❌ Migration failed', { error: error.message });
        console.error(error);
        process.exit(1);
    }
}

runMigrations();
