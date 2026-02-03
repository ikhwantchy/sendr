"use strict";
/**
 * Database Connection Pool
 * PostgreSQL connection using pg library
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.logActivity = logActivity;
exports.closePool = closePool;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wa_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
exports.pool = new pg_1.Pool(poolConfig);
// Test connection
exports.pool.on('connect', () => {
    logger_1.logger.info('Database connected');
});
exports.pool.on('error', (err) => {
    logger_1.logger.error('Unexpected database error', { error: err });
});
/**
 * Query helper with logging
 */
async function query(text, params) {
    const start = Date.now();
    try {
        // Automatically convert '?' placeholders to '$n' for Postgres compatibility
        let pgText = text;
        if (params && params.length > 0) {
            let index = 1;
            pgText = text.replace(/\?/g, () => `$${index++}`);
        }
        const result = await exports.pool.query(pgText, params);
        const duration = Date.now() - start;
        logger_1.logger.debug('Query executed', {
            text: pgText.substring(0, 100),
            duration_ms: duration,
            rows: result.rowCount,
        });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Query error', { error, text, params });
        throw error;
    }
}
/**
 * Transaction helper
 */
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
/**
 * Log activity for audit trail
 */
async function logActivity(type, message, metadata = {}) {
    try {
        await query(`INSERT INTO event_logs (tenant_id, event_type, event_data, context) 
             VALUES (?, ?, ?, ?)`, [
            metadata.tenant_id || '00000000-0000-0000-0000-000000000001',
            type,
            JSON.stringify({ message, ...metadata }),
            JSON.stringify({ source: 'system' })
        ]);
    }
    catch (error) {
        logger_1.logger.error('Failed to log activity to Postgres', { error });
    }
}
/**
 * Close pool (for graceful shutdown)
 */
async function closePool() {
    await exports.pool.end();
    logger_1.logger.info('Database pool closed');
}
//# sourceMappingURL=connection-postgres.js.map