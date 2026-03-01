/**
 * Action Execution Engine
 *
 * Responsibilities:
 * - Subscribe to KEYWORD_MATCHED events
 * - Execute configured actions
 * - Support template variables ({{nama}}, {{tanggal}}, etc.)
 * - Emit ACTION_EXECUTED / ACTION_FAILED events
 *
 * Supported Actions:
 * - SEND_TEXT: Send text message
 * - SEND_IMAGE: Send image with caption
 * - FETCH_SPREADSHEET: Fetch data from spreadsheet
 * - COMPOSE_MESSAGE: Compose message from template + data
 * - TRIGGER_REMINDER: Schedule a reminder
 * - SEND_SHEET_DATA: Fetch Google Sheet data and send as formatted text
 */
declare class ActionExecutionEngine {
    constructor();
    /**
     * Initialize the action engine
     */
    private initialize;
    /**
     * Handle KEYWORD_MATCHED event
     */
    private handleKeywordMatched;
    /**
     * Handle REMINDER_TRIGGERED event
     */
    private handleReminderTriggered;
    /**
     * Execute a single action
     */
    private executeAction;
    /**
     * Execute SEND_TEXT action
     */
    private executeSendText;
    /**
     * Execute SEND_IMAGE action
     */
    private executeSendImage;
    /**
     * Execute FETCH_SPREADSHEET action
     */
    private executeFetchSpreadsheet;
    /**
     * Execute COMPOSE_MESSAGE action
     */
    private executeComposeMessage;
    /**
     * Execute TRIGGER_REMINDER action
     */
    private executeTriggerReminder;
    /**
     * Execute SEND_SHEET_DATA action
     * Fetches data from Google Sheet, applies filters, renders template, sends formatted message
     * Works like the Reminder system but triggered by keywords
     */
    private executeSendSheetData;
    /**
     * Log outbound message to database
     * This is non-blocking and won't break if table doesn't exist
     */
    private logMessageToDatabase;
}
export declare const actionEngine: ActionExecutionEngine;
export {};
//# sourceMappingURL=actionEngine.d.ts.map