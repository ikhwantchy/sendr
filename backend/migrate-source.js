const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.sqlite');
const db = new sqlite3(dbPath);

console.log('Migrating database...');

try {
    // Add source column to messages table
    try {
        db.prepare("ALTER TABLE messages ADD COLUMN source TEXT DEFAULT 'auto_reply'").run();
        console.log('✅ Added source column to messages table');
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log('ℹ️ Column source already exists');
        } else {
            throw error;
        }
    }
} catch (error) {
    console.error('❌ Migration failed:', error);
}

db.close();
