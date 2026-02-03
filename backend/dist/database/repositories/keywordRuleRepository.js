"use strict";
/**
 * Keyword Rule Repository
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.keywordRuleRepository = void 0;
const connection_1 = require("../connection");
class KeywordRuleRepository {
    /**
     * Parse JSON fields from database row
     */
    parseRule(rule) {
        if (!rule)
            return rule;
        // Parse actions if it's a string
        if (typeof rule.actions === 'string') {
            try {
                rule.actions = JSON.parse(rule.actions);
            }
            catch (e) {
                console.error('Failed to parse actions:', e);
                rule.actions = [];
            }
        }
        // Parse metadata if it's a string
        if (typeof rule.metadata === 'string') {
            try {
                rule.metadata = JSON.parse(rule.metadata);
            }
            catch (e) {
                console.error('Failed to parse metadata:', e);
                rule.metadata = {};
            }
        }
        // Ensure is_active is boolean
        rule.is_active = !!rule.is_active;
        return rule;
    }
    async findById(id, tenantId) {
        const sql = tenantId
            ? 'SELECT * FROM keyword_rules WHERE id = ? AND tenant_id = ?'
            : 'SELECT * FROM keyword_rules WHERE id = ?';
        const params = tenantId ? [id, tenantId] : [id];
        const result = await (0, connection_1.query)(sql, params);
        const rule = result.rows[0] || null;
        return rule ? this.parseRule(rule) : null;
    }
    async findByBot(tenantId, botId) {
        const sql = tenantId
            ? 'SELECT * FROM keyword_rules WHERE tenant_id = ? AND bot_id = ? ORDER BY priority DESC, created_at ASC'
            : 'SELECT * FROM keyword_rules WHERE bot_id = ? ORDER BY priority DESC, created_at ASC';
        const params = tenantId ? [tenantId, botId] : [botId];
        const result = await (0, connection_1.query)(sql, params);
        return result.rows.map(rule => this.parseRule(rule));
    }
    async findByTenant(tenantId) {
        const result = await (0, connection_1.query)('SELECT * FROM keyword_rules WHERE tenant_id = ? ORDER BY created_at DESC', [tenantId]);
        return result.rows.map(rule => this.parseRule(rule));
    }
    async create(data) {
        const ruleId = this.generateUUID();
        await (0, connection_1.query)(`INSERT INTO keyword_rules 
       (id, tenant_id, bot_id, name, keyword, match_type, scope, scope_target, priority, actions, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            ruleId,
            data.tenant_id,
            data.bot_id,
            data.name,
            data.keyword,
            data.match_type,
            data.scope,
            data.scope_target || null,
            data.priority || 0,
            JSON.stringify(data.actions),
            JSON.stringify(data.metadata || {}),
            data.created_by || null,
        ]);
        const rule = await this.findById(ruleId);
        if (!rule) {
            throw new Error('Failed to create rule');
        }
        return rule;
    }
    async update(id, tenantId, data) {
        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
                fields.push(`${key} = ?`);
                if (key === 'actions' || key === 'metadata') {
                    values.push(JSON.stringify(value));
                }
                else if (key === 'is_active') {
                    values.push(value ? 1 : 0);
                }
                else {
                    values.push(value);
                }
            }
        }
        if (fields.length === 0)
            return await this.findById(id, tenantId);
        values.push(id, tenantId);
        await (0, connection_1.query)(`UPDATE keyword_rules SET ${fields.join(', ')} 
             WHERE id = ? AND tenant_id = ?`, values);
        const rule = await this.findById(id, tenantId);
        if (!rule) {
            throw new Error('Rule not found after update');
        }
        return rule;
    }
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    async delete(id, tenantId) {
        await (0, connection_1.query)('DELETE FROM keyword_rules WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    }
}
exports.keywordRuleRepository = new KeywordRuleRepository();
//# sourceMappingURL=keywordRuleRepository.js.map