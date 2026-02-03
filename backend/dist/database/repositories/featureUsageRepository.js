"use strict";
/**
 * Feature Usage Repository
 * Track daily/monthly feature usage for limits enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureUsageRepository = void 0;
const connection_1 = require("../connection");
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
class FeatureUsageRepository {
    /**
     * Record feature usage (increment counter)
     */
    async recordUsage(botId, userId, featureKey) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        // Try to update existing record
        const updateStmt = connection_1.db.prepare(`
            UPDATE feature_usage 
            SET usage_count = usage_count + 1, updated_at = ?
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? AND usage_date = ?
        `);
        const result = updateStmt.run(new Date().toISOString(), botId, userId, featureKey, today);
        // If no record exists, create new one
        if (result.changes === 0) {
            const id = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            const insertStmt = connection_1.db.prepare(`
                INSERT INTO feature_usage (id, bot_id, user_id, feature_key, usage_date, usage_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `);
            insertStmt.run(id, botId, userId, featureKey, today, now, now);
        }
        logger_1.logger.debug('Feature usage recorded', { bot_id: botId, user_id: userId, feature_key: featureKey });
    }
    /**
     * Get daily usage (today)
     */
    async getDailyUsage(botId, userId, featureKey) {
        const today = new Date().toISOString().split('T')[0];
        const stmt = connection_1.db.prepare(`
            SELECT usage_count FROM feature_usage
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? AND usage_date = ?
        `);
        const result = stmt.get(botId, userId, featureKey, today);
        return result?.usage_count || 0;
    }
    /**
     * Get monthly usage (current month)
     */
    async getMonthlyUsage(botId, userId, featureKey) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const stmt = connection_1.db.prepare(`
            SELECT SUM(usage_count) as total FROM feature_usage
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? 
            AND usage_date LIKE ?
        `);
        const result = stmt.get(botId, userId, featureKey, `${yearMonth}%`);
        return result?.total || 0;
    }
    /**
     * Get usage stats (daily + monthly)
     */
    async getUsageStats(botId, userId, featureKey) {
        const daily = await this.getDailyUsage(botId, userId, featureKey);
        const monthly = await this.getMonthlyUsage(botId, userId, featureKey);
        return { daily, monthly };
    }
    /**
     * Get all usage for a bot
     */
    async getUsageByBot(botId, startDate, endDate) {
        let query = 'SELECT * FROM feature_usage WHERE bot_id = ?';
        const params = [botId];
        if (startDate) {
            query += ' AND usage_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND usage_date <= ?';
            params.push(endDate);
        }
        query += ' ORDER BY usage_date DESC';
        const stmt = connection_1.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Get all usage for a user
     */
    async getUsageByUser(userId, startDate, endDate) {
        let query = 'SELECT * FROM feature_usage WHERE user_id = ?';
        const params = [userId];
        if (startDate) {
            query += ' AND usage_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND usage_date <= ?';
            params.push(endDate);
        }
        query += ' ORDER BY usage_date DESC';
        const stmt = connection_1.db.prepare(query);
        return stmt.all(...params);
    }
    /**
     * Reset daily usage (for cron job)
     * Note: We don't actually delete, we just let old records stay for analytics
     * The getDailyUsage only looks at today's date
     */
    async cleanupOldUsage(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        const stmt = connection_1.db.prepare('DELETE FROM feature_usage WHERE usage_date < ?');
        const result = stmt.run(cutoffDateStr);
        logger_1.logger.info('Old usage records cleaned up', { deleted: result.changes, cutoff_date: cutoffDateStr });
    }
    /**
     * Get feature usage summary for bot
     */
    async getUsageSummary(botId, featureKey) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        // Today's usage
        const todayStmt = connection_1.db.prepare(`
            SELECT COUNT(DISTINCT user_id) as users, SUM(usage_count) as total
            FROM feature_usage
            WHERE bot_id = ? AND feature_key = ? AND usage_date = ?
        `);
        const todayResult = todayStmt.get(botId, featureKey, today);
        // This month's usage
        const monthStmt = connection_1.db.prepare(`
            SELECT SUM(usage_count) as total
            FROM feature_usage
            WHERE bot_id = ? AND feature_key = ? AND usage_date LIKE ?
        `);
        const monthResult = monthStmt.get(botId, featureKey, `${yearMonth}%`);
        return {
            total_users: todayResult.users || 0,
            total_usage_today: todayResult.total || 0,
            total_usage_month: monthResult.total || 0,
        };
    }
    /**
     * Check if user has exceeded daily limit
     */
    async hasExceededDailyLimit(botId, userId, featureKey, limit) {
        const usage = await this.getDailyUsage(botId, userId, featureKey);
        return usage >= limit;
    }
    /**
     * Check if user has exceeded monthly limit
     */
    async hasExceededMonthlyLimit(botId, userId, featureKey, limit) {
        const usage = await this.getMonthlyUsage(botId, userId, featureKey);
        return usage >= limit;
    }
}
exports.featureUsageRepository = new FeatureUsageRepository();
//# sourceMappingURL=featureUsageRepository.js.map