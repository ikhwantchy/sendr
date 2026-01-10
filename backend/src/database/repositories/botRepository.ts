/**
 * Bot Repository
 * Database operations for bots table
 */

import { query } from '../connection';

export interface Bot {
    id: string;
    tenant_id: string;
    name: string;
    phone_number: string | null;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    qr_code: string | null;
    qr_expires_at: string | null;
    session_data: any;
    config: any;
    last_connected_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

class BotRepository {
    /**
     * Find bot by ID (with tenant check)
     */
    async findById(id: string, tenantId?: string): Promise<Bot | null> {
        const sql = tenantId
            ? 'SELECT * FROM bots WHERE id = ? AND tenant_id = ?'
            : 'SELECT * FROM bots WHERE id = ?';

        const params = tenantId ? [id, tenantId] : [id];
        const result = await query(sql, params);

        const bot = result.rows[0] || null;

        // Parse config JSON
        if (bot && bot.config) {
            try {
                bot.config = JSON.parse(bot.config);
            } catch (e) {
                bot.config = {};
            }
        }

        return bot;
    }

    /**
     * Find all bots for a tenant
     */
    async findByTenant(tenantId: string): Promise<Bot[]> {
        const result = await query(
            'SELECT * FROM bots WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );

        // Parse config JSON for each bot
        return result.rows.map((bot: Bot) => {
            if (bot.config) {
                try {
                    bot.config = JSON.parse(bot.config as any);
                } catch (e) {
                    bot.config = {};
                }
            }
            return bot;
        });
    }

    /**
     * Create a new bot
     */
    async create(data: {
        tenant_id: string;
        name: string;
        config?: any;
        created_by?: string;
    }): Promise<Bot> {
        // Generate UUID for the bot
        const botId = this.generateUUID();
        const configJson = data.config ? JSON.stringify(data.config) : JSON.stringify({});

        // Insert bot with explicit ID
        await query(
            `INSERT INTO bots (id, tenant_id, name, config, created_by)
       VALUES (?, ?, ?, ?, ?)`,
            [botId, data.tenant_id, data.name, configJson, data.created_by]
        );

        // Fetch the created bot
        const bot = await this.findById(botId);

        if (!bot) {
            throw new Error('Failed to create bot');
        }

        return bot;
    }

    /**
     * Generate UUID v4
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Update bot
     */
    async update(id: string, data: Partial<Bot>): Promise<Bot> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        // SQLite doesn't support RETURNING *, so we update then fetch
        await query(
            `UPDATE bots SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        // Fetch updated bot
        const bot = await this.findById(id);
        if (!bot) {
            throw new Error('Bot not found after update');
        }

        return bot;
    }

    /**
     * Delete bot
     */
    async delete(id: string, tenantId: string): Promise<void> {
        await query(
            'DELETE FROM bots WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
    }

    /**
     * Find connected bots
     */
    async findConnected(tenantId?: string): Promise<Bot[]> {
        const sql = tenantId
            ? 'SELECT * FROM bots WHERE status = ? AND tenant_id = ?'
            : 'SELECT * FROM bots WHERE status = ?';

        const params = tenantId ? ['connected', tenantId] : ['connected'];
        const result = await query(sql, params);

        return result.rows;
    }
}

export const botRepository = new BotRepository();
