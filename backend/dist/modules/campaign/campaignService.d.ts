/**
 * Enhanced Campaign Service
 * ============================================
 * - Multi-source contact import (Manual, CSV, Google Sheets)
 * - Template variable support
 * - Anti-spam configuration
 * - Campaign analytics
 */
export interface ContactData {
    phone: string;
    name: string;
    [key: string]: string;
}
export interface CampaignCreateData {
    tenant_id: string;
    bot_id: string;
    name: string;
    message_template: string;
    contact_source: 'manual' | 'csv' | 'sheets';
    contacts?: ContactData[];
    sheets_url?: string;
    sheets_tab?: string;
    delay_preset?: 'safe' | 'moderate' | 'aggressive' | 'custom';
    custom_delay_config?: {
        minDelay: number;
        maxDelay: number;
        batchSize: number;
        batchPauseMin: number;
        batchPauseMax: number;
        dailyLimit: number;
    };
    image_url?: string;
    scheduled_at?: string;
    campaign_type?: 'freetext' | 'template';
    template_name?: string;
    template_language?: string;
    template_components_json?: string;
}
declare class CampaignService {
    /**
     * Get available template variables
     */
    getAvailableVariables(): {
        variable: string;
        description: string;
        example: string;
    }[];
    /**
     * Parse contacts from CSV text
     */
    parseCSVContacts(csvText: string): {
        contacts: ContactData[];
        headers: string[];
    };
    /**
     * Parse a single CSV line (handles quoted values with commas)
     */
    private parseCSVLine;
    /**
     * Fetch contacts from Google Sheets (public)
     */
    fetchSheetsContacts(url: string, tabName?: string): Promise<{
        contacts: ContactData[];
        headers: string[];
    }>;
    /**
     * Parse manual input contacts (one per line)
     */
    parseManualContacts(text: string): {
        contacts: ContactData[];
        headers: string[];
    };
    /**
     * Create a new campaign
     */
    createCampaign(data: CampaignCreateData): Promise<any>;
    /**
     * Start a campaign immediately
     */
    startCampaign(campaignId: string): Promise<void>;
    /**
     * Get campaign by ID with recipients summary
     */
    getCampaign(campaignId: string): Promise<any>;
    /**
     * List campaigns with filters
     */
    listCampaigns(tenantId: string, botId?: string, status?: string, limit?: number, offset?: number): Promise<any[]>;
    /**
     * Get campaign recipients with pagination
     */
    getCampaignRecipients(campaignId: string, status?: string, limit?: number, offset?: number): Promise<any>;
    /**
     * Retry failed recipients
     */
    retryFailedRecipients(campaignId: string): Promise<number>;
    /**
     * Delete campaign and recipients
     */
    deleteCampaign(campaignId: string): Promise<void>;
    /**
     * Get campaign statistics
     */
    getCampaignStats(tenantId: string, botId?: string): Promise<any>;
    updateRecipientStatus(recipientId: string, status: 'sent' | 'failed', error?: string): Promise<void>;
}
export declare const campaignService: CampaignService;
export {};
//# sourceMappingURL=campaignService.d.ts.map