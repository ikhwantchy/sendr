/**
 * Permission Middleware
 * Checks if user has required permissions for bot operations
 */

const { query } = require('../database/connection');

/**
 * Check if user is owner
 */
const requireOwner = (req, res, next) => {
    if (req.user.role?.toLowerCase() !== 'owner') {
        return res.status(403).json({
            success: false,
            error: 'Owner access required'
        });
    }
    next();
};

/**
 * Check if user has access to bot
 * @param {string} action - Required action (view, edit, delete, create_campaign, create_rule, view_analytics)
 */
const checkBotAccess = (action) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const botId = req.params.botId || req.body.bot_id;

            if (!botId) {
                return res.status(400).json({
                    success: false,
                    error: 'Bot ID is required'
                });
            }

            // Owner has full access to all bots
            if (req.user.role?.toLowerCase() === 'owner') {
                return next();
            }

            // Check if user has permission
            const permission = await query(
                `SELECT * FROM bot_permissions 
         WHERE bot_id = ? AND user_id = ?`,
                [botId, userId]
            );

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
                    hasPermission = userPermission.can_view;
                    break;
                case 'edit':
                    hasPermission = userPermission.can_edit;
                    break;
                case 'delete':
                    hasPermission = userPermission.can_delete;
                    break;
                case 'create_campaign':
                    hasPermission = userPermission.can_create_campaigns;
                    break;
                case 'create_rule':
                    hasPermission = userPermission.can_create_rules;
                    break;
                case 'view_analytics':
                    hasPermission = userPermission.can_view_analytics;
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
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check permissions'
            });
        }
    };
};

/**
 * Get user's accessible bot IDs
 */
const getUserBotIds = async (userId, userRole) => {
    try {
        // Owner has access to all bots
        if (userRole?.toLowerCase() === 'owner') {
            const result = await query('SELECT id FROM bots');
            return result.rows.map(row => row.id);
        }

        // Get bots user has permission to view
        const result = await query(
            `SELECT DISTINCT bot_id FROM bot_permissions 
       WHERE user_id = ? AND can_view = true`,
            [userId]
        );

        return result.rows.map(row => row.bot_id);
    } catch (error) {
        console.error('Error getting user bot IDs:', error);
        return [];
    }
};

module.exports = {
    requireOwner,
    checkBotAccess,
    getUserBotIds
};
