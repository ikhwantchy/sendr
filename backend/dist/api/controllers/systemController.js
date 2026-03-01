"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStats = exports.cleanupLogs = exports.optimizeDatabase = exports.downloadBackup = exports.getBackups = exports.createBackup = exports.getSystemHealth = void 0;
const connection_sqlite_1 = require("../../database/connection-sqlite");
const auditLogService_1 = __importDefault(require("../../services/auditLogService"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
/**
 * System Controller
 * Handles system maintenance, backup, and health checks
 */
/**
 * GET /api/admin/system/health
 * Get system health status
 */
const getSystemHealth = async (req, res) => {
    try {
        const health = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {}
        };
        // Database check
        try {
            await (0, connection_sqlite_1.query)('SELECT 1');
            health.checks.database = { status: 'healthy', message: 'Connected' };
        }
        catch (error) {
            health.checks.database = { status: 'unhealthy', message: 'Connection failed' };
            health.status = 'unhealthy';
        }
        // Get database size
        try {
            const sizeResult = await (0, connection_sqlite_1.query)(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
            health.checks.database.size = sizeResult.rows[0]?.size || 'Unknown';
        }
        catch (error) {
            // Ignore
        }
        // Redis check (if available)
        health.checks.redis = { status: 'not_configured', message: 'Redis not configured' };
        // Disk space (approximate)
        health.checks.disk = { status: 'healthy', message: 'OK' };
        // Memory usage
        const memUsage = process.memoryUsage();
        health.checks.memory = {
            status: 'healthy',
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal
        };
        // Uptime
        health.uptime = `${Math.round(process.uptime())} seconds`;
        // WhatsApp bots status
        const botsResult = await (0, connection_sqlite_1.query)(`SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected
             FROM bots`);
        health.checks.whatsapp = {
            status: 'healthy',
            total_bots: parseInt(botsResult.rows[0].total),
            connected_bots: parseInt(botsResult.rows[0].connected)
        };
        res.json({
            success: true,
            health
        });
    }
    catch (error) {
        console.error('[System] Health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
};
exports.getSystemHealth = getSystemHealth;
/**
 * POST /api/admin/system/backup
 * Create a database backup (SQLite)
 */
const createBackup = async (req, res) => {
    try {
        const userId = req.user.id;
        const backupPath = (0, connection_sqlite_1.backupDatabase)();
        if (!backupPath) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create backup'
            });
        }
        const filename = path_1.default.basename(backupPath);
        // Log backup creation
        await auditLogService_1.default.log({
            user_id: userId,
            action_type: 'backup.create',
            action_category: 'system',
            description: `Created database backup: ${filename}`,
            status: 'success'
        });
        res.json({
            success: true,
            message: 'Backup created successfully',
            backup: {
                filename,
                path: backupPath,
                created_at: new Date()
            }
        });
    }
    catch (error) {
        console.error('[System] Backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create backup',
            error: error.message
        });
    }
};
exports.createBackup = createBackup;
/**
 * GET /api/admin/system/backups
 * Get list of backups (SQLite)
 */
const getBackups = async (req, res) => {
    try {
        const backups = (0, connection_sqlite_1.listBackups)().map(b => ({
            filename: b.name,
            file_size: b.size,
            file_size_display: b.size > 1024 * 1024
                ? `${(b.size / 1024 / 1024).toFixed(1)} MB`
                : `${(b.size / 1024).toFixed(0)} KB`,
            created_at: b.date
        }));
        res.json({
            success: true,
            backups
        });
    }
    catch (error) {
        console.error('[System] Get backups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch backups',
            error: error.message
        });
    }
};
exports.getBackups = getBackups;
/**
 * GET /api/admin/system/backups/download/:filename
 * Download a backup file
 */
const downloadBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ success: false, message: 'Invalid filename' });
        }
        const backupDir = path_1.default.join(process.cwd(), 'data', 'backups');
        const filepath = path_1.default.join(backupDir, filename);
        if (!(0, fs_1.existsSync)(filepath)) {
            return res.status(404).json({ success: false, message: 'Backup file not found' });
        }
        res.download(filepath, filename);
    }
    catch (error) {
        console.error('[System] Download backup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download backup',
            error: error.message
        });
    }
};
exports.downloadBackup = downloadBackup;
/**
 * POST /api/admin/system/maintenance/optimize-db
 * Optimize database (vacuum, analyze)
 */
const optimizeDatabase = async (req, res) => {
    try {
        const userId = req.user.id;
        // Run VACUUM for SQLite
        await (0, connection_sqlite_1.query)('VACUUM');
        // Log maintenance
        await auditLogService_1.default.log({
            user_id: userId,
            action_type: 'maintenance.optimize_db',
            action_category: 'system',
            description: 'Optimized database (VACUUM)',
            status: 'success'
        });
        res.json({
            success: true,
            message: 'Database optimized successfully'
        });
    }
    catch (error) {
        console.error('[System] Optimize DB error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to optimize database',
            error: error.message
        });
    }
};
exports.optimizeDatabase = optimizeDatabase;
/**
 * POST /api/admin/system/maintenance/cleanup-logs
 * Clean up old audit logs
 */
const cleanupLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        await auditLogService_1.default.cleanupOldLogs();
        // Log cleanup
        await auditLogService_1.default.log({
            user_id: userId,
            action_type: 'maintenance.cleanup_logs',
            action_category: 'system',
            description: 'Cleaned up old audit logs',
            status: 'success'
        });
        res.json({
            success: true,
            message: 'Old logs cleaned up successfully'
        });
    }
    catch (error) {
        console.error('[System] Cleanup logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup logs',
            error: error.message
        });
    }
};
exports.cleanupLogs = cleanupLogs;
/**
 * GET /api/admin/system/stats
 * Get system statistics
 */
const getSystemStats = async (req, res) => {
    try {
        // Table sizes
        const tableSizesResult = await (0, connection_sqlite_1.query)(`SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
             FROM pg_tables
             WHERE schemaname = 'public'
             ORDER BY size_bytes DESC
             LIMIT 10`);
        // Total database size
        const dbSizeResult = await (0, connection_sqlite_1.query)(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
        // Row counts
        const rowCountsResult = await (0, connection_sqlite_1.query)(`SELECT 
                'users' as table_name, COUNT(*) as count FROM users
             UNION ALL
             SELECT 'bots', COUNT(*) FROM bots
             UNION ALL
             SELECT 'reminders', COUNT(*) FROM reminders
             UNION ALL
             SELECT 'audit_logs', COUNT(*) FROM audit_logs
             UNION ALL
             SELECT 'api_keys', COUNT(*) FROM api_keys
             UNION ALL
             SELECT 'user_invites', COUNT(*) FROM user_invites`);
        res.json({
            success: true,
            stats: {
                database_size: dbSizeResult.rows[0].size,
                table_sizes: tableSizesResult.rows,
                row_counts: rowCountsResult.rows,
                memory_usage: {
                    rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
                    heap_used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
                },
                uptime: `${Math.round(process.uptime())} seconds`
            }
        });
    }
    catch (error) {
        console.error('[System] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system stats',
            error: error.message
        });
    }
};
exports.getSystemStats = getSystemStats;
//# sourceMappingURL=systemController.js.map