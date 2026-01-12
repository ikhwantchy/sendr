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

class LLMService {
    private providers: Map<string, LLMProvider> = new Map();

    constructor() {
        // Register available providers
        this.providers.set('google', new GoogleGeminiProvider());
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
            if (!aiConfig.enabled) {
                throw new Error('AI not enabled for this bot');
            }

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(botId, contactId, 'chat');

            // Build messages with context
            const messages: LLMMessage[] = [
                { role: 'system', content: aiConfig.systemPrompt || 'You are a helpful assistant.' }
            ];

            // Add conversation history (last 10 messages)
            const history = JSON.parse(conversation.messages || '[]').slice(-10);
            messages.push(...history);

            // Add current user message
            messages.push({ role: 'user', content: userMessage });

            // Get provider and call AI
            const provider = this.getProvider(aiConfig.provider || 'google');
            const config: LLMConfig = {
                provider: aiConfig.provider,
                model: aiConfig.model || 'gemini-2.0-flash',
                apiKey: aiConfig.apiKey,
                systemPrompt: aiConfig.systemPrompt,
                temperature: aiConfig.temperature || 0.7,
                maxTokens: aiConfig.maxTokens || 1024
            };

            const response = await provider.chat(messages, config);

            // Save conversation history
            await this.saveConversationMessage(conversation.id, userMessage, response.content);

            // Track usage
            await this.trackUsage(botId, conversation.id, aiConfig.provider, aiConfig.model, response);

            return response.content;
        } catch (error: any) {
            logger.error('LLM chat error', { error: error.message, botId });
            throw error;
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

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(botId, contactId, 'data_collection');

            // Get provider
            const provider = this.getProvider(aiConfig.provider || 'google');
            const config: LLMConfig = {
                provider: aiConfig.provider,
                model: aiConfig.model || 'gemini-1.5-flash',
                apiKey: aiConfig.apiKey
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
