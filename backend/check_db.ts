import { query } from './src/database/connection';
import { logger } from './src/utils/logger';

async function check() {
    try {
        const tables = await query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', tables.rows.map((r: any) => r.name));

        try {
            const columns = await query("PRAGMA table_info(bots)");
            console.log('Bots columns:', columns.rows.map((c: any) => c.name));
        } catch (e) { }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
