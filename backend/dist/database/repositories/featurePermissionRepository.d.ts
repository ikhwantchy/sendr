/**
 * Feature Permission Repository
 * Manages feature permissions for users on bots
 */
export interface FeaturePermission {
    id: string;
    bot_id: string;
    user_id: string;
    feature_key: string;
    is_enabled: boolean;
    daily_limit: number | null;
    monthly_limit: number | null;
    created_at: string;
    updated_at: string;
}
export interface FeaturePermissionWithDetails extends FeaturePermission {
    feature_name?: string;
    feature_description?: string;
    feature_category?: string;
    is_premium?: boolean;
}
export interface FeaturePermissionInput {
    feature_key: string;
    is_enabled: boolean;
    daily_limit?: number | null;
    monthly_limit?: number | null;
}
declare class FeaturePermissionRepository {
    /**
     * Create feature permission
     */
    create(botId: string, userId: string, featureKey: string, options?: {
        is_enabled?: boolean;
        daily_limit?: number | null;
        monthly_limit?: number | null;
    }): Promise<FeaturePermission>;
    /**
     * Update feature permission
     */
    update(id: string, options: {
        is_enabled?: boolean;
        daily_limit?: number | null;
        monthly_limit?: number | null;
    }): Promise<void>;
    /**
     * Delete feature permission
     */
    delete(id: string): Promise<void>;
    /**
     * Find all permissions for a bot and user
     */
    findByBotAndUser(botId: string, userId: string): Promise<FeaturePermissionWithDetails[]>;
    /**
     * Find specific permission
     */
    findByBotUserFeature(botId: string, userId: string, featureKey: string): Promise<FeaturePermission | null>;
    /**
     * Find all permissions for a bot
     */
    findByBotId(botId: string): Promise<FeaturePermissionWithDetails[]>;
    /**
     * Bulk create permissions for user
     */
    bulkCreate(botId: string, userId: string, features: FeaturePermissionInput[]): Promise<FeaturePermission[]>;
    /**
     * Delete all permissions for user on bot
     */
    deleteByBotAndUser(botId: string, userId: string): Promise<void>;
    /**
     * Delete all permissions for bot
     */
    deleteByBotId(botId: string): Promise<void>;
    /**
     * Get enabled features for user on bot
     */
    getEnabledFeatures(botId: string, userId: string): Promise<string[]>;
    /**
     * Check if user has feature enabled
     */
    hasFeature(botId: string, userId: string, featureKey: string): Promise<boolean>;
    /**
     * Copy permissions from one user to another
     */
    copyPermissions(botId: string, fromUserId: string, toUserId: string): Promise<FeaturePermission[]>;
}
export declare const featurePermissionRepository: FeaturePermissionRepository;
export {};
//# sourceMappingURL=featurePermissionRepository.d.ts.map