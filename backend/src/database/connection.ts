import { query as queryPg, transaction as transactionPg, closePool as closePoolPg } from './connection-postgres';
import { query as querySqlite, transaction as transactionSqlite, closePool as closePoolSqlite } from './connection-sqlite';

const isSqlite = process.env.DATABASE_TYPE === 'sqlite';

// Re-export pool for legacy compatibility (Postgres only)
export const pool = isSqlite ? ({} as any) : require('./connection-postgres').pool;

// Re-export db for legacy compatibility (SQLite only) - Placeholder
export const db = isSqlite ? (require('./connection-sqlite').db || {}) : ({} as any);

export async function query(text: string, params?: any[]) {
    if (isSqlite) {
        return querySqlite(text, params);
    }
    return queryPg(text, params);
}

// Transaction wrapper is tricky because callback expects specific client type
// Ideally we should unify client interface
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
