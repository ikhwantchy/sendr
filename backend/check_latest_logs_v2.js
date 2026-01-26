
const { query } = require('./dist/database/connection');
const { initDatabase } = require('./dist/database/connection-sqlite');

async function checkLatestLogs() {
    try {
        await initDatabase();
        const logs = await query(`
            SELECT * FROM reminder_logs 
            ORDER BY executed_at DESC 
            LIMIT 5
        `);
        console.log('--- LATEST LOGS ---');
        console.log(JSON.stringify(logs.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLatestLogs();
