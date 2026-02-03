"use strict";
/**
 * Google Gemini LLM Provider
 * Free tier: 15 req/min, 1M tokens/day
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleGeminiProvider = void 0;
const base_1 = require("../base");
const logger_1 = require("../../../utils/logger");
const toolManager_1 = require("../../tools/toolManager");
class GoogleGeminiProvider extends base_1.LLMProvider {
    name = 'google';
    models = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];
    toolManager;
    constructor() {
        super();
        this.toolManager = new toolManager_1.ToolManager();
    }
    async chat(messages, config) {
        try {
            const apiKey = config.apiKey;
            const model = config.model || 'gemini-2.0-flash';
            // Build request payload
            const contents = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const systemInstruction = messages.find(m => m.role === 'system')?.content;
            const payload = {
                contents,
                generationConfig: {
                    temperature: config.temperature || 0.7,
                    maxOutputTokens: config.maxTokens || 1024,
                }
            };
            // Add system instruction (v1beta supports this)
            if (systemInstruction) {
                payload.systemInstruction = {
                    parts: [{ text: systemInstruction }]
                };
            }
            // Add tools/function calling if enabled (v1beta only)
            const enableTools = config.enableTools !== false; // Default true
            if (enableTools) {
                const tools = this.toolManager.getAvailableTools();
                payload.tools = [{
                        function_declarations: tools.map(tool => ({
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters
                        }))
                    }];
            }
            // Call Gemini API (v1beta for function calling support)
            let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Gemini API error: ${error}`);
            }
            let data = await response.json();
            // Check if LLM wants to call a function
            const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
            if (functionCall && enableTools) {
                logger_1.logger.info('LLM requested function call', { function: functionCall.name });
                // Execute the requested tool
                const toolResult = await this.toolManager.executeTool(functionCall.name, functionCall.args);
                // Send tool result back to LLM for final response
                const followUpPayload = {
                    contents: [
                        ...contents,
                        {
                            role: 'model',
                            parts: [{ functionCall: functionCall }]
                        },
                        {
                            role: 'user',
                            parts: [{
                                    functionResponse: {
                                        name: functionCall.name,
                                        response: { result: toolResult }
                                    }
                                }]
                        }
                    ],
                    generationConfig: payload.generationConfig
                };
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(followUpPayload)
                });
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Gemini API error on follow-up: ${error}`);
                }
                data = await response.json();
            }
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const tokensInput = data.usageMetadata?.promptTokenCount || 0;
            const tokensOutput = data.usageMetadata?.candidatesTokenCount || 0;
            return {
                content,
                tokensInput,
                tokensOutput,
                cost: 0 // Free tier
            };
        }
        catch (error) {
            logger_1.logger.error('Gemini chat error', {
                error: error.message,
                cause: error.cause,
                stack: error.stack
            });
            throw error;
        }
    }
    async extractData(text, schema, config) {
        try {
            // Build extraction prompt
            const schemaDescription = Object.entries(schema.fields)
                .map(([key, field]) => `- ${key} (${field.type}${field.required ? ', required' : ''}): ${field.description || ''}`)
                .join('\n');
            const prompt = `Extract the following information from the text. Return ONLY a valid JSON object, no markdown or explanation.

Schema:
${schemaDescription}

Text: "${text}"

Return format:
{
  "field1": "value1",
  "field2": "value2",
  ...
}

If a field is not found, use null. Do not include fields that are not in the schema.`;
            const messages = [
                { role: 'system', content: 'You are a data extraction assistant. Always return valid JSON only.' },
                { role: 'user', content: prompt }
            ];
            const response = await this.chat(messages, config);
            // Parse JSON from response
            let extracted = {};
            try {
                // Remove markdown code blocks if present
                let jsonStr = response.content.trim();
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
                extracted = JSON.parse(jsonStr);
            }
            catch (e) {
                logger_1.logger.error('Failed to parse extracted data', { response: response.content });
                extracted = {};
            }
            // Check for missing required fields
            const missingFields = Object.entries(schema.fields)
                .filter(([key, field]) => field.required && !extracted[key])
                .map(([key]) => key);
            return {
                ...extracted,
                _missingFields: missingFields,
                _confidence: missingFields.length === 0 ? 1 : 0.5
            };
        }
        catch (error) {
            logger_1.logger.error('Gemini extract error', { error: error.message });
            throw error;
        }
    }
    async testConnection(apiKey) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
                })
            });
            if (!response.ok) {
                const error = await response.text();
                // 429 means the API key is valid but quota is exceeded. 
                // For a connection test, this is actually a success in terms of key validity.
                if (response.status === 429) {
                    logger_1.logger.info('Gemini connection test: Key is valid but quota exceeded (429)');
                    return true;
                }
                logger_1.logger.warn('Gemini connection test failed', { status: response.status, error });
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error('Gemini connection test exception', {
                error: error.message,
                cause: error.cause,
                stack: error.stack
            });
            return false;
        }
    }
    getPricing(model) {
        // Gemini pricing (free tier available)
        const pricing = {
            'gemini-2.5-flash': { inputCostPer1K: 0, outputCostPer1K: 0 },
            'gemini-2.5-pro': { inputCostPer1K: 0.00125, outputCostPer1K: 0.005 },
            'gemini-2.0-flash': { inputCostPer1K: 0, outputCostPer1K: 0 },
            'gemini-1.5-flash': { inputCostPer1K: 0, outputCostPer1K: 0 },
            'gemini-1.5-pro': { inputCostPer1K: 0.00125, outputCostPer1K: 0.005 }
        };
        return pricing[model] || { inputCostPer1K: 0, outputCostPer1K: 0 };
    }
}
exports.GoogleGeminiProvider = GoogleGeminiProvider;
//# sourceMappingURL=google.js.map