/**
 * Bot Repository
 * Database operations for bots table
 */
export interface Bot {
    id: string;
    tenant_id: string;
    name: string;
    phone_number: string | null;
    lid: string | null;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    is_paused: number;
    qr_code: string | null;
    qr_expires_at: string | null;
    session_data: any;
    config: any;
    ai_config: any;
    last_connected_at: string | null;
    expires_at: string | null;
    expired_reason: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
declare class BotRepository {
    /**
     * Find bot by ID (with tenant check)
     */
    findById(id: string, tenantId?: string): Promise<Bot | null>;
    /**
     * Find all bots in the system (for admins) - includes owner info
     */
    findAll(): Promise<Bot[]>;
    /**
     * Find all bots for a tenant
     */
    findByTenant(tenantId: string): Promise<Bot[]>;
    /**
     * Find bots accessible by user (tenant bots + explicit permissions)
     */
    findAccessibleByUser(userId: string, tenantId: string): Promise<Bot[]>;
    /**
     * Create a new bot
     */
    create(data: {
        tenant_id: string;
        name: string;
        config?: any;
        created_by?: string;
        expires_at?: string | null;
    }): Promise<Bot>;
    /**
     * Generate UUID v4
     */
    private generateUUID;
    /**
     * Update bot
     */
    update(id: string, data: Partial<Bot>): Promise<Bot>;
    /**
     * Delete bot
     */
    delete(id: string, tenantId?: string): Promise<void>;
    /**
     * Find connected bots
     */
    findConnected(tenantId?: string): Promise<Bot[]>;
    /**
     * Find expired bots that are still connected
     * Used by cron job to auto-disconnect expired bots
     */
    findExpiredConnectedBots(): Promise<Bot[]>;
    /**
     * Find bots expiring soon (within X days)
     */
    findExpiringSoon(days?: number): Promise<Bot[]>;
}
export declare const botRepository: BotRepository;
export {};
//# sourceMappingURL=botRepository.d.ts.map