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
        const userId = (req as any).user.id; // Still used for some personal filters if needed

        // Get total bots (using tenant_id for consistency with analytics)
        const botsResult = await query(`
            SELECT COUNT(*) as count 
            FROM bots 
            WHERE tenant_id = ?
        `, [tenantId]);

        // Get active rules
        const rulesResult = await query(`
            SELECT COUNT(*) as count 
            FROM keyword_rules r
            INNER JOIN bots b ON r.bot_id = b.id
            WHERE b.tenant_id = ? AND r.is_active = 1
        `, [tenantId]);

        // Get outbound messages
        let messagesSent = 0;
        try {
            const messagesResult = await query(`
                SELECT COUNT(*) as count 
                FROM messages m
                INNER JOIN bots b ON m.bot_id = b.id
                WHERE b.tenant_id = ? AND m.direction = 'outbound'
            `, [tenantId]);
            messagesSent = messagesResult.rows[0]?.count || 0;
        } catch (err) {
            // Check if table exists error?
        }

        // Get campaigns
        let campaigns = 0;
        try {
            const campaignsResult = await query(`
                SELECT COUNT(*) as count 
                FROM campaigns c
                INNER JOIN bots b ON c.bot_id = b.id
                WHERE b.tenant_id = ?
            `, [tenantId]);
            campaigns = campaignsResult.rows[0]?.count || 0;
        } catch (err) { }

        // Get total users
        let totalUsers = 0;
        try {
            const usersResult = await query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE tenant_id = ?
            `, [tenantId]);
            totalUsers = usersResult.rows[0]?.count || 0;
        } catch (err) { }

        // Get active users (logged in within last 15 minutes)
        let activeUsers = 0;
        try {
            const activeUsersResult = await query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE tenant_id = ? 
                AND last_login_at IS NOT NULL 
                AND datetime(last_login_at) >= datetime('now', '-15 minutes')
            `, [tenantId]);
            activeUsers = activeUsersResult.rows[0]?.count || 0;
        } catch (err) { }

        res.json({
            success: true,
            data: {
                totalBots: botsResult.rows[0]?.count || 0,
                activeRules: rulesResult.rows[0]?.count || 0,
                campaigns: campaigns,
                messagesSent: messagesSent,
                totalUsers: totalUsers,
                activeUsers: activeUsers
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

        // Helper for bot filtering
        const getBotFilter = (tableAlias: string, params: any[]) => {
            if (!botId) return '';
            params.push(botId);
            return `AND ${tableAlias}.id = ?`;
        };

        // 1. Campaigns
        try {
            const campaignParams: any[] = [userId];
            const campaigns = await query(`
                SELECT c.id, c.name, c.status, c.created_at, c.updated_at, b.name as bot_name
                FROM campaigns c JOIN bots b ON c.bot_id = b.id
                WHERE b.created_by = ? ${getDateFilter('c.updated_at')} ${getBotFilter('b', campaignParams)}
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
            const botParams: any[] = [userId];
            const bots = await query(`
                SELECT id, name, status, updated_at FROM bots 
                WHERE created_by = ? ${getDateFilter('updated_at')} ${getBotFilter('bots', botParams)}
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
            const ruleParams: any[] = [userId];
            const rules = await query(`
                SELECT r.id, r.keyword, r.created_at, b.name as bot_name 
                FROM keyword_rules r JOIN bots b ON r.bot_id = b.id
                WHERE b.created_by = ? ${getDateFilter('r.created_at')} ${getBotFilter('b', ruleParams)}
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
            const msgParams: any[] = [userId];
            const msgs = await query(`
                SELECT m.id, m.content, m.created_at, m.source, m.direction, b.name as bot_name
                FROM messages m JOIN bots b ON m.bot_id = b.id
                WHERE b.created_by = ? ${getDateFilter('m.created_at')} ${getBotFilter('b', msgParams)}
                ORDER BY m.created_at DESC LIMIT ?
            `, [...msgParams, limit]);

            msgs.rows.forEach(m => {
                let type = 'message';
                if (m.source === 'reminder') type = 'reminder';
                if (m.source === 'campaign') type = 'campaign'; // Though campaigns are usually tracked in their own table, individual msgs also helpful

                activities.push({
                    id: `msg-${m.id}`,
                    type: type,
                    direction: m.direction, // Pass direction to frontend
                    message: `${m.direction === 'inbound' ? 'Received' : 'Sent'}: ${m.content || ''}`,
                    timestamp: m.created_at
                });
            });
        } catch (e: any) {
            console.error('Message query error:', e);
            console.error('Message query error details:', {
                message: e?.message,
                code: e?.code,
                errno: e?.errno
            });
        }

        // 5. System Activity Logs (Persistent History) - ONLY if no botId is specified, or fetch specific?
        // Usually system logs are global. If filtering by bot, maybe skip or filter message content?
        // For now, let's skip system logs if filtering by bot to keep it clean.
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
        const tenantId = req.user?.tenant_id;

        if (!tenantId) {
            return res.status(400).json({ success: false, message: 'Tenant context missing' });
        }

        const data = await AnalyticsController.getAnalyticsData({ timeRange, tenantId, botId });

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
