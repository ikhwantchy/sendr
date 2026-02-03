/**
 * LID to Phone Mapping Service
 * Handles mapping between WhatsApp LID and phone numbers
 *
 * WhatsApp now uses LID (Linked ID) format for some contacts instead of phone numbers.
 * This service maintains a mapping so we can resolve LID to phone numbers.
 */
export interface LidPhoneMapping {
    id?: string;
    bot_id: string;
    lid: string;
    phone: string;
    name?: string;
    created_at?: string;
    updated_at?: string;
}
declare class LidPhoneMappingService {
    /**
     * Get phone number from LID
     */
    getPhoneByLid(botId: string, lid: string): Promise<string | null>;
    /**
     * Get LID by phone number
     */
    getLidByPhone(botId: string, phone: string): Promise<string | null>;
    /**
     * Create or update a mapping
     */
    upsertMapping(mapping: LidPhoneMapping): Promise<{
        success: boolean;
        id?: string;
        error?: string;
    }>;
    /**
     * Get all mappings for a bot
     */
    getMappingsByBot(botId: string): Promise<LidPhoneMapping[]>;
    /**
     * Delete a mapping
     */
    deleteMapping(id: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Bulk import mappings from an array
     */
    bulkImport(botId: string, mappings: {
        lid: string;
        phone: string;
        name?: string;
    }[]): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * Normalize phone number
     */
    private normalizePhone;
}
export declare const lidPhoneMappingService: LidPhoneMappingService;
export default lidPhoneMappingService;
//# sourceMappingURL=lidPhoneMappingService.d.ts.map