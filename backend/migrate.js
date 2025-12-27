/**
 * Database Migration Script (PostgreSQL)
 * Run: node migrate.js
 */

const { pool } = require('./dist/database/connection');

async function runMigrations() {
    try {
        console.log('Starting database migrations...');

        // Migration 1: Update campaigns table
        console.log('[1/2] Updating campaigns table...');

        // Check if columns exist before adding
        const checkColumn = async (table, column) => {
            const result = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [table, column]);
            return result.rows.length > 0;
        };

        if (!(await checkColumn('campaigns', 'total_contacts'))) {
            await pool.query(`ALTER TABLE campaigns ADD COLUMN total_contacts INTEGER DEFAULT 0`);
        }

        if (!(await checkColumn('campaigns', 'sent_count'))) {
            await pool.query(`ALTER TABLE campaigns ADD COLUMN sent_count INTEGER DEFAULT 0`);
        }

        if (!(await checkColumn('campaigns', 'failed_count'))) {
            await pool.query(`ALTER TABLE campaigns ADD COLUMN failed_count INTEGER DEFAULT 0`);
        }

        if (!(await checkColumn('campaigns', 'started_at'))) {
            await pool.query(`ALTER TABLE campaigns ADD COLUMN started_at TIMESTAMP`);
        }

        if (!(await checkColumn('campaigns', 'completed_at'))) {
            await pool.query(`ALTER TABLE campaigns ADD COLUMN completed_at TIMESTAMP`);
        }

        // Create indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at)`);

        console.log('✅ Campaigns table updated');

        // Migration 2: Create reminders table
        console.log('[2/2] Creating reminders table...');

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

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at ON reminders(next_run_at)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminders_schedule_type ON reminders(schedule_type)`);

        console.log('✅ Reminders table created');

        console.log('🎉 All migrations completed successfully!');
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

runMigrations();
