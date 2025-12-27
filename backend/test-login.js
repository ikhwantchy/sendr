/**
 * TEST LOGIN - Quick test script
 */

const bcrypt = require('bcryptjs');
const { query } = require('./dist/database/connection-sqlite');

async function testLogin() {
    try {
        const email = 'testuser@example.com';
        const password = 'password123';

        console.log('🔐 Testing login...\n');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}\n`);

        // Get user
        console.log('[1/3] Fetching user from database...');
        const result = await query(
            "SELECT * FROM users WHERE email = ? AND status = 'active'",
            [email]
        );

        if (!result.rows || result.rows.length === 0) {
            console.log('❌ User not found or inactive');
            process.exit(1);
        }

        const user = result.rows[0];
        console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status
        });
        console.log();

        // Test password
        console.log('[2/3] Testing password...');
        console.log('Stored hash:', user.password_hash);

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            console.log('❌ Password does not match!');
            process.exit(1);
        }

        console.log('✅ Password matches!\n');

        // Check permissions
        console.log('[3/3] Checking bot permissions...');
        const perms = await query(
            'SELECT * FROM bot_permissions WHERE user_id = ?',
            [user.id]
        );

        console.log(`✅ User has ${perms.rows.length} bot permission(s)`);
        if (perms.rows.length > 0) {
            console.log('Permissions:', perms.rows);
        }
        console.log();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ LOGIN TEST PASSED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('User should be able to login with:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}\n`);
        console.log('If login still fails, check backend console for errors.');
        console.log();

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testLogin();
