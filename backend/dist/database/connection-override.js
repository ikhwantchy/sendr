"use strict";
/**
 * Alternative database connection for Windows/pgAdmin setup
 * Use this if standard connection has authentication issues
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.closePool = closePool;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
// Try different connection methods
const poolConfig = {
    // Try localhost first
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wa_automation',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // Alternative: try 127.0.0.1 if localhost fails
    // host: '127.0.0.1',
    // Alternative: try different port if 5432 fails
    // port: 5433,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
};
exports.pool = new pg_1.Pool(poolConfig);
exports.pool.on('connect', () => {
    logger_1.logger.info('Database connected successfully');
});
exports.pool.on('error', (err) => {
    logger_1.logger.error('Unexpected database error', { error: err });
    // Try alternative connection
    logger_1.logger.info('Trying alternative connection method...');
});
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        logger_1.logger.debug('Query executed', {
            text: text.substring(0, 100),
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
async function closePool() {
    await exports.pool.end();
    logger_1.logger.info('Database pool closed');
}
//# sourceMappingURL=connection-override.js.map