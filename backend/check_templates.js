
const { query } = require('./dist/database/connection');
const { initDatabase } = require('./dist/database/connection-sqlite');

async function checkReminders() {
    try {
        await initDatabase();
        const result = await query('SELECT id, name, schedule, template_config FROM reminders WHERE is_active = 1');
        console.log('--- ALL ACTIVE REMINDERS (TEMPLATE CONFIG) ---');
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkReminders();
