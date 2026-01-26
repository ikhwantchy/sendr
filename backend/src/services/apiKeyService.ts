import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from '../database/connection-sqlite';
import auditLogService from './auditLogService';

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

class ApiKeyService {
    private readonly KEY_PREFIX = 'sk_live_';
    private readonly KEY_LENGTH = 32;
    private readonly SALT_ROUNDS = 10;

    /**
     * Generate a new API key
     */
    async generateKey(tenantId: string, userId: string, name: string, permissions?: any): Promise<{ key: string; key_id: string }> {
        // Generate random key
        const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
        const key = this.KEY_PREFIX + randomBytes.toString('hex');
        const keyPrefix = key.substring(0, 16); // First 16 chars for display

        // Hash the key for storage
        const keyHash = await bcrypt.hash(key, this.SALT_ROUNDS);

        // Default permissions
        const defaultPermissions = {
            read: true,
            write: false,
            admin: false
        };

        const finalPermissions = permissions || defaultPermissions;

        const keyId = crypto.randomUUID();

        // Insert into database
        await query(
            `INSERT INTO api_keys 
            (id, tenant_id, created_by, name, key_hash, key_prefix, permissions, rate_limit, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                keyId,
                tenantId,
                userId,
                name,
                keyHash,
                keyPrefix,
                JSON.stringify(finalPermissions),
                1000 // Default: 1000 requests per hour
            ]
        );

        // Log creation
        await auditLogService.log({
            user_id: userId,
            action_type: 'api_key.create',
            action_category: 'api',
            resource_type: 'api_key',
            resource_id: keyId,
            description: `Created API key: ${name}`,
            status: 'success'
        });

        return { key, key_id: keyId };
    }

    /**
     * Validate an API key
     */
    async validateKey(key: string, ipAddress?: string): Promise<ApiKeyValidation> {
        if (!key || !key.startsWith(this.KEY_PREFIX)) {
            return { valid: false, error: 'Invalid API key format' };
        }

        try {
            // Get all active keys (we need to check hash)
            const result = await query(
                `SELECT id, tenant_id, created_by, key_hash, permissions, rate_limit, ip_whitelist, 
                        expires_at, is_active
                 FROM api_keys 
                 WHERE is_active = 1 AND key_prefix = ?`,
                [key.substring(0, 16)]
            );

            // Find matching key by comparing hash
            for (const row of result.rows) {
                const isMatch = await bcrypt.compare(key, row.key_hash);

                if (isMatch) {
                    // Check if expired
                    if (row.expires_at && new Date(row.expires_at) < new Date()) {
                        return { valid: false, error: 'API key expired' };
                    }

                    // Check IP whitelist
                    if (row.ip_whitelist && row.ip_whitelist.length > 0 && ipAddress) {
                        if (!row.ip_whitelist.includes(ipAddress)) {
                            return { valid: false, error: 'IP address not whitelisted' };
                        }
                    }

                    // Update last used
                    await this.updateLastUsed(row.id);

                    return {
                        valid: true,
                        key_id: row.id,
                        user_id: row.created_by,
                        tenant_id: row.tenant_id,
                        permissions: row.permissions
                    };
                }
            }

            return { valid: false, error: 'Invalid API key' };
        } catch (error) {
            console.error('[ApiKey] Validation error:', error);
            return { valid: false, error: 'Validation failed' };
        }
    }

    /**
     * Check rate limit for an API key
     */
    async checkRateLimit(keyId: string): Promise<{ allowed: boolean; remaining: number }> {
        const result = await query(
            `SELECT rate_limit, request_count, updated_at 
             FROM api_keys 
             WHERE id = ?`,
            [keyId]
        );

        if (result.rows.length === 0) {
            return { allowed: false, remaining: 0 };
        }

        const { rate_limit, request_count, updated_at } = result.rows[0];
        const hourAgo = new Date(Date.now() - 3600000); // 1 hour ago

        // Reset counter if last update was more than 1 hour ago
        if (new Date(updated_at) < hourAgo) {
            await query(
                `UPDATE api_keys SET request_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [keyId]
            );
            return { allowed: true, remaining: rate_limit };
        }

        // Check if limit exceeded
        if (request_count >= rate_limit) {
            return { allowed: false, remaining: 0 };
        }

        // Increment counter
        await query(
            `UPDATE api_keys SET request_count = request_count + 1 WHERE id = ?`,
            [keyId]
        );

        return { allowed: true, remaining: rate_limit - request_count - 1 };
    }

    /**
     * Update last used timestamp
     */
    private async updateLastUsed(keyId: string): Promise<void> {
        await query(
            `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [keyId]
        );
    }

    /**
     * Get all API keys for a user
     */
    async getUserKeys(tenantId: string): Promise<ApiKey[]> {
        const result = await query(
            `SELECT id, tenant_id, created_by, name, key_prefix, permissions, rate_limit, 
                    ip_whitelist, expires_at, last_used_at, is_active, created_at, request_count
             FROM api_keys 
             WHERE tenant_id = ? 
             ORDER BY created_at DESC`,
            [tenantId]
        );

        return result.rows.map(row => this.parseKey(row));
    }

    private parseKey(row: any): ApiKey {
        if (!row) return row;
        const parsed = { ...row };
        if (typeof parsed.permissions === 'string') {
            try {
                parsed.permissions = JSON.parse(parsed.permissions);
            } catch (e) {
                parsed.permissions = {};
            }
        }
        return parsed;
    }

    /**
     * Get all API keys (admin only)
     */
    async getAllKeys(): Promise<ApiKey[]> {
        const result = await query(
            `SELECT ak.*, u.email as user_email, u.name as user_name
             FROM api_keys ak
             LEFT JOIN users u ON ak.created_by = u.id
             ORDER BY ak.created_at DESC`
        );

        return result.rows.map(row => this.parseKey(row));
    }

    /**
     * Update API key settings
     */
    async updateKey(keyId: string, updates: Partial<ApiKey>, updatedBy: string): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            fields.push(`name = ?`);
            values.push(updates.name);
        }

        if (updates.permissions !== undefined) {
            fields.push(`permissions = ?`);
            values.push(JSON.stringify(updates.permissions));
        }

        if (updates.rate_limit !== undefined) {
            fields.push(`rate_limit = ?`);
            values.push(updates.rate_limit);
        }

        if (updates.ip_whitelist !== undefined) {
            fields.push(`ip_whitelist = ?`);
            values.push(updates.ip_whitelist);
        }

        if (updates.expires_at !== undefined) {
            fields.push(`expires_at = ?`);
            values.push(updates.expires_at);
        }

        if (updates.is_active !== undefined) {
            fields.push(`is_active = ?`);
            values.push(updates.is_active);
        }

        if (fields.length === 0) return;

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(keyId);

        await query(
            `UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        // Log update
        await auditLogService.log({
            user_id: updatedBy,
            action_type: 'api_key.update',
            action_category: 'api',
            resource_type: 'api_key',
            resource_id: keyId,
            description: `Updated API key settings`,
            metadata: updates,
            status: 'success'
        });
    }

    /**
     * Revoke (deactivate) an API key
     */
    async revokeKey(keyId: string, revokedBy: string): Promise<void> {
        await query(
            `UPDATE api_keys SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [keyId]
        );

        // Log revocation
        await auditLogService.log({
            user_id: revokedBy,
            action_type: 'api_key.revoke',
            action_category: 'api',
            resource_type: 'api_key',
            resource_id: keyId,
            description: `Revoked API key`,
            status: 'success'
        });
    }

    /**
     * Delete an API key permanently
     */
    async deleteKey(keyId: string, deletedBy: string): Promise<void> {
        // Get key info for logging
        const result = await query(
            `SELECT name FROM api_keys WHERE id = ?`,
            [keyId]
        );

        const keyName = result.rows[0]?.name || 'Unknown';

        await query(`DELETE FROM api_keys WHERE id = ?`, [keyId]);

        // Log deletion
        await auditLogService.log({
            user_id: deletedBy,
            action_type: 'api_key.delete',
            action_category: 'api',
            resource_type: 'api_key',
            resource_id: keyId,
            description: `Deleted API key: ${keyName}`,
            status: 'success'
        });
    }

    /**
     * Get API key usage stats
     */
    async getKeyStats(keyId: string, days: number = 30): Promise<any> {
        const result = await query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(*) as requests,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
             FROM audit_logs
             WHERE resource_type = 'api_key' 
             AND resource_id = ?
             AND action_type = 'api.request'
             AND created_at >= DATETIME('now', '-' || ? || ' days')
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            [keyId, days]
        );

        return result.rows;
    }
}

export default new ApiKeyService();
