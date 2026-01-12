/**
 * Groq LLM Provider
 * Fast inference, free and paid tiers
 */

import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
import { logger } from '../../../utils/logger';

export class GroqProvider extends LLMProvider {
    name = 'groq';
    models = [
        'llama-3.3-70b-versatile',  // Latest Llama 3.3 (recommended)
        'llama-3.1-70b-versatile',
        'llama-3.1-8b-instant',
        'mixtral-8x7b-32768',
        'gemma2-9b-it'
    ];

    async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model || 'llama3-70b-8192',
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    temperature: config.temperature || 0.7,
                    max_tokens: config.maxTokens || 1024
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Groq API error: ${error}`);
            }

            const data = await response.json() as any;

            return {
                content: data.choices[0].message.content,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens,
                cost: 0
            };
        } catch (error: any) {
            logger.error('Groq chat error', { error: error.message });
            throw error;
        }
    }

    async extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData> {
        // Groq is fast, perfect for silent extraction
        const systemPrompt = `Extract as JSON: ${JSON.stringify(schema.fields)}`;
        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ], { ...config, model: config.model || 'llama3-8b-8192' });

        try {
            const extracted = JSON.parse(response.content.trim().replace(/```json\n?|```/g, ''));
            const missingFields = Object.entries(schema.fields)
                .filter(([key, field]) => field.required && !extracted[key])
                .map(([key]) => key);

            return {
                ...extracted,
                _missingFields: missingFields,
                _confidence: 1
            };
        } catch (e) {
            return { _missingFields: [], _confidence: 0 };
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    getPricing(model: string) {
        // Groq current pricing is mostly free or extremely cheap
        return { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
