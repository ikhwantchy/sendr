import dotenv from 'dotenv';
dotenv.config();

import { query } from './connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🌱 Starting seed...');

    try {
        // Helper to handle placeholders and timestamps based on DB type
        const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
        const isSqlite = dbType === 'sqlite' || dbType !== 'postgres';
        const p = (n: number) => isSqlite ? '?' : `$${n}`;
        const now = isSqlite ? 'CURRENT_TIMESTAMP' : 'NOW()';

        // 1. Ensure Default Tenant Exists
        let tenantId = 'default-tenant-id'; // Match the ID from schema

        // Check by slug first (to avoid unique constraint error)
        const slugCheck = await query(`SELECT * FROM tenants WHERE slug = ${p(1)}`, ['default']);

        if (slugCheck.rows.length > 0) {
            console.log('ℹ️ Default tenant found (by slug)');
            tenantId = slugCheck.rows[0].id;
        } else {
            // Check by ID just in case
            const idCheck = await query(`SELECT * FROM tenants WHERE id = ${p(1)}`, [tenantId]);

            if (idCheck.rows.length === 0) {
                console.log('Creating default tenant...');
                await query(`
                    INSERT INTO tenants (id, name, slug, created_at, updated_at)
                    VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${now}, ${now})
                 `, [tenantId, 'Default Tenant', 'default']);
            }
        }

        // 2. Check if admin exists
        const check = await query(`SELECT * FROM users WHERE email = ${p(1)}`, ['admin@example.com']);

        if (check.rows.length === 0) {
            console.log('Creating admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            try {
                await query(`
                    INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, created_at, updated_at)
                    VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${now}, ${now})
                `, ['default-user-id', tenantId, 'admin@example.com', hashedPassword, 'Admin User', 'OWNER', 'active']);

                console.log('✅ Admin user created');
                console.log('   Email: admin@example.com');
                console.log('   Password: admin123');
            } catch (insertError) {
                console.error('❌ Failed to insert admin user:', insertError);
                throw insertError;
            }
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        console.log('✅ Seed completed successfully');

        // Forced save for SQLite
        try {
            const { saveDatabase } = await import('./connection-sqlite');
            saveDatabase();
            console.log('💾 Database saved to disk');
        } catch (e) { }

    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
