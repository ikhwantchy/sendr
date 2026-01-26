import { Request, Response } from 'express';
import apiKeyService from '../../services/apiKeyService';

/**
 * API Keys Controller
 * Manages API key CRUD operations
 */

/**
 * GET /api/admin/api-keys
 * Get all API keys (admin) or user's keys
 */
export const getApiKeys = async (req: Request, res: Response) => {
    try {
        const userRole = req.user!.role.toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
        const userId = req.user!.id;

        let keys;
        if (isAdmin) {
            // Admin can see all keys
            keys = await apiKeyService.getAllKeys();
        } else {
            // Regular users see only their keys (by tenant)
            const tenantId = req.user!.tenant_id;
            keys = await apiKeyService.getUserKeys(tenantId);
        }

        res.json({
            success: true,
            keys
        });
    } catch (error: any) {
        console.error('[ApiKeys] Get keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch API keys',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/api-keys
 * Generate a new API key
 */
export const createApiKey = async (req: Request, res: Response) => {
    try {
        const { name, permissions, rate_limit, ip_whitelist, expires_at } = req.body;
        const userId = req.user!.id;
        const tenantId = req.user!.tenant_id;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'API key name is required'
            });
        }

        // Generate key
        const { key, key_id } = await apiKeyService.generateKey(tenantId, userId, name, permissions);

        // Update additional settings if provided
        if (rate_limit || ip_whitelist || expires_at) {
            await apiKeyService.updateKey(key_id, {
                rate_limit,
                ip_whitelist,
                expires_at
            }, userId);
        }

        res.json({
            success: true,
            message: 'API key created successfully',
            key, // Only shown once!
            key_id,
            warning: 'Save this key now! It will not be shown again.'
        });
    } catch (error: any) {
        console.error('[ApiKeys] Create key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create API key',
            error: error.message
        });
    }
};

/**
 * PUT /api/admin/api-keys/:id
 * Update API key settings
 */
export const updateApiKey = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user!.id;

        await apiKeyService.updateKey(id, updates, userId);

        res.json({
            success: true,
            message: 'API key updated successfully'
        });
    } catch (error: any) {
        console.error('[ApiKeys] Update key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update API key',
            error: error.message
        });
    }
};

/**
 * POST /api/admin/api-keys/:id/revoke
 * Revoke (deactivate) an API key
 */
export const revokeApiKey = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        await apiKeyService.revokeKey(id, userId);

        res.json({
            success: true,
            message: 'API key revoked successfully'
        });
    } catch (error: any) {
        console.error('[ApiKeys] Revoke key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke API key',
            error: error.message
        });
    }
};

/**
 * DELETE /api/admin/api-keys/:id
 * Delete an API key permanently
 */
export const deleteApiKey = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        await apiKeyService.deleteKey(id, userId);

        res.json({
            success: true,
            message: 'API key deleted successfully'
        });
    } catch (error: any) {
        console.error('[ApiKeys] Delete key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete API key',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/api-keys/:id/stats
 * Get usage statistics for an API key
 */
export const getApiKeyStats = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;

        const stats = await apiKeyService.getKeyStats(id, parseInt(days as string));

        res.json({
            success: true,
            stats
        });
    } catch (error: any) {
        console.error('[ApiKeys] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch API key stats',
            error: error.message
        });
    }
};
