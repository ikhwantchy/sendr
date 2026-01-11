/**
 * UPDATE OWNER ACCOUNT
 * Change default owner to your real account
 */

const { query, saveDatabase } = require('./dist/database/connection-sqlite');
const bcrypt = require('bcryptjs');

async function updateOwnerAccount() {
    try {
        console.log('🔄 Updating owner account...\n');

        // Default credentials (admin)
        const newEmail = 'admin@example.com';
        const newName = 'Admin User';
        const newPassword = 'admin123';

        console.log('New owner details:');
        console.log(`  Email: ${newEmail}`);
        console.log(`  Name: ${newName}`);
        console.log(`  Password: ${newPassword}\n`);

        // Hash password
        console.log('[1/3] Hashing password...');
        const passwordHash = await bcrypt.hash(newPassword, 10);
        console.log('✅ Password hashed\n');

        // Update owner account
        console.log('[2/3] Updating owner account...');

        // DEBUG: Check users before
        const beforeUsers = await query("SELECT id, email, role, status FROM users");
        console.log('DEBUG: Users in DB:', JSON.stringify(beforeUsers.rows, null, 2));

        await query(
            `UPDATE users 
             SET email = ?, name = ?, password_hash = ?, role = 'OWNER', status = 'active', updated_at = datetime('now')
             WHERE role = 'OWNER' OR email = 'admin@example.com'`,
            [newEmail, newName, passwordHash]
        );
        console.log('✅ Owner account updated\n');

        // Save database
        console.log('[3/3] Saving database...');
        saveDatabase();
        console.log('✅ Database saved\n');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 OWNER ACCOUNT UPDATED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📝 New Login Credentials:');
        console.log(`   Email:    ${newEmail}`);
        console.log(`   Password: ${newPassword}`);
        console.log(`   Name:     ${newName}`);
        console.log(`   Role:     OWNER\n`);
        console.log('🚀 You can now login with your real account!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error updating owner account:', error.message);
        console.error(error);
        process.exit(1);
    }
}

updateOwnerAccount();
