import { query, closePool } from './src/database/connection';

async function checkTenants() {
    try {
        const tenants = await query('SELECT * FROM tenants');
        console.log('Tenants:', tenants.rows);
    } catch (error: any) {
        console.error('Error checking tenants:', error.message);
    } finally {
        await closePool();
    }
}

checkTenants();
