/**
 * BytePlus ARK LLM Provider
 * OpenAI-compatible API for ByteDance's ARK models
 */

import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
import { logger } from '../../../utils/logger';

export class BytePlusProvider extends LLMProvider {
    name = 'byteplus';
    // List common models, users can also type custom endpoint IDs
    models = [
        'doubao-pro-4k',
        'doubao-pro-32k',
        'doubao-lite-4k',
        'doubao-lite-32k'
    ];

    async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
        try {
            // BytePlus ARK uses an OpenAI-compatible endpoint
            // Usually: https://ark.cn-beijing.volces.com/api/v3/chat/completions (for mainland China)
            // Or: https://ark.byteplus.com/api/v3/chat/completions (for global/international)
            const endpoint = 'https://ark.byteplus.com/api/v3/chat/completions';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model || 'doubao-pro-4k',
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    temperature: config.temperature || 0.7,
                    max_tokens: config.maxTokens || 1024
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`BytePlus ARK API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;

            return {
                content: data.choices[0].message.content,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens,
                cost: 0 // Pricing varies by agreement/region
            };
        } catch (error: any) {
            logger.error('BytePlus ARK chat error', { error: error.message });
            throw error;
        }
    }

    async extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData> {
        const systemPrompt = `Extract data in JSON format based on this schema: ${JSON.stringify(schema.fields)}`;
        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ], config);

        try {
            const cleanJson = response.content.trim().replace(/^```json\s*|\s*```$/g, '');
            const extracted = JSON.parse(cleanJson);

            const missingFields = Object.entries(schema.fields)
                .filter(([key, field]) => field.required && !extracted[key])
                .map(([key]) => key);

            return {
                ...extracted,
                _missingFields: missingFields,
                _confidence: missingFields.length === 0 ? 1 : 0.5
            };
        } catch (e) {
            logger.warn('Failed to parse JSON from BytePlus response', { content: response.content });
            return { _missingFields: [], _confidence: 0 };
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            // Test with a lightweight endpoint check
            const response = await fetch('https://ark.byteplus.com/api/v3/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    getPricing(model: string) {
        return { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
