/**
 * Feature Access Middleware
 * Guards routes based on feature permissions
 */
import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            featurePermission?: any;
            featureUsage?: {
                daily: number;
                monthly: number;
            };
        }
    }
}
/**
 * Middleware to check if user has access to a specific feature
 */
export declare const requireFeature: (featureKey: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to track feature usage after successful operation
 */
export declare const trackFeatureUsage: (featureKey: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to check if user is admin
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
/**
 * Middleware to check bot ownership or admin
 */
export declare const requireBotOwnerOrAdmin: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=featureAccess.d.ts.map