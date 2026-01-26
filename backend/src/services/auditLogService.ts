import crypto from 'crypto';
import { query } from '../database/connection-sqlite';

/**
 * Audit Log Service
 * Tracks all user and system actions for security and compliance
 */

export interface AuditLogEntry {
    id?: string;
    tenant_id?: string;
    user_id?: string;
    action_type: string;
    action_category: 'user' | 'bot' | 'reminder' | 'system' | 'api' | 'settings';
    resource_type?: string;
    resource_id?: string;
    description: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
    status?: 'success' | 'failed' | 'warning';
    created_at?: Date;
}

export interface AuditLogFilters {
    tenant_id?: string;
    user_id?: string;
    action_category?: string;
    action_type?: string;
    resource_type?: string;
    resource_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}

class AuditLogService {
    /**
     * Create a new audit log entry
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            const id = crypto.randomUUID();
            const tenantId = entry.tenant_id || 'default-tenant-id';

            await query(
                `INSERT INTO audit_logs 
                (id, tenant_id, user_id, action, category, resource_type, resource_id, 
                 details, ip_address, user_agent, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
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
                ]
            );
        } catch (error) {
            // Don't throw - audit logging should never break the main flow
            console.error('[AuditLog] Failed to create log entry:', error);
        }
    }

    /**
     * Get audit logs with filters and pagination
     */
    async getLogs(filters: AuditLogFilters = {}): Promise<{ logs: any[]; total: number }> {
        const conditions: string[] = [];
        const params: any[] = [];

        // Build WHERE clause
        if (filters.tenant_id) {
            conditions.push(`tenant_id = ?`);
            params.push(filters.tenant_id);
        }

        if (filters.user_id) {
            conditions.push(`user_id = ?`);
            params.push(filters.user_id);
        }

        if (filters.action_category) {
            conditions.push(`category = ?`);
            params.push(filters.action_category);
        }

        if (filters.action_type) {
            conditions.push(`action = ?`);
            params.push(filters.action_type);
        }

        if (filters.resource_type) {
            conditions.push(`resource_type = ?`);
            params.push(filters.resource_type);
        }

        if (filters.resource_id) {
            conditions.push(`resource_id = ?`);
            params.push(filters.resource_id);
        }

        if (filters.status) {
            conditions.push(`status = ?`);
            params.push(filters.status);
        }

        if (filters.start_date) {
            conditions.push(`created_at >= ?`);
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            conditions.push(`created_at <= ?`);
            params.push(filters.end_date);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].total);

        // Get logs with pagination
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;

        const logsResult = await query(
            `SELECT 
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
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return {
            logs: logsResult.rows,
            total
        };
    }

    /**
     * Get logs for a specific resource
     */
    async getResourceLogs(resourceType: string, resourceId: string): Promise<any[]> {
        const result = await query(
            `SELECT 
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
            LIMIT 100`,
            [resourceType, resourceId]
        );

        return result.rows;
    }

    /**
     * Get recent activity (for dashboard)
     */
    async getRecentActivity(limit: number = 50): Promise<any[]> {
        const result = await query(
            `SELECT 
                al.*,
                al.details as description,
                al.action as action_type,
                al.category as action_category,
                u.email as user_email,
                u.name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.created_at DESC
            LIMIT ?`,
            [limit]
        );

        return result.rows;
    }

    /**
     * Get activity stats for a user
     */
    async getUserStats(userId: string, days: number = 30): Promise<any> {
        const result = await query(
            `SELECT 
                category as action_category,
                COUNT(*) as count
            FROM audit_logs
            WHERE user_id = ? 
            AND created_at >= DATETIME('now', '-' || ? || ' days')
            GROUP BY category
            ORDER BY count DESC`,
            [userId, days]
        );

        return result.rows;
    }

    /**
     * Clean up old logs based on retention policy
     */
    async cleanupOldLogs(): Promise<number> {
        // In SQLite we don't have stored procedures, just delete directly
        await query(`DELETE FROM audit_logs WHERE created_at < DATETIME('now', '-30 days')`);
        console.log('[AuditLog] Cleanup completed');
        return 0;
    }

    /**
     * Export logs to CSV format
     */
    async exportLogs(filters: AuditLogFilters = {}): Promise<string> {
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

    async logUserLogin(userId: string, tenantId?: string, ipAddress?: string, userAgent?: string) {
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

    async logUserLogout(userId: string, tenantId?: string) {
        await this.log({
            user_id: userId,
            tenant_id: tenantId,
            action_type: 'user.logout',
            action_category: 'user',
            description: 'User logged out',
            status: 'success'
        });
    }

    async logBotCreated(userId: string, tenantId: string, botId: string, botName: string) {
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

    async logBotDeleted(userId: string, tenantId: string, botId: string, botName: string) {
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

    async logReminderCreated(userId: string, tenantId: string, reminderId: string, reminderName: string) {
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

    async logReminderExecuted(reminderId: string, tenantId: string, status: 'success' | 'failed', details?: string) {
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

    async logSettingChanged(userId: string, tenantId: string, category: string, key: string, oldValue: any, newValue: any) {
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

    async logApiRequest(apiKeyId: string, tenantId: string, endpoint: string, method: string, statusCode: number, responseTime: number) {
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

export default new AuditLogService();
