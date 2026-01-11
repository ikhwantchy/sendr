/**
 * FORCE UPDATE - Stops server, updates DB, you restart manually
 */

const { query, saveDatabase } = require('./dist/database/connection-sqlite');
const bcrypt = require('bcryptjs');

async function forceUpdate() {
    try {
        console.log('⚠️  FORCE UPDATE MODE\n');
        console.log('IMPORTANT: Make sure backend server is STOPPED!\n');

        await new Promise(resolve => setTimeout(resolve, 2000));

        const email = 'admin@example.com';
        const password = 'admin123';

        console.log('[1/3] Generating NEW password hash...');
        const passwordHash = await bcrypt.hash(password, 10);
        console.log(`✅ Hash: ${passwordHash.substring(0, 30)}...\n`);

        console.log('[2/3] Updating database...');
        await query(
            `UPDATE users 
             SET password_hash = ?, status = 'active', updated_at = datetime('now')
             WHERE email = ?`,
            [passwordHash, email]
        );
        console.log('✅ User updated\n');

        console.log('[3/3] Saving to file...');
        saveDatabase();
        console.log('✅ Database saved\n');

        // Verify
        console.log('🔍 Verifying...');
        const check = await query('SELECT email, password_hash FROM users WHERE email = ?', [email]);
        if (check.rows.length > 0) {
            const match = await bcrypt.compare(password, check.rows[0].password_hash);
            if (match) {
                console.log('✅ PASSWORD VERIFIED!\n');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎉 SUCCESS! Now start your backend server');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                console.log('Login with:');
                console.log(`  Email:    ${email}`);
                console.log(`  Password: ${password}\n`);
            } else {
                console.log('❌ Verification failed - password mismatch');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

forceUpdate();
