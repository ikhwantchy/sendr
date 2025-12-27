const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');

try {
    const db = new Database(dbPath, { readonly: true });

    console.log('========================================');
    console.log('  CHECKING RULES IN DATABASE');
    console.log('========================================');
    console.log('');

    // Get all rules
    const rules = db.prepare('SELECT * FROM keyword_rules').all();

    console.log(`Found ${rules.length} rules:`);
    console.log('');

    rules.forEach((rule, index) => {
        console.log(`Rule ${index + 1}:`);
        console.log('  ID:', rule.id);
        console.log('  Name:', rule.name);
        console.log('  Keyword:', rule.keyword);
        console.log('  Match Type:', rule.match_type);
        console.log('  Scope:', rule.scope);
        console.log('  Active:', rule.is_active === 1 ? 'YES' : 'NO');
        console.log('  Actions (raw):', rule.actions);
        console.log('');

        // Try to parse actions
        try {
            const actions = JSON.parse(rule.actions);
            console.log('  Actions (parsed):');
            actions.forEach((action, i) => {
                console.log(`    Action ${i + 1}:`);
                console.log('      Type:', action.type);
                console.log('      Config:', JSON.stringify(action.config));
            });
        } catch (e) {
            console.log('  ❌ FAILED TO PARSE ACTIONS!');
            console.log('  Error:', e.message);
        }
        console.log('');
        console.log('---');
        console.log('');
    });

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}
