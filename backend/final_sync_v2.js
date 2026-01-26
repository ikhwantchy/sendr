
const { initDatabase, query, saveDatabase } = require('./dist/database/connection-sqlite');

async function finalFixV2() {
    try {
        console.log('--- FINAL DATABASE SYNC FIX (V2) ---');
        await initDatabase();

        const id = '213af9e3-9a4c-4083-a3ce-95da24113c92';
        const newSchedule = '10 02 26 01 *'; // 02:10 AM

        console.log(`Setting schedule for ID ${id} to: ${newSchedule}`);

        const updateResult = await query("UPDATE reminders SET schedule = ?, is_active = 1 WHERE id = ?", [newSchedule, id]);
        console.log('Update result:', JSON.stringify(updateResult));

        // Explicitly check after update
        const check = await query("SELECT id, name, schedule FROM reminders WHERE id = ?", [id]);
        console.log('Current state in memory:', JSON.stringify(check.rows, null, 2));

        saveDatabase();
        console.log('✅ Changes flushed to database_v2.sqlite');

        process.exit(0);
    } catch (error) {
        console.error('❌ FATAL ERROR:', error);
        process.exit(1);
    }
}

finalFixV2();
