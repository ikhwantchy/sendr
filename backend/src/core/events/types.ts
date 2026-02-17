/**
 * Event Types - All system events
 * These are the ONLY events that can be emitted in the system
 */

export enum EventType {
    // Message Events
    MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
    MESSAGE_SENT = 'MESSAGE_SENT',
    MESSAGE_FAILED = 'MESSAGE_FAILED',

    // Rule Engine Events
    KEYWORD_MATCHED = 'KEYWORD_MATCHED',
    KEYWORD_NO_MATCH = 'KEYWORD_NO_MATCH',

    // Action Events
    ACTION_EXECUTED = 'ACTION_EXECUTED',
    ACTION_FAILED = 'ACTION_FAILED',

    // Reminder Events
    REMINDER_TRIGGERED = 'REMINDER_TRIGGERED',
    REMINDER_SENT = 'REMINDER_SENT',
    REMINDER_FAILED = 'REMINDER_FAILED',

    // Blast/Campaign Events
    BLAST_CREATED = 'BLAST_CREATED',
    BLAST_STARTED = 'BLAST_STARTED',
    BLAST_MESSAGE_SENT = 'BLAST_MESSAGE_SENT',
    BLAST_MESSAGE_FAILED = 'BLAST_MESSAGE_FAILED',
    BLAST_FINISHED = 'BLAST_FINISHED',
    BLAST_CANCELLED = 'BLAST_CANCELLED',

    // WhatsApp Connection Events
    WA_QR_GENERATED = 'WA_QR_GENERATED',
    WA_CONNECTED = 'WA_CONNECTED',
    WA_DISCONNECTED = 'WA_DISCONNECTED',
    WA_ERROR = 'WA_ERROR',

    // Data Source Events
    DATA_SOURCE_FETCHED = 'DATA_SOURCE_FETCHED',
    DATA_SOURCE_ERROR = 'DATA_SOURCE_ERROR',

    // System Events
    BOT_CREATED = 'BOT_CREATED',
    BOT_DELETED = 'BOT_DELETED',
    RULE_CREATED = 'RULE_CREATED',
    RULE_UPDATED = 'RULE_UPDATED',
    RULE_DELETED = 'RULE_DELETED',
}

/**
 * Standard Event Context
 * MANDATORY for all events - ensures tenant isolation
 */
export interface EventContext {
    tenant_id: string;
    bot_id: string;
    channel: 'wa'; // WhatsApp only for now
    group_id: string | null;
    contact_id: string | null;
    message: string | null;
    timestamp: string; // ISO-8601
    metadata?: Record<string, any>;
    source?: string; // e.g. 'auto_reply', 'reminder'
}

/**
 * Base Event Structure
 */
export interface BaseEvent<T = any> {
    type: EventType;
    context: EventContext;
    payload: T;
    event_id: string;
    emitted_at: string;
}

/**
 * Event Payloads for specific events
 */

export interface MessageReceivedPayload {
    wa_message_id: string;
    from: string;
    to: string;
    message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
    content: string;
    media_url?: string;
    is_group: boolean;
    group_name?: string;
    sender_id?: string;
    sender_name?: string;
    sender_phone?: string; // Resolved phone number (from LID if needed)
    mentioned_jids?: string[];
    quoted_message?: {
        participant?: string;
        stanzaId?: string;
        content?: string;
    };
}

export interface KeywordMatchedPayload {
    rule_id: string;
    rule_name: string;
    keyword: string;
    match_type: 'equals' | 'contains' | 'regex';
    matched_text: string;
    actions: ActionConfig[];
}

export interface ActionExecutedPayload {
    action_type: string;
    action_config: Record<string, any>;
    result: any;
    duration_ms: number;
}

export interface ActionFailedPayload {
    action_type: string;
    action_config: Record<string, any>;
    error: string;
    stack?: string;
}

export interface ReminderTriggeredPayload {
    reminder_id: string;
    reminder_name: string;
    cron_expression: string;
    message_template: string;
    data_source_id?: string;
}

export interface BlastMessageSentPayload {
    campaign_id: string;
    contact_id: string;
    message_content: string;
    sent_at: string;
}

export interface BlastMessageFailedPayload {
    campaign_id: string;
    contact_id: string;
    error: string;
}

export interface WaQrGeneratedPayload {
    qr_code: string;
    expires_at: string;
}

export interface WaConnectedPayload {
    phone_number: string;
    device_name: string;
    connected_at: string;
}

export interface WaDisconnectedPayload {
    reason: string;
    disconnected_at: string;
}

/**
 * Action Configuration Types
 */
export interface ActionConfig {
    type: 'SEND_TEXT' | 'SEND_IMAGE' | 'FETCH_SPREADSHEET' | 'COMPOSE_MESSAGE' | 'TRIGGER_REMINDER' | 'SEND_SHEET_DATA';
    config: Record<string, any>;
}

export interface SendTextActionConfig {
    message: string;
    variables?: Record<string, string>;
}

export interface SendImageActionConfig {
    image_url: string;
    caption?: string;
    variables?: Record<string, string>;
}

export interface FetchSpreadsheetActionConfig {
    data_source_id: string;
    filters?: Record<string, any>;
    store_as?: string; // Variable name to store result
}

export interface ComposeMessageActionConfig {
    template: string;
    data_source_id?: string;
    variables?: Record<string, string>;
}

export interface TriggerReminderActionConfig {
    reminder_id: string;
    delay_seconds?: number;
}

export interface SendSheetDataActionConfig {
    spreadsheet_url: string;
    sheet_name?: string; // tab name (empty = auto-detect or Sheet1)
    message_template: string; // message template with {{variables}} from sheet columns
    is_digest_mode?: boolean; // true = combine all rows into one message (default true)
    filter_column?: string; // legacy simple filter: column name
    filter_value?: string; // legacy simple filter: value to match
    filters?: Array<{ // advanced filters (same as reminder)
        column: string;
        operator: string;
        value: any;
        value2?: any;
        caseInsensitive?: boolean;
    }>;
    sort?: { // optional sorting
        column: string;
        order: 'asc' | 'desc';
    };
    max_rows?: number; // default 50
    image_url?: string; // optional image to send with message
}
