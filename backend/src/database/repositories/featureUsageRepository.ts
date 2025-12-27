/**
 * Feature Usage Repository
 * Track daily/monthly feature usage for limits enforcement
 */

import { db } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface FeatureUsage {
    id: string;
    bot_id: string;
    user_id: string;
    feature_key: string;
    usage_date: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
}

export interface UsageStats {
    daily: number;
    monthly: number;
}

class FeatureUsageRepository {
    /**
     * Record feature usage (increment counter)
     */
    async recordUsage(botId: string, userId: string, featureKey: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Try to update existing record
        const updateStmt = db.prepare(`
            UPDATE feature_usage 
            SET usage_count = usage_count + 1, updated_at = ?
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? AND usage_date = ?
        `);

        const result = updateStmt.run(new Date().toISOString(), botId, userId, featureKey, today);

        // If no record exists, create new one
        if (result.changes === 0) {
            const id = uuidv4();
            const now = new Date().toISOString();

            const insertStmt = db.prepare(`
                INSERT INTO feature_usage (id, bot_id, user_id, feature_key, usage_date, usage_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `);

            insertStmt.run(id, botId, userId, featureKey, today, now, now);
        }

        logger.debug('Feature usage recorded', { bot_id: botId, user_id: userId, feature_key: featureKey });
    }

    /**
     * Get daily usage (today)
     */
    async getDailyUsage(botId: string, userId: string, featureKey: string): Promise<number> {
        const today = new Date().toISOString().split('T')[0];

        const stmt = db.prepare(`
            SELECT usage_count FROM feature_usage
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? AND usage_date = ?
        `);

        const result = stmt.get(botId, userId, featureKey, today) as { usage_count: number } | undefined;
        return result?.usage_count || 0;
    }

    /**
     * Get monthly usage (current month)
     */
    async getMonthlyUsage(botId: string, userId: string, featureKey: string): Promise<number> {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM

        const stmt = db.prepare(`
            SELECT SUM(usage_count) as total FROM feature_usage
            WHERE bot_id = ? AND user_id = ? AND feature_key = ? 
            AND usage_date LIKE ?
        `);

        const result = stmt.get(botId, userId, featureKey, `${yearMonth}%`) as { total: number | null } | undefined;
        return result?.total || 0;
    }

    /**
     * Get usage stats (daily + monthly)
     */
    async getUsageStats(botId: string, userId: string, featureKey: string): Promise<UsageStats> {
        const daily = await this.getDailyUsage(botId, userId, featureKey);
        const monthly = await this.getMonthlyUsage(botId, userId, featureKey);

        return { daily, monthly };
    }

    /**
     * Get all usage for a bot
     */
    async getUsageByBot(botId: string, startDate?: string, endDate?: string): Promise<FeatureUsage[]> {
        let query = 'SELECT * FROM feature_usage WHERE bot_id = ?';
        const params: any[] = [botId];

        if (startDate) {
            query += ' AND usage_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND usage_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY usage_date DESC';

        const stmt = db.prepare(query);
        return stmt.all(...params) as FeatureUsage[];
    }

    /**
     * Get all usage for a user
     */
    async getUsageByUser(userId: string, startDate?: string, endDate?: string): Promise<FeatureUsage[]> {
        let query = 'SELECT * FROM feature_usage WHERE user_id = ?';
        const params: any[] = [userId];

        if (startDate) {
            query += ' AND usage_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND usage_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY usage_date DESC';

        const stmt = db.prepare(query);
        return stmt.all(...params) as FeatureUsage[];
    }

    /**
     * Reset daily usage (for cron job)
     * Note: We don't actually delete, we just let old records stay for analytics
     * The getDailyUsage only looks at today's date
     */
    async cleanupOldUsage(daysToKeep: number = 90): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const stmt = db.prepare('DELETE FROM feature_usage WHERE usage_date < ?');
        const result = stmt.run(cutoffDateStr);

        logger.info('Old usage records cleaned up', { deleted: result.changes, cutoff_date: cutoffDateStr });
    }

    /**
     * Get feature usage summary for bot
     */
    async getUsageSummary(botId: string, featureKey: string): Promise<{
        total_users: number;
        total_usage_today: number;
        total_usage_month: number;
    }> {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Today's usage
        const todayStmt = db.prepare(`
            SELECT COUNT(DISTINCT user_id) as users, SUM(usage_count) as total
            FROM feature_usage
            WHERE bot_id = ? AND feature_key = ? AND usage_date = ?
        `);
        const todayResult = todayStmt.get(botId, featureKey, today) as { users: number; total: number | null };

        // This month's usage
        const monthStmt = db.prepare(`
            SELECT SUM(usage_count) as total
            FROM feature_usage
            WHERE bot_id = ? AND feature_key = ? AND usage_date LIKE ?
        `);
        const monthResult = monthStmt.get(botId, featureKey, `${yearMonth}%`) as { total: number | null };

        return {
            total_users: todayResult.users || 0,
            total_usage_today: todayResult.total || 0,
            total_usage_month: monthResult.total || 0,
        };
    }

    /**
     * Check if user has exceeded daily limit
     */
    async hasExceededDailyLimit(botId: string, userId: string, featureKey: string, limit: number): Promise<boolean> {
        const usage = await this.getDailyUsage(botId, userId, featureKey);
        return usage >= limit;
    }

    /**
     * Check if user has exceeded monthly limit
     */
    async hasExceededMonthlyLimit(botId: string, userId: string, featureKey: string, limit: number): Promise<boolean> {
        const usage = await this.getMonthlyUsage(botId, userId, featureKey);
        return usage >= limit;
    }
}

export const featureUsageRepository = new FeatureUsageRepository();
