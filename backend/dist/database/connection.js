"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.db = void 0;
exports.query = query;
exports.transaction = transaction;
exports.closePool = closePool;
exports.logActivity = logActivity;
const logger_1 = require("../utils/logger");
const connection_postgres_1 = require("./connection-postgres");
const connection_sqlite_1 = require("./connection-sqlite");
// Robust detection
const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
const isSqlite = dbType === 'sqlite' || dbType !== 'postgres';
logger_1.logger.info(`🔌 Database Driver: ${isSqlite ? 'SQLite' : 'PostgreSQL'} (from ${process.env.DATABASE_TYPE || 'default'})`);
async function query(text, params) {
    if (isSqlite) {
        return (0, connection_sqlite_1.query)(text, params);
    }
    return (0, connection_postgres_1.query)(text, params);
}
// Transaction wrapper
async function transaction(callback) {
    if (isSqlite) {
        return (0, connection_sqlite_1.transaction)(callback);
    }
    return (0, connection_postgres_1.transaction)(callback);
}
async function closePool() {
    if (isSqlite) {
        return (0, connection_sqlite_1.closePool)();
    }
    return (0, connection_postgres_1.closePool)();
}
// Export logActivity
async function logActivity(type, message, metadata = {}) {
    if (isSqlite) {
        return (0, connection_sqlite_1.logActivity)(type, message, metadata);
    }
}
// Exports for backward compatibility and specific driver access
var connection_sqlite_2 = require("./connection-sqlite");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return connection_sqlite_2.db; } });
// Mock pool for migrate scripts that expect pg pool
exports.pool = isSqlite ? {
    query: async (text, params) => {
        // migration runner sends "text" as object { text: string } sometimes or string
        const sql = typeof text === 'string' ? text : text.text;
        const p = params || text.values;
        return (0, connection_sqlite_1.query)(sql, p);
    },
    end: connection_sqlite_1.closePool
} : connection_postgres_1.pool;
//# sourceMappingURL=connection.js.map