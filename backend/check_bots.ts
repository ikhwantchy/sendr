import { query } from './src/database/connection';

async function check() {
    const result = await query('SELECT id, name, phone_number, ai_config FROM bots');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
}

check();
