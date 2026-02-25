/**
 * OpenRouter LLM Provider
 * OpenAI-compatible API that provides access to many models (including free ones)
 */

import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
import { logger } from '../../../utils/logger';

export class OpenRouterProvider extends LLMProvider {
    name = 'openrouter';
    // Popular models, including many free ones
    models = [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'deepseek/deepseek-r1:free',
        'qwen/qwen-3-coder-480b-a3b5:free',
        'mistralai/mistral-small-3-1-24b:free',
        'google/gemma-3-27b:free',
        'nvidia/nemotron-4-340b-instruct:free',
        'openai/gpt-oss-120b:free',
        'z-ai/glm-4-5-air:free',
        'stepfun/step-3-5-flash:free',
        'openrouter/free'
    ];




    async chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse> {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'HTTP-Referer': 'https://sendr.web.id',
                    'X-Title': 'Sendr WA Automation',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model || 'openrouter/free',
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
                throw new Error(`OpenRouter API error: ${error}`);
            }

            const data = await response.json() as any;

            if (data.error) {
                throw new Error(`OpenRouter API error: ${data.error.message || JSON.stringify(data.error)}`);
            }

            return {
                content: data.choices[0].message.content,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens,
                cost: 0
            };
        } catch (error: any) {
            logger.error('OpenRouter chat error', { error: error.message });
            throw error;
        }
    }

    async extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData> {
        const systemPrompt = `Extract data in JSON format based on this schema: ${JSON.stringify(schema.fields)}`;
        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ], { ...config, model: config.model || 'openrouter/free' });


        try {
            // Clean markdown if present
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
            logger.warn('Failed to parse JSON from OpenRouter response', { content: response.content });
            return { _missingFields: [], _confidence: 0 };
        }
    }

    async testConnection(apiKey: string): Promise<boolean> {
        try {
            // Test with model list check
            const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    getPricing(model: string) {
        // OpenRouter pricing is variable; users should monitor their credits
        return { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
