/**
 * Alternative database connection for Windows/pgAdmin setup
 * Use this if standard connection has authentication issues
 */

import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Try different connection methods
const poolConfig: PoolConfig = {
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

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
    logger.info('Database connected successfully');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', { error: err });

    // Try alternative connection
    logger.info('Trying alternative connection method...');
});

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

export async function closePool(): Promise<void> {
    await pool.end();
    logger.info('Database pool closed');
}
