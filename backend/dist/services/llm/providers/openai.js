"use strict";
/**
 * OpenAI LLM Provider
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const base_1 = require("../base");
const logger_1 = require("../../../utils/logger");
class OpenAIProvider extends base_1.LLMProvider {
    name = 'openai';
    models = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-3.5-turbo'
    ];
    async chat(messages, config) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-4o-mini',
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
                throw new Error(`OpenAI API error: ${error}`);
            }
            const data = await response.json();
            return {
                content: data.choices[0].message.content,
                tokensInput: data.usage.prompt_tokens,
                tokensOutput: data.usage.completion_tokens,
                cost: 0 // Will be calculated by service
            };
        }
        catch (error) {
            logger_1.logger.error('OpenAI chat error', { error: error.message });
            throw error;
        }
    }
    async extractData(text, schema, config) {
        // Implementation similar to base but utilizing GPT-4o's JSON mode
        const systemPrompt = `Extract data in JSON format based on this schema: ${JSON.stringify(schema.fields)}`;
        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ], { ...config, model: config.model || 'gpt-4o-mini' });
        try {
            const extracted = JSON.parse(response.content.trim().replace(/```json\n?|```/g, ''));
            const missingFields = Object.entries(schema.fields)
                .filter(([key, field]) => field.required && !extracted[key])
                .map(([key]) => key);
            return {
                ...extracted,
                _missingFields: missingFields,
                _confidence: missingFields.length === 0 ? 1 : 0.5
            };
        }
        catch (e) {
            return { _missingFields: [], _confidence: 0 };
        }
    }
    async testConnection(apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    getPricing(model) {
        const pricing = {
            'gpt-4o': { inputCostPer1K: 0.005, outputCostPer1K: 0.015 },
            'gpt-4o-mini': { inputCostPer1K: 0.00015, outputCostPer1K: 0.0006 },
            'gpt-3.5-turbo': { inputCostPer1K: 0.0005, outputCostPer1K: 0.0015 }
        };
        return pricing[model] || { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map