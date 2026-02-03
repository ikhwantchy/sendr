"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const connection_sqlite_1 = require("../database/connection-sqlite");
class AuditLogService {
    /**
     * Create a new audit log entry
     */
    async log(entry) {
        try {
            const id = crypto_1.default.randomUUID();
            const tenantId = entry.tenant_id || 'default-tenant-id';
            await (0, connection_sqlite_1.query)(`INSERT INTO audit_logs 
                (id, tenant_id, user_id, action, category, resource_type, resource_id, 
                 details, ip_address, user_agent, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                tenantId,
                entry.user_id || null,
                entry.action_type,
                entry.action_category,
                entry.resource_type || null,
                entry.resource_id || null,
                entry.description + (entry.metadata ? ' ' + JSON.stringify(entry.metadata) : ''),
                entry.ip_address || null,
                entry.user_agent || null,
                entry.status || 'success'
            ]);
        }
        catch (error) {
            // Don't throw - audit logging should never break the main flow
            console.error('[AuditLog] Failed to create log entry:', error);
        }
    }
    /**
     * Get audit logs with filters and pagination
     */
    async getLogs(filters = {}) {
        const conditions = [];
        const params = [];
        // Debug log
        console.log('[AuditLog] Filters received:', {
            start_date: filters.start_date,
            end_date: filters.end_date
        });
        // Build WHERE clause (use al. prefix for audit_logs table)
        if (filters.tenant_id) {
            conditions.push(`al.tenant_id = ?`);
            params.push(filters.tenant_id);
        }
        if (filters.user_id) {
            conditions.push(`al.user_id = ?`);
            params.push(filters.user_id);
        }
        if (filters.action_category) {
            conditions.push(`al.category = ?`);
            params.push(filters.action_category);
        }
        if (filters.action_type) {
            conditions.push(`al.action = ?`);
            params.push(filters.action_type);
        }
        if (filters.resource_type) {
            conditions.push(`al.resource_type = ?`);
            params.push(filters.resource_type);
        }
        if (filters.resource_id) {
            conditions.push(`al.resource_id = ?`);
            params.push(filters.resource_id);
        }
        if (filters.status) {
            conditions.push(`al.status = ?`);
            params.push(filters.status);
        }
        if (filters.start_date) {
            try {
                // Convert ISO date to SQLite format (YYYY-MM-DD HH:MM:SS)
                const startDate = new Date(filters.start_date);
                if (!isNaN(startDate.getTime())) {
                    const formattedStart = startDate.toISOString().replace('T', ' ').split('.')[0];
                    console.log('[AuditLog] Formatted start_date:', formattedStart);
                    conditions.push(`al.created_at >= ?`);
                    params.push(formattedStart);
                }
                else {
                    console.log('[AuditLog] Invalid start_date:', filters.start_date);
                }
            }
            catch (e) {
                console.error('[AuditLog] Error parsing start_date:', e);
            }
        }
        if (filters.end_date) {
            try {
                // Convert ISO date to SQLite format (YYYY-MM-DD HH:MM:SS)
                const endDate = new Date(filters.end_date);
                if (!isNaN(endDate.getTime())) {
                    const formattedEnd = endDate.toISOString().replace('T', ' ').split('.')[0];
                    console.log('[AuditLog] Formatted end_date:', formattedEnd);
                    conditions.push(`al.created_at <= ?`);
                    params.push(formattedEnd);
                }
                else {
                    console.log('[AuditLog] Invalid end_date:', filters.end_date);
                }
            }
            catch (e) {
                console.error('[AuditLog] Error parsing end_date:', e);
            }
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // Debug: log the query
        console.log('[AuditLog] Where clause:', whereClause);
        console.log('[AuditLog] Params:', params);
        // Get total count (use alias 'al' to match WHERE clause)
        const countResult = await (0, connection_sqlite_1.query)(`SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total);
        // Get logs with pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const logsResult = await (0, connection_sqlite_1.query)(`SELECT 
                al.*,
                al.details as description,
                al.action as action_type,
                al.category as action_category,
                u.email as user_email,
                u.name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?`, [...params, limit, offset]);
        return {
            logs: logsResult.rows,
            total
        };
    }
    /**
     * Get logs for a specific resource
     */
    async getResourceLogs(resourceType, resourceId) {
        const result = await (0, connection_sqlite_1.query)(`SELECT 
                al.*,
                al.details as description,
                al.action as action_type,
                al.category as action_category,
                u.email as user_email,
                u.name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.resource_type = ? AND al.resource_id = ?
            ORDER BY al.created_at DESC
            LIMIT 100`, [resourceType, resourceId]);
        return result.rows;
    }
    /**
     * Get recent activity (for dashboard)
     */
    async getRecentActivity(limit = 50) {
        const result = await (0, connection_sqlite_1.query)(`SELECT 
                al.*,
                al.details as description,
                al.action as action_type,
                al.category as action_category,
                u.email as user_email,
                u.name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ?`, [limit]);
        return result.rows;
    }
    /**
     * Get activity stats for a user
     */
    async getUserStats(userId, days = 30) {
        const result = await (0, connection_sqlite_1.query)(`SELECT 
                category as action_category,
                COUNT(*) as count
            FROM audit_logs
            WHERE user_id = ? 
            AND created_at >= DATETIME('now', '-' || ? || ' days')
            GROUP BY category
            ORDER BY count DESC`, [userId, days]);
        return result.rows;
    }
    /**
     * Clean up old logs based on retention policy
     */
    async cleanupOldLogs() {
        // In SQLite we don't have stored procedures, just delete directly
        await (0, connection_sqlite_1.query)(`DELETE FROM audit_logs WHERE created_at < DATETIME('now', '-30 days')`);
        console.log('[AuditLog] Cleanup completed');
        return 0;
    }
    /**
     * Export logs to CSV format
     */
    async exportLogs(filters = {}) {
        const { logs } = await this.getLogs({ ...filters, limit: 10000 });
        // CSV header
        let csv = 'Timestamp,User,Action Type,Category,Resource,Description,Status,IP Address\n';
        // CSV rows
        logs.forEach(log => {
            const row = [
                log.created_at,
                log.user_email || 'System',
                log.action_type,
                log.action_category,
                log.resource_type ? `${log.resource_type}:${log.resource_id}` : '',
                `"${(log.description || '').replace(/"/g, '""')}"`, // Escape quotes
                log.status,
                log.ip_address || ''
            ].join(',');
            csv += row + '\n';
        });
        return csv;
    }
    /**
     * Helper methods for common log types
     */
    async logUserLogin(userId, tenantId, ipAddress, userAgent) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'user.login',
            action_category: 'user',
            description: 'User logged in',
            ip_address: ipAddress,
            user_agent: userAgent,
            status: 'success'
        });
    }
    async logUserLogout(userId, tenantId) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'user.logout',
            action_category: 'user',
            description: 'User logged out',
            status: 'success'
        });
    }
    async logBotCreated(userId, tenantId, botId, botName) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'bot.create',
            action_category: 'bot',
            resource_type: 'bot',
            resource_id: botId,
            description: `Created bot: ${botName}`,
            status: 'success'
        });
    }
    async logBotDeleted(userId, tenantId, botId, botName) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'bot.delete',
            action_category: 'bot',
            resource_type: 'bot',
            resource_id: botId,
            description: `Deleted bot: ${botName}`,
            status: 'success'
        });
    }
    async logReminderCreated(userId, tenantId, reminderId, reminderName) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'reminder.create',
            action_category: 'reminder',
            resource_type: 'reminder',
            resource_id: reminderId,
            description: `Created reminder: ${reminderName}`,
            status: 'success'
        });
    }
    async logReminderExecuted(reminderId, tenantId, status, details) {
        await this.log({
            tenant_id: tenantId,
            action_type: 'reminder.execute',
            action_category: 'reminder',
            resource_type: 'reminder',
            resource_id: reminderId,
            description: details || `Reminder executed`,
            status
        });
    }
    async logSettingChanged(userId, tenantId, category, key, oldValue, newValue) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'settings.update',
            action_category: 'settings',
            description: `Updated ${category}.${key}`,
            metadata: {
                category,
                key,
                old_value: oldValue,
                new_value: newValue
            },
            status: 'success'
        });
    }
    async logApiRequest(apiKeyId, tenantId, endpoint, method, statusCode, responseTime) {
        await this.log({
            tenant_id: tenantId,
            action_type: 'api.request',
            action_category: 'api',
            resource_type: 'api_key',
            resource_id: apiKeyId,
            description: `${method} ${endpoint}`,
            metadata: {
                status_code: statusCode,
                response_time_ms: responseTime
            },
            status: statusCode < 400 ? 'success' : 'failed'
        });
    }
}
exports.default = new AuditLogService();
//# sourceMappingURL=auditLogService.js.map