/**
 * Quick diagnostic script to check messages table
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'brobot.db');

console.log('🔍 Checking database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Database connected');
});

// Check if messages table exists
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'", (err, row) => {
    if (err) {
        console.error('❌ Error checking table:', err.message);
        db.close();
        return;
    }

    if (!row) {
        console.log('❌ Table "messages" does NOT exist');
        console.log('📝 You need to run migrations to create the table');
        db.close();
        return;
    }

    console.log('✅ Table "messages" exists');

    // Count messages
    db.get("SELECT COUNT(*) as count FROM messages", (err, result) => {
        if (err) {
            console.error('❌ Error counting messages:', err.message);
            db.close();
            return;
        }

        console.log(`📊 Total messages in database: ${result.count}`);

        // Count outbound messages
        db.get("SELECT COUNT(*) as count FROM messages WHERE direction = 'outbound'", (err, result) => {
            if (err) {
                console.error('❌ Error counting outbound messages:', err.message);
                db.close();
                return;
            }

            console.log(`📤 Outbound messages: ${result.count}`);

            // Show recent messages
            db.all("SELECT id, bot_id, direction, message_type, content, created_at FROM messages ORDER BY created_at DESC LIMIT 5", (err, rows) => {
                if (err) {
                    console.error('❌ Error fetching messages:', err.message);
                    db.close();
                    return;
                }

                if (rows.length > 0) {
                    console.log('\n📋 Recent messages:');
                    rows.forEach((row, i) => {
                        console.log(`${i + 1}. [${row.direction}] ${row.message_type}: ${row.content?.substring(0, 50)}... (${row.created_at})`);
                    });
                } else {
                    console.log('\n📋 No messages found in database');
                }

                db.close();
                console.log('\n✅ Diagnostic complete');
            });
        });
    });
});
