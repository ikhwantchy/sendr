import { logger } from '../utils/logger';
import { query as queryPg, transaction as transactionPg, closePool as closePoolPg } from './connection-postgres';
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

// Export logActivity (SQLite only for now)
export async function logActivity(type: 'bot' | 'rule' | 'campaign' | 'message' | 'error', message: string, metadata: any = {}) {
    if (isSqlite) {
        return logActivitySqlite(type, message, metadata);
    }
    // For postgres, we can add implementation later if needed
}
