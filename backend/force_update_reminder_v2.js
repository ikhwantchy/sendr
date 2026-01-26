
const { query } = require('./dist/database/connection');
const { initDatabase } = require('./dist/database/connection-sqlite');
const fs = require('fs');
const path = require('path');

async function forceUpdate() {
    try {
        await initDatabase();

        // Cek dulu data sekarang
        const check = await query("SELECT id, name, schedule FROM reminders WHERE name = 'TEST'");
        console.log('Current reminders named TEST:', JSON.stringify(check.rows, null, 2));

        const now = new Date();
        now.setMinutes(now.getMinutes() + 2);
        const mm = String(now.getMinutes()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const MM = String(now.getMonth() + 1).padStart(2, '0');

        const newSchedule = `${mm} ${hh} ${dd} ${MM} *`;
        console.log(`Setting schedule to: ${newSchedule}`);

        // Update SEMUA yang namanya TEST biar pasti kena salah satu ID-nya
        await query(`
            UPDATE reminders 
            SET schedule = ?, is_active = 1 
            WHERE name = 'TEST'
        `, [newSchedule]);

        const { saveDatabase } = require('./dist/database/connection-sqlite');
        saveDatabase();

        console.log('✅ Forced update and saved to disk');

        // Verifikasi file di disk
        const DB_PATH = path.join(__dirname, 'data/database.sqlite');
        if (fs.existsSync(DB_PATH)) {
            const stats = fs.statSync(DB_PATH);
            console.log(`DB File size: ${stats.size} bytes, Last modified: ${stats.mtime}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

forceUpdate();
