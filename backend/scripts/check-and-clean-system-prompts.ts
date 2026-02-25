/**
 * Script: Check & Clean Footer from System Prompts in DB
 * 
 * Checks both:
 * 1. bots.ai_config (global systemPrompt)
 * 2. llm_allowed_targets.llm_config (per-target system_prompt overrides)
 * 
 * Run: cd backend && npx tsx scripts/check-and-clean-system-prompts.ts
 */

import { query } from '../src/database/connection';

const FOOTER_PATTERNS = [
    ' —— Automated Message powered by sendr.web.id',
    '\n—— Automated Message powered by sendr.web.id',
    '—— Automated Message powered by sendr.web.id',
    '\n\n\n—\nAutomated Message\npowered by sendr.web.id',
    '\n\n—\nAutomated System Randomizer\npowered by sendr.web.id',
    ' —— Automated System Randomizer powered by sendr.web.id',
    'Automated Message powered by sendr.web.id',
    'powered by sendr.web.id',
];

function stripFooters(text: string): { result: string; changed: boolean } {
    let result = text;
    let changed = false;
    for (const pattern of FOOTER_PATTERNS) {
        while (result.includes(pattern)) {
            result = result.replace(pattern, '');
            changed = true;
        }
    }
    return { result: result.trimEnd(), changed };
}

async function main() {
    console.log('🔍 Checking bots.ai_config (global system prompts)...\n');

    // 1. Check bots table
    const bots = await query('SELECT id, name, ai_config FROM bots WHERE ai_config IS NOT NULL', []);
    for (const bot of bots.rows) {
        const config = JSON.parse(bot.ai_config || '{}');
        const sp = config.systemPrompt || '';

        console.log(`\nBot: ${bot.name} (${bot.id})`);

        if (sp.includes('sendr.web.id') || sp.includes('Automated Message')) {
            console.log(`  ⚠️  FOUND FOOTER IN SYSTEM PROMPT!`);
            console.log(`  Snippet: ...${sp.substring(sp.length - 200)}`);

            const { result, changed } = stripFooters(sp);
            if (changed) {
                config.systemPrompt = result;
                await query('UPDATE bots SET ai_config = ? WHERE id = ?', [JSON.stringify(config), bot.id]);
                console.log(`  ✅ Cleaned!`);
            }
        } else {
            console.log(`  ✅ Clean`);
        }
    }

    console.log('\n\n🔍 Checking llm_allowed_targets.llm_config (per-target overrides)...\n');

    // 2. Check llm_allowed_targets table
    const targets = await query('SELECT id, bot_id, target_jid, llm_config FROM llm_allowed_targets WHERE llm_config IS NOT NULL', []);
    for (const target of targets.rows) {
        const config = JSON.parse(target.llm_config || '{}');
        const sp = config.system_prompt || config.systemPrompt || '';

        console.log(`\nTarget: ${target.target_jid} (bot: ${target.bot_id})`);

        if (sp.includes('sendr.web.id') || sp.includes('Automated Message')) {
            console.log(`  ⚠️  FOUND FOOTER IN SYSTEM PROMPT!`);
            console.log(`  Snippet: ...${sp.substring(sp.length - 200)}`);

            const { result, changed } = stripFooters(sp);
            if (changed) {
                if (config.system_prompt) config.system_prompt = result;
                if (config.systemPrompt) config.systemPrompt = result;
                await query('UPDATE llm_allowed_targets SET llm_config = ? WHERE id = ?', [JSON.stringify(config), target.id]);
                console.log(`  ✅ Cleaned!`);
            }
        } else {
            console.log(`  ✅ Clean`);
            console.log(`  System prompt preview: ${sp.substring(0, 100)}...`);
        }
    }

    console.log('\n\n🎉 Done checking all configs!\n');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
