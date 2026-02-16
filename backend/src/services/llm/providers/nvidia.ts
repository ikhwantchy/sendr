/**
 * NVIDIA NIM LLM Provider
 * OpenAI-compatible API for NVIDIA hosted models
 */

import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
import { logger } from '../../../utils/logger';

export class NvidiaProvider extends LLMProvider {
    name = 'nvidia';
    // List some common models, but users can type any valid model ID
    models = [
        'meta/llama-3.1-405b-instruct',
        'meta/llama-3.1-70b-instruct',
        'meta/llama-3.1-8b-instruct',
        'nvidia/nemotron-4-340b-instruct',
        'mistralai/mistral-large-2-instruct',
        'google/gemma-2-27b-it',
        'microsoft/phi-3.5-moe-instruct'
    ];

    async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
        try {
            // NVIDIA NIM uses standard OpenAI-compatible endpoint
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model || 'meta/llama-3.1-70b-instruct',
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    // NVIDIA specific parameters if needed, otherwise standard OpenAI params
                    temperature: config.temperature || 0.5,
                    max_tokens: config.maxTokens || 1024,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`NVIDIA NIM API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as any;

            return {
                content: data.choices[0].message.content,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens,
                cost: 0 // NVIDIA NIMs are often free during preview or credited
            };
        } catch (error: any) {
            logger.error('NVIDIA NIM chat error', { error: error.message });
            throw error;
        }
    }

    async extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData> {
        // Use system prompt for robust JSON extraction
        const systemPrompt = `You are a data extraction assistant. Extract data from the user input based on this JSON schema: ${JSON.stringify(schema.fields)}.
        
        Rules:
        1. Return ONLY valid JSON.
        2. Do not include markdown formatting (like \`\`\`json).
        3. If a field isn't found, leave it empty or null.
        `;

        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ], config);

        try {
            // Clean markdown if present (some models are chatty)
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
            logger.warn('Failed to parse JSON from NVIDIA response', { content: response.content });
            return { _missingFields: [], _confidence: 0 };
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            // Test with a lightweight model list check
            const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    getPricing(model: string) {
        // NVIDIA NIM pricing is variable/preview; returning 0 for now or placeholder
        // Users should monitor their own NVIDIA credits
        return { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
