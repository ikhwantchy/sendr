import crypto from 'crypto';
import { query } from '../database/connection';

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
                } else {
                    console.log('[AuditLog] Invalid start_date:', filters.start_date);
                }
            } catch (e) {
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
                } else {
                    console.log('[AuditLog] Invalid end_date:', filters.end_date);
                }
            } catch (e) {
                console.error('[AuditLog] Error parsing end_date:', e);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Debug: log the query
        console.log('[AuditLog] Where clause:', whereClause);
        console.log('[AuditLog] Params:', params);

        // Get total count (use alias 'al' to match WHERE clause)
        const countResult = await query(
            `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`,
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
