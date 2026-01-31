import { logger } from '../utils/logger';
import { query as queryPg, transaction as transactionPg, closePool as closePoolPg, pool as poolPg } from './connection-postgres';
import { query as querySqlite, transaction as transactionSqlite, closePool as closePoolSqlite, logActivity as logActivitySqlite } from './connection-sqlite';

// Robust detection
const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
const isSqlite = dbType === 'sqlite' || dbType !== 'postgres';

logger.info(`🔌 Database Driver: ${isSqlite ? 'SQLite' : 'PostgreSQL'} (from ${process.env.DATABASE_TYPE || 'default'})`);

export async function query(text: string, params?: any[]) {
    if (isSqlite) {
        return querySqlite(text, params);
    }
    return queryPg(text, params);
}

// Transaction wrapper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (isSqlite) {
        return transactionSqlite(callback);
    }
    return transactionPg(callback);
}

export async function closePool(): Promise<void> {
    if (isSqlite) {
        return closePoolSqlite();
    }
    return closePoolPg();
}

// Export logActivity
export async function logActivity(type: 'bot' | 'rule' | 'campaign' | 'message' | 'error', message: string, metadata: any = {}) {
    if (isSqlite) {
        return logActivitySqlite(type, message, metadata);
    }
}

// Exports for backward compatibility and specific driver access
export { db } from './connection-sqlite';

// Mock pool for migrate scripts that expect pg pool
export const pool = isSqlite ? {
    query: async (text: string, params?: any[]) => {
        // migration runner sends "text" as object { text: string } sometimes or string
        const sql = typeof text === 'string' ? text : (text as any).text;
        const p = params || (text as any).values;
        return querySqlite(sql, p);
    },
    end: closePoolSqlite
} : poolPg;
