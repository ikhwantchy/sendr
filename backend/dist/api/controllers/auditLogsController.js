"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceLogs = exports.getAuditLogStats = exports.exportAuditLogs = exports.getAuditLogs = void 0;
const auditLogService_1 = __importDefault(require("../../services/auditLogService"));
/**
 * Audit Logs Controller
 * Manages audit log viewing and export
 */
/**
 * GET /api/admin/audit-logs
 * Get audit logs with filters
 */
const getAuditLogs = async (req, res) => {
    try {
        const { user_id, action_category, action_type, resource_type, resource_id, status, start_date, end_date, limit, offset } = req.query;
        // DEBUG: Log all received query params
        console.log('[AuditLogs] ===== DEBUG =====');
        console.log('[AuditLogs] Raw query params:', req.query);
        console.log('[AuditLogs] start_date:', start_date);
        console.log('[AuditLogs] end_date:', end_date);
        const filters = {};
        if (user_id)
            filters.user_id = user_id;
        if (action_category)
            filters.action_category = action_category;
        if (action_type)
            filters.action_type = action_type;
        if (resource_type)
            filters.resource_type = resource_type;
        if (resource_id)
            filters.resource_id = resource_id;
        if (status)
            filters.status = status;
        if (start_date)
            filters.start_date = start_date;
        if (end_date)
            filters.end_date = end_date;
        if (limit)
            filters.limit = parseInt(limit);
        if (offset)
            filters.offset = parseInt(offset);
        console.log('[AuditLogs] Filters object:', filters);
        const { logs, total } = await auditLogService_1.default.getLogs(filters);
        console.log('[AuditLogs] Result: logs count =', logs.length, ', total =', total);
        res.json({
            success: true,
            logs,
            total,
            pagination: {
                limit: filters.limit || 50,
                offset: filters.offset || 0
            }
        });
    }
    catch (error) {
        console.error('[AuditLogs] Get logs error:', error);
        console.error('[AuditLogs] Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};
exports.getAuditLogs = getAuditLogs;
/**
 * GET /api/admin/audit-logs/export
 * Export audit logs to CSV
 */
const exportAuditLogs = async (req, res) => {
    try {
        const { user_id, action_category, action_type, start_date, end_date } = req.query;
        const filters = {};
        if (user_id)
            filters.user_id = user_id;
        if (action_category)
            filters.action_category = action_category;
        if (action_type)
            filters.action_type = action_type;
        if (start_date)
            filters.start_date = start_date;
        if (end_date)
            filters.end_date = end_date;
        filters.limit = 10000; // Max export limit
        const csv = await auditLogService_1.default.exportLogs(filters);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${Date.now()}.csv`);
        res.send(csv);
    }
    catch (error) {
        console.error('[AuditLogs] Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export audit logs',
            error: error.message
        });
    }
};
exports.exportAuditLogs = exportAuditLogs;
/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 */
const getAuditLogStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        // Get stats by category
        const { logs: categoryStats } = await auditLogService_1.default.getLogs({
            start_date: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString(),
            limit: 10000
        });
        const stats = {
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
    }
    catch (error) {
        console.error('[AuditLogs] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log stats',
            error: error.message
        });
    }
};
exports.getAuditLogStats = getAuditLogStats;
/**
 * GET /api/admin/audit-logs/resource/:type/:id
 * Get logs for a specific resource
 */
const getResourceLogs = async (req, res) => {
    try {
        const { type, id } = req.params;
        const logs = await auditLogService_1.default.getResourceLogs(type, id);
        res.json({
            success: true,
            logs,
            resource: { type, id }
        });
    }
    catch (error) {
        console.error('[AuditLogs] Get resource logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resource logs',
            error: error.message
        });
    }
};
exports.getResourceLogs = getResourceLogs;
//# sourceMappingURL=auditLogsController.js.map