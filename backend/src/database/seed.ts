import { query } from './connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🌱 Starting seed...');

    try {
        // Check if admin exists
        const check = await query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);

        if (check.rows.length === 0) {
            console.log('Creating admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await query(`
                INSERT INTO users (id, email, password, name, role, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [uuidv4(), 'admin@example.com', hashedPassword, 'Admin User', 'admin']);

            console.log('✅ Admin user created');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        console.log('✅ Seed completed successfully');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
