import { query, closePool } from './src/database/connection';

async function checkUsers() {
    try {
        const users = await query('SELECT id, email, tenant_id, role FROM users');
        console.log('Users in database:', users.rows);
    } catch (error: any) {
        console.error('Error checking users:', error.message);
    } finally {
        await closePool();
    }
}

checkUsers();
