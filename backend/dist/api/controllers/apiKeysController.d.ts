import { Request, Response } from 'express';
/**
 * API Keys Controller
 * Manages API key CRUD operations
 */
/**
 * GET /api/admin/api-keys
 * Get all API keys (admin) or user's keys
 */
export declare const getApiKeys: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/api-keys
 * Generate a new API key
 */
export declare const createApiKey: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PUT /api/admin/api-keys/:id
 * Update API key settings
 */
export declare const updateApiKey: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/admin/api-keys/:id/revoke
 * Revoke (deactivate) an API key
 */
export declare const revokeApiKey: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/admin/api-keys/:id
 * Delete an API key permanently
 */
export declare const deleteApiKey: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/api-keys/:id/stats
 * Get usage statistics for an API key
 */
export declare const getApiKeyStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=apiKeysController.d.ts.map