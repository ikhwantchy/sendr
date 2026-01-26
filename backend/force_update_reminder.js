
const { query } = require('./dist/database/connection');
const { initDatabase } = require('./dist/database/connection-sqlite');

async function forceUpdate() {
    try {
        await initDatabase();
        const now = new Date();
        now.setMinutes(now.getMinutes() + 3);
        const mm = String(now.getMinutes()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const MM = String(now.getMonth() + 1).padStart(2, '0');

        const newSchedule = `${mm} ${hh} ${dd} ${MM} *`;
        console.log(`Setting schedule to: ${newSchedule}`);

        await query(`
            UPDATE reminders 
            SET schedule = ?, is_active = 1 
            WHERE id = '213af9e3-9a4c-4083-a3ce-95da24113c92'
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
