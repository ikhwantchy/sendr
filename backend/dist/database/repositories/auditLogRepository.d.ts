/**
 * Audit Log Repository
 * Track all permission and bot management changes
 */
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
export type AuditAction = 'bot_created' | 'bot_updated' | 'bot_deleted' | 'user_assigned' | 'user_removed' | 'permission_created' | 'permission_updated' | 'permission_deleted' | 'permissions_bulk_updated' | 'bot_connected' | 'bot_disconnected';
declare class AuditLogRepository {
    /**
     * Create audit log entry
     */
    log(botId: string, adminId: string, action: AuditAction, details?: Record<string, any>, userId?: string | null): Promise<AuditLog>;
    /**
     * Get all logs for a bot
     */
    findByBot(botId: string, limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get all logs for a user
     */
    findByUser(userId: string, limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get all logs by admin
     */
    findByAdmin(adminId: string, limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get all logs (system-wide)
     */
    findAll(limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get logs by action type
     */
    findByAction(action: AuditAction, limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get logs within date range
     */
    findByDateRange(startDate: string, endDate: string, limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Get recent activity (last 24 hours)
     */
    getRecentActivity(limit?: number): Promise<AuditLogWithDetails[]>;
    /**
     * Clean up old logs
     */
    cleanupOldLogs(daysToKeep?: number): Promise<void>;
    /**
     * Get audit statistics
     */
    getStatistics(): Promise<{
        total_logs: number;
        logs_today: number;
        logs_this_week: number;
        logs_this_month: number;
        most_active_admin: {
            admin_id: string;
            admin_name: string;
            count: number;
        } | null;
        most_common_action: {
            action: string;
            count: number;
        } | null;
    }>;
}
export declare const auditLogRepository: AuditLogRepository;
export {};
//# sourceMappingURL=auditLogRepository.d.ts.map