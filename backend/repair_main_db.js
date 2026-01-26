
const { initDatabase, query, saveDatabase } = require('./dist/database/connection-sqlite');
const fs = require('fs');
const path = require('path');

async function repair() {
    try {
        console.log('--- REPAIRING DATABASE.SQLITE ---');
        // Fix: Make sure it points to database.sqlite
        const dbPath = path.resolve(__dirname, 'data/database.sqlite');
        console.log('Target DB Path:', dbPath);

        await initDatabase();

        const id = '213af9e3-9a4c-4083-a3ce-95da24113c92';
        const newSchedule = '28 02 26 01 *'; // 02:28 AM

        console.log(`Setting schedule for ID ${id} to: ${newSchedule}`);

        await query("UPDATE reminders SET schedule = ?, is_active = 1 WHERE id = ?", [newSchedule, id]);

        // Final verification
        const check = await query("SELECT id, name, schedule FROM reminders WHERE id = ?", [id]);
        console.log('VERIFIED IN MEMORY:', JSON.stringify(check.rows, null, 2));

        saveDatabase();
        console.log('✅ PERSISTED TO DISK');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

repair();
