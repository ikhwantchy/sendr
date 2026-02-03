export declare function query(text: string, params?: any[]): Promise<any>;
export declare function transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
export declare function closePool(): Promise<void>;
export declare function logActivity(type: 'bot' | 'rule' | 'campaign' | 'message' | 'error', message: string, metadata?: any): Promise<void>;
export { db } from './connection-sqlite';
export declare const pool: any;
//# sourceMappingURL=connection.d.ts.map