/**
 * SQLite Migration Script - SAFE VERSION
 * Creates tables if they don't exist, then adds columns
 * UPDATED: Includes Multi-User Access System migrations
 */

const { query, saveDatabase } = require('./dist/database/connection-sqlite');

async function runMigrations() {
    try {
        console.log('Starting SQLite migrations...');

        // First, ensure campaigns table exists
        console.log('[1/7] Ensuring campaigns table exists...');

        await query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                bot_id TEXT NOT NULL,
                name TEXT NOT NULL,
                message_template TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_contacts TEXT,
                scheduled_at TEXT,
                status TEXT DEFAULT 'draft',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Campaigns table exists');

        // Check if columns exist
        const checkColumn = async (table, column) => {
            const result = await query(`PRAGMA table_info(${table})`);
            return result.rows.some(row => row.name === column);
        };

        // Migration 2: Add new columns to campaigns
        console.log('[2/7] Adding new columns to campaigns...');

        if (!(await checkColumn('campaigns', 'total_contacts'))) {
            await query(`ALTER TABLE campaigns ADD COLUMN total_contacts INTEGER DEFAULT 0`);
            console.log('  ✅ Added total_contacts');
        }

        if (!(await checkColumn('campaigns', 'sent_count'))) {
            await query(`ALTER TABLE campaigns ADD COLUMN sent_count INTEGER DEFAULT 0`);
            console.log('  ✅ Added sent_count');
        }

        if (!(await checkColumn('campaigns', 'failed_count'))) {
            await query(`ALTER TABLE campaigns ADD COLUMN failed_count INTEGER DEFAULT 0`);
            console.log('  ✅ Added failed_count');
        }

        if (!(await checkColumn('campaigns', 'started_at'))) {
            await query(`ALTER TABLE campaigns ADD COLUMN started_at TEXT`);
            console.log('  ✅ Added started_at');
        }

        if (!(await checkColumn('campaigns', 'completed_at'))) {
            await query(`ALTER TABLE campaigns ADD COLUMN completed_at TEXT`);
            console.log('  ✅ Added completed_at');
        }

        console.log('✅ Campaigns columns updated');

        // Migration 3: Create indexes
        console.log('[3/7] Creating indexes...');

        await query(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_campaigns_bot_id ON campaigns(bot_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at)`);

        console.log('✅ Indexes created');

        // Migration 4: Create reminders table
        console.log('[4/7] Creating reminders table...');

        await query(`
            CREATE TABLE IF NOT EXISTS reminders (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                bot_id TEXT NOT NULL,
                name TEXT NOT NULL,
                message TEXT NOT NULL,
                recipient TEXT NOT NULL,
                schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'custom')),
                schedule_config TEXT,
                next_run_at TEXT NOT NULL,
                last_run_at TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE
            )
        `);

        await query(`CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reminders_next_run_at ON reminders(next_run_at)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON reminders(is_active)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reminders_schedule_type ON reminders(schedule_type)`);

        console.log('✅ Reminders table created');

        // Migration 5: Add role column to users (MULTI-USER ACCESS)
        console.log('[5/7] Adding role column to users...');

        if (!(await checkColumn('users', 'role'))) {
            await query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'owner'`);
            console.log('  ✅ Added role column');
        }

        // Update existing users to owner role
        await query(`UPDATE users SET role = 'owner' WHERE role IS NULL OR role = ''`);
        console.log('  ✅ Updated existing users to owner');

        // Migration 6: Create bot_permissions table (MULTI-USER ACCESS)
        console.log('[6/7] Creating bot_permissions table...');

        await query(`
            CREATE TABLE IF NOT EXISTS bot_permissions (
                id TEXT PRIMARY KEY,
                bot_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                can_view INTEGER DEFAULT 1,
                can_edit INTEGER DEFAULT 0,
                can_delete INTEGER DEFAULT 0,
                can_create_campaigns INTEGER DEFAULT 1,
                can_create_rules INTEGER DEFAULT 0,
                can_view_analytics INTEGER DEFAULT 1,
                granted_by TEXT,
                granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(bot_id, user_id),
                FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users(id)
            )
        `);

        await query(`CREATE INDEX IF NOT EXISTS idx_bot_permissions_user ON bot_permissions(user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_bot_permissions_bot ON bot_permissions(bot_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_bot_permissions_granted_by ON bot_permissions(granted_by)`);

        console.log('✅ Bot permissions table created');

        // Migration 7: Create user_invitations table (MULTI-USER ACCESS)
        console.log('[7/7] Creating user_invitations table...');

        await query(`
            CREATE TABLE IF NOT EXISTS user_invitations (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                invited_by TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TEXT NOT NULL,
                accepted_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await query(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON user_invitations(invited_by)`);

        console.log('✅ User invitations table created');

        // Save database
        saveDatabase();
        console.log('✅ Database saved');

        console.log('');
        console.log('🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
        console.log('');
        console.log('✅ Multi-User Access System migrations:');
        console.log('   - users.role column added');
        console.log('   - bot_permissions table created');
        console.log('   - user_invitations table created');
        console.log('');
        console.log('Next steps:');
        console.log('1. Ensure Redis is running');
        console.log('2. Restart backend: npm run dev');
        console.log('3. Test multi-user features');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigrations();
