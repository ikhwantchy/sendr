import { query, closePool } from './src/database/connection';

async function checkBots() {
    try {
        const result = await query('SELECT count(*) as count FROM bots');
        console.log('Total bots in database:', result.rows[0].count);

        const bots = await query('SELECT id, name, tenant_id FROM bots LIMIT 5');
        console.log('Sample bots:', bots.rows);
    } catch (error: any) {
        console.error('Error checking bots:', error.message);
    } finally {
        await closePool();
    }
}

checkBots();
