import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../../database/connection-sqlite';

const router = Router();
router.use(authenticate);

router.get('/dashboard-stats', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // Get total bots for this user (created_by)
        const botsResult = await query(`
            SELECT COUNT(*) as count 
            FROM bots 
            WHERE created_by = ?
        `, [userId]);

        // Get active rules count (using keyword_rules table)
        const rulesResult = await query(`
            SELECT COUNT(*) as count 
            FROM keyword_rules r
            INNER JOIN bots b ON r.bot_id = b.id
            WHERE b.created_by = ? AND r.is_active = 1
        `, [userId]);

        // For campaigns and messages, return 0 since tables don't exist in SQLite yet
        // These will be populated when the full schema is migrated

        res.json({
            success: true,
            data: {
                totalBots: botsResult.rows[0]?.count || 0,
                activeRules: rulesResult.rows[0]?.count || 0,
                campaigns: 0, // Table not in SQLite schema yet
                messagesSent: 0 // Table not in SQLite schema yet
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics'
        });
    }
});

router.get('/', async (req, res) => {
    res.json({ success: true, data: {}, message: 'Analytics routes - implement as needed' });
});

export default router;
