import { query as queryPg, transaction as transactionPg, closePool as closePoolPg } from './connection-postgres';
import { query as querySqlite, transaction as transactionSqlite, closePool as closePoolSqlite } from './connection-sqlite';

const isSqlite = process.env.DATABASE_TYPE === 'sqlite';

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
