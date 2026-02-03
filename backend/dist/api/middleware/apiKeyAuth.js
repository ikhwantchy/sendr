"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalApiKeyAuth = exports.requirePermission = exports.apiKeyAuth = void 0;
const apiKeyService_1 = __importDefault(require("../../services/apiKeyService"));
/**
 * API Key authentication middleware
 * Expects: Authorization: Bearer sk_live_xxxxx
 */
const apiKeyAuth = async (req, res, next) => {
    try {
        // Get API key from Authorization header
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'API key required. Use: Authorization: Bearer <your_api_key>'
            });
        }
        const apiKey = authHeader.substring(7); // Remove 'Bearer '
        // Validate API key
        const validation = await apiKeyService_1.default.validateKey(apiKey, req.ip);
        if (!validation.valid) {
            return res.status(401).json({
                success: false,
                message: validation.error || 'Invalid API key'
            });
        }
        // Check rate limit
        const rateLimit = await apiKeyService_1.default.checkRateLimit(validation.key_id);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                message: 'Rate limit exceeded. Try again later.',
                retry_after: 3600 // 1 hour in seconds
            });
        }
        // Add rate limit headers
        res.set('X-RateLimit-Limit', '1000');
        res.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        res.set('X-RateLimit-Reset', new Date(Date.now() + 3600000).toISOString());
        // Attach API key info to request
        req.apiKey = {
            id: validation.key_id,
            user_id: validation.user_id,
            permissions: validation.permissions
        };
        // Also set user for audit logging
        req.user = {
            id: validation.user_id,
            tenant_id: 'api-tenant', // Placeholder
            email: 'api_key_user',
            role: 'API'
        };
        next();
    }
    catch (error) {
        console.error('[ApiKeyAuth] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};
exports.apiKeyAuth = apiKeyAuth;
/**
 * Check if API key has specific permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                message: 'API key required'
            });
        }
        const permissions = req.apiKey.permissions;
        // Admin has all permissions
        if (permissions.admin) {
            return next();
        }
        // Check specific permission
        if (!permissions[permission]) {
            return res.status(403).json({
                success: false,
                message: `This API key does not have '${permission}' permission`
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
/**
 * Optional API key auth (doesn't fail if no key provided)
 */
const optionalApiKeyAuth = async (req, res, next) => {
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No API key provided, continue without auth
        return next();
    }
    // API key provided, validate it
    return (0, exports.apiKeyAuth)(req, res, next);
};
exports.optionalApiKeyAuth = optionalApiKeyAuth;
//# sourceMappingURL=apiKeyAuth.js.map