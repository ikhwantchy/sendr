
const { query } = require('./src/database/connection');

async function checkBots() {
    try {
        const result = await query('SELECT id, name, phone_number, status, updated_at FROM bots');
        console.log('--- Bots Status ---');
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error('Error checking bots:', err);
    }
}

checkBots();
