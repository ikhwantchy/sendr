/**
 * Groq LLM Provider
 * Fast inference, free and paid tiers
 */
import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
export declare class GroqProvider extends LLMProvider {
    name: string;
    models: string[];
    chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
    extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData>;
    testConnection(apiKey: string): Promise<boolean>;
    getPricing(model: string): {
        inputCostPer1K: number;
        outputCostPer1K: number;
    };
}
//# sourceMappingURL=groq.d.ts.map