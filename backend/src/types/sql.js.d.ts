declare module 'sql.js' {
    export interface Database {
        run(sql: string): void;
        prepare(sql: string): Statement;
        export(): Uint8Array;
        close(): void;
    }

    export interface Statement {
        bind(params?: any[]): void;
        step(): boolean;
        getAsObject(): any;
        free(): void;
    }

    export interface SqlJsStatic {
        Database: new (data?: Uint8Array) => Database;
    }

    export default function initSqlJs(): Promise<SqlJsStatic>;
}
