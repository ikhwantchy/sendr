/**
 * Keyword Rule Repository
 */

import { query } from '../connection-sqlite';

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

    async findByBot(tenantId: string, botId: string): Promise<KeywordRule[]> {
        const result = await query(
            `SELECT * FROM keyword_rules 
       WHERE tenant_id = ? AND bot_id = ?
       ORDER BY priority DESC, created_at ASC`,
            [tenantId, botId]
        );

        return result.rows.map(rule => this.parseRule(rule));
    }

    async findByTenant(tenantId: string): Promise<KeywordRule[]> {
        const result = await query(
            'SELECT * FROM keyword_rules WHERE tenant_id = ? ORDER BY created_at DESC',
            [tenantId]
        );

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

    async update(id: string, tenantId: string, data: Partial<KeywordRule>): Promise<KeywordRule> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && key !== 'id' && key !== 'tenant_id') {
                if (key === 'actions' || key === 'metadata') {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(JSON.stringify(value));
                } else {
                    fields.push(`${key} = $${paramIndex}`);
                    values.push(value);
                }
                paramIndex++;
            }
        }

        values.push(id, tenantId);

        await query(
            `UPDATE keyword_rules SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}`,
            values
        );

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

    async delete(id: string, tenantId: string): Promise<void> {
        await query(
            'DELETE FROM keyword_rules WHERE id = ? AND tenant_id = ?',
            [id, tenantId]
        );
    }
}

export const keywordRuleRepository = new KeywordRuleRepository();
