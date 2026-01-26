
const { initDatabase, query, saveDatabase } = require('./dist/database/connection-sqlite');

async function forceUpdate() {
    try {
        await initDatabase();

        const id = '213af9e3-9a4c-4083-a3ce-95da24113c92';

        // 1. Cek Awal
        const r1 = await query("SELECT schedule FROM reminders WHERE id = ?", [id]);
        console.log('BEFORE UPDATE:', r1.rows[0].schedule);

        // 2. Update
        const newSchedule = '59 01 26 01 *';
        await query("UPDATE reminders SET schedule = ?, is_active = 1 WHERE id = ?", [newSchedule, id]);

        // 3. Cek Memori (Harusnya sudah berubah)
        const r2 = await query("SELECT schedule FROM reminders WHERE id = ?", [id]);
        console.log('AFTER UPDATE (MEMORY):', r2.rows[0].schedule);

        // 4. Save
        console.log('Saving to disk...');
        saveDatabase();

        // 5. Cek lagi (Harusnya tetap baru)
        const r3 = await query("SELECT schedule FROM reminders WHERE id = ?", [id]);
        console.log('AFTER SAVE (MEMORY):', r3.rows[0].schedule);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

forceUpdate();
