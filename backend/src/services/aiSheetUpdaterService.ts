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

import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { googleSheetsWriteService } from './googleSheetsWriteService';
import { llmService } from './llm/llmService';

// Mode types for AI Assistant
export type AIAssistantMode = 'update' | 'create' | 'smart';

// Column schema for Create mode - defines what data to extract/fill
export interface ColumnSchema {
    name: string;           // Column header name in spreadsheet
    source: 'sender_name' | 'sender_phone' | 'timestamp' | 'ai_extract' | 'ai_classify' | 'static';
    ai_prompt?: string;     // For ai_extract - what to extract from message
    static_value?: string;  // For static source - fixed value
    required?: boolean;     // Whether this field is required
}

export interface SheetUpdaterConfig {
    id?: string;
    bot_id: string;
    name: string;
    spreadsheet_url: string;
    spreadsheet_id?: string;
    sheet_name: string;
    match_column: string;        // Column to match (e.g., "NoHP", "Phone") - for update/smart mode
    update_column: string;       // Column to update (e.g., "Status") - for update mode
    ai_instructions: string;     // Instructions for AI classification/extraction
    value_mappings: ValueMapping[];
    is_enabled: boolean;
    target_jids?: string[];      // Optional: only apply to these groups/contacts
    // New fields for extended modes
    mode: AIAssistantMode;       // 'update' | 'create' | 'smart'
    column_schema?: ColumnSchema[];  // For create mode - columns to fill
    trigger_keywords?: string[]; // Optional: only trigger on these keywords
}

export interface ValueMapping {
    keywords: string[];          // Keywords that trigger this mapping
    value: string;               // Value to write to spreadsheet
    emoji?: string;              // Optional emoji prefix
}

export interface ClassificationResult {
    classification: string;      // e.g., "CONFIRMED", "DECLINED", "MAYBE"
    confidence: number;          // 0-1 confidence score
    mappedValue: string;         // The actual value to write
    originalMessage: string;
}

// Result from AI data extraction (for Create mode)
export interface ExtractionResult {
    success: boolean;
    data: Record<string, string>;  // Column name -> extracted value
    confidence: number;
    error?: string;
}

// Result from AI smart mode decision
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

class AISheetUpdaterService {
    
    /**
     * Default value mappings for common use cases
     */
    static DEFAULT_EVENT_MAPPINGS: ValueMapping[] = [
        {
            keywords: ['hadir', 'datang', 'bisa', 'oke', 'ok', 'siap', 'gas', 'ikut', 'join', 'yes', 'iya', 'yoi', 'confirm', 'confirmed', 'acc'],
            value: 'CONFIRMED',
            emoji: '✅'
        },
        {
            keywords: ['tidak', 'gabisa', 'ga bisa', 'gak bisa', 'cancel', 'batal', 'skip', 'no', 'nope', 'absent', 'izin', 'halangan'],
            value: 'DECLINED',
            emoji: '❌'
        },
        {
            keywords: ['mungkin', 'maybe', 'belum tau', 'belum tahu', 'nanti', 'liat nanti', 'tentative', 'pending'],
            value: 'MAYBE',
            emoji: '⏳'
        }
    ];

    /**
     * Create a new sheet updater configuration
     */
    async createConfig(config: SheetUpdaterConfig): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const id = config.id || uuidv4();
            const spreadsheetId = googleSheetsWriteService.extractSpreadsheetId(config.spreadsheet_url);

            if (!spreadsheetId) {
                return { success: false, error: 'Invalid spreadsheet URL' };
            }

            // Validate write access
            const validation = await googleSheetsWriteService.validateWriteAccess(spreadsheetId);
            if (!validation.valid) {
                return { success: false, error: validation.message };
            }

            // Check if sheet exists
            if (!validation.sheets?.includes(config.sheet_name)) {
                return { 
                    success: false, 
                    error: `Sheet "${config.sheet_name}" not found. Available: ${validation.sheets?.join(', ')}` 
                };
            }

            // Default mode to 'update' if not specified
            const mode = config.mode || 'update';

            await query(`
                INSERT INTO ai_sheet_updaters (
                    id, bot_id, name, spreadsheet_url, spreadsheet_id, sheet_name,
                    match_column, update_column, ai_instructions, value_mappings,
                    is_enabled, target_jids, mode, column_schema, trigger_keywords,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                id,
                config.bot_id,
                config.name,
                config.spreadsheet_url,
                spreadsheetId,
                config.sheet_name,
                config.match_column,
                config.update_column,
                config.ai_instructions,
                JSON.stringify(config.value_mappings),
                config.is_enabled ? 1 : 0,
                config.target_jids ? JSON.stringify(config.target_jids) : null,
                mode,
                config.column_schema ? JSON.stringify(config.column_schema) : null,
                config.trigger_keywords ? JSON.stringify(config.trigger_keywords) : null
            ]);

            logger.info('[AISheetUpdater] Created config:', { id, name: config.name, mode });
            return { success: true, id };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error creating config:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all configs for a bot
     */
    async getConfigsByBot(botId: string): Promise<SheetUpdaterConfig[]> {
        try {
            const result = await query(
                'SELECT * FROM ai_sheet_updaters WHERE bot_id = ? ORDER BY created_at DESC',
                [botId]
            );

            return result.rows.map((row: any) => ({
                id: row.id,
                bot_id: row.bot_id,
                name: row.name,
                spreadsheet_url: row.spreadsheet_url,
                spreadsheet_id: row.spreadsheet_id,
                sheet_name: row.sheet_name,
                match_column: row.match_column,
                update_column: row.update_column,
                ai_instructions: row.ai_instructions,
                value_mappings: JSON.parse(row.value_mappings || '[]'),
                is_enabled: row.is_enabled === 1,
                target_jids: row.target_jids ? JSON.parse(row.target_jids) : null,
                mode: row.mode || 'update',
                column_schema: row.column_schema ? JSON.parse(row.column_schema) : null,
                trigger_keywords: row.trigger_keywords ? JSON.parse(row.trigger_keywords) : null
            }));
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error getting configs:', error.message);
            return [];
        }
    }

    /**
     * Get a single config by ID
     */
    async getConfig(configId: string): Promise<SheetUpdaterConfig | null> {
        try {
            const result = await query('SELECT * FROM ai_sheet_updaters WHERE id = ?', [configId]);
            
            if (!result.rows.length) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                bot_id: row.bot_id,
                name: row.name,
                spreadsheet_url: row.spreadsheet_url,
                spreadsheet_id: row.spreadsheet_id,
                sheet_name: row.sheet_name,
                match_column: row.match_column,
                update_column: row.update_column,
                ai_instructions: row.ai_instructions,
                value_mappings: JSON.parse(row.value_mappings || '[]'),
                is_enabled: row.is_enabled === 1,
                target_jids: row.target_jids ? JSON.parse(row.target_jids) : null,
                mode: row.mode || 'update',
                column_schema: row.column_schema ? JSON.parse(row.column_schema) : null,
                trigger_keywords: row.trigger_keywords ? JSON.parse(row.trigger_keywords) : null
            };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error getting config:', error.message);
            return null;
        }
    }

    /**
     * Update a config
     */
    async updateConfig(configId: string, updates: Partial<SheetUpdaterConfig>): Promise<{ success: boolean; error?: string }> {
        try {
            const existing = await this.getConfig(configId);
            if (!existing) {
                return { success: false, error: 'Config not found' };
            }

            const spreadsheetId = updates.spreadsheet_url 
                ? googleSheetsWriteService.extractSpreadsheetId(updates.spreadsheet_url)
                : existing.spreadsheet_id;

            await query(`
                UPDATE ai_sheet_updaters SET
                    name = ?, spreadsheet_url = ?, spreadsheet_id = ?, sheet_name = ?,
                    match_column = ?, update_column = ?, ai_instructions = ?,
                    value_mappings = ?, is_enabled = ?, target_jids = ?,
                    mode = ?, column_schema = ?, trigger_keywords = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                updates.name ?? existing.name,
                updates.spreadsheet_url ?? existing.spreadsheet_url,
                spreadsheetId,
                updates.sheet_name ?? existing.sheet_name,
                updates.match_column ?? existing.match_column,
                updates.update_column ?? existing.update_column,
                updates.ai_instructions ?? existing.ai_instructions,
                JSON.stringify(updates.value_mappings ?? existing.value_mappings),
                updates.is_enabled !== undefined ? (updates.is_enabled ? 1 : 0) : (existing.is_enabled ? 1 : 0),
                updates.target_jids ? JSON.stringify(updates.target_jids) : (existing.target_jids ? JSON.stringify(existing.target_jids) : null),
                updates.mode ?? existing.mode ?? 'update',
                updates.column_schema ? JSON.stringify(updates.column_schema) : (existing.column_schema ? JSON.stringify(existing.column_schema) : null),
                updates.trigger_keywords ? JSON.stringify(updates.trigger_keywords) : (existing.trigger_keywords ? JSON.stringify(existing.trigger_keywords) : null),
                configId
            ]);

            return { success: true };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error updating config:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a config
     */
    async deleteConfig(configId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await query('DELETE FROM ai_sheet_updaters WHERE id = ?', [configId]);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get configs by target JID - finds sheet updaters that include this target
     */
    async getConfigsByTargetJid(botId: string, targetJid: string): Promise<SheetUpdaterConfig[]> {
        try {
            // Get all configs for this bot, then filter by target_jids containing the targetJid
            const result = await query(
                'SELECT * FROM ai_sheet_updaters WHERE bot_id = ? ORDER BY created_at DESC',
                [botId]
            );

            const configs = result.rows.map((row: any) => ({
                id: row.id,
                bot_id: row.bot_id,
                name: row.name,
                spreadsheet_url: row.spreadsheet_url,
                spreadsheet_id: row.spreadsheet_id,
                sheet_name: row.sheet_name,
                match_column: row.match_column,
                update_column: row.update_column,
                ai_instructions: row.ai_instructions,
                value_mappings: JSON.parse(row.value_mappings || '[]'),
                is_enabled: row.is_enabled === 1,
                target_jids: row.target_jids ? JSON.parse(row.target_jids) : null,
                mode: row.mode || 'update',
                column_schema: row.column_schema ? JSON.parse(row.column_schema) : null,
                trigger_keywords: row.trigger_keywords ? JSON.parse(row.trigger_keywords) : null
            }));

            // Filter to configs that have this target JID in their target_jids array
            return configs.filter((config: SheetUpdaterConfig) => 
                config.target_jids && config.target_jids.includes(targetJid)
            );
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error getting configs by target JID:', error.message);
            return [];
        }
    }

    /**
     * Delete configs by target JID - removes sheet updaters linked to this target
     */
    async deleteConfigsByTargetJid(botId: string, targetJid: string): Promise<{ success: boolean; deleted: number; error?: string }> {
        try {
            const configs = await this.getConfigsByTargetJid(botId, targetJid);
            let deleted = 0;

            for (const config of configs) {
                // If this config only has one target (the one being deleted), delete the whole config
                if (config.target_jids && config.target_jids.length === 1) {
                    await query('DELETE FROM ai_sheet_updaters WHERE id = ?', [config.id]);
                    deleted++;
                } else if (config.target_jids && config.target_jids.length > 1) {
                    // If config has multiple targets, just remove this target from the array
                    const newTargetJids = config.target_jids.filter(jid => jid !== targetJid);
                    await query(
                        'UPDATE ai_sheet_updaters SET target_jids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                        [JSON.stringify(newTargetJids), config.id]
                    );
                }
            }

            logger.info(`[AISheetUpdater] Deleted/updated ${deleted} configs for target JID: ${targetJid}`);
            return { success: true, deleted };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error deleting configs by target JID:', error.message);
            return { success: false, deleted: 0, error: error.message };
        }
    }

    /**
     * Toggle config enabled/disabled
     */
    async toggleConfig(configId: string): Promise<{ success: boolean; is_enabled?: boolean }> {
        try {
            const config = await this.getConfig(configId);
            if (!config) return { success: false };

            const newState = !config.is_enabled;
            await query(
                'UPDATE ai_sheet_updaters SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newState ? 1 : 0, configId]
            );

            return { success: true, is_enabled: newState };
        } catch (error: any) {
            return { success: false };
        }
    }

    /**
     * Classify a message using AI
     */
    async classifyMessage(
        message: string,
        valueMappings: ValueMapping[],
        aiInstructions?: string
    ): Promise<ClassificationResult> {
        // First, try simple keyword matching (fast path)
        const lowerMessage = message.toLowerCase().trim();
        
        for (const mapping of valueMappings) {
            for (const keyword of mapping.keywords) {
                if (lowerMessage.includes(keyword.toLowerCase())) {
                    return {
                        classification: mapping.value,
                        confidence: 0.95,
                        mappedValue: mapping.emoji ? `${mapping.emoji} ${mapping.value}` : mapping.value,
                        originalMessage: message
                    };
                }
            }
        }

        // If no keyword match, use AI for classification
        try {
            const classifications = valueMappings.map(m => m.value).join(', ');
            const defaultInstructions = `Classify the following message into one of these categories: ${classifications}, or UNKNOWN if unclear.`;
            
            const prompt = `${aiInstructions || defaultInstructions}

Message: "${message}"

Respond with ONLY the classification word (e.g., CONFIRMED, DECLINED, MAYBE, UNKNOWN). No explanation.`;

            // Use a simple LLM call for classification
            // We'll use the bot's default AI config or fall back
            const aiResponse = await this.quickAIClassify(prompt);
            const classification = aiResponse.trim().toUpperCase();

            // Find matching mapping
            const matchedMapping = valueMappings.find(m => 
                m.value.toUpperCase() === classification
            );

            if (matchedMapping) {
                return {
                    classification: matchedMapping.value,
                    confidence: 0.75,
                    mappedValue: matchedMapping.emoji ? `${matchedMapping.emoji} ${matchedMapping.value}` : matchedMapping.value,
                    originalMessage: message
                };
            }

            return {
                classification: 'UNKNOWN',
                confidence: 0.5,
                mappedValue: 'PENDING',
                originalMessage: message
            };
        } catch (error: any) {
            logger.error('[AISheetUpdater] AI classification error:', error.message);
            return {
                classification: 'ERROR',
                confidence: 0,
                mappedValue: 'PENDING',
                originalMessage: message
            };
        }
    }

    /**
     * Quick AI classification without full conversation context
     */
    private async quickAIClassify(prompt: string): Promise<string> {
        // Use Gemini directly for simple classification
        const { GoogleGeminiProvider } = await import('./llm/providers/google');
        const provider = new GoogleGeminiProvider();

        // Get any available API key from configs
        const keyResult = await query(`
            SELECT llm_config FROM llm_allowed_targets 
            WHERE is_enabled = 1 AND llm_config LIKE '%api_key%' 
            LIMIT 1
        `);

        if (!keyResult.rows.length) {
            throw new Error('No AI API key configured');
        }

        const config = JSON.parse(keyResult.rows[0].llm_config);
        
        const response = await provider.chat(
            [{ role: 'user', content: prompt }],
            {
                provider: config.provider || 'gemini',
                model: config.model || 'gemini-2.0-flash',
                apiKey: config.api_key || config.apiKey,
                maxTokens: 50,
                temperature: 0.1
            }
        );

        return response.content;
    }

    /**
     * Extract structured data from a message using AI (for Create mode)
     * @param message - The message to extract data from
     * @param columnSchema - Schema defining what columns to fill
     * @param senderPhone - Sender's phone number
     * @param senderName - Sender's name (optional)
     * @param aiInstructions - Custom AI instructions
     */
    async extractDataFromMessage(
        message: string,
        columnSchema: ColumnSchema[],
        senderPhone: string,
        senderName?: string,
        aiInstructions?: string
    ): Promise<ExtractionResult> {
        try {
            const data: Record<string, string> = {};
            const aiExtractionFields: ColumnSchema[] = [];

            // Process non-AI fields first
            for (const col of columnSchema) {
                switch (col.source) {
                    case 'sender_phone':
                        data[col.name] = senderPhone;
                        break;
                    case 'sender_name':
                        data[col.name] = senderName || '';
                        break;
                    case 'timestamp':
                        data[col.name] = new Date().toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        break;
                    case 'static':
                        data[col.name] = col.static_value || '';
                        break;
                    case 'ai_extract':
                    case 'ai_classify':
                        aiExtractionFields.push(col);
                        break;
                }
            }

            // If there are AI extraction fields, use AI to extract them all at once
            if (aiExtractionFields.length > 0) {
                const fieldsDescription = aiExtractionFields.map(f => 
                    `- ${f.name}: ${f.ai_prompt || 'Extract relevant information'}`
                ).join('\n');

                const prompt = `${aiInstructions || 'Extract the following information from the message. Be concise and accurate.'}

Message: "${message}"

Extract these fields:
${fieldsDescription}

Respond in JSON format ONLY, like this:
{
${aiExtractionFields.map(f => `  "${f.name}": "extracted value or empty string if not found"`).join(',\n')}
}

Important:
- Return ONLY valid JSON, no explanation
- Use empty string "" if information is not found
- Keep values concise (1-3 words when possible)`;

                try {
                    const aiResponse = await this.quickAIClassify(prompt);
                    
                    // Parse JSON response - handle potential markdown code blocks
                    let jsonStr = aiResponse.trim();
                    if (jsonStr.startsWith('```')) {
                        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                    }
                    
                    const extracted = JSON.parse(jsonStr);
                    
                    // Merge AI extracted data
                    for (const field of aiExtractionFields) {
                        data[field.name] = extracted[field.name] || '';
                    }
                } catch (parseError: any) {
                    logger.error('[AISheetUpdater] Failed to parse AI extraction response:', parseError.message);
                    // Set empty values for AI fields
                    for (const field of aiExtractionFields) {
                        data[field.name] = '';
                    }
                    return {
                        success: false,
                        data,
                        confidence: 0,
                        error: 'Failed to parse AI response'
                    };
                }
            }

            // Check required fields
            const missingRequired = columnSchema
                .filter(c => c.required && !data[c.name])
                .map(c => c.name);

            if (missingRequired.length > 0) {
                return {
                    success: false,
                    data,
                    confidence: 0.5,
                    error: `Missing required fields: ${missingRequired.join(', ')}`
                };
            }

            return {
                success: true,
                data,
                confidence: 0.85
            };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error extracting data:', error.message);
            return {
                success: false,
                data: {},
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Determine whether to update existing row or create new row (for Smart mode)
     */
    async determineSmartAction(
        message: string,
        config: SheetUpdaterConfig,
        phoneExistsInSheet: boolean,
        aiInstructions?: string
    ): Promise<SmartModeDecision> {
        try {
            const prompt = `${aiInstructions || 'Analyze the following message and determine the appropriate action.'}

Message: "${message}"

Context:
- This is from a WhatsApp automation system
- Phone number ${phoneExistsInSheet ? 'EXISTS' : 'DOES NOT EXIST'} in the spreadsheet
- Config name: ${config.name}

Decide the action:
- "update": If this message is a response/reply to update an existing record (e.g., RSVP confirmation, status update, payment confirmation)
- "create": If this message contains new data that should be added as a new row (e.g., new order, new inquiry, new registration)
- "skip": If this message is not relevant for sheet operations (e.g., greeting, question, unrelated message)

Respond in JSON format ONLY:
{"action": "update|create|skip", "reason": "brief explanation"}`;

            const aiResponse = await this.quickAIClassify(prompt);
            
            // Parse JSON response
            let jsonStr = aiResponse.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }
            
            const decision = JSON.parse(jsonStr);
            
            return {
                action: decision.action || 'skip',
                reason: decision.reason || '',
                confidence: 0.75
            };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error determining smart action:', error.message);
            // Default to update if phone exists, otherwise skip
            return {
                action: phoneExistsInSheet ? 'update' : 'skip',
                reason: 'Fallback due to AI error',
                confidence: 0.3
            };
        }
    }

    /**
     * Check if message contains any trigger keywords
     */
    private checkTriggerKeywords(message: string, keywords?: string[]): boolean {
        if (!keywords || keywords.length === 0) return true; // No filter = always trigger
        
        const lowerMessage = message.toLowerCase();
        return keywords.some(kw => lowerMessage.includes(kw.toLowerCase()));
    }

    /**
     * Process an incoming message and update spreadsheet if applicable
     * Supports automatic LID→Phone matching via recent campaign recipients
     * Now supports multiple modes: update, create, smart
     */
    async processMessage(
        botId: string,
        senderPhone: string,
        message: string,
        senderJid?: string,
        senderName?: string
    ): Promise<UpdateResponse> {
        try {
            // Get all enabled configs for this bot
            const configs = await this.getConfigsByBot(botId);
            const enabledConfigs = configs.filter(c => c.is_enabled);

            if (enabledConfigs.length === 0) {
                return { success: false, message: 'No active sheet updater configs', rowFound: false };
            }

            // Normalize phone number
            const normalizedPhone = this.normalizePhone(senderPhone);
            const isLid = senderJid?.includes('@lid') || false;

            for (const config of enabledConfigs) {
                // Check trigger keywords if configured
                if (!this.checkTriggerKeywords(message, config.trigger_keywords)) {
                    logger.debug(`[AISheetUpdater] Message doesn't match trigger keywords for ${config.name}`);
                    continue;
                }

                // Check if this config applies to the sender (if target_jids is set)
                if (config.target_jids && config.target_jids.length > 0) {
                    if (senderJid && !config.target_jids.includes(senderJid)) {
                        continue; // Skip this config
                    }
                }

                const mode = config.mode || 'update';
                logger.info(`[AISheetUpdater] Processing with mode: ${mode} for config: ${config.name}`);

                // For CREATE mode - don't need to find existing row
                if (mode === 'create') {
                    const result = await this.handleCreateMode(config, message, normalizedPhone, senderName);
                    if (result.success) return result;
                    continue;
                }

                // For UPDATE and SMART modes - need to find existing row first
                let findResult = await googleSheetsWriteService.findRowByValue(
                    config.spreadsheet_id!,
                    config.sheet_name,
                    config.match_column,
                    normalizedPhone
                );

                // If not found by phone AND this is a LID, try matching with recent campaign recipients
                let matchedPhone = normalizedPhone;
                if (!findResult.found && isLid) {
                    logger.info(`[AISheetUpdater] 🔍 Phone not found (LID detected), trying campaign recipient match...`);
                    
                    // Try to find phone from recent campaign recipients
                    const campaignMatch = await this.findPhoneFromRecentCampaign(
                        botId,
                        config.spreadsheet_id!,
                        config.sheet_name,
                        config.match_column
                    );

                    if (campaignMatch.phone && campaignMatch.confidence !== 'none') {
                        logger.info(`[AISheetUpdater] ✅ Found from campaign! Phone: ${campaignMatch.phone} (confidence: ${campaignMatch.confidence})`);
                        matchedPhone = campaignMatch.phone;
                        
                        // Re-search with the matched phone
                        findResult = await googleSheetsWriteService.findRowByValue(
                            config.spreadsheet_id!,
                            config.sheet_name,
                            config.match_column,
                            matchedPhone
                        );

                        // Auto-create LID mapping for future use
                        if (findResult.found && senderJid) {
                            try {
                                const { lidPhoneMappingService } = await import('./lidPhoneMappingService');
                                const lid = senderJid.split('@')[0];
                                await lidPhoneMappingService.upsertMapping({
                                    bot_id: botId,
                                    lid: lid,
                                    phone: matchedPhone,
                                    name: senderName
                                });
                                logger.info(`[AISheetUpdater] 🔗 Auto-created LID mapping: ${lid} → ${matchedPhone}`);
                            } catch (mapErr) {
                                logger.warn('[AISheetUpdater] Failed to auto-create LID mapping', { error: mapErr });
                            }
                        }
                    }
                }

                // Handle SMART mode - AI decides whether to update or create
                if (mode === 'smart') {
                    const decision = await this.determineSmartAction(
                        message,
                        config,
                        findResult.found,
                        config.ai_instructions
                    );

                    logger.info(`[AISheetUpdater] 🧠 Smart mode decision: ${decision.action} (${decision.reason})`);

                    if (decision.action === 'skip') {
                        logger.debug(`[AISheetUpdater] Smart mode decided to skip this message`);
                        continue;
                    }

                    if (decision.action === 'create') {
                        const result = await this.handleCreateMode(config, message, matchedPhone, senderName);
                        if (result.success) return result;
                        continue;
                    }

                    // Fall through to update logic
                }

                // UPDATE mode logic
                if (!findResult.found) {
                    logger.debug(`[AISheetUpdater] Phone ${normalizedPhone} not found in ${config.name}`);
                    continue;
                }

                const result = await this.handleUpdateMode(config, message, matchedPhone);
                if (result.success) return result;
            }

            return { success: false, message: 'No matching row found in any configured sheet', rowFound: false };
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error processing message:', error.message);
            return { success: false, message: error.message, rowFound: false };
        }
    }

    /**
     * Handle UPDATE mode - classify message and update existing row
     */
    private async handleUpdateMode(
        config: SheetUpdaterConfig,
        message: string,
        matchedPhone: string
    ): Promise<UpdateResponse> {
        // Classify the message
        const classification = await this.classifyMessage(
            message,
            config.value_mappings,
            config.ai_instructions
        );

        if (classification.classification === 'UNKNOWN' || classification.classification === 'ERROR') {
            logger.debug(`[AISheetUpdater] Could not classify message: "${message}"`);
            return { success: false, message: 'Could not classify message', rowFound: true, mode: 'update' };
        }

        // Update the spreadsheet
        const updateResult = await googleSheetsWriteService.updateRowByMatch(
            config.spreadsheet_id!,
            config.sheet_name,
            config.match_column,
            matchedPhone,
            config.update_column,
            classification.mappedValue
        );

        if (updateResult.success) {
            // Log the update
            await this.logUpdate(config.id!, matchedPhone, message, classification);

            logger.info(`[AISheetUpdater] ✅ Updated ${config.sheet_name}: ${matchedPhone} → ${classification.mappedValue}`);
            
            return {
                success: true,
                message: `Updated status to ${classification.mappedValue}`,
                classification: classification.classification,
                updatedValue: classification.mappedValue,
                rowFound: true,
                mode: 'update'
            };
        }

        return { success: false, message: 'Failed to update spreadsheet', rowFound: true, mode: 'update' };
    }

    /**
     * Handle CREATE mode - extract data from message and append new row
     */
    private async handleCreateMode(
        config: SheetUpdaterConfig,
        message: string,
        senderPhone: string,
        senderName?: string
    ): Promise<UpdateResponse> {
        if (!config.column_schema || config.column_schema.length === 0) {
            logger.warn(`[AISheetUpdater] CREATE mode requires column_schema but none defined for ${config.name}`);
            return { 
                success: false, 
                message: 'Column schema not configured for create mode', 
                rowFound: false,
                mode: 'create'
            };
        }

        // Extract data from message
        const extraction = await this.extractDataFromMessage(
            message,
            config.column_schema,
            senderPhone,
            senderName,
            config.ai_instructions
        );

        if (!extraction.success) {
            logger.warn(`[AISheetUpdater] Failed to extract data: ${extraction.error}`);
            return { 
                success: false, 
                message: extraction.error || 'Failed to extract data from message',
                rowFound: false,
                mode: 'create'
            };
        }

        // Append new row to spreadsheet
        try {
            const appendResult = await googleSheetsWriteService.appendRowAsObject(
                config.spreadsheet_id!,
                config.sheet_name,
                extraction.data
            );

            if (appendResult.success) {
                logger.info(`[AISheetUpdater] ✅ Created new row in ${config.sheet_name}:`, extraction.data);
                
                // Log the creation (reuse logUpdate with special classification)
                await this.logUpdate(config.id!, senderPhone, message, {
                    classification: 'CREATED',
                    confidence: extraction.confidence,
                    mappedValue: JSON.stringify(extraction.data),
                    originalMessage: message
                });

                return {
                    success: true,
                    message: 'Created new row in spreadsheet',
                    rowFound: false,
                    mode: 'create',
                    extractedData: extraction.data
                };
            } else {
                return {
                    success: false,
                    message: appendResult.error || 'Failed to append row',
                    rowFound: false,
                    mode: 'create'
                };
            }
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error appending row:', error.message);
            return {
                success: false,
                message: error.message,
                rowFound: false,
                mode: 'create'
            };
        }
    }

    /**
     * Find a phone match from recent campaign recipients when LID is unknown
     * Returns the phone if there's exactly ONE unmapped recipient, otherwise null
     */
    private async findPhoneFromRecentCampaign(
        botId: string,
        spreadsheetId: string,
        sheetName: string,
        phoneColumn: string
    ): Promise<{ phone: string | null; confidence: 'high' | 'low' | 'none'; candidates?: string[] }> {
        try {
            // Get recent campaign recipients (last 24 hours) that were successfully sent
            const recentRecipients = await query(`
                SELECT DISTINCT cr.phone, cr.name, cr.sent_at
                FROM campaign_recipients cr
                JOIN campaigns c ON cr.campaign_id = c.id
                WHERE c.bot_id = ?
                AND cr.status = 'sent'
                AND cr.sent_at > datetime('now', '-24 hours')
                ORDER BY cr.sent_at DESC
            `, [botId]);

            if (!recentRecipients.rows || recentRecipients.rows.length === 0) {
                logger.debug('[AISheetUpdater] No recent campaign recipients found');
                return { phone: null, confidence: 'none' };
            }

            logger.info('[AISheetUpdater] 📋 Found recent campaign recipients', { 
                count: recentRecipients.rows.length,
                phones: recentRecipients.rows.map((r: any) => r.phone?.slice(-4))
            });

            // Get phones that already have LID mappings
            const existingMappings = await query(`
                SELECT phone FROM lid_phone_mappings WHERE bot_id = ?
            `, [botId]);

            const mappedPhones = new Set(existingMappings.rows.map((r: any) => this.normalizePhone(r.phone)));

            // Get phones from spreadsheet
            const { headers, rows } = await googleSheetsWriteService.readSheet(spreadsheetId, sheetName);
            const phoneColumnIndex = headers.findIndex(h =>
                h.toLowerCase().trim() === phoneColumn.toLowerCase().trim()
            );

            if (phoneColumnIndex === -1) {
                return { phone: null, confidence: 'none' };
            }

            const sheetPhones = new Set(rows.map(row => this.normalizePhone(row[phoneColumnIndex] || '')));

            // Find unmapped phones that are in both campaign recipients AND spreadsheet
            const unmappedCandidates: string[] = [];
            
            for (const recipient of recentRecipients.rows) {
                const normalizedPhone = this.normalizePhone(recipient.phone);
                
                // Check if this phone is in spreadsheet AND not yet mapped
                if (sheetPhones.has(normalizedPhone) && !mappedPhones.has(normalizedPhone)) {
                    unmappedCandidates.push(normalizedPhone);
                }
            }

            logger.info('[AISheetUpdater] 📊 Unmapped candidates from recent campaigns', { 
                candidates: unmappedCandidates.map(p => p.slice(-4)),
                count: unmappedCandidates.length
            });

            if (unmappedCandidates.length === 0) {
                return { phone: null, confidence: 'none' };
            }

            if (unmappedCandidates.length === 1) {
                // High confidence - only one unmapped candidate
                return { phone: unmappedCandidates[0], confidence: 'high' };
            }

            // Multiple candidates - low confidence, return first one but log warning
            logger.warn('[AISheetUpdater] ⚠️ Multiple unmapped candidates - using first one', {
                candidates: unmappedCandidates,
                selected: unmappedCandidates[0]
            });
            
            return { phone: unmappedCandidates[0], confidence: 'low', candidates: unmappedCandidates };

        } catch (error: any) {
            logger.error('[AISheetUpdater] Error finding phone from campaign:', error.message);
            return { phone: null, confidence: 'none' };
        }
    }

    /**
     * Normalize phone number for matching
     */
    private normalizePhone(phone: string): string {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle Indonesian numbers - convert 08xxx to 628xxx
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        
        // Keep the full number with 62 prefix for matching
        // The spreadsheet likely has 628xxx format
        return cleaned;
    }

    /**
     * Log an update for tracking
     */
    private async logUpdate(
        configId: string,
        phone: string,
        message: string,
        classification: ClassificationResult
    ): Promise<void> {
        try {
            await query(`
                INSERT INTO ai_sheet_update_logs (
                    id, config_id, phone, message, classification, 
                    mapped_value, confidence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                uuidv4(),
                configId,
                phone,
                message,
                classification.classification,
                classification.mappedValue,
                classification.confidence
            ]);
        } catch (error: any) {
            logger.error('[AISheetUpdater] Error logging update:', error.message);
        }
    }

    /**
     * Get update logs for a config
     */
    async getUpdateLogs(configId: string, limit: number = 50): Promise<any[]> {
        try {
            const result = await query(`
                SELECT * FROM ai_sheet_update_logs 
                WHERE config_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [configId, limit]);

            return result.rows;
        } catch (error: any) {
            return [];
        }
    }
}

export const aiSheetUpdaterService = new AISheetUpdaterService();
export default aiSheetUpdaterService;
