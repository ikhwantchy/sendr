const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Update admin/owner to ADMIN
    db.run(`UPDATE users SET role = 'ADMIN' WHERE LOWER(role) IN ('admin', 'owner')`, (err) => {
        if (err) console.error('Error updating admins:', err.message);
        else console.log('Admins updated to ADMIN');
    });

    // Update operator/viewer/user to USER
    db.run(`UPDATE users SET role = 'USER' WHERE LOWER(role) IN ('user', 'operator', 'viewer')`, (err) => {
        if (err) console.error('Error updating users:', err.message);
        else console.log('Users updated to USER');
    });
});

db.close();
