const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./wa_automation.db');

db.all("SELECT id, name, status, sent_count, total_contacts FROM campaigns ORDER BY created_at DESC LIMIT 5", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("CAMPAIGNS:");
    console.table(rows);

    db.all("SELECT id, campaign_id, phone, status, sent_at, error FROM campaign_recipients ORDER BY created_at DESC LIMIT 5", [], (err, recipients) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("RECIPIENTS:");
        console.table(recipients);
        db.close();
    });
});
