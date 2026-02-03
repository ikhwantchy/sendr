/**
 * Database Connection Pool
 * PostgreSQL connection using pg library
 */
export declare const pool: any;
/**
 * Query helper with logging
 */
export declare function query(text: string, params?: any[]): Promise<any>;
/**
 * Transaction helper
 */
export declare function transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
/**
 * Log activity for audit trail
 */
export declare function logActivity(type: string, message: string, metadata?: any): Promise<void>;
/**
 * Close pool (for graceful shutdown)
 */
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection-postgres.d.ts.map