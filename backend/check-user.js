/**
 * CHECK USER IN DATABASE
 */

const { query } = require('./dist/database/connection-sqlite');
const bcrypt = require('bcryptjs');

async function checkUser() {
    try {
        console.log('🔍 Checking users in database...\n');

        const result = await query('SELECT id, email, name, role, status, password_hash FROM users');

        console.log(`Found ${result.rows.length} users:\n`);

        for (const user of result.rows) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`ID:       ${user.id}`);
            console.log(`Email:    ${user.email}`);
            console.log(`Name:     ${user.name}`);
            console.log(`Role:     ${user.role}`);
            console.log(`Status:   ${user.status}`);
            console.log(`Hash:     ${user.password_hash.substring(0, 30)}...`);

            // Test password
            const testPasswords = ['admin123', 'admin', 'password', '123456'];
            for (const pwd of testPasswords) {
                const match = await bcrypt.compare(pwd, user.password_hash);
                if (match) {
                    console.log(`✅ PASSWORD MATCH: "${pwd}"`);
                }
            }
            console.log('');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUser();
