/**
 * API Key Service
 * Manages API key generation, validation, and rate limiting
 */
export interface ApiKey {
    id?: string;
    tenant_id: string;
    created_by: string;
    name: string;
    key_hash?: string;
    key_prefix?: string;
    permissions?: any;
    rate_limit?: number;
    ip_whitelist?: string[];
    expires_at?: Date;
    last_used_at?: Date;
    request_count?: number;
    is_active?: boolean;
    created_at?: Date;
}
export interface ApiKeyValidation {
    valid: boolean;
    key_id?: string;
    user_id?: string;
    tenant_id?: string;
    permissions?: any;
    error?: string;
}
declare class ApiKeyService {
    private readonly KEY_PREFIX;
    private readonly KEY_LENGTH;
    private readonly SALT_ROUNDS;
    /**
     * Generate a new API key
     */
    generateKey(tenantId: string, userId: string, name: string, permissions?: any): Promise<{
        key: string;
        key_id: string;
    }>;
    /**
     * Validate an API key
     */
    validateKey(key: string, ipAddress?: string): Promise<ApiKeyValidation>;
    /**
     * Check rate limit for an API key
     */
    checkRateLimit(keyId: string): Promise<{
        allowed: boolean;
        remaining: number;
    }>;
    /**
     * Update last used timestamp
     */
    private updateLastUsed;
    /**
     * Get all API keys for a user
     */
    getUserKeys(tenantId: string): Promise<ApiKey[]>;
    private parseKey;
    /**
     * Get all API keys (admin only)
     */
    getAllKeys(): Promise<ApiKey[]>;
    /**
     * Update API key settings
     */
    updateKey(keyId: string, updates: Partial<ApiKey>, updatedBy: string): Promise<void>;
    /**
     * Revoke (deactivate) an API key
     */
    revokeKey(keyId: string, revokedBy: string): Promise<void>;
    /**
     * Delete an API key permanently
     */
    deleteKey(keyId: string, deletedBy: string): Promise<void>;
    /**
     * Get API key usage stats
     */
    getKeyStats(keyId: string, days?: number): Promise<any>;
}
declare const _default: ApiKeyService;
export default _default;
//# sourceMappingURL=apiKeyService.d.ts.map