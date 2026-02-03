/**
 * Google Gemini LLM Provider
 * Free tier: 15 req/min, 1M tokens/day
 */
import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
export declare class GoogleGeminiProvider extends LLMProvider {
    name: string;
    models: string[];
    private toolManager;
    constructor();
    chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
    extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData>;
    testConnection(apiKey: string): Promise<boolean>;
    getPricing(model: string): any;
}
//# sourceMappingURL=google.d.ts.map