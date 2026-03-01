import { query } from '../src/database/connection-sqlite';

async function check() {
    try {
        const msgs = await query(`SELECT id, name, status, adapter_type, phone_number FROM bots`);
        console.table(msgs.rows);
    } catch (e) {
        console.error(e);
    }
}
check();
