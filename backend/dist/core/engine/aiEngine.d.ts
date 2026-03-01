/**
 * AI Engine
 *
 * Responsibilities:
 * - Subscribe to MESSAGE_RECEIVED for silent data extraction
 * - Subscribe to KEYWORD_NO_MATCH for fallback conversation
 * - Manage AI logic (mentions, hybrid mode, silent mode)
 */
declare class AIEngine {
    constructor();
    private initialize;
    /**
     * Handle every message for potential silent data extraction
     */
    private handleMessageReceived;
    /**
     * Handle cases where no rules were matched
     */
    private handleNoMatch;
    /**
     * Terminology adapts to the user's message (e.g., "tim", "sif", "kloter", "sesi").
     * Bypasses LLM for cost-efficiency and 100% randomization accuracy.
     */
    private handleDistributorCommand;
    /**
     * Check if the bot is mentioned in the message
     */
    private isBotMentioned;
    /**
     * Check if target (group/contact) is allowed to use LLM
     */
    private isTargetAllowed;
    /**
     * Process message for AI Sheet Updater
     * Checks if sender matches any configured sheet and updates accordingly
     * Now supports matching by name if phone not found (for LID cases)
     * Returns result for optional confirmation reply
     */
    private processSheetUpdate;
}
export declare const aiEngine: AIEngine;
export {};
//# sourceMappingURL=aiEngine.d.ts.map