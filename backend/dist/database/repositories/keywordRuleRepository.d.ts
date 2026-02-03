/**
 * Keyword Rule Repository
 */
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
declare class KeywordRuleRepository {
    /**
     * Parse JSON fields from database row
     */
    private parseRule;
    findById(id: string, tenantId?: string): Promise<KeywordRule | null>;
    findByBot(tenantId: string | undefined, botId: string): Promise<KeywordRule[]>;
    findByTenant(tenantId: string): Promise<KeywordRule[]>;
    create(data: {
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
    }): Promise<KeywordRule>;
    update(id: string, tenantId: string, data: Partial<KeywordRule>): Promise<KeywordRule>;
    private generateUUID;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const keywordRuleRepository: KeywordRuleRepository;
export {};
//# sourceMappingURL=keywordRuleRepository.d.ts.map