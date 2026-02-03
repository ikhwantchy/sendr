"use strict";
/**
 * Audit Log Repository
 * Track all permission and bot management changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogRepository = void 0;
const connection_1 = require("../connection");
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
class AuditLogRepository {
    /**
     * Create audit log entry
     */
    async log(botId, adminId, action, details, userId) {
        const id = (0, uuid_1.v4)();
        const createdAt = new Date().toISOString();
        const detailsJson = details ? JSON.stringify(details) : null;
        const stmt = connection_1.db.prepare(`
            INSERT INTO bot_audit_log (id, bot_id, user_id, admin_id, action, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, botId, userId || null, adminId, action, detailsJson, createdAt);
        logger_1.logger.info('Audit log created', { bot_id: botId, action, admin_id: adminId });
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
    async findByBot(botId, limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(botId, limit);
    }
    /**
     * Get all logs for a user
     */
    async findByUser(userId, limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(userId, limit);
    }
    /**
     * Get all logs by admin
     */
    async findByAdmin(adminId, limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(adminId, limit);
    }
    /**
     * Get all logs (system-wide)
     */
    async findAll(limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(limit);
    }
    /**
     * Get logs by action type
     */
    async findByAction(action, limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(action, limit);
    }
    /**
     * Get logs within date range
     */
    async findByDateRange(startDate, endDate, limit = 100) {
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(startDate, endDate, limit);
    }
    /**
     * Get recent activity (last 24 hours)
     */
    async getRecentActivity(limit = 50) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString();
        const stmt = connection_1.db.prepare(`
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
        return stmt.all(yesterdayStr, limit);
    }
    /**
     * Clean up old logs
     */
    async cleanupOldLogs(daysToKeep = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString();
        const stmt = connection_1.db.prepare('DELETE FROM bot_audit_log WHERE created_at < ?');
        const result = stmt.run(cutoffDateStr);
        logger_1.logger.info('Old audit logs cleaned up', { deleted: result.changes, cutoff_date: cutoffDateStr });
    }
    /**
     * Get audit statistics
     */
    async getStatistics() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        // Total logs
        const totalStmt = connection_1.db.prepare('SELECT COUNT(*) as count FROM bot_audit_log');
        const totalResult = totalStmt.get();
        // Today's logs
        const todayStmt = connection_1.db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const todayResult = todayStmt.get(`${today}T00:00:00`);
        // This week's logs
        const weekStmt = connection_1.db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const weekResult = weekStmt.get(weekAgo);
        // This month's logs
        const monthStmt = connection_1.db.prepare('SELECT COUNT(*) as count FROM bot_audit_log WHERE created_at >= ?');
        const monthResult = monthStmt.get(monthAgo);
        // Most active admin
        const adminStmt = connection_1.db.prepare(`
            SELECT al.admin_id, u.name as admin_name, COUNT(*) as count
            FROM bot_audit_log al
            LEFT JOIN users u ON al.admin_id = u.id
            GROUP BY al.admin_id
            ORDER BY count DESC
            LIMIT 1
        `);
        const adminResult = adminStmt.get();
        // Most common action
        const actionStmt = connection_1.db.prepare(`
            SELECT action, COUNT(*) as count
            FROM bot_audit_log
            GROUP BY action
            ORDER BY count DESC
            LIMIT 1
        `);
        const actionResult = actionStmt.get();
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
exports.auditLogRepository = new AuditLogRepository();
//# sourceMappingURL=auditLogRepository.js.map