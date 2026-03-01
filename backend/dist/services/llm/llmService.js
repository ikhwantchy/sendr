"use strict";
/**
 * LLM Service - Main orchestrator for AI features
 * Handles provider selection, conversation management, and data extraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmService = void 0;
const uuid_1 = require("uuid");
const google_1 = require("./providers/google");
const openai_1 = require("./providers/openai");
const groq_1 = require("./providers/groq");
const nvidia_1 = require("./providers/nvidia");
const openrouter_1 = require("./providers/openrouter");
const byteplus_1 = require("./providers/byteplus");
const connection_1 = require("../../database/connection");
const logger_1 = require("../../utils/logger");
const aiSheetUpdaterService_1 = require("../aiSheetUpdaterService");
const knowledgeBaseService_1 = require("../knowledgeBaseService");
class LLMService {
    providers = new Map();
    constructor() {
        // Register available providers
        const googleProvider = new google_1.GoogleGeminiProvider();
        this.providers.set('google', googleProvider);
        this.providers.set('gemini', googleProvider); // Alias for consistency
        this.providers.set('openai', new openai_1.OpenAIProvider());
        this.providers.set('groq', new groq_1.GroqProvider());
        const nvidiaProvider = new nvidia_1.NvidiaProvider();
        this.providers.set('nvidia', nvidiaProvider);
        this.providers.set('nim', nvidiaProvider);
        this.providers.set('openrouter', new openrouter_1.OpenRouterProvider());
        this.providers.set('byteplus', new byteplus_1.BytePlusProvider());
        this.providers.set('ark', new byteplus_1.BytePlusProvider()); // Alias for ARK
    }
    /**
     * Get provider instance
     */
    getProvider(name) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not found`);
        }
        return provider;
    }
    /**
     * Chat with AI
     */
    async chat(botId, userMessage, contactId) {
        try {
            // Get bot AI config
            const botResult = await (0, connection_1.query)('SELECT ai_config FROM bots WHERE id = ?', [botId]);
            if (!botResult.rows.length) {
                throw new Error('Bot not found');
            }
            const aiConfig = JSON.parse(botResult.rows[0].ai_config || '{}');
            // Check for per-target override config (Whitelist + Custom Config)
            const targetConfigResult = await (0, connection_1.query)('SELECT llm_config FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ? AND is_enabled = 1 ORDER BY updated_at DESC LIMIT 1', [botId, contactId]);
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
                logger_1.logger.info('Using per-target LLM override', { botId, contactId });
                // Safe merge: only override if value exists in override object
                if (override.provider)
                    activeConfig.provider = override.provider;
                if (override.model)
                    activeConfig.model = override.model;
                if (override.api_key || override.apiKey)
                    activeConfig.apiKey = override.api_key || override.apiKey;
                if (override.system_prompt || override.systemPrompt)
                    activeConfig.systemPrompt = override.system_prompt || override.systemPrompt;
                if (override.temperature !== undefined)
                    activeConfig.temperature = override.temperature;
                if (override.maxTokens !== undefined)
                    activeConfig.maxTokens = override.maxTokens;
            }
            // Get or create conversation
            const conversation = await this.getOrCreateConversation(botId, contactId, 'chat');
            // Build base system prompt
            const now = new Date();
            const timeContext = `[CURRENT_CONTEXT]\nToday: ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\nTime: ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}\nLocation: Jakarta, Indonesia\n\n`;
            let systemPrompt = timeContext + (activeConfig.systemPrompt || 'You are a helpful assistant.');
            // --- Programmatic Shuffler Interceptor ---
            // If user asks for groups, we MANUALLY shuffle the student list in the prompt 
            // to bypass AI sorting bias and DB sync lag.
            const isGroupingRequest = /kelompok|bagi|acak|random|group/i.test(userMessage);
            if (isGroupingRequest && systemPrompt.includes('DATA MAHASISWA')) {
                try {
                    const sections = systemPrompt.split('---');
                    let shuffled = false;
                    for (let i = 0; i < sections.length; i++) {
                        if (sections[i].includes('DATA MAHASISWA')) {
                            const lines = sections[i].split('\n');
                            const headerIdx = lines.findIndex(l => l.includes('DATA MAHASISWA'));
                            if (headerIdx !== -1) {
                                let names = lines.slice(headerIdx + 1).filter(l => l.trim().startsWith('-'));
                                const otherLines = lines.slice(headerIdx + 1).filter(l => !l.trim().startsWith('-'));
                                // Fisher-Yates Shuffle
                                for (let j = names.length - 1; j > 0; j--) {
                                    const k = Math.floor(Math.random() * (j + 1));
                                    [names[j], names[k]] = [names[k], names[j]];
                                }
                                sections[i] = lines.slice(0, headerIdx + 1).join('\n') + '\n' +
                                    names.join('\n') + '\n' +
                                    otherLines.join('\n');
                                shuffled = true;
                            }
                        }
                    }
                    if (shuffled) {
                        systemPrompt = sections.join('---');
                        // ADD "FORCE RANDOM" INSTRUCTION AT THE TOP OF SYSTEM PROMPT
                        systemPrompt = `🚨 CRITICAL: THE STUDENT LIST BELOW IS ALREADY SYSTEM-SHUFFLED. DO NOT RE-SORT OR USE ALPHABETICAL ORDER. TAKE NAMES EXACTLY IN THE ORDER PROVIDED BELOW.\n\n` + systemPrompt;
                        logger_1.logger.info('[LLMService] Programmatically shuffled student list for grouping request');
                    }
                }
                catch (err) {
                    logger_1.logger.error('[LLMService] Shuffler Interceptor failed', err);
                }
            }
            // -----------------------------------------
            // Check if user is querying sheet data and inject context if available
            if (aiSheetUpdaterService_1.aiSheetUpdaterService.isQueryingSheetData(userMessage)) {
                try {
                    const sheetData = await aiSheetUpdaterService_1.aiSheetUpdaterService.getSheetDataForChat(botId, contactId);
                    if (sheetData && sheetData.data) {
                        systemPrompt += `\n\n--- DATA REFERENCE ---\nThe following is real-time data from the connected spreadsheet. Use this to answer questions about tasks, deadlines, or recorded information:\n\n${sheetData.data}\n--- END DATA ---\n\nWhen answering about this data, be concise and helpful. Format nicely for WhatsApp (use bullet points or numbered lists).`;
                        logger_1.logger.info('[LLMService] Injected sheet data into system prompt', {
                            botId,
                            contactId,
                            sheetName: sheetData.sheetName
                        });
                    }
                }
                catch (sheetError) {
                    logger_1.logger.warn('[LLMService] Failed to get sheet data for chat', { error: sheetError.message });
                }
            }
            // Knowledge Base context injection (from llm_config.knowledgeBase)
            if (targetConfigResult.rows.length > 0) {
                try {
                    const override = JSON.parse(targetConfigResult.rows[0].llm_config || '{}');
                    const kbConfig = override.knowledgeBase;
                    if (kbConfig && kbConfig.sheets && kbConfig.sheets.length > 0) {
                        if (knowledgeBaseService_1.knowledgeBaseService.shouldInjectContext(userMessage, kbConfig)) {
                            const kbContext = await knowledgeBaseService_1.knowledgeBaseService.getContextForChat(kbConfig);
                            if (kbContext) {
                                systemPrompt += `\n\n--- KNOWLEDGE BASE ---\nBerikut adalah data referensi real-time dari sumber data yang terhubung. Gunakan data ini untuk menjawab pertanyaan pengguna dengan akurat:\n\n${kbContext}\n--- END KNOWLEDGE BASE ---\n\nGunakan data di atas untuk menjawab pertanyaan. Jawab dengan ringkas dan natural. Format untuk WhatsApp (gunakan bullet points atau numbered list). Jika data tidak relevan dengan pertanyaan, abaikan dan jawab secara umum.`;
                                logger_1.logger.info('[LLMService] Injected Knowledge Base context', {
                                    botId,
                                    contactId,
                                    sheetsCount: kbConfig.sheets.length,
                                    mode: kbConfig.mode,
                                });
                            }
                        }
                    }
                }
                catch (kbError) {
                    logger_1.logger.warn('[LLMService] Failed to inject Knowledge Base context', { error: kbError.message });
                }
            }
            // Build messages with context
            const messages = [
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
            const config = {
                provider: providerName,
                model: activeConfig.model || 'gemini-1.5-flash',
                apiKey: activeConfig.apiKey,
                systemPrompt: systemPrompt,
                temperature: activeConfig.temperature || 0.7,
                maxTokens: activeConfig.maxTokens || 1024
            };
            const response = await provider.chat(messages, config);
            // Save conversation history
            await this.saveConversationMessage(conversation.id, userMessage, response.content);
            // Track usage (use resolved model from config)
            await this.trackUsage(botId, conversation.id, providerName, config.model, response);
            return response.content;
        }
        catch (error) {
            let errorMsg = error.message;
            if (errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota') || errorMsg.includes('429')) {
                errorMsg = 'QUOTA_EXCEEDED: Your Gemini API Key has reached its daily/minute limit. Please wait or try switching the model to gemini-1.5-flash in your AI configuration.';
            }
            logger_1.logger.error('LLM chat error', { error: errorMsg, botId });
            throw new Error(errorMsg);
        }
    }
    /**
     * Extract data from message (silent mode)
     */
    async extractData(botId, userMessage, contactId) {
        try {
            // Get bot AI config
            const botResult = await (0, connection_1.query)('SELECT ai_config FROM bots WHERE id = ?', [botId]);
            if (!botResult.rows.length) {
                throw new Error('Bot not found');
            }
            const aiConfig = JSON.parse(botResult.rows[0].ai_config || '{}');
            if (!aiConfig.enabled || !aiConfig.dataSchema) {
                return { extracted: {}, isComplete: false, missingFields: [] };
            }
            // Check for per-target override
            const targetConfigResult = await (0, connection_1.query)('SELECT llm_config FROM llm_allowed_targets WHERE bot_id = ? AND target_jid = ? AND is_enabled = 1 ORDER BY updated_at DESC LIMIT 1', [botId, contactId]);
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
            const config = {
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
            await (0, connection_1.query)('UPDATE ai_conversations SET extracted_data = ? WHERE id = ?', [JSON.stringify(mergedData), conversation.id]);
            const missingFields = extracted._missingFields || [];
            const isComplete = missingFields.length === 0;
            return {
                extracted: mergedData,
                isComplete,
                missingFields
            };
        }
        catch (error) {
            logger_1.logger.error('LLM extract error', { error: error.message, botId });
            return { extracted: {}, isComplete: false, missingFields: [] };
        }
    }
    /**
     * Get or create conversation
     */
    async getOrCreateConversation(botId, contactId, mode) {
        // Check for active conversation
        const existing = await (0, connection_1.query)(`SELECT * FROM ai_conversations 
             WHERE bot_id = ? AND contact_id = ? AND status = 'active' 
             ORDER BY started_at DESC LIMIT 1`, [botId, contactId]);
        if (existing.rows.length > 0) {
            return existing.rows[0];
        }
        // Create new conversation
        const id = (0, uuid_1.v4)();
        await (0, connection_1.query)(`INSERT INTO ai_conversations (id, bot_id, contact_id, mode, status)
             VALUES (?, ?, ?, ?, 'active')`, [id, botId, contactId, mode]);
        const result = await (0, connection_1.query)('SELECT * FROM ai_conversations WHERE id = ?', [id]);
        return result.rows[0];
    }
    /**
     * Save conversation message
     */
    async saveConversationMessage(conversationId, userMessage, aiResponse) {
        const conv = await (0, connection_1.query)('SELECT messages FROM ai_conversations WHERE id = ?', [conversationId]);
        if (!conv.rows.length)
            return;
        const messages = JSON.parse(conv.rows[0].messages || '[]');
        messages.push({ role: 'user', content: userMessage }, { role: 'assistant', content: aiResponse });
        await (0, connection_1.query)('UPDATE ai_conversations SET messages = ? WHERE id = ?', [JSON.stringify(messages), conversationId]);
    }
    /**
     * Track AI usage for cost monitoring
     */
    async trackUsage(botId, conversationId, provider, model, response) {
        const providerInstance = this.getProvider(provider);
        const pricing = providerInstance.getPricing(model);
        const cost = (response.tokensInput / 1000) * pricing.inputCostPer1K +
            (response.tokensOutput / 1000) * pricing.outputCostPer1K;
        await (0, connection_1.query)(`INSERT INTO ai_usage (id, bot_id, conversation_id, provider, model, tokens_input, tokens_output, cost)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [(0, uuid_1.v4)(), botId, conversationId, provider, model, response.tokensInput, response.tokensOutput, cost]);
    }
    /**
     * Test provider connection
     */
    async testConnection(provider, apiKey) {
        try {
            const providerInstance = this.getProvider(provider);
            return await providerInstance.testConnection(apiKey);
        }
        catch {
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
    async endConversation(conversationId) {
        await (0, connection_1.query)(`UPDATE ai_conversations 
             SET status = 'completed', ended_at = CURRENT_TIMESTAMP 
             WHERE id = ?`, [conversationId]);
    }
}
exports.llmService = new LLMService();
//# sourceMappingURL=llmService.js.map