"use strict";
/**
 * Feature Access Middleware
 * Guards routes based on feature permissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBotOwnerOrAdmin = exports.requireAdmin = exports.trackFeatureUsage = exports.requireFeature = void 0;
const botUserRepository_1 = require("../../database/repositories/botUserRepository");
const featurePermissionRepository_1 = require("../../database/repositories/featurePermissionRepository");
const featureUsageRepository_1 = require("../../database/repositories/featureUsageRepository");
const logger_1 = require("../../utils/logger");
/**
 * Middleware to check if user has access to a specific feature
 */
const requireFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            const { botId } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized - user not authenticated',
                });
            }
            if (!botId) {
                return res.status(400).json({
                    success: false,
                    error: 'Bot ID is required',
                });
            }
            // Admin bypass - admins have access to all features
            if (req.user?.role === 'ADMIN') {
                logger_1.logger.debug('Admin bypass for feature access', { user_id: userId, feature_key: featureKey });
                return next();
            }
            // Check if user has access to this bot
            const botUser = await botUserRepository_1.botUserRepository.findByBotAndUser(botId, userId);
            if (!botUser || !botUser.is_active) {
                logger_1.logger.warn('User does not have access to bot', { user_id: userId, bot_id: botId });
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this bot',
                    code: 'BOT_ACCESS_DENIED',
                });
            }
            // Check if feature is enabled for user
            const permission = await featurePermissionRepository_1.featurePermissionRepository.findByBotUserFeature(botId, userId, featureKey);
            if (!permission || !permission.is_enabled) {
                logger_1.logger.warn('Feature not enabled for user', {
                    user_id: userId,
                    bot_id: botId,
                    feature_key: featureKey
                });
                return res.status(403).json({
                    success: false,
                    error: `Feature '${featureKey}' is not enabled for you`,
                    code: 'FEATURE_NOT_ENABLED',
                    feature_key: featureKey,
                });
            }
            // Check daily limit
            if (permission.daily_limit !== null) {
                const dailyUsage = await featureUsageRepository_1.featureUsageRepository.getDailyUsage(botId, userId, featureKey);
                if (dailyUsage >= permission.daily_limit) {
                    logger_1.logger.warn('Daily limit exceeded', {
                        user_id: userId,
                        bot_id: botId,
                        feature_key: featureKey,
                        limit: permission.daily_limit,
                        usage: dailyUsage,
                    });
                    return res.status(429).json({
                        success: false,
                        error: 'Daily limit exceeded for this feature',
                        code: 'DAILY_LIMIT_EXCEEDED',
                        limit: permission.daily_limit,
                        usage: dailyUsage,
                    });
                }
            }
            // Check monthly limit
            if (permission.monthly_limit !== null) {
                const monthlyUsage = await featureUsageRepository_1.featureUsageRepository.getMonthlyUsage(botId, userId, featureKey);
                if (monthlyUsage >= permission.monthly_limit) {
                    logger_1.logger.warn('Monthly limit exceeded', {
                        user_id: userId,
                        bot_id: botId,
                        feature_key: featureKey,
                        limit: permission.monthly_limit,
                        usage: monthlyUsage,
                    });
                    return res.status(429).json({
                        success: false,
                        error: 'Monthly limit exceeded for this feature',
                        code: 'MONTHLY_LIMIT_EXCEEDED',
                        limit: permission.monthly_limit,
                        usage: monthlyUsage,
                    });
                }
            }
            // Get current usage stats
            const usageStats = await featureUsageRepository_1.featureUsageRepository.getUsageStats(botId, userId, featureKey);
            // Attach permission and usage to request for later use
            req.featurePermission = permission;
            req.featureUsage = usageStats;
            logger_1.logger.debug('Feature access granted', {
                user_id: userId,
                bot_id: botId,
                feature_key: featureKey,
                daily_usage: usageStats.daily,
                monthly_usage: usageStats.monthly,
            });
            next();
        }
        catch (error) {
            logger_1.logger.error('Error in feature access middleware', { error, feature_key: featureKey });
            return res.status(500).json({
                success: false,
                error: 'Internal server error while checking feature access',
            });
        }
    };
};
exports.requireFeature = requireFeature;
/**
 * Middleware to track feature usage after successful operation
 */
const trackFeatureUsage = (featureKey) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        // Override send function to track usage on successful response
        res.send = function (data) {
            // Only track if response was successful (2xx status code)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const { botId } = req.params;
                const userId = req.user?.id;
                if (botId && userId) {
                    // Track usage asynchronously (don't wait for it)
                    featureUsageRepository_1.featureUsageRepository.recordUsage(botId, userId, featureKey)
                        .then(() => {
                        logger_1.logger.debug('Feature usage tracked', {
                            user_id: userId,
                            bot_id: botId,
                            feature_key: featureKey,
                        });
                    })
                        .catch((error) => {
                        logger_1.logger.error('Failed to track feature usage', {
                            error,
                            user_id: userId,
                            bot_id: botId,
                            feature_key: featureKey,
                        });
                    });
                }
            }
            // Call original send
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.trackFeatureUsage = trackFeatureUsage;
/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        logger_1.logger.warn('Admin access denied', { user_id: req.user?.id });
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED',
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
/**
 * Middleware to check bot ownership or admin
 */
const requireBotOwnerOrAdmin = async (req, res, next) => {
    try {
        const { botId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }
        // Admin bypass
        if (req.user?.role === 'ADMIN') {
            return next();
        }
        // Check if user has access to bot
        const botUser = await botUserRepository_1.botUserRepository.findByBotAndUser(botId, userId);
        if (!botUser || !botUser.is_active) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this bot',
                code: 'BOT_ACCESS_DENIED',
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in bot owner middleware', { error });
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
exports.requireBotOwnerOrAdmin = requireBotOwnerOrAdmin;
//# sourceMappingURL=featureAccess.js.map