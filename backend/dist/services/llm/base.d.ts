/**
 * Base interface for LLM providers
 * Supports multiple providers: OpenAI, Anthropic, Google, Groq, etc.
 */
export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface LLMConfig {
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    enableTools?: boolean;
}
export interface LLMResponse {
    content: string;
    tokensInput: number;
    tokensOutput: number;
    cost?: number;
}
export interface DataSchema {
    fields: {
        [key: string]: {
            type: 'string' | 'number' | 'date' | 'email' | 'phone';
            required: boolean;
            description?: string;
        };
    };
}
export interface ExtractedData {
    [key: string]: any;
    _confidence?: number;
    _missingFields?: string[];
}
export declare abstract class LLMProvider {
    abstract name: string;
    abstract models: string[];
    /**
     * Send a chat message and get response
     */
    abstract chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
    /**
     * Extract structured data from text
     */
    abstract extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData>;
    /**
     * Test if API key is valid
     */
    abstract testConnection(apiKey: string): Promise<boolean>;
    /**
     * Get pricing info for the model
     */
    abstract getPricing(model: string): {
        inputCostPer1K: number;
        outputCostPer1K: number;
    };
}
//# sourceMappingURL=base.d.ts.map