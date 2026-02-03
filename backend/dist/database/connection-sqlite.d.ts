/**
 * SQLite Database Connection
 * Simple file-based database - no setup required!
 */
interface BetterStatement {
    run(...params: any[]): {
        changes: number;
        lastInsertRowid: number | bigint;
    };
    get(...params: any[]): any;
    all(...params: any[]): any[];
}
export declare const db: {
    prepare(sql: string): BetterStatement;
    transaction: (fn: Function) => (...args: any[]) => any;
    exec: (sql: string) => void;
    readonly open: boolean;
};
export declare function initDatabase(): Promise<void>;
export declare function saveDatabase(): void;
export declare function query(sql: string, params?: any[]): Promise<any>;
export declare function transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export declare function logActivity(type: string, message: string, metadata?: any): Promise<void>;
export {};
//# sourceMappingURL=connection-sqlite.d.ts.map