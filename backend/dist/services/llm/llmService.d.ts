/**
 * LLM Service - Main orchestrator for AI features
 * Handles provider selection, conversation management, and data extraction
 */
declare class LLMService {
    private providers;
    constructor();
    /**
     * Get provider instance
     */
    private getProvider;
    /**
     * Chat with AI
     */
    chat(botId: string, userMessage: string, contactId: string): Promise<string>;
    /**
     * Extract data from message (silent mode)
     */
    extractData(botId: string, userMessage: string, contactId: string): Promise<{
        extracted: any;
        isComplete: boolean;
        missingFields: string[];
    }>;
    /**
     * Get or create conversation
     */
    private getOrCreateConversation;
    /**
     * Save conversation message
     */
    private saveConversationMessage;
    /**
     * Track AI usage for cost monitoring
     */
    private trackUsage;
    /**
     * Test provider connection
     */
    testConnection(provider: string, apiKey: string): Promise<boolean>;
    /**
     * Get available providers
     */
    getAvailableProviders(): {
        name: string;
        displayName: string;
        models: string[];
    }[];
    /**
     * End conversation
     */
    endConversation(conversationId: string): Promise<void>;
}
export declare const llmService: LLMService;
export {};
//# sourceMappingURL=llmService.d.ts.map