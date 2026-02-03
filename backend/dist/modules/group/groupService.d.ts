/**
 * Group Service - WhatsApp Group Detection & Management
 * ✅ Auto-detect groups where bot is member
 * ✅ Store in wa_groups table
 * ✅ Handle group activation via #enable_reminder
 */
declare class GroupService {
    /**
     * Sync groups for a bot
     * Called when bot connects
     */
    syncGroupsForBot(botId: string, retryCount?: number): Promise<number>;
    /**
     * Upsert group into database
     */
    upsertGroup(botId: string, groupId: string, groupName: string): Promise<void>;
    /**
     * Activate group for reminders
     */
    activateGroup(botId: string, groupId: string): Promise<boolean>;
    /**
     * Deactivate group
     */
    deactivateGroup(botId: string, groupId: string): Promise<boolean>;
    /**
     * Get active groups for bot
     */
    getActiveGroups(botId: string): Promise<any[]>;
    /**
     * Get all groups for bot
     */
    getAllGroups(botId: string): Promise<any[]>;
    /**
     * Handle #enable_reminder command in group
     */
    handleEnableCommand(botId: string, groupId: string, senderId: string): Promise<string>;
    /**
     * Handle #disable_reminder command in group
     */
    handleDisableCommand(botId: string, groupId: string, senderId: string): Promise<string>;
}
export declare const groupService: GroupService;
export {};
//# sourceMappingURL=groupService.d.ts.map