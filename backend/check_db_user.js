const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkDb() {
    const SQL = await initSqlJs();
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'database.sqlite');

    if (!fs.existsSync(dbPath)) return;

    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('--- USER: User@example.com ---');
    const user = db.exec("SELECT id, email, role, tenant_id FROM users WHERE email = 'User@example.com'");
    console.log(JSON.stringify(user, null, 2));

    if (user[0] && user[0].values[0]) {
        const userId = user[0].values[0][0];
        console.log('\n--- PERMISSIONS FOR THIS USER ---');
        const perms = db.exec(`SELECT * FROM bot_permissions WHERE user_id = '${userId}'`);
        console.log(JSON.stringify(perms, null, 2));
    }

    db.close();
}

checkDb().catch(console.error);
