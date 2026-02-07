/**
 * Audit Log Service
 * Tracks all user and system actions for security and compliance
 */
export interface AuditLogEntry {
    id?: string;
    tenant_id?: string;
    user_id?: string;
    action_type: string;
    action_category: 'user' | 'bot' | 'reminder' | 'system' | 'api' | 'settings' | 'integrations';
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
declare class AuditLogService {
    /**
     * Create a new audit log entry
     */
    log(entry: AuditLogEntry): Promise<void>;
    /**
     * Get audit logs with filters and pagination
     */
    getLogs(filters?: AuditLogFilters): Promise<{
        logs: any[];
        total: number;
    }>;
    /**
     * Get logs for a specific resource
     */
    getResourceLogs(resourceType: string, resourceId: string): Promise<any[]>;
    /**
     * Get recent activity (for dashboard)
     */
    getRecentActivity(limit?: number): Promise<any[]>;
    /**
     * Get activity stats for a user
     */
    getUserStats(userId: string, days?: number): Promise<any>;
    /**
     * Clean up old logs based on retention policy
     */
    cleanupOldLogs(): Promise<number>;
    /**
     * Export logs to CSV format
     */
    exportLogs(filters?: AuditLogFilters): Promise<string>;
    /**
     * Helper methods for common log types
     */
    logUserLogin(userId: string, tenantId?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    logUserLogout(userId: string, tenantId?: string): Promise<void>;
    logBotCreated(userId: string, tenantId: string, botId: string, botName: string): Promise<void>;
    logBotDeleted(userId: string, tenantId: string, botId: string, botName: string): Promise<void>;
    logReminderCreated(userId: string, tenantId: string, reminderId: string, reminderName: string): Promise<void>;
    logReminderExecuted(reminderId: string, tenantId: string, status: 'success' | 'failed', details?: string): Promise<void>;
    logSettingChanged(userId: string, tenantId: string, category: string, key: string, oldValue: any, newValue: any): Promise<void>;
    logApiRequest(apiKeyId: string, tenantId: string, endpoint: string, method: string, statusCode: number, responseTime: number): Promise<void>;
}
declare const _default: AuditLogService;
export default _default;
//# sourceMappingURL=auditLogService.d.ts.map