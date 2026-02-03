/**
 * OpenAI LLM Provider
 */
import { LLMProvider, LLMMessage, LLMConfig, LLMResponse, DataSchema, ExtractedData } from '../base';
export declare class OpenAIProvider extends LLMProvider {
    name: string;
    models: string[];
    chat(messages: LLMMessage[], config: LLMConfig): Promise<LLMResponse>;
    extractData(text: string, schema: DataSchema, config: LLMConfig): Promise<ExtractedData>;
    testConnection(apiKey: string): Promise<boolean>;
    getPricing(model: string): any;
}
//# sourceMappingURL=openai.d.ts.map