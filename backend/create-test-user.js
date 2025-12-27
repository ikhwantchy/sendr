/**
 * CREATE TEST USER - AUTOMATIC SCRIPT
 * Run: node create-test-user.js
 */

const { query, saveDatabase } = require('./dist/database/connection-sqlite');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createTestUser() {
    try {
        console.log('🚀 Creating test user...\n');

        // 1. Get owner ID
        console.log('[1/5] Getting owner ID...');
        const ownerResult = await query("SELECT id, email FROM users WHERE role LIKE 'owner' LIMIT 1");

        if (!ownerResult.rows || ownerResult.rows.length === 0) {
            console.error('❌ No owner found! Please create an owner account first.');
            process.exit(1);
        }

        const ownerId = ownerResult.rows[0].id;
        console.log(`✅ Owner ID: ${ownerId} (${ownerResult.rows[0].email})\n`);

        // 2. Get bot ID
        console.log('[2/5] Getting bot ID...');
        const botResult = await query("SELECT id, name FROM bots LIMIT 1");

        if (!botResult.rows || botResult.rows.length === 0) {
            console.error('❌ No bots found! Please create a bot first.');
            process.exit(1);
        }

        const botId = botResult.rows[0].id;
        console.log(`✅ Bot ID: ${botId} (${botResult.rows[0].name})\n`);

        // 3. Check if test user already exists
        console.log('[3/5] Checking if test user exists...');
        const existingUser = await query("SELECT id FROM users WHERE email = 'testuser@example.com'");

        if (existingUser.rows && existingUser.rows.length > 0) {
            console.log('⚠️  Test user already exists. Deleting old user...');
            await query("DELETE FROM bot_permissions WHERE user_id = ?", [existingUser.rows[0].id]);
            await query("DELETE FROM users WHERE email = 'testuser@example.com'");
            console.log('✅ Old test user deleted\n');
        }

        // 4. Create test user
        console.log('[4/5] Creating test user...');
        const userId = crypto.randomUUID();
        const hashedPassword = await bcrypt.hash('password123', 10);

        await query(`
            INSERT INTO users (id, tenant_id, email, name, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [userId, 'default-tenant', 'testuser@example.com', 'Test User', hashedPassword, 'OPERATOR']);

        console.log('✅ Test user created');
        console.log(`   Email: testuser@example.com`);
        console.log(`   Password: password123`);
        console.log(`   Role: OPERATOR\n`);

        // 5. Assign bot permissions
        console.log('[5/5] Assigning bot permissions...');
        const permId = crypto.randomUUID();

        await query(`
            INSERT INTO bot_permissions (
                id, bot_id, user_id,
                can_view, can_edit, can_delete,
                can_create_campaigns, can_create_rules, can_view_analytics,
                granted_by, granted_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
            permId, botId, userId,
            1, 0, 0,  // can_view=true, can_edit=false, can_delete=false
            1, 0, 1,  // can_create_campaigns=true, can_create_rules=false, can_view_analytics=true
            ownerId
        ]);

        console.log('✅ Bot permissions assigned');
        console.log(`   Bot: ${botResult.rows[0].name}`);
        console.log(`   Permissions: View, Create Campaigns, View Analytics\n`);

        // Save database
        saveDatabase();
        console.log('✅ Database saved\n');

        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 TEST USER CREATED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📝 Login Credentials:');
        console.log('   Email:    testuser@example.com');
        console.log('   Password: password123');
        console.log('   Role:     OPERATOR\n');
        console.log('✅ What test user can do:');
        console.log('   • View assigned bot');
        console.log('   • Create campaigns');
        console.log('   • View analytics\n');
        console.log('❌ What test user CANNOT do:');
        console.log('   • Edit bot settings');
        console.log('   • Delete bot');
        console.log('   • Create rules');
        console.log('   • See other bots');
        console.log('   • Manage users\n');
        console.log('🚀 Next steps:');
        console.log('   1. Logout from owner account');
        console.log('   2. Login with: testuser@example.com / password123');
        console.log('   3. Check that you only see 1 bot!');
        console.log('   4. Verify "Users" menu is NOT visible\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating test user:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run
createTestUser();
