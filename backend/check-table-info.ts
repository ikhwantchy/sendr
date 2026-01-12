import { query, closePool } from './src/database/connection';

async function checkTableInfo() {
    try {
        const info = await query('PRAGMA table_info(bots)');
        console.log('Bots table info:', info.rows);
    } catch (error: any) {
        console.error('Error checking table info:', error.message);
    } finally {
        await closePool();
    }
}

checkTableInfo();
