/**
 * AI Sheet Updater Service (AI Assistant)
 * Handles automatic spreadsheet updates based on AI-classified responses
 *
 * Features:
 * - UPDATE MODE: Classify incoming messages (CONFIRMED, DECLINED, MAYBE, etc.)
 *   Match sender to spreadsheet row by phone number, update specified column
 * - CREATE MODE: Extract data from messages using AI, append new rows
 * - SMART MODE: AI decides whether to update existing or create new row
 */
export type AIAssistantMode = 'update' | 'create' | 'smart';
export interface ColumnSchema {
    name: string;
    source: 'sender_name' | 'sender_phone' | 'timestamp' | 'ai_extract' | 'ai_classify' | 'static';
    ai_prompt?: string;
    static_value?: string;
    required?: boolean;
}
export interface SheetUpdaterConfig {
    id?: string;
    bot_id: string;
    name: string;
    spreadsheet_url: string;
    spreadsheet_id?: string;
    sheet_name: string;
    match_column: string;
    update_column: string;
    ai_instructions: string;
    value_mappings: ValueMapping[];
    is_enabled: boolean;
    target_jids?: string[];
    mode: AIAssistantMode;
    column_schema?: ColumnSchema[];
    trigger_keywords?: string[];
}
export interface ValueMapping {
    keywords: string[];
    value: string;
    emoji?: string;
}
export interface ClassificationResult {
    classification: string;
    confidence: number;
    mappedValue: string;
    originalMessage: string;
}
export interface ExtractionResult {
    success: boolean;
    data: Record<string, string>;
    confidence: number;
    error?: string;
}
export interface SmartModeDecision {
    action: 'update' | 'create' | 'skip';
    reason: string;
    confidence: number;
}
export interface UpdateResponse {
    success: boolean;
    message: string;
    classification?: string;
    updatedValue?: string;
    rowFound?: boolean;
    mode?: AIAssistantMode;
    extractedData?: Record<string, string>;
}
declare class AISheetUpdaterService {
    /**
     * Default value mappings for common use cases
     */
    static DEFAULT_EVENT_MAPPINGS: ValueMapping[];
    /**
     * Create a new sheet updater configuration
     */
    createConfig(config: SheetUpdaterConfig): Promise<{
        success: boolean;
        id?: string;
        error?: string;
    }>;
    /**
     * Get all configs for a bot
     */
    getConfigsByBot(botId: string): Promise<SheetUpdaterConfig[]>;
    /**
     * Get a single config by ID
     */
    getConfig(configId: string): Promise<SheetUpdaterConfig | null>;
    /**
     * Update a config
     */
    updateConfig(configId: string, updates: Partial<SheetUpdaterConfig>): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Delete a config
     */
    deleteConfig(configId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get configs by target JID - finds sheet updaters that include this target
     */
    getConfigsByTargetJid(botId: string, targetJid: string): Promise<SheetUpdaterConfig[]>;
    /**
     * Delete configs by target JID - removes sheet updaters linked to this target
     */
    deleteConfigsByTargetJid(botId: string, targetJid: string): Promise<{
        success: boolean;
        deleted: number;
        error?: string;
    }>;
    /**
     * Toggle config enabled/disabled
     */
    toggleConfig(configId: string): Promise<{
        success: boolean;
        is_enabled?: boolean;
    }>;
    /**
     * Classify a message using AI
     */
    classifyMessage(message: string, valueMappings: ValueMapping[], aiInstructions?: string): Promise<ClassificationResult>;
    /**
     * Quick AI classification without full conversation context
     * Uses the appropriate provider based on config (Gemini, Groq, OpenAI, etc.)
     */
    private quickAIClassify;
    /**
     * Extract structured data from a message using AI (for Create mode)
     * @param message - The message to extract data from
     * @param columnSchema - Schema defining what columns to fill
     * @param senderPhone - Sender's phone number
     * @param senderName - Sender's name (optional)
     * @param aiInstructions - Custom AI instructions
     */
    extractDataFromMessage(message: string, columnSchema: ColumnSchema[], senderPhone: string, senderName?: string, aiInstructions?: string): Promise<ExtractionResult>;
    /**
     * Determine whether to update existing row or create new row (for Smart mode)
     */
    determineSmartAction(message: string, config: SheetUpdaterConfig, phoneExistsInSheet: boolean, aiInstructions?: string): Promise<SmartModeDecision>;
    /**
     * Check if message contains any trigger keywords
     */
    private checkTriggerKeywords;
    /**
     * Process an incoming message and update spreadsheet if applicable
     * Supports automatic LID→Phone matching via recent campaign recipients
     * Now supports multiple modes: update, create, smart
     */
    processMessage(botId: string, senderPhone: string, message: string, senderJid?: string, senderName?: string): Promise<UpdateResponse>;
    /**
     * Handle UPDATE mode - classify message and update existing row
     */
    private handleUpdateMode;
    /**
     * Handle CREATE mode - extract data from message and append new row
     */
    private handleCreateMode;
    /**
     * Find a phone match from recent campaign recipients when LID is unknown
     * Returns the phone if there's exactly ONE unmapped recipient, otherwise null
     */
    private findPhoneFromRecentCampaign;
    /**
     * Normalize phone number for matching
     */
    private normalizePhone;
    /**
     * Log an update for tracking
     */
    private logUpdate;
    /**
     * Get update logs for a config
     */
    getUpdateLogs(configId: string, limit?: number): Promise<any[]>;
    /**
     * Get sheet data for AI chat context
     * Returns formatted sheet data that can be injected into the AI system prompt
     * @param botId - Bot ID to look up configs for
     * @param targetJid - Target group/contact JID to filter configs
     * @returns Formatted string with sheet data, or null if no relevant config
     */
    getSheetDataForChat(botId: string, targetJid: string): Promise<{
        data: string;
        sheetName: string;
        headers: string[];
    } | null>;
    /**
     * Check if a message is asking about sheet data
     * Simple keyword check to avoid unnecessary AI calls
     */
    isQueryingSheetData(message: string): boolean;
}
export declare const aiSheetUpdaterService: AISheetUpdaterService;
export default aiSheetUpdaterService;
//# sourceMappingURL=aiSheetUpdaterService.d.ts.map