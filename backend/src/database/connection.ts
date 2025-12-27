/**
 * Database Connection Pool
 * PostgreSQL connection using pg library
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const poolConfig: PoolConfig = {
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

export const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
    logger.info('Database connected');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', { error: err });
});

/**
 * Query helper with logging
 */
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;

        logger.debug('Query executed', {
            text: text.substring(0, 100),
            duration_ms: duration,
            rows: result.rowCount,
        });

        return result;
    } catch (error) {
        logger.error('Query error', { error, text, params });
        throw error;
    }
}

/**
 * Transaction helper
 */
export async function transaction<T>(
    callback: (client: any) => Promise<T>
): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Close pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
    await pool.end();
    logger.info('Database pool closed');
}
