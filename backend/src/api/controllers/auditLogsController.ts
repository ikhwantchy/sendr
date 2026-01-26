import { Request, Response } from 'express';
import auditLogService from '../../services/auditLogService';

/**
 * Audit Logs Controller
 * Manages audit log viewing and export
 */

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filters
 */
export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const {
            user_id,
            action_category,
            action_type,
            resource_type,
            resource_id,
            status,
            start_date,
            end_date,
            limit,
            offset
        } = req.query;

        const filters: any = {};
        if (user_id) filters.user_id = user_id as string;
        if (action_category) filters.action_category = action_category as string;
        if (action_type) filters.action_type = action_type as string;
        if (resource_type) filters.resource_type = resource_type as string;
        if (resource_id) filters.resource_id = resource_id as string;
        if (status) filters.status = status as string;
        if (start_date) filters.start_date = start_date as string;
        if (end_date) filters.end_date = end_date as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (offset) filters.offset = parseInt(offset as string);

        const { logs, total } = await auditLogService.getLogs(filters);

        res.json({
            success: true,
            logs,
            total,
            pagination: {
                limit: filters.limit || 50,
                offset: filters.offset || 0
            }
        });
    } catch (error: any) {
        console.error('[AuditLogs] Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV
 */
export const exportAuditLogs = async (req: Request, res: Response) => {
    try {
        const {
            user_id,
            action_category,
            action_type,
            start_date,
            end_date
        } = req.query;

        const filters: any = {};
        if (user_id) filters.user_id = user_id as string;
        if (action_category) filters.action_category = action_category as string;
        if (action_type) filters.action_type = action_type as string;
        if (start_date) filters.start_date = start_date as string;
        if (end_date) filters.end_date = end_date as string;
        filters.limit = 10000; // Max export limit

        const csv = await auditLogService.exportLogs(filters);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
        res.send(csv);
    } catch (error: any) {
        console.error('[AuditLogs] Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export audit logs',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 */
export const getAuditLogStats = async (req: Request, res: Response) => {
    try {
        const { days = 30 } = req.query;

        // Get stats by category
        const { logs: categoryStats } = await auditLogService.getLogs({
            start_date: new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000).toISOString(),
            limit: 10000
        });

        const stats: any = {
            by_category: {},
            by_status: {},
            total: categoryStats.length
        };

        categoryStats.forEach(log => {
            // Count by category
            stats.by_category[log.action_category] = (stats.by_category[log.action_category] || 0) + 1;

            // Count by status
            stats.by_status[log.status] = (stats.by_status[log.status] || 0) + 1;
        });

        res.json({
            success: true,
            stats,
            period: `Last ${days} days`
        });
    } catch (error: any) {
        console.error('[AuditLogs] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log stats',
            error: error.message
        });
    }
};

/**
 * GET /api/admin/audit-logs/resource/:type/:id
 * Get logs for a specific resource
 */
export const getResourceLogs = async (req: Request, res: Response) => {
    try {
        const { type, id } = req.params;

        const logs = await auditLogService.getResourceLogs(type, id);

        res.json({
            success: true,
            logs,
            resource: { type, id }
        });
    } catch (error: any) {
        console.error('[AuditLogs] Get resource logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resource logs',
            error: error.message
        });
    }
};
