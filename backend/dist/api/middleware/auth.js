"use strict";
/**
 * Authentication Middleware
 * JWT-based authentication with RBAC
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireRole = requireRole;
exports.generateToken = generateToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../../utils/logger");
const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';
/**
 * Authenticate JWT token
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided',
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, getJwtSecret());
            // Persistent Session Validation
            const securityService = (await Promise.resolve().then(() => __importStar(require('../../services/securityService')))).default;
            const isValid = await securityService.validateSession(token);
            if (!isValid) {
                logger_1.logger.warn('Session revoked or not found', { userId: decoded.id });
                return res.status(401).json({
                    success: false,
                    error: 'Session expired or revoked',
                });
            }
            req.user = decoded;
            next();
        }
        catch (error) {
            logger_1.logger.warn('Token validation failed', { error: error.message });
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Authentication error', { error: error.message });
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}
/**
 * Require specific roles
 */
function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
        }
        next();
    };
}
/**
 * Generate JWT token
 */
function generateToken(user) {
    return jsonwebtoken_1.default.sign(user, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
}
//# sourceMappingURL=auth.js.map