const { query } = require('./src/database/connection-sqlite');

async function checkReminders() {
    try {
        const result = await query('SELECT id, name, schedule, next_run_at, is_active FROM reminders');
        console.log('--- Reminders Status ---');
        console.table(result.rows);

        const activeWithoutNextRun = result.rows.filter(r => r.is_active === 1 && !r.next_run_at && r.schedule !== 'now');
        if (activeWithoutNextRun.length > 0) {
            console.log(`⚠️ Found ${activeWithoutNextRun.length} active reminders missing next_run_at. Starting scheduler to fix them...`);
        } else {
            console.log('✅ All active reminders have a "Next Run" time calculated.');
        }
    } catch (err) {
        console.error('Check failed:', err);
    }
}

checkReminders();
