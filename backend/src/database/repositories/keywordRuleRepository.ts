/**
 * Keyword Rule Repository
 */

import { query } from '../connection';

export interface KeywordRule {
    id: string;
    tenant_id: string;
    bot_id: string;
    name: string;
    keyword: string;
    match_type: 'equals' | 'contains' | 'regex';
    scope: 'global' | 'group' | 'contact';
    scope_target: string | null;
    priority: number;
    is_active: boolean;
    actions: any[];
    metadata: any;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

class KeywordRuleRepository {
    /**
     * Parse JSON fields from database row
     */
    private parseRule(rule: any): KeywordRule {
        if (!rule) return rule;

        // Parse actions if it's a string
        if (typeof rule.actions === 'string') {
            try {
                rule.actions = JSON.parse(rule.actions);
            } catch (e) {
                console.error('Failed to parse actions:', e);
                rule.actions = [];
            }
        }

        // Parse metadata if it's a string
        if (typeof rule.metadata === 'string') {
            try {
                rule.metadata = JSON.parse(rule.metadata);
            } catch (e) {
                console.error('Failed to parse metadata:', e);
                rule.metadata = {};
            }
        }

        // Ensure is_active is boolean
        rule.is_active = !!rule.is_active;

        return rule;
    }

    async findById(id: string, tenantId?: string): Promise<KeywordRule | null> {
        const sql = tenantId
            ? 'SELECT * FROM keyword_rules WHERE id = ? AND tenant_id = ?'
            : 'SELECT * FROM keyword_rules WHERE id = ?';

        const params = tenantId ? [id, tenantId] : [id];
        const result = await query(sql, params);

        const rule = result.rows[0] || null;
        return rule ? this.parseRule(rule) : null;
    }

    async findByBot(tenantId: string | undefined, botId: string): Promise<KeywordRule[]> {
        const sql = tenantId
            ? 'SELECT * FROM keyword_rules WHERE tenant_id = ? AND bot_id = ? ORDER BY priority DESC, created_at ASC'
            : 'SELECT * FROM keyword_rules WHERE bot_id = ? ORDER BY priority DESC, created_at ASC';

        const params = tenantId ? [tenantId, botId] : [botId];
        const result = await query(sql, params);

        return result.rows.map(rule => this.parseRule(rule));
    }

    async findByTenant(tenantId?: string): Promise<KeywordRule[]> {
        const sql = tenantId
            ? 'SELECT * FROM keyword_rules WHERE tenant_id = ? ORDER BY created_at DESC'
            : 'SELECT * FROM keyword_rules ORDER BY created_at DESC';

        const params = tenantId ? [tenantId] : [];
        const result = await query(sql, params);

        return result.rows.map(rule => this.parseRule(rule));
    }

    async create(data: {
        tenant_id: string;
        bot_id: string;
        name: string;
        keyword: string;
        match_type: 'equals' | 'contains' | 'regex';
        scope: 'global' | 'group' | 'contact';
        scope_target?: string;
        priority?: number;
        actions: any[];
        metadata?: any;
        created_by?: string;
    }): Promise<KeywordRule> {
        const ruleId = this.generateUUID();

        await query(
            `INSERT INTO keyword_rules 
       (id, tenant_id, bot_id, name, keyword, match_type, scope, scope_target, priority, actions, metadata, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
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
            ]
        );

        const rule = await this.findById(ruleId);
        if (!rule) {
            throw new Error('Failed to create rule');
        }
        return rule;
    }

    async update(id: string, tenantId: string | undefined, data: Partial<KeywordRule>): Promise<KeywordRule> {
        const fields: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
                fields.push(`${key} = ?`);
                if (key === 'actions' || key === 'metadata') {
                    values.push(JSON.stringify(value));
                } else if (key === 'is_active') {
                    values.push(value ? 1 : 0);
                } else {
                    values.push(value);
                }
            }
        }

        if (fields.length === 0) return await this.findById(id, tenantId) as KeywordRule;

        const sql = tenantId
            ? `UPDATE keyword_rules SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`
            : `UPDATE keyword_rules SET ${fields.join(', ')} WHERE id = ?`;

        if (tenantId) {
            values.push(id, tenantId);
        } else {
            values.push(id);
        }

        await query(sql, values);

        const rule = await this.findById(id, tenantId);
        if (!rule) {
            throw new Error('Rule not found after update');
        }
        return rule;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async delete(id: string, tenantId?: string): Promise<void> {
        const sql = tenantId
            ? 'DELETE FROM keyword_rules WHERE id = ? AND tenant_id = ?'
            : 'DELETE FROM keyword_rules WHERE id = ?';

        const params = tenantId ? [id, tenantId] : [id];
        await query(sql, params);
    }
}

export const keywordRuleRepository = new KeywordRuleRepository();
