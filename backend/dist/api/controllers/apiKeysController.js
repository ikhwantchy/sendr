"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApiKeyStats = exports.deleteApiKey = exports.revokeApiKey = exports.updateApiKey = exports.createApiKey = exports.getApiKeys = void 0;
const apiKeyService_1 = __importDefault(require("../../services/apiKeyService"));
/**
 * API Keys Controller
 * Manages API key CRUD operations
 */
/**
 * GET /api/admin/api-keys
 * Get all API keys (admin) or user's keys
 */
const getApiKeys = async (req, res) => {
    try {
        const userRole = req.user.role.toUpperCase();
        const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
        const userId = req.user.id;
        let keys;
        if (isAdmin) {
            // Admin can see all keys
            keys = await apiKeyService_1.default.getAllKeys();
        }
        else {
            // Regular users see only their keys (by tenant)
            const tenantId = req.user.tenant_id;
            keys = await apiKeyService_1.default.getUserKeys(tenantId);
        }
        res.json({
            success: true,
            keys
        });
    }
    catch (error) {
        console.error('[ApiKeys] Get keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch API keys',
            error: error.message
        });
    }
};
exports.getApiKeys = getApiKeys;
/**
 * POST /api/admin/api-keys
 * Generate a new API key
 */
const createApiKey = async (req, res) => {
    try {
        const { name, permissions, rate_limit, ip_whitelist, expires_at } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenant_id;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'API key name is required'
            });
        }
        // Generate key
        const { key, key_id } = await apiKeyService_1.default.generateKey(tenantId, userId, name, permissions);
        // Update additional settings if provided
        if (rate_limit || ip_whitelist || expires_at) {
            await apiKeyService_1.default.updateKey(key_id, {
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
    }
    catch (error) {
        console.error('[ApiKeys] Create key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create API key',
            error: error.message
        });
    }
};
exports.createApiKey = createApiKey;
/**
 * PUT /api/admin/api-keys/:id
 * Update API key settings
 */
const updateApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;
        await apiKeyService_1.default.updateKey(id, updates, userId);
        res.json({
            success: true,
            message: 'API key updated successfully'
        });
    }
    catch (error) {
        console.error('[ApiKeys] Update key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update API key',
            error: error.message
        });
    }
};
exports.updateApiKey = updateApiKey;
/**
 * POST /api/admin/api-keys/:id/revoke
 * Revoke (deactivate) an API key
 */
const revokeApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await apiKeyService_1.default.revokeKey(id, userId);
        res.json({
            success: true,
            message: 'API key revoked successfully'
        });
    }
    catch (error) {
        console.error('[ApiKeys] Revoke key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke API key',
            error: error.message
        });
    }
};
exports.revokeApiKey = revokeApiKey;
/**
 * DELETE /api/admin/api-keys/:id
 * Delete an API key permanently
 */
const deleteApiKey = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await apiKeyService_1.default.deleteKey(id, userId);
        res.json({
            success: true,
            message: 'API key deleted successfully'
        });
    }
    catch (error) {
        console.error('[ApiKeys] Delete key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete API key',
            error: error.message
        });
    }
};
exports.deleteApiKey = deleteApiKey;
/**
 * GET /api/admin/api-keys/:id/stats
 * Get usage statistics for an API key
 */
const getApiKeyStats = async (req, res) => {
    try {
        const { id } = req.params;
        const { days = 30 } = req.query;
        const stats = await apiKeyService_1.default.getKeyStats(id, parseInt(days));
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error('[ApiKeys] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch API key stats',
            error: error.message
        });
    }
};
exports.getApiKeyStats = getApiKeyStats;
//# sourceMappingURL=apiKeysController.js.map