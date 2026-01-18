const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        // Initialize SQL.js
        const SQL = await initSqlJs();

        // Load database
        const dbPath = path.join(__dirname, 'data', 'database.sqlite');
        const buffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        console.log('✅ Database loaded');

        // Check if table exists
        const checkTable = db.exec(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='llm_allowed_targets'
        `);

        if (checkTable.length > 0 && checkTable[0].values.length > 0) {
            console.log('✅ Table llm_allowed_targets already exists');

            // Check columns
            const columns = db.exec(`PRAGMA table_info(llm_allowed_targets)`);
            console.log('\nExisting columns:');
            if (columns.length > 0) {
                columns[0].values.forEach(col => {
                    console.log(`  - ${col[1]} (${col[2]})`);
                });
            }

            // Check if new columns exist
            const hasConfigName = columns[0].values.some(col => col[1] === 'config_name');
            const hasIsEnabled = columns[0].values.some(col => col[1] === 'is_enabled');
            const hasLlmConfig = columns[0].values.some(col => col[1] === 'llm_config');

            if (!hasConfigName || !hasIsEnabled || !hasLlmConfig) {
                console.log('\n⚠️  Missing new columns, adding them...');

                if (!hasConfigName) {
                    db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN config_name TEXT`);
                    console.log('✅ Added config_name column');
                }

                if (!hasIsEnabled) {
                    db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN is_enabled INTEGER DEFAULT 1`);
                    console.log('✅ Added is_enabled column');
                }

                if (!hasLlmConfig) {
                    db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN llm_config TEXT DEFAULT '{}'`);
                    console.log('✅ Added llm_config column');
                }

                if (!columns[0].values.some(col => col[1] === 'last_used_at')) {
                    db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN last_used_at TIMESTAMP`);
                    console.log('✅ Added last_used_at column');
                }

                // Save database
                const data = db.export();
                fs.writeFileSync(dbPath, data);
                console.log('\n✅ Database saved with new columns');
            } else {
                console.log('\n✅ All required columns already exist');
            }
        } else {
            console.log('⚠️  Table does not exist, creating it...');

            // Run full migration
            const migrationSQL = fs.readFileSync(
                path.join(__dirname, 'src', 'database', 'migrations', '009_create_llm_allowed_targets.sql'),
                'utf8'
            );

            db.run(migrationSQL);
            console.log('✅ Table created');

            // Add new columns
            db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN config_name TEXT`);
            db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN is_enabled INTEGER DEFAULT 1`);
            db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN llm_config TEXT DEFAULT '{}'`);
            db.run(`ALTER TABLE llm_allowed_targets ADD COLUMN last_used_at TIMESTAMP`);
            console.log('✅ Added new columns');

            // Save database
            const data = db.export();
            fs.writeFileSync(dbPath, data);
            console.log('✅ Database saved');
        }

        db.close();
        console.log('\n🎉 Migration complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
