/**
 * Feature Access Middleware
 * Guards routes based on feature permissions
 */

import { Request, Response, NextFunction } from 'express';
import { botUserRepository } from '../../database/repositories/botUserRepository';
import { featurePermissionRepository } from '../../database/repositories/featurePermissionRepository';
import { featureUsageRepository } from '../../database/repositories/featureUsageRepository';
import { logger } from '../../utils/logger';

// Extend Express Request to include feature permission
declare global {
    namespace Express {
        interface Request {
            featurePermission?: any;
            featureUsage?: { daily: number; monthly: number };
        }
    }
}

/**
 * Middleware to check if user has access to a specific feature
 */
export const requireFeature = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
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
            if (req.user?.role === 'admin') {
                logger.debug('Admin bypass for feature access', { user_id: userId, feature_key: featureKey });
                return next();
            }

            // Check if user has access to this bot
            const botUser = await botUserRepository.findByBotAndUser(botId, userId);

            if (!botUser || !botUser.is_active) {
                logger.warn('User does not have access to bot', { user_id: userId, bot_id: botId });
                return res.status(403).json({
                    success: false,
                    error: 'You do not have access to this bot',
                    code: 'BOT_ACCESS_DENIED',
                });
            }

            // Check if feature is enabled for user
            const permission = await featurePermissionRepository.findByBotUserFeature(
                botId,
                userId,
                featureKey
            );

            if (!permission || !permission.is_enabled) {
                logger.warn('Feature not enabled for user', {
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
                const dailyUsage = await featureUsageRepository.getDailyUsage(botId, userId, featureKey);

                if (dailyUsage >= permission.daily_limit) {
                    logger.warn('Daily limit exceeded', {
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
                const monthlyUsage = await featureUsageRepository.getMonthlyUsage(botId, userId, featureKey);

                if (monthlyUsage >= permission.monthly_limit) {
                    logger.warn('Monthly limit exceeded', {
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
            const usageStats = await featureUsageRepository.getUsageStats(botId, userId, featureKey);

            // Attach permission and usage to request for later use
            req.featurePermission = permission;
            req.featureUsage = usageStats;

            logger.debug('Feature access granted', {
                user_id: userId,
                bot_id: botId,
                feature_key: featureKey,
                daily_usage: usageStats.daily,
                monthly_usage: usageStats.monthly,
            });

            next();
        } catch (error) {
            logger.error('Error in feature access middleware', { error, feature_key: featureKey });
            return res.status(500).json({
                success: false,
                error: 'Internal server error while checking feature access',
            });
        }
    };
};

/**
 * Middleware to track feature usage after successful operation
 */
export const trackFeatureUsage = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function to track usage on successful response
        res.send = function (data: any): Response {
            // Only track if response was successful (2xx status code)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const { botId } = req.params;
                const userId = req.user?.id;

                if (botId && userId) {
                    // Track usage asynchronously (don't wait for it)
                    featureUsageRepository.recordUsage(botId, userId, featureKey)
                        .then(() => {
                            logger.debug('Feature usage tracked', {
                                user_id: userId,
                                bot_id: botId,
                                feature_key: featureKey,
                            });
                        })
                        .catch((error) => {
                            logger.error('Failed to track feature usage', {
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

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        logger.warn('Admin access denied', { user_id: req.user?.id });
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED',
        });
    }

    next();
};

/**
 * Middleware to check bot ownership or admin
 */
export const requireBotOwnerOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
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
        if (req.user?.role === 'admin') {
            return next();
        }

        // Check if user has access to bot
        const botUser = await botUserRepository.findByBotAndUser(botId, userId);

        if (!botUser || !botUser.is_active) {
            return res.status(403).json({
                success: false,
                error: 'You do not have access to this bot',
                code: 'BOT_ACCESS_DENIED',
            });
        }

        next();
    } catch (error) {
        logger.error('Error in bot owner middleware', { error });
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
