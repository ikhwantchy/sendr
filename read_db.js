const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/database.sqlite');

db.all("SELECT id, name, ai_config FROM bots", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    rows.forEach(row => {
        console.log(`Bot: ${row.name} (${row.id})`);
        console.log(`Config: ${row.ai_config}`);
        console.log('---');
    });
    db.close();
});
