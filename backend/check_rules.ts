import { query } from './src/database/connection';

async function check() {
    const botId = '4afd7ce0-9c62-4829-b8d4-d244acf1d87c';
    const rules = await query('SELECT * FROM keyword_rules WHERE bot_id = ?', [botId]);
    console.log(JSON.stringify(rules.rows, null, 2));
    process.exit(0);
}

check();
