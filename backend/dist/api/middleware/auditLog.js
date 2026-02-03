"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = exports.auditLogMiddleware = void 0;
const auditLogService_1 = __importDefault(require("../../services/auditLogService"));
/**
 * Audit Log Middleware
 * Automatically logs all requests to audit_logs table
 */
// Extend Express Request to include user info
// Express Request type extension removed - already in auth.ts
/**
 * Audit log middleware - logs all requests
 */
const auditLogMiddleware = async (req, res, next) => {
    const startTime = Date.now();
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    res.json = function (body) {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Log after response is sent (async, non-blocking)
        setImmediate(() => {
            logRequest(req, statusCode, responseTime);
        });
        return originalJson(body);
    };
    next();
};
exports.auditLogMiddleware = auditLogMiddleware;
/**
 * Log the request to audit logs
 */
async function logRequest(req, statusCode, responseTime) {
    try {
        const method = req.method;
        const path = req.path;
        const userId = req.user?.id;
        // Determine action type and category based on path
        const { actionType, actionCategory, resourceType, resourceId } = parseRequestPath(path, method);
        // Skip logging for certain paths (health checks, static files, etc.)
        if (shouldSkipLogging(path)) {
            return;
        }
        // Create description
        const description = `${method} ${path}`;
        // Determine status
        const status = statusCode < 400 ? 'success' : 'failed';
        // Log to audit
        await auditLogService_1.default.log({
            user_id: userId,
            action_type: actionType,
            action_category: actionCategory,
            resource_type: resourceType,
            resource_id: resourceId,
            description,
            metadata: {
                method,
                path,
                status_code: statusCode,
                response_time_ms: responseTime,
                query: req.query,
                ip: req.ip
            },
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            status
        });
    }
    catch (error) {
        // Don't throw - audit logging should never break the app
        console.error('[AuditMiddleware] Failed to log request:', error);
    }
}
/**
 * Parse request path to determine action type and category
 */
function parseRequestPath(path, method) {
    // API endpoints
    if (path.startsWith('/api/')) {
        // Extract resource from path
        const parts = path.split('/').filter(p => p);
        // /api/bots/:id
        if (parts[1] === 'bots') {
            return {
                actionType: `bot.${method.toLowerCase()}`,
                actionCategory: 'bot',
                resourceType: 'bot',
                resourceId: parts[2]
            };
        }
        // /api/reminders/:id
        if (parts[1] === 'reminders') {
            return {
                actionType: `reminder.${method.toLowerCase()}`,
                actionCategory: 'reminder',
                resourceType: 'reminder',
                resourceId: parts[2]
            };
        }
        // /api/auto-replies/:id
        if (parts[1] === 'auto-replies') {
            return {
                actionType: `auto_reply.${method.toLowerCase()}`,
                actionCategory: 'bot',
                resourceType: 'auto_reply',
                resourceId: parts[2]
            };
        }
        // /api/admin/*
        if (parts[1] === 'admin') {
            const resource = parts[2];
            return {
                actionType: `${resource}.${method.toLowerCase()}`,
                actionCategory: 'settings',
                resourceType: resource,
                resourceId: parts[3]
            };
        }
        // /api/auth/*
        if (parts[1] === 'auth') {
            return {
                actionType: `auth.${parts[2] || method.toLowerCase()}`,
                actionCategory: 'user'
            };
        }
    }
    // Default
    return {
        actionType: `${method.toLowerCase()}.${path.replace(/\//g, '_')}`,
        actionCategory: 'system'
    };
}
/**
 * Determine if request should be skipped from logging
 */
function shouldSkipLogging(path) {
    const skipPaths = [
        '/health',
        '/ping',
        '/favicon.ico',
        '/static/',
        '/assets/',
        '/_next/',
        '/api/admin/system/health' // Don't log health checks
    ];
    return skipPaths.some(skipPath => path.startsWith(skipPath));
}
/**
 * Audit log for specific actions (use in controllers)
 */
const logAction = async (req, actionType, actionCategory, description, metadata, resourceType, resourceId) => {
    try {
        await auditLogService_1.default.log({
            user_id: req.user?.id,
            action_type: actionType,
            action_category: actionCategory,
            resource_type: resourceType,
            resource_id: resourceId,
            description,
            metadata,
            ip_address: req.ip,
            user_agent: req.get('user-agent'),
            status: 'success'
        });
    }
    catch (error) {
        console.error('[AuditMiddleware] Failed to log action:', error);
    }
};
exports.logAction = logAction;
//# sourceMappingURL=auditLog.js.map