"use strict";
/**
 * Permission Middleware
 * Checks if user has required permissions for bot operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBotIds = exports.checkBotAccess = exports.requireOwner = void 0;
const connection_1 = require("../../database/connection");
/**
 * Check if user is owner
 */
const requireOwner = (req, res, next) => {
    const role = req.user.role?.toLowerCase();
    if (role !== 'admin' && role !== 'owner') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};
exports.requireOwner = requireOwner;
/**
 * Check if user has access to bot
 * @param {string} action - Required action (view, edit, delete, create_campaign, create_rule, view_analytics)
 */
const checkBotAccess = (action) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const botId = req.params.botId || req.body.bot_id || req.body.botId;
            if (!botId) {
                return res.status(400).json({
                    success: false,
                    error: 'Bot ID is required'
                });
            }
            // Admin has full access to all bots
            const role = req.user.role?.toLowerCase();
            if (role === 'admin' || role === 'owner') {
                return next();
            }
            // Check if user has permission
            const permission = await (0, connection_1.query)(`SELECT * FROM bot_permissions 
         WHERE bot_id = ? AND user_id = ?`, [botId, userId]);
            if (permission.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'No access to this bot'
                });
            }
            const userPermission = permission.rows[0];
            // Check specific action permission
            let hasPermission = false;
            switch (action) {
                case 'view':
                    hasPermission = !!userPermission.can_view;
                    break;
                case 'edit':
                    hasPermission = !!userPermission.can_edit;
                    break;
                case 'delete':
                    hasPermission = !!userPermission.can_delete;
                    break;
                case 'create_campaign':
                    hasPermission = !!userPermission.can_create_campaigns;
                    break;
                case 'create_rule':
                    hasPermission = !!userPermission.can_create_rules;
                    break;
                case 'view_analytics':
                    hasPermission = !!userPermission.can_view_analytics;
                    break;
                case 'use_reminders':
                    hasPermission = !!userPermission.can_use_reminders;
                    break;
                case 'use_ai':
                    hasPermission = !!userPermission.can_use_ai;
                    break;
                case 'manage_contacts':
                    hasPermission = !!userPermission.can_manage_contacts;
                    break;
                case 'manage_datasources':
                    hasPermission = !!userPermission.can_manage_datasources;
                    break;
                default:
                    hasPermission = false;
            }
            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: `No permission to ${action} this bot`
                });
            }
            // Attach permission to request for later use
            req.botPermission = userPermission;
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check permissions'
            });
        }
    };
};
exports.checkBotAccess = checkBotAccess;
/**
 * Get user's accessible bot IDs
 */
const getUserBotIds = async (userId, userRole) => {
    try {
        // Admin has access to all bots
        const role = userRole?.toLowerCase();
        if (role === 'admin' || role === 'owner') {
            const result = await (0, connection_1.query)('SELECT id FROM bots');
            return result.rows.map((row) => row.id);
        }
        // Get bots user has permission to view
        const result = await (0, connection_1.query)(`SELECT DISTINCT bot_id FROM bot_permissions 
       WHERE user_id = ? AND can_view = 1`, [userId]);
        return result.rows.map((row) => row.bot_id);
    }
    catch (error) {
        console.error('Error getting user bot IDs:', error);
        return [];
    }
};
exports.getUserBotIds = getUserBotIds;
//# sourceMappingURL=checkPermission.js.map