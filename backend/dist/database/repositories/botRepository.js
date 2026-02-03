"use strict";
/**
 * Bot Repository
 * Database operations for bots table
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.botRepository = void 0;
const connection_1 = require("../connection");
class BotRepository {
    /**
     * Find bot by ID (with tenant check)
     */
    async findById(id, tenantId) {
        const sql = tenantId
            ? 'SELECT * FROM bots WHERE id = ? AND tenant_id = ?'
            : 'SELECT * FROM bots WHERE id = ?';
        const params = tenantId ? [id, tenantId] : [id];
        const result = await (0, connection_1.query)(sql, params);
        const bot = result.rows[0] || null;
        // Parse JSON fields
        if (bot) {
            if (bot.config) {
                try {
                    bot.config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
                }
                catch (e) {
                    bot.config = {};
                }
            }
            if (bot.ai_config) {
                try {
                    bot.ai_config = typeof bot.ai_config === 'string' ? JSON.parse(bot.ai_config) : bot.ai_config;
                }
                catch (e) {
                    bot.ai_config = { enabled: false };
                }
            }
        }
        return bot;
    }
    /**
     * Find all bots in the system (for admins)
     */
    async findAll() {
        const result = await (0, connection_1.query)('SELECT * FROM bots ORDER BY created_at DESC');
        return result.rows.map((bot) => {
            if (bot.config) {
                try {
                    bot.config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
                }
                catch (e) {
                    bot.config = {};
                }
            }
            if (bot.ai_config) {
                try {
                    bot.ai_config = typeof bot.ai_config === 'string' ? JSON.parse(bot.ai_config) : bot.ai_config;
                }
                catch (e) {
                    bot.ai_config = { enabled: false };
                }
            }
            return bot;
        });
    }
    /**
     * Find all bots for a tenant
     */
    async findByTenant(tenantId) {
        const result = await (0, connection_1.query)('SELECT * FROM bots WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
        // Parse JSON fields for each bot
        return result.rows.map((bot) => {
            if (bot.config) {
                try {
                    bot.config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
                }
                catch (e) {
                    bot.config = {};
                }
            }
            if (bot.ai_config) {
                try {
                    bot.ai_config = typeof bot.ai_config === 'string' ? JSON.parse(bot.ai_config) : bot.ai_config;
                }
                catch (e) {
                    bot.ai_config = { enabled: false };
                }
            }
            return bot;
        });
    }
    /**
     * Find bots accessible by user (tenant bots + explicit permissions)
     */
    async findAccessibleByUser(userId, tenantId) {
        // FIXED: Using correct table name 'bot_permissions'
        const result = await (0, connection_1.query)(`
            SELECT DISTINCT b.* FROM bots b
            LEFT JOIN bot_permissions p ON b.id = p.bot_id AND p.user_id = ?
            WHERE b.tenant_id = ? OR (p.user_id = ? AND (p.can_view = 1 OR p.can_view = 'true'))
            ORDER BY b.created_at DESC
        `, [userId, tenantId, userId]);
        return result.rows.map((bot) => {
            if (bot.config) {
                try {
                    bot.config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
                }
                catch (e) {
                    bot.config = {};
                }
            }
            if (bot.ai_config) {
                try {
                    bot.ai_config = typeof bot.ai_config === 'string' ? JSON.parse(bot.ai_config) : bot.ai_config;
                }
                catch (e) {
                    bot.ai_config = { enabled: false };
                }
            }
            return bot;
        });
    }
    /**
     * Create a new bot
     */
    async create(data) {
        // Generate UUID for the bot
        const botId = this.generateUUID();
        const configJson = data.config ? JSON.stringify(data.config) : JSON.stringify({});
        // Insert bot with explicit ID
        await (0, connection_1.query)(`INSERT INTO bots (id, tenant_id, name, config, created_by)
       VALUES (?, ?, ?, ?, ?)`, [botId, data.tenant_id, data.name, configJson, data.created_by]);
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
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Update bot
     */
    async update(id, data) {
        const fields = [];
        const values = [];
        // Always update updated_at
        data.updated_at = new Date().toISOString();
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
                fields.push(`${key} = ?`);
                // Stringify JSON fields if necessary
                if ((key === 'config' || key === 'ai_config' || key === 'session_data') && typeof value === 'object') {
                    values.push(JSON.stringify(value));
                }
                else {
                    values.push(value);
                }
            }
        }
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        await (0, connection_1.query)(`UPDATE bots SET ${fields.join(', ')} WHERE id = ?`, values);
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
    async delete(id, tenantId) {
        const sql = tenantId
            ? 'DELETE FROM bots WHERE id = ? AND tenant_id = ?'
            : 'DELETE FROM bots WHERE id = ?';
        const params = tenantId ? [id, tenantId] : [id];
        await (0, connection_1.query)(sql, params);
    }
    /**
     * Find connected bots
     */
    async findConnected(tenantId) {
        const sql = tenantId
            ? 'SELECT * FROM bots WHERE status = ? AND tenant_id = ?'
            : 'SELECT * FROM bots WHERE status = ?';
        const params = tenantId ? ['connected', tenantId] : ['connected'];
        const result = await (0, connection_1.query)(sql, params);
        return result.rows;
    }
}
exports.botRepository = new BotRepository();
//# sourceMappingURL=botRepository.js.map