/**
 * LLM Service - Main orchestrator for AI features
 * Handles provider selection, conversation management, and data extraction
 */

import { v4 as uuidv4 } from 'uuid';
import { GoogleGeminiProvider } from './providers/google';
import { OpenAIProvider } from './providers/openai';
import { GroqProvider } from './providers/groq';
import { LLMProvider, LLMMessage, LLMConfig, DataSchema } from './base';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';
import { aiSheetUpdaterService } from '../aiSheetUpdaterService';
import { knowledgeBaseService, KnowledgeBaseConfig } from '../knowledgeBaseService';

class LLMService {
    private providers: Map<string, LLMProvider> = new Map();

    constructor() {
        // Register available providers
        const googleProvider = new GoogleGeminiProvider();
        this.providers.set('google', googleProvider);
        this.providers.set('gemini', googleProvider); // Alias for consistency
        this.providers.set('openai', new OpenAIProvider());
        this.providers.set('groq', new GroqProvider());
    }

    /**
     * Get provider instance
     */
    private getProvider(name: string): LLMProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not found`);
        }
        return provider;
    }

    /**
     * Chat with AI
     */
    async chat(botId: string, userMessage: string, contactId: string): Promise<string> {
        try {
            // Get bot AI config
            const botResult = await query('SELECT ai_config FROM bots WHERE id = ?', [botId]);
            if (!botResult.rows.length) {
                throw new Error('Bot not found');
            }

            const aiConfig = JSON.parse(botResult.rows[0].ai_config || '{}');

            // Check for per-target override config (Whitelist + Custom Config)
            const targetConfigResult = await query(
                'SELECT llm_config FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ? AND is_enabled = 1 ORDER BY updated_at DESC LIMIT 1',
                [botId, contactId]
            );

            const hasGranularConfig = targetConfigResult.rows.length > 0;

            if (!aiConfig.enabled && !hasGranularConfig) {
                throw new Error('AI not enabled for this bot and no target-specific configuration found');
            }

            let activeConfig = {
                provider: aiConfig.provider || 'gemini', // Default to gemini if global is empty
                apiKey: aiConfig.apiKey,
                model: aiConfig.model || 'gemini-2.0-flash',
                systemPrompt: aiConfig.systemPrompt,
                temperature: aiConfig.temperature || 0.7,
                maxTokens: aiConfig.maxTokens || 1024
            };

            if (targetConfigResult.rows.length > 0) {
                const override = JSON.parse(targetConfigResult.rows[0].llm_config || '{}');
                logger.info('Using per-target LLM override', { botId, contactId });

                // Safe merge: only override if value exists in override object
                if (override.provider) activeConfig.provider = override.provider;
                if (override.model) activeConfig.model = override.model;
                if (override.api_key || override.apiKey) activeConfig.apiKey = override.api_key || override.apiKey;
                if (override.system_prompt || override.systemPrompt) activeConfig.systemPrompt = override.system_prompt || override.systemPrompt;
                if (override.temperature !== undefined) activeConfig.temperature = override.temperature;
                if (override.maxTokens !== undefined) activeConfig.maxTokens = override.maxTokens;
            }

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(botId, contactId, 'chat');

            // Build base system prompt
            let systemPrompt = activeConfig.systemPrompt || 'You are a helpful assistant.';
            
            // Check if user is querying sheet data and inject context if available
            if (aiSheetUpdaterService.isQueryingSheetData(userMessage)) {
                try {
                    const sheetData = await aiSheetUpdaterService.getSheetDataForChat(botId, contactId);
                    if (sheetData && sheetData.data) {
                        systemPrompt += `\n\n--- DATA REFERENCE ---\nThe following is real-time data from the connected spreadsheet. Use this to answer questions about tasks, deadlines, or recorded information:\n\n${sheetData.data}\n--- END DATA ---\n\nWhen answering about this data, be concise and helpful. Format nicely for WhatsApp (use bullet points or numbered lists).`;
                        logger.info('[LLMService] Injected sheet data into system prompt', { 
                            botId, 
                            contactId, 
                            sheetName: sheetData.sheetName 
                        });
                    }
                } catch (sheetError: any) {
                    logger.warn('[LLMService] Failed to get sheet data for chat', { error: sheetError.message });
                }
            }

            // Knowledge Base context injection (from llm_config.knowledgeBase)
            if (targetConfigResult.rows.length > 0) {
                try {
                    const override = JSON.parse(targetConfigResult.rows[0].llm_config || '{}');
                    const kbConfig: KnowledgeBaseConfig | undefined = override.knowledgeBase;

                    if (kbConfig && kbConfig.sheets && kbConfig.sheets.length > 0) {
                        if (knowledgeBaseService.shouldInjectContext(userMessage, kbConfig)) {
                            const kbContext = await knowledgeBaseService.getContextForChat(kbConfig);
                            if (kbContext) {
                                systemPrompt += `\n\n--- KNOWLEDGE BASE ---\nBerikut adalah data referensi real-time dari sumber data yang terhubung. Gunakan data ini untuk menjawab pertanyaan pengguna dengan akurat:\n\n${kbContext}\n--- END KNOWLEDGE BASE ---\n\nGunakan data di atas untuk menjawab pertanyaan. Jawab dengan ringkas dan natural. Format untuk WhatsApp (gunakan bullet points atau numbered list). Jika data tidak relevan dengan pertanyaan, abaikan dan jawab secara umum.`;
                                logger.info('[LLMService] Injected Knowledge Base context', {
                                    botId,
                                    contactId,
                                    sheetsCount: kbConfig.sheets.length,
                                    mode: kbConfig.mode,
                                });
                            }
                        }
                    }
                } catch (kbError: any) {
                    logger.warn('[LLMService] Failed to inject Knowledge Base context', { error: kbError.message });
                }
            }

            // Build messages with context
            const messages: LLMMessage[] = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history (last 10 messages)
            const history = JSON.parse(conversation.messages || '[]').slice(-10);
            messages.push(...history);

            // Add current user message
            messages.push({ role: 'user', content: userMessage });

            // Ensure provider exists (use 'gemini' as safe default alias)
            const providerName = activeConfig.provider || 'gemini';
            const provider = this.getProvider(providerName);

            const config: LLMConfig = {
                provider: providerName,
                model: activeConfig.model || 'gemini-1.5-flash',
                apiKey: activeConfig.apiKey,
                systemPrompt: activeConfig.systemPrompt,
                temperature: activeConfig.temperature || 0.7,
                maxTokens: activeConfig.maxTokens || 1024
            };

            const response = await provider.chat(messages, config);

            // Save conversation history
            await this.saveConversationMessage(conversation.id, userMessage, response.content);

            // Track usage (use resolved model from config)
            await this.trackUsage(botId, conversation.id, providerName, config.model!, response);

            return response.content;
        } catch (error: any) {
            let errorMsg = error.message;
            if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota') || errorMsg.includes('429')) {
                errorMsg = 'QUOTA_EXCEEDED: Your Gemini API Key has reached its daily/minute limit. Please wait or try switching the model to gemini-1.5-flash in your AI configuration.';
            }
            logger.error('LLM chat error', { error: errorMsg, botId });
            throw new Error(errorMsg);
        }
    }

    /**
     * Extract data from message (silent mode)
     */
    async extractData(botId: string, userMessage: string, contactId: string): Promise<{
        extracted: any;
        isComplete: boolean;
        missingFields: string[];
    }> {
        try {
            // Get bot AI config
            const botResult = await query('SELECT ai_config FROM bots WHERE id = ?', [botId]);
            if (!botResult.rows.length) {
                throw new Error('Bot not found');
            }

            const aiConfig = JSON.parse(botResult.rows[0].ai_config || '{}');
            if (!aiConfig.enabled || !aiConfig.dataSchema) {
                return { extracted: {}, isComplete: false, missingFields: [] };
            }

            // Check for per-target override
            const targetConfigResult = await query(
                'SELECT llm_config FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ? AND is_enabled = 1 ORDER BY updated_at DESC LIMIT 1',
                [botId, contactId]
            );

            let activeConfig = {
                provider: aiConfig.provider || 'gemini',
                apiKey: aiConfig.apiKey,
                model: aiConfig.model || 'gemini-1.5-flash'
            };

            if (targetConfigResult.rows.length > 0) {
                const override = JSON.parse(targetConfigResult.rows[0].llm_config || '{}');
                activeConfig = {
                    ...activeConfig,
                    ...override,
                    apiKey: override.api_key || override.apiKey || activeConfig.apiKey
                };
            }

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(botId, contactId, 'data_collection');

            // Get provider
            const provider = this.getProvider(activeConfig.provider || 'google');
            const config: LLMConfig = {
                provider: activeConfig.provider,
                model: activeConfig.model,
                apiKey: activeConfig.apiKey
            };

            // Extract data
            const extracted = await provider.extractData(userMessage, aiConfig.dataSchema, config);

            // Merge with existing extracted data
            const existingData = JSON.parse(conversation.extracted_data || '{}');
            const mergedData = { ...existingData, ...extracted };
            delete mergedData._confidence;
            delete mergedData._missingFields;

            // Update conversation
            await query(
                'UPDATE ai_conversations SET extracted_data = ? WHERE id = ?',
                [JSON.stringify(mergedData), conversation.id]
            );

            const missingFields = extracted._missingFields || [];
            const isComplete = missingFields.length === 0;

            return {
                extracted: mergedData,
                isComplete,
                missingFields
            };
        } catch (error: any) {
            logger.error('LLM extract error', { error: error.message, botId });
            return { extracted: {}, isComplete: false, missingFields: [] };
        }
    }

    /**
     * Get or create conversation
     */
    private async getOrCreateConversation(
        botId: string,
        contactId: string,
        mode: 'chat' | 'data_collection' | 'hybrid'
    ) {
        // Check for active conversation
        const existing = await query(
            `SELECT * FROM ai_conversations 
             WHERE bot_id = ? AND contact_id = ? AND status = 'active' 
             ORDER BY started_at DESC LIMIT 1`,
            [botId, contactId]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create new conversation
        const id = uuidv4();
        await query(
            `INSERT INTO ai_conversations (id, bot_id, contact_id, mode, status)
             VALUES (?, ?, ?, ?, 'active')`,
            [id, botId, contactId, mode]
        );

        const result = await query('SELECT * FROM ai_conversations WHERE id = ?', [id]);
        return result.rows[0];
    }

    /**
     * Save conversation message
     */
    private async saveConversationMessage(conversationId: string, userMessage: string, aiResponse: string) {
        const conv = await query('SELECT messages FROM ai_conversations WHERE id = ?', [conversationId]);
        if (!conv.rows.length) return;

        const messages = JSON.parse(conv.rows[0].messages || '[]');
        messages.push(
            { role: 'user', content: userMessage },
            { role: 'assistant', content: aiResponse }
        );

        await query(
            'UPDATE ai_conversations SET messages = ? WHERE id = ?',
            [JSON.stringify(messages), conversationId]
        );
    }

    /**
     * Track AI usage for cost monitoring
     */
    private async trackUsage(
        botId: string,
        conversationId: string,
        provider: string,
        model: string,
        response: any
    ) {
        const providerInstance = this.getProvider(provider);
        const pricing = providerInstance.getPricing(model);

        const cost =
            (response.tokensInput / 1000) * pricing.inputCostPer1K +
            (response.tokensOutput / 1000) * pricing.outputCostPer1K;

        await query(
            `INSERT INTO ai_usage (id, bot_id, conversation_id, provider, model, tokens_input, tokens_output, cost)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), botId, conversationId, provider, model, response.tokensInput, response.tokensOutput, cost]
        );
    }

    /**
     * Test provider connection
     */
    async testConnection(provider: string, apiKey: string): Promise<boolean> {
        try {
            const providerInstance = this.getProvider(provider);
            return await providerInstance.testConnection(apiKey);
        } catch {
            return false;
        }
    }

    /**
     * Get available providers
     */
    getAvailableProviders() {
        return Array.from(this.providers.entries()).map(([name, provider]) => ({
            name,
            displayName: provider.name,
            models: provider.models
        }));
    }

    /**
     * End conversation
     */
    async endConversation(conversationId: string) {
        await query(
            `UPDATE ai_conversations 
             SET status = 'completed', ended_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [conversationId]
        );
    }
}

export const llmService = new LLMService();
