/**
 * Bot User Repository
 * Manages user assignments to bots
 */
export interface BotUser {
    id: string;
    bot_id: string;
    user_id: string;
    assigned_by: string;
    assigned_at: string;
    is_active: boolean;
}
export interface BotUserWithDetails extends BotUser {
    bot_name?: string;
    user_name?: string;
    user_email?: string;
    assigned_by_name?: string;
}
declare class BotUserRepository {
    /**
     * Assign user to bot
     */
    assignUser(botId: string, userId: string, assignedBy: string): Promise<BotUser>;
    /**
     * Remove user from bot
     */
    removeUser(botId: string, userId: string): Promise<void>;
    /**
     * Deactivate user access (soft delete)
     */
    deactivateUser(botId: string, userId: string): Promise<void>;
    /**
     * Reactivate user access
     */
    reactivateUser(botId: string, userId: string): Promise<void>;
    /**
     * Find all users for a bot
     */
    findByBotId(botId: string): Promise<BotUserWithDetails[]>;
    /**
     * Find all bots for a user
     */
    findByUserId(userId: string): Promise<BotUserWithDetails[]>;
    /**
     * Check if user has access to bot
     */
    findByBotAndUser(botId: string, userId: string): Promise<BotUser | null>;
    /**
     * Check if user has access to bot (including inactive)
     */
    findByBotAndUserIncludingInactive(botId: string, userId: string): Promise<BotUser | null>;
    /**
     * Get active user count for bot
     */
    getActiveUserCount(botId: string): Promise<number>;
    /**
     * Get all active bot-user assignments
     */
    findAllActive(): Promise<BotUser[]>;
    /**
     * Bulk assign users to bot
     */
    bulkAssignUsers(botId: string, userIds: string[], assignedBy: string): Promise<BotUser[]>;
    /**
     * Remove all users from bot
     */
    removeAllUsers(botId: string): Promise<void>;
}
export declare const botUserRepository: BotUserRepository;
export {};
//# sourceMappingURL=botUserRepository.d.ts.map