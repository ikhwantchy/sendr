/**
 * Audit Log Repository
 * Track all permission and bot management changes
 */

import { db } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

export interface AuditLog {
    id: string;
    bot_id: string;
    user_id: string | null;
    admin_id: string;
    action: string;
    details: string | null;
    created_at: string;
}

export interface AuditLogWithDetails extends AuditLog {
    bot_name?: string;
    user_name?: string;
    user_email?: string;
    admin_name?: string;
    admin_email?: string;
}

export type AuditAction =
    | 'bot_created'
    | 'bot_updated'
    | 'bot_deleted'
    | 'user_assigned'
    | 'user_removed'
    | 'permission_created'
    | 'permission_updated'
    | 'permission_deleted'
    | 'permissions_bulk_updated'
    | 'bot_connected'
    | 'bot_disconnected';

class AuditLogRepository {
    /**
     * Create audit log entry
     */
    async log(
        botId: string,
        adminId: string,
        action: AuditAction,
        details?: Record<string, any>,
        userId?: string | null
    ): Promise<AuditLog> {
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const detailsJson = details ? JSON.stringify(details) : null;

        const stmt = db.prepare(`
            INSERT INTO bot_audit_log (id, bot_id, user_id, admin_id, action, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, botId, userId || null, adminId, action, detailsJson, createdAt);

        logger.info('Audit log created', { bot_id: botId, action, admin_id: adminId });

        return {
            id,
            bot_id: botId,
            user_id: userId || null,
            admin_id: adminId,
            action,
            details: detailsJson,
            created_at: createdAt,
        };
    }

    /**
     * Get all logs for a bot
     */
    async findByBot(botId: string, limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                u.email as user_email,
                admin.name as admin_name,
                admin.email as admin_email
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            WHERE al.bot_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(botId, limit) as AuditLogWithDetails[];
    }

    /**
     * Get all logs for a user
     */
    async findByUser(userId: string, limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                admin.name as admin_name,
                admin.email as admin_email
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            WHERE al.user_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(userId, limit) as AuditLogWithDetails[];
    }

    /**
     * Get all logs by admin
     */
    async findByAdmin(adminId: string, limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                u.email as user_email
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.admin_id = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(adminId, limit) as AuditLogWithDetails[];
    }

    /**
     * Get all logs (system-wide)
     */
    async findAll(limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                u.email as user_email,
                admin.name as admin_name,
                admin.email as admin_email
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(limit) as AuditLogWithDetails[];
    }

    /**
     * Get logs by action type
     */
    async findByAction(action: AuditAction, limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                admin.name as admin_name
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            WHERE al.action = ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(action, limit) as AuditLogWithDetails[];
    }

    /**
     * Get logs within date range
     */
    async findByDateRange(startDate: string, endDate: string, limit: number = 100): Promise<AuditLogWithDetails[]> {
        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                admin.name as admin_name
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            WHERE al.created_at >= ? AND al.created_at <= ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(startDate, endDate, limit) as AuditLogWithDetails[];
    }

    /**
     * Get recent activity (last 24 hours)
     */
    async getRecentActivity(limit: number = 50): Promise<AuditLogWithDetails[]> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString();

        const stmt = db.prepare(`
            SELECT 
                al.*,
                b.name as bot_name,
                u.name as user_name,
                admin.name as admin_name
            FROM bot_audit_log al
            LEFT JOIN bots b ON al.bot_id = b.id
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users admin ON al.admin_id = admin.id
            WHERE al.created_at >= ?
            ORDER BY al.created_at DESC
            LIMIT ?
        `);

        return stmt.all(yesterdayStr, limit) as AuditLogWithDetails[];
    }

    /**
     * Clean up old logs
     */
    async cleanupOldLogs(daysToKeep: number = 365): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString();

        const stmt = db.prepare('DELETE FROM bot_audit_log WHERE created_at < ?');
        const result = stmt.run(cutoffDateStr);

        logger.info('Old audit logs cleaned up', { deleted: result.changes, cutoff_date: cutoffDateStr });
    }

    /**
     * Get audit statistics
     */
    async getStatistics(): Promise<{
        total_logs: number;
        logs_today: number;
        logs_this_week: number;
        logs_this_month: number;
        most_active_admin: { admin_id: string; admin_name: string; count: number } | null;
        most_common_action: { action: string; count: number } | null;
    }> {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Total logs
        const totalStmt = db.prepare('SELECT COUNT(*) as count FROM bot_audit_log');
        const totalResult = totalStmt.get() as { count: number };

        // Today's logs
        const todayStmt = db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const todayResult = todayStmt.get(`${today}T00:00:00`) as { count: number };

        // This week's logs
        const weekStmt = db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const weekResult = weekStmt.get(weekAgo) as { count: number };

        // This month's logs
        const monthStmt = db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const monthResult = monthStmt.get(monthAgo) as { count: number };

        // Most active admin
        const adminStmt = db.prepare(`
            SELECT al.admin_id, u.name as admin_name, COUNT(*) as count
            FROM bot_audit_log al
            LEFT JOIN users u ON al.admin_id = u.id
            GROUP BY al.admin_id
            ORDER BY count DESC
            LIMIT 1
        `);
        const adminResult = adminStmt.get() as { admin_id: string; admin_name: string; count: number } | undefined;

        // Most common action
        const actionStmt = db.prepare(`
            SELECT action, COUNT(*) as count
            FROM bot_audit_log
            GROUP BY action
            ORDER BY count DESC
            LIMIT 1
        `);
        const actionResult = actionStmt.get() as { action: string; count: number } | undefined;

        return {
            total_logs: totalResult.count,
            logs_today: todayResult.count,
            logs_this_week: weekResult.count,
            logs_this_month: monthResult.count,
            most_active_admin: adminResult || null,
            most_common_action: actionResult || null,
        };
    }
}

export const auditLogRepository = new AuditLogRepository();
