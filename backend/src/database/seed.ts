import dotenv from 'dotenv';
dotenv.config();

import { query } from './connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🌱 Starting seed...');

    try {
        // 1. Ensure Default Tenant Exists
        let tenantId = '11111111-1111-1111-1111-111111111111';

        // Check by slug first (to avoid unique constraint error)
        const slugCheck = await query('SELECT * FROM tenants WHERE slug = $1', ['default']);

        if (slugCheck.rows.length > 0) {
            console.log('ℹ️ Default tenant found (by slug)');
            tenantId = slugCheck.rows[0].id;
        } else {
            // Check by ID just in case
            const idCheck = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);

            if (idCheck.rows.length === 0) {
                console.log('Creating default tenant...');
                await query(`
                    INSERT INTO tenants (id, name, slug, created_at, updated_at)
                    VALUES ($1, $2, $3, NOW(), NOW())
                 `, [tenantId, 'Default Tenant', 'default']);
            }
        }

        // 2. Check if admin exists
        const check = await query('SELECT * FROM users WHERE email = $1', ['admin@example.com']);

        if (check.rows.length === 0) {
            console.log('Creating admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            await query(`
                INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            `, ['default-user-id', tenantId, 'admin@example.com', hashedPassword, 'Admin User', 'OWNER']);

            console.log('✅ Admin user created');
            console.log('   Email: admin@example.com');
            console.log('   Password: admin123');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        console.log('✅ Seed completed successfully');
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
