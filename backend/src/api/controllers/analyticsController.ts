import { query } from '../../database/connection';

type TimeRange = '30m' | '24h' | '7d' | '30d';

interface AnalyticsFilter {
    timeRange: TimeRange;
    tenantId: string | null; // null = all tenants (for OWNER/ADMIN)
    botId?: string;
    timezone?: string; // User's timezone (default: Asia/Jakarta)
}

/**
 * Format a Date to a specific timezone string
 */
function formatInTimezone(date: Date, timezone: string, format: 'hour' | 'minute' | 'day'): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
    
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    
    if (format === 'day') {
        return `${year}-${month}-${day}`;
    } else if (format === 'hour') {
        return `${year}-${month}-${day} ${hour}:00`;
    } else {
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
}

export class AnalyticsController {
    /**
     * Get comprehensive analytics data
     */
    static async getAnalyticsData(filter: AnalyticsFilter) {
        const { timeRange, tenantId, botId, timezone = 'Asia/Jakarta' } = filter;

        // 1. Calculate Date Ranges
        const now = new Date();
        let startDate = new Date();
        let prevStartDate = new Date();
        let prevEndDate = new Date(); // Effectively same as startDate
        let groupByFormat = '%Y-%m-%d';

        switch (timeRange) {
            case '30m':
                startDate.setMinutes(startDate.getMinutes() - 30);
                prevStartDate.setMinutes(prevStartDate.getMinutes() - 60);
                prevEndDate.setMinutes(prevEndDate.getMinutes() - 30);
                groupByFormat = '%Y-%m-%d %H:%M'; // Group by minute
                break;
            case '24h':
                startDate.setHours(startDate.getHours() - 24);
                prevStartDate.setHours(prevStartDate.getHours() - 48);
                prevEndDate.setHours(prevEndDate.getHours() - 24);
                groupByFormat = '%Y-%m-%d %H:00'; // Group by hour for 24h view
                break;
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                prevStartDate.setDate(prevStartDate.getDate() - 14);
                prevEndDate.setDate(prevEndDate.getDate() - 7);
                groupByFormat = '%Y-%m-%d';
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                prevStartDate.setDate(prevStartDate.getDate() - 60);
                prevEndDate.setDate(prevEndDate.getDate() - 30);
                groupByFormat = '%Y-%m-%d';
                break;
        }

        // Debug log
        console.log(`[Analytics] TimeRange: ${timeRange}, StartDate: ${startDate.toISOString()}, GroupBy: ${groupByFormat}${botId ? `, BotId: ${botId}` : ''}, TenantId: ${tenantId || 'ALL'}`);

        // Convert to SQLite-friendly format (YYYY-MM-DD HH:MM:SS) - no T, no Z, no milliseconds
        const toSqliteDate = (d: Date) => d.toISOString().replace('T', ' ').replace('Z', '').split('.')[0];
        
        const startIso = toSqliteDate(startDate);
        const prevStartIso = toSqliteDate(prevStartDate);
        const prevEndIso = toSqliteDate(prevEndDate);

        // Debug the converted format
        console.log(`[Analytics] SQLite StartDate: ${startIso}`);

        // SQL Helpers - tenantId null means show all tenants (OWNER/ADMIN)
        const tenantFilter = tenantId ? `AND b.tenant_id = ?` : '';
        const tenantParams = tenantId ? [tenantId] : [];
        const botFilter = botId ? `AND b.id = ?` : '';
        const botParams = botId ? [botId] : [];

        // 2. Fetch Summaries (Current Period vs Previous Period)

        // Total Outbound Messages (Period-based for Analytics Card + Trend)
        const totalMessagesResult = await query(`
            SELECT COUNT(*) as count FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE datetime(m.created_at) >= datetime(?)
            AND m.direction = 'outbound'
            ${tenantFilter}
            ${botFilter}
        `, [startIso, ...tenantParams, ...botParams]);
        const totalMessages = totalMessagesResult.rows[0]?.count || 0;

        // NEW: Lifetime Total Messages (The 'Original' Count from Dashboard)
        const lifetimeResult = await query(`
            SELECT COUNT(*) as count FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE m.direction = 'outbound'
            ${tenantFilter}
            ${botFilter}
        `, [...tenantParams, ...botParams]);
        const lifetimeMessages = lifetimeResult.rows[0]?.count || 0;

        const prevTotalMessagesResult = await query(`
            SELECT COUNT(*) as count FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE m.created_at >= ? AND m.created_at < ?
            ${tenantFilter}
            ${botFilter}
        `, [prevStartIso, prevEndIso, ...tenantParams, ...botParams]);
        const prevTotalMessages = prevTotalMessagesResult.rows[0]?.count || 0;

        const messageTrend = AnalyticsController.calculateTrend(totalMessages, prevTotalMessages);

        // Reminders Delivered (from logs for accuracy of delivery vs just sent)
        const remindersResult = await query(`
            SELECT COUNT(*) as count FROM reminder_logs rl
            JOIN reminders r ON rl.reminder_id = r.id
            JOIN bots b ON r.bot_id = b.id
            WHERE rl.executed_at >= ? AND rl.status = 'success'
            ${tenantId ? `AND r.tenant_id = ?` : ''}
            ${botFilter}
        `, [startIso, ...tenantParams, ...botParams]);
        const totalReminders = remindersResult.rows[0]?.count || 0;

        // Active Bots
        const botsResult = await query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'connected' THEN 1 ELSE 0 END) as active
            FROM bots b
            WHERE 1=1
            ${tenantFilter}
            ${botFilter}
        `, [...tenantParams, ...botParams]);
        const totalBots = botsResult.rows[0]?.total || 0;
        const activeBots = botsResult.rows[0]?.active || 0;

        // 3. Traffic Chart Data - BREAKDOWN BY SOURCE
        const trafficResult = await query(`
            SELECT 
                strftime(?, datetime(m.created_at, 'localtime')) as date,
                SUM(CASE WHEN (m.source = 'auto_reply' OR m.direction = 'outbound') AND (m.source IS NULL OR m.source NOT IN ('campaign', 'reminder')) THEN 1 ELSE 0 END) as auto_replies,
                SUM(CASE WHEN m.source = 'campaign' THEN 1 ELSE 0 END) as campaigns,
                SUM(CASE WHEN m.source = 'reminder' THEN 1 ELSE 0 END) as reminders,
                SUM(CASE WHEN m.direction = 'inbound' THEN 1 ELSE 0 END) as received
            FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE m.created_at >= ?
            ${tenantFilter}
            ${botFilter}
            GROUP BY 1
            ORDER BY 1
        `, [groupByFormat, startIso, ...tenantParams, ...botParams]);


        let trafficChart = trafficResult.rows;

        // Generate empty buckets to ensure full time range is displayed (in user's timezone)
        const buckets: any[] = [];

        if (timeRange === '30m') {
            // 30 Minutes: Minute intervals
            for (let i = 30; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 60 * 1000);
                const timeStr = formatInTimezone(d, timezone, 'minute');
                buckets.push({ date: timeStr, auto_replies: 0, campaigns: 0, reminders: 0, received: 0 });
            }
        } else if (timeRange === '24h') {
            // 24 Hours: Hourly intervals (Clean chart style)
            for (let i = 24; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 60 * 60 * 1000);
                const timeStr = formatInTimezone(d, timezone, 'hour');
                buckets.push({ date: timeStr, auto_replies: 0, campaigns: 0, reminders: 0, received: 0 });
            }
        } else if (timeRange === '7d' || timeRange === '30d') {
            // Days: Daily intervals
            const days = timeRange === '7d' ? 7 : 30;
            for (let i = days; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const timeStr = formatInTimezone(d, timezone, 'day');
                buckets.push({ date: timeStr, auto_replies: 0, campaigns: 0, reminders: 0, received: 0 });
            }
        }

        // Merge actual data into buckets
        if (buckets.length > 0) {
            const dataMap = new Map(trafficChart.map(row => [row.date, row]));
            trafficChart = buckets.map(bucket => {
                const actualData = dataMap.get(bucket.date);
                return actualData || bucket;
            });
        }

        // 4. Message Distribution - Real Data Now
        const distributionResult = await query(`
            SELECT source, COUNT(*) as count
            FROM messages m
            JOIN bots b ON m.bot_id = b.id
            WHERE m.created_at >= ? AND m.direction = 'outbound'
            ${tenantFilter}
            ${botFilter}
            GROUP BY source
        `, [startIso, ...tenantParams, ...botParams]);

        // Map database results to UI structure
        const distMap: any = {
            'auto_reply': 0,
            'campaign': 0,
            'reminder': 0
        };

        distributionResult.rows.forEach((r: any) => {
            const key = r.source || 'auto_reply';
            distMap[key] = (distMap[key] || 0) + r.count;
        });

        const messageDistribution = [
            { type: 'Auto-Replies', count: distMap['auto_reply'] },
            { type: 'Campaigns', count: distMap['campaign'] },
            { type: 'Reminders', count: distMap['reminder'] }
        ];

        // 5. Top Bots Leaderboard
        const topBotsResult = await query(`
            SELECT 
                b.id,
                b.name,
                b.status,
                COUNT(m.id) as volume
            FROM bots b
            LEFT JOIN messages m ON b.id = m.bot_id AND m.created_at >= ?
            WHERE 1=1
            ${tenantFilter}
            ${botFilter}
            GROUP BY b.id
            ORDER BY volume DESC
            LIMIT 5
        `, [startIso, ...tenantParams, ...botParams]);

        const maxVolume = topBotsResult.rows[0]?.volume || 1;
        const topBots = topBotsResult.rows.map((bot: any) => ({
            id: bot.id,
            name: bot.name,
            status: bot.status,
            volume: bot.volume,
            activityScore: Math.round((bot.volume / maxVolume) * 100)
        }));

        return {
            summary: {
                totalMessages, // Period Total
                lifetimeMessages, // Lifetime Total (Asli/Realtime)
                trend: messageTrend,
                campaigns: distMap['campaign'],
                reminders: totalReminders,
                activeBots,
                totalBots
            },
            trafficChart,
            messageDistribution,
            topBots
        };
    }

    private static calculateTrend(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
    }
}
