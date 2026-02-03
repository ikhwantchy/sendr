/**
 * Alternative database connection for Windows/pgAdmin setup
 * Use this if standard connection has authentication issues
 */
export declare const pool: any;
export declare function query(text: string, params?: any[]): Promise<any>;
export declare function transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=connection-override.d.ts.map