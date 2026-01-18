
import { query } from './src/database/connection';

async function check() {
    const botId = 'cdff9c0d-fa62-4392-acc6-cdc52db5eb39';
    try {
        const bot = await query('SELECT id, name, status, ai_config, lid FROM bots WHERE id = ?', [botId]);
        console.log('--- Bot Info ---');
        console.log(JSON.stringify(bot.rows, null, 2));

        const allowed = await query('SELECT * FROM llm_allowed_targets WHERE bot_id = ?', [botId]);
        console.log('--- LLM Allowed Targets ---');
        console.log(JSON.stringify(allowed.rows, null, 2));

        const groups = await query('SELECT * FROM wa_groups WHERE bot_id = ?', [botId]);
        console.log('--- Bot Groups ---');
        console.log(JSON.stringify(groups.rows, null, 2));
    } catch (err) {
        console.error('Error during check:', err);
    }
    process.exit(0);
}

check().catch(console.error);
