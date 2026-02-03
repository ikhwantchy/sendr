import { Request, Response, NextFunction } from 'express';
/**
 * API Key Authentication Middleware
 * Validates API keys from Authorization header
 */
declare global {
    namespace Express {
        interface Request {
            apiKey?: {
                id: string;
                user_id: string;
                permissions: any;
            };
        }
    }
}
/**
 * API Key authentication middleware
 * Expects: Authorization: Bearer sk_live_xxxxx
 */
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
/**
 * Check if API key has specific permission
 */
export declare const requirePermission: (permission: "read" | "write" | "admin") => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
/**
 * Optional API key auth (doesn't fail if no key provided)
 */
export declare const optionalApiKeyAuth: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=apiKeyAuth.d.ts.map