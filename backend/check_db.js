const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function checkDb() {
    const SQL = await initSqlJs();
    const dataDir = path.join(__dirname, 'data');
    const dbPath = path.join(dataDir, 'database.sqlite');

    if (!fs.existsSync(dbPath)) {
        console.log('Database file not found at:', dbPath);
        return;
    }

    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('--- USERS ---');
    const users = db.exec("SELECT id, email, role, tenant_id FROM users");
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- BOTS ---');
    const bots = db.exec("SELECT id, name, tenant_id FROM bots");
    console.log(JSON.stringify(bots, null, 2));

    console.log('\n--- BOT PERMISSIONS ---');
    const perms = db.exec("SELECT * FROM bot_permissions");
    console.log(JSON.stringify(perms, null, 2));

    db.close();
}

checkDb().catch(console.error);
