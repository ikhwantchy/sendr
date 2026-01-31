
import { Request, Response } from 'express';
import { query } from '../../database/connection';

/**
 * Get all bot permissions for a specific user
 */
export const getUserPermissions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const res_permissions = await query(
            `SELECT p.*, b.name as bot_name 
             FROM bot_permissions p
             JOIN bots b ON p.bot_id = b.id
             WHERE p.user_id = ?`,
            [userId]
        );

        res.json({ success: true, data: res_permissions.rows });
    } catch (error) {
        console.error('Failed to get user permissions:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

/**
 * Update or Create permission for a specific user and bot
 */
export const updatePermission = async (req: Request, res: Response) => {
    try {
        const { userId, botId } = req.params;
        const {
            can_view,
            can_edit,
            can_delete,
            can_create_campaigns,
            can_create_rules,
            can_view_analytics,
            can_use_reminders,
            can_use_ai,
            can_manage_contacts,
            can_manage_datasources
        } = req.body;

        console.log(`[Permissions] Updating bot ${botId} for user ${userId}`, req.body);

        await query(
            `INSERT OR REPLACE INTO bot_permissions 
            (user_id, bot_id, can_view, can_edit, can_delete, can_create_campaigns, can_create_rules, can_view_analytics, can_use_reminders, can_use_ai, can_manage_contacts, can_manage_datasources)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                botId,
                can_view === true || can_view === 1 ? 1 : 0,
                can_edit === true || can_edit === 1 ? 1 : 0,
                can_delete === true || can_delete === 1 ? 1 : 0,
                can_create_campaigns === true || can_create_campaigns === 1 ? 1 : 0,
                can_create_rules === true || can_create_rules === 1 ? 1 : 0,
                can_view_analytics === true || can_view_analytics === 1 ? 1 : 0,
                can_use_reminders === true || can_use_reminders === 1 ? 1 : 0,
                can_use_ai === true || can_use_ai === 1 ? 1 : 0,
                can_manage_contacts === true || can_manage_contacts === 1 ? 1 : 0,
                can_manage_datasources === true || can_manage_datasources === 1 ? 1 : 0
            ]
        );

        res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error: any) {
        console.error('Failed to update permission:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Check access
 */
export const checkAccess = async (req: Request, res: Response) => {
    try {
        const { botId } = req.params;
        const userId = (req as any).user.id;
        const role = (req as any).user.role;

        if (role === 'OWNER' || role === 'ADMIN') {
            return res.json({
                success: true,
                data: {
                    has_access: true,
                    permissions: {
                        can_view: true, can_edit: true, can_delete: true,
                        can_create_campaigns: true, can_create_rules: true,
                        can_view_analytics: true, can_use_reminders: true, can_use_ai: true,
                        can_manage_contacts: true, can_manage_datasources: true
                    }
                }
            });
        }

        const res_perm = await query(
            'SELECT * FROM bot_permissions WHERE user_id = ? AND bot_id = ?',
            [userId, botId]
        );

        if (res_perm.rows.length === 0) {
            return res.json({ success: true, data: { has_access: false } });
        }

        const p = res_perm.rows[0];
        res.json({
            success: true,
            data: {
                has_access: p.can_view === 1,
                permissions: {
                    can_view: p.can_view === 1,
                    can_edit: p.can_edit === 1,
                    can_delete: p.can_delete === 1,
                    can_create_campaigns: p.can_create_campaigns === 1,
                    can_create_rules: p.can_create_rules === 1,
                    can_view_analytics: p.can_view_analytics === 1,
                    can_use_reminders: p.can_use_reminders === 1,
                    can_use_ai: p.can_use_ai === 1,
                    can_manage_contacts: p.can_manage_contacts === 1,
                    can_manage_datasources: p.can_manage_datasources === 1
                }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getBotPermissions = async (req: Request, res: Response) => res.json({ success: true, data: [] });
export const grantPermission = updatePermission;
export const revokePermission = async (req: Request, res: Response) => res.json({ success: true });
