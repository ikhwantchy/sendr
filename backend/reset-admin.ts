
import { query, saveDatabase } from './src/database/connection-sqlite';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
    console.log('🔄 Resetting admin password (TSX Mode)...');

    const email = 'admin@example.com';
    const password = 'admin123';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`🔑 Password hashed for: ${password}`);

    // Update
    try {
        // First check if user exists
        const check = await query("SELECT * FROM users WHERE email = ? OR role = 'OWNER'", [email]);

        if (check.rows.length === 0) {
            console.log('❌ Admin user not found! Cannot reset.');

            // Try to find ANY user to promote
            const anyUser = await query("SELECT * FROM users LIMIT 1");
            if (anyUser.rows.length > 0) {
                console.log(`ℹ️ Found another user: ${anyUser.rows[0].email}. Promoting to OWNER...`);
                await query(
                    "UPDATE users SET email = ?, password_hash = ?, role = 'OWNER', status = 'active' WHERE id = ?",
                    [email, hashedPassword, anyUser.rows[0].id]
                );
                console.log('✅ User promoted to Admin');
            } else {
                console.log('❌ No users found in DB at all.');
                process.exit(1);
            }
        } else {
            console.log(`ℹ️ Found ${check.rows.length} matching users. Updating...`);
            await query(
                "UPDATE users SET password_hash = ?, status = 'active' WHERE email = ? OR role = 'OWNER'",
                [hashedPassword, email]
            );
            console.log('✅ Admin password updated');
        }

        saveDatabase();
        console.log('💾 Database saved');
        console.log('\n✅ DONE. Login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

resetAdmin();
