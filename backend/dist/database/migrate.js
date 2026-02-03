"use strict";
/**
 * Database Migration Script
 * Run this to initialize the database
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const connection_1 = require("./connection");
const logger_1 = require("../utils/logger");
async function runMigration() {
    try {
        logger_1.logger.info('Starting database migration...');
        // Check if we are using SQLite
        const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
        const isSqlite = dbType === 'sqlite' || dbType !== 'postgres';
        if (!isSqlite) {
            // Read schema file (PostgreSQL only)
            const schemaPath = (0, path_1.join)(__dirname, 'schema.sql');
            const schema = (0, fs_1.readFileSync)(schemaPath, 'utf-8');
            // Execute schema
            await (0, connection_1.query)(schema);
            logger_1.logger.info('✅ PostgreSQL database schema initialized');
        }
        else {
            // SQLite auto-initializes in connection-sqlite.ts, so we just run a dummy query to trigger it
            await (0, connection_1.query)('SELECT 1');
            logger_1.logger.info('✅ SQLite database auto-initialized');
        }
        logger_1.logger.info('✅ Database migration completed successfully');
        logger_1.logger.info('📊 Tables created:');
        logger_1.logger.info('  - tenants');
        logger_1.logger.info('  - users');
        logger_1.logger.info('  - bots');
        logger_1.logger.info('  - keyword_rules');
        logger_1.logger.info('  - data_sources');
        logger_1.logger.info('  - reminders');
        logger_1.logger.info('  - contacts');
        logger_1.logger.info('  - campaigns');
        logger_1.logger.info('  - campaign_logs');
        logger_1.logger.info('  - event_logs');
        logger_1.logger.info('  - messages');
        logger_1.logger.info('');
        logger_1.logger.info('🔐 Default credentials created:');
        logger_1.logger.info('  Email: admin@example.com');
        logger_1.logger.info('  Password: admin123');
        logger_1.logger.info('  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    }
    catch (error) {
        logger_1.logger.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await (0, connection_1.closePool)();
    }
}
// Run migration
runMigration()
    .then(() => {
    console.log('\n✅ Migration completed successfully\n');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Migration failed:', error.message, '\n');
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map