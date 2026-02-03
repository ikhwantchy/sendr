"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAdminOrOwner = exports.requireAdmin = void 0;
/**
 * Admin Authentication Middleware
 * Ensures only admin users can access certain routes
 */
/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    // Check if user is admin or owner
    const role = req.user.role.toUpperCase();
    if (role !== 'ADMIN' && role !== 'OWNER') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Require admin or owner (user can access their own resources)
 */
const requireAdminOrOwner = (resourceUserIdField = 'user_id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Admin can access everything
        if (req.user.role.toUpperCase() === 'ADMIN' || req.user.role.toUpperCase() === 'OWNER') {
            return next();
        }
        // Check if user owns the resource
        const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
        if (resourceUserId && resourceUserId === req.user.id) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin or owner access required.'
        });
    };
};
exports.requireAdminOrOwner = requireAdminOrOwner;
/**
 * Require specific role(s)
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        const userRole = req.user.role.toUpperCase();
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=adminAuth.js.map