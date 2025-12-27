/**
 * Database Migration Script
 * Run this to initialize the database
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pool, closePool } from './connection';
import { logger } from '../utils/logger';

async function runMigration() {
    try {
        logger.info('Starting database migration...');

        // Read schema file
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        // Execute schema
        await pool.query(schema);

        logger.info('✅ Database migration completed successfully');
        logger.info('📊 Tables created:');
        logger.info('  - tenants');
        logger.info('  - users');
        logger.info('  - bots');
        logger.info('  - keyword_rules');
        logger.info('  - data_sources');
        logger.info('  - reminders');
        logger.info('  - contacts');
        logger.info('  - campaigns');
        logger.info('  - campaign_logs');
        logger.info('  - event_logs');
        logger.info('  - messages');

        logger.info('');
        logger.info('🔐 Default credentials created:');
        logger.info('  Email: admin@example.com');
        logger.info('  Password: admin123');
        logger.info('  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');

    } catch (error: any) {
        logger.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await closePool();
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
