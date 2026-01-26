
const { query } = require('./dist/database/connection');
const { initDatabase } = require('./dist/database/connection-sqlite');

async function forceUpdate() {
    try {
        await initDatabase();

        // Cek dulu data sekarang
        const check = await query("SELECT id, name, schedule FROM reminders WHERE name = 'TEST'");
        console.log('Current reminders named TEST:', JSON.stringify(check.rows, null, 2));

        // Set ke jam 01:55
        const newSchedule = `55 01 26 01 *`;
        console.log(`Setting schedule to: ${newSchedule}`);

        await query(`
            UPDATE reminders 
            SET schedule = ?, is_active = 1 
            WHERE name = 'TEST'
        `, [newSchedule]);

        const { saveDatabase } = require('./dist/database/connection-sqlite');
        saveDatabase();

        console.log('✅ Forced update and saved to disk');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

forceUpdate();
