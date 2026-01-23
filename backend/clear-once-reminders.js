const { query } = require('./src/database/connection-sqlite');

/**
 * Check if a cron expression represents a "once" execution
 */
function isOnceCron(cronExpression) {
    if (!cronExpression || cronExpression === 'now') return true;

    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [minute, hour, day, month, dayOfWeek] = parts;

    // If both day AND month are specific numbers (not wildcards), it's a "once" reminder
    const hasSpecificDay = day !== '*' && !day.includes('/') && !day.includes('-') && !day.includes(',');
    const hasSpecificMonth = month !== '*' && !month.includes('/') && !month.includes('-') && !month.includes(',');

    return hasSpecificDay && hasSpecificMonth;
}

async function clearOnceRemindersNextRun() {
    try {
        const result = await query('SELECT id, name, schedule, next_run_at FROM reminders WHERE is_active = 1');

        console.log('--- Checking Reminders ---');
        let clearedCount = 0;

        for (const reminder of result.rows) {
            if (isOnceCron(reminder.schedule)) {
                if (reminder.next_run_at) {
                    await query('UPDATE reminders SET next_run_at = NULL WHERE id = ?', [reminder.id]);
                    console.log(`📭 Cleared: "${reminder.name}" (${reminder.schedule})`);
                    clearedCount++;
                } else {
                    console.log(`✅ Already cleared: "${reminder.name}" (${reminder.schedule})`);
                }
            } else {
                console.log(`⏰ Kept: "${reminder.name}" (${reminder.schedule}) - Next: ${reminder.next_run_at}`);
            }
        }

        console.log(`\n✅ Done! Cleared ${clearedCount} "Once" reminders.`);
    } catch (err) {
        console.error('Error:', err);
    }
}

clearOnceRemindersNextRun();
