
const { initDatabase, query, saveDatabase } = require('./dist/database/connection-sqlite');

async function finalFix() {
    try {
        await initDatabase();
        const id = '213af9e3-9a4c-4083-a3ce-95da24113c92';
        const newSchedule = '03 02 26 01 *'; // 02:03 AM

        console.log(`Setting schedule to: ${newSchedule}`);
        await query("UPDATE reminders SET schedule = ?, is_active = 1 WHERE id = ?", [newSchedule, id]);

        // Force save and WAIT
        saveDatabase();
        console.log('✅ Changes saved to disk.');

        // Wait a bit to ensure FS sync
        await new Promise(r => setTimeout(r, 2000));

        // Verify one last time from a FRESH load
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

finalFix();
