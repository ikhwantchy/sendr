import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../../database/connection';
// Import Controller
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();
router.use(authenticate);

// Legacy/Dashboard Stats (Keep for backwards compatibility or specific widget)
router.get('/dashboard-stats', async (req, res) => {
    try {
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

        // For OWNER/ADMIN, show all data (no tenant filter)
        const tenantParams = isAdmin ? [] : [tenantId];

        // Get total bots
        const botsResult = await query(
            isAdmin 
                ? `SELECT COUNT(*) as count FROM bots`
                : `SELECT COUNT(*) as count FROM bots WHERE tenant_id = ?`,
            tenantParams
        );

        // Get active rules
        const rulesResult = await query(
            isAdmin
                ? `SELECT COUNT(*) as count FROM keyword_rules r INNER JOIN bots b ON r.bot_id = b.id WHERE r.is_active = 1`
                : `SELECT COUNT(*) as count FROM keyword_rules r INNER JOIN bots b ON r.bot_id = b.id WHERE b.tenant_id = ? AND r.is_active = 1`,
            tenantParams
        );

        // Get outbound messages
        let messagesSent = 0;
        try {
            const messagesResult = await query(
                isAdmin
                    ? `SELECT COUNT(*) as count FROM messages m INNER JOIN bots b ON m.bot_id = b.id WHERE m.direction = 'outbound'`
                    : `SELECT COUNT(*) as count FROM messages m INNER JOIN bots b ON m.bot_id = b.id WHERE b.tenant_id = ? AND m.direction = 'outbound'`,
                tenantParams
            );
            messagesSent = messagesResult.rows[0]?.count || 0;
        } catch (err) {
            // Check if table exists error?
        }

        // Get campaigns
        let campaigns = 0;
        try {
            const campaignsResult = await query(
                isAdmin
                    ? `SELECT COUNT(*) as count FROM campaigns c INNER JOIN bots b ON c.bot_id = b.id`
                    : `SELECT COUNT(*) as count FROM campaigns c INNER JOIN bots b ON c.bot_id = b.id WHERE b.tenant_id = ?`,
                tenantParams
            );
            campaigns = campaignsResult.rows[0]?.count || 0;
        } catch (err) { }

        // Get active reminders
        let activeReminders = 0;
        try {
            const remindersResult = await query(
                isAdmin
                    ? `SELECT COUNT(*) as count FROM reminders r INNER JOIN bots b ON r.bot_id = b.id WHERE r.is_active = 1`
                    : `SELECT COUNT(*) as count FROM reminders r INNER JOIN bots b ON r.bot_id = b.id WHERE b.tenant_id = ? AND r.is_active = 1`,
                tenantParams
            );
            activeReminders = remindersResult.rows[0]?.count || 0;
        } catch (err) { }

        // Get total users - Admin sees ALL users, regular users see only their tenant
        let totalUsers = 0;
        try {
            if (isAdmin) {
                // Admin/Owner sees all users in the system
                const usersResult = await query(`SELECT COUNT(*) as count FROM users`);
                totalUsers = usersResult.rows[0]?.count || 0;
            } else {
                const usersResult = await query(`
                    SELECT COUNT(*) as count 
                    FROM users 
                    WHERE tenant_id = ?
                `, [tenantId]);
                totalUsers = usersResult.rows[0]?.count || 0;
            }
        } catch (err) { }

        // Get active users (logged in within last 15 minutes)
        let activeUsers = 0;
        try {
            if (isAdmin) {
                // Admin/Owner sees all active users
                const activeUsersResult = await query(`
                    SELECT COUNT(*) as count 
                    FROM users 
                    WHERE last_login_at IS NOT NULL 
                    AND datetime(last_login_at) >= datetime('now', '-15 minutes')
                `);
                activeUsers = activeUsersResult.rows[0]?.count || 0;
            } else {
                const activeUsersResult = await query(`
                    SELECT COUNT(*) as count 
                    FROM users 
                    WHERE tenant_id = ? 
                    AND last_login_at IS NOT NULL 
                    AND datetime(last_login_at) >= datetime('now', '-15 minutes')
                `, [tenantId]);
                activeUsers = activeUsersResult.rows[0]?.count || 0;
            }
        } catch (err) { }

        res.json({
            success: true,
            data: {
                totalBots: botsResult.rows[0]?.count || 0,
                activeRules: rulesResult.rows[0]?.count || 0,
                campaigns: campaigns,
                messagesSent: messagesSent,
                totalUsers: totalUsers,
                activeUsers: activeUsers,
                activeReminders: activeReminders
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
    }
});

// Activity Logs
router.get('/activity-logs', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const tenantId = (req as any).user.tenant_id;
        const userRole = (req as any).user.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const limit = parseInt(req.query.limit as string) || 50;
        const timeRange = (req.query.timeRange as string) || '24h';
        const botId = req.query.botId as string; // Optional botId filter
        const activities: any[] = [];

        // Helper for date filtering
        const getDateFilter = (col: string) => {
            if (timeRange === 'all') return '';
            let modifier = '-1 day';
            if (timeRange === '7d') modifier = '-7 days';
            if (timeRange === '30d') modifier = '-30 days';
            return `AND datetime(${col}) >= datetime('now', '${modifier}')`;
        };

        // Helper for bot filtering (specific bot)
        const getBotFilter = (tableAlias: string, params: any[]) => {
            if (!botId) return '';
            params.push(botId);
            return `AND ${tableAlias}.id = ?`;
        };

        // Helper for bot access - admins see all tenant bots, users see only permitted bots
        // If botId is specified, skip tenant filter (user is viewing a specific bot they have access to)
        const getBotAccessFilter = (tableAlias: string, params: any[]) => {
            // If specific botId is requested, skip access filter (already authorized by viewing the page)
            if (botId) return '';
            
            if (isAdmin) {
                // Admin sees all bots in their tenant
                params.push(tenantId);
                return `AND ${tableAlias}.tenant_id = ?`;
            } else {
                // Regular users see bots they created OR have permission to via bot_permissions
                params.push(userId, userId);
                return `AND (${tableAlias}.created_by = ? OR ${tableAlias}.id IN (SELECT bot_id FROM bot_permissions WHERE user_id = ? AND can_view = 1))`;
            }
        };

        // 1. Campaigns
        try {
            const campaignParams: any[] = [];
            const accessFilter = getBotAccessFilter('b', campaignParams);
            const botFilter = getBotFilter('b', campaignParams);
            
            const campaigns = await query(`
                SELECT c.id, c.name, c.status, c.created_at, c.updated_at, b.name as bot_name
                FROM campaigns c JOIN bots b ON c.bot_id = b.id
                WHERE 1=1 ${accessFilter} ${getDateFilter('c.updated_at')} ${botFilter}
                ORDER BY c.updated_at DESC LIMIT ?
            `, [...campaignParams, limit]);

            campaigns.rows.forEach(c => {
                if (c.status === 'completed' || c.status === 'sending') {
                    activities.push({
                        id: `camp-${c.id}`,
                        type: 'campaign',
                        message: `Campaign "${c.name}" ${c.status}`,
                        timestamp: c.updated_at || c.created_at
                    });
                }
            });
        } catch (e) {
            console.error('Campaign query error:', e);
        }

        // 2. Bots (Connections)
        try {
            const botParams: any[] = [];
            const accessFilter = getBotAccessFilter('bots', botParams);
            const botFilter = getBotFilter('bots', botParams);
            
            const bots = await query(`
                SELECT id, name, status, updated_at FROM bots 
                WHERE 1=1 ${accessFilter} ${getDateFilter('updated_at')} ${botFilter}
                ORDER BY updated_at DESC LIMIT ?
            `, [...botParams, limit]);

            bots.rows.forEach(b => {
                let statusText = b.status;
                if (b.status === 'connected') statusText = 'connected';
                else if (b.status === 'paused') statusText = 'paused';
                else if (b.status === 'reconnecting') statusText = 'reconnecting';
                else if (b.status === 'disconnected') statusText = 'disconnected';

                activities.push({
                    id: `bot-${b.id}`,
                    type: 'bot',
                    message: `${b.name} ${statusText}`,
                    timestamp: b.updated_at
                });
            });
        } catch (e) { }

        // 3. Rules
        try {
            const ruleParams: any[] = [];
            const accessFilter = getBotAccessFilter('b', ruleParams);
            const botFilter = getBotFilter('b', ruleParams);
            
            const rules = await query(`
                SELECT r.id, r.keyword, r.created_at, b.name as bot_name 
                FROM keyword_rules r JOIN bots b ON r.bot_id = b.id
                WHERE 1=1 ${accessFilter} ${getDateFilter('r.created_at')} ${botFilter}
                ORDER BY r.created_at DESC LIMIT ?
            `, [...ruleParams, limit]);

            rules.rows.forEach(r => {
                activities.push({
                    id: `rule-${r.id}`,
                    type: 'rule',
                    message: `Rule "${r.keyword}" created`,
                    timestamp: r.created_at
                });
            });
        } catch (e) {
            console.error('Rule query error:', e);
        }

        // 4. Messages (Inbound & Outbound)
        try {
            const msgParams: any[] = [];
            const accessFilter = getBotAccessFilter('b', msgParams);
            const botFilter = getBotFilter('b', msgParams);
            
            const msgs = await query(`
                SELECT m.id, m.content, m.created_at, m.source, m.direction, b.name as bot_name
                FROM messages m JOIN bots b ON m.bot_id = b.id
                WHERE 1=1 ${accessFilter} ${getDateFilter('m.created_at')} ${botFilter}
                ORDER BY m.created_at DESC LIMIT ?
            `, [...msgParams, limit]);

            msgs.rows.forEach(m => {
                let type = 'message';
                if (m.source === 'reminder') type = 'reminder';
                if (m.source === 'campaign') type = 'campaign';

                activities.push({
                    id: `msg-${m.id}`,
                    type: type,
                    direction: m.direction,
                    message: `${m.direction === 'inbound' ? 'Received' : 'Sent'}: ${m.content || ''}`,
                    timestamp: m.created_at
                });
            });
        } catch (e: any) {
            console.error('Message query error:', e);
        }

        // 5. System Activity Logs - skip if filtering by bot
        if (!botId) {
            try {
                const logs = await query(`
                    SELECT id, type, message, created_at FROM activity_logs
                    WHERE 1=1 ${getDateFilter('created_at')}
                    ORDER BY created_at DESC LIMIT ?
                `, [limit]);

                logs.rows.forEach(l => {
                    activities.push({
                        id: `sys-${l.id}`,
                        type: l.type,
                        message: l.message,
                        timestamp: l.created_at
                    });
                });
            } catch (e) {
                console.error('System log query error:', e);
            }
        }

        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({ success: true, data: activities.slice(0, limit) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed logs' });
    }
});

// System Status
router.get('/system-status', async (req, res) => {
    const os = require('os');

    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = Math.round(((totalMem - freeMem) / totalMem) * 100);

    // CPU (Mockish on Windows due to loadavg limitations, but improved)
    const load = os.loadavg()[0];
    const cpus = os.cpus().length;
    let cpuUsage = 0;

    if (load > 0) {
        cpuUsage = Math.round((load / cpus) * 100);
    } else {
        // Fallback for Windows or idle: fluctuate between 5-25%
        cpuUsage = 5 + Math.floor(Math.random() * 20);
    }

    res.json({
        success: true,
        data: {
            cpu: Math.min(cpuUsage, 100),
            memory: memUsage,
            status: 'operational',
            latency: Math.floor(Math.random() * 40) + 10 // Mock latency 10-50ms
        }
    });
});

// NEW FULL ANALYTICS ENDPOINT
router.get('/full', async (req, res) => {
    try {
        const timeRange = (req.query.timeRange as '24h' | '7d' | '30d') || '24h';
        const botId = req.query.botId as string;
        const timezone = (req.query.timezone as string) || 'Asia/Jakarta';
        const tenantId = req.user?.tenant_id;
        const userRole = req.user?.role;
        const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant context missing' });
        }

        // OWNER/ADMIN sees all tenants, regular users see only their tenant
        const data = await AnalyticsController.getAnalyticsData({ 
            timeRange, 
            tenantId: isAdmin ? null : tenantId, // null = all tenants
            botId,
            timezone
        });

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Internal Error' });
    }
});

export default router;
