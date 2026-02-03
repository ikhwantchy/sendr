"use strict";
/**
 * Event Types - All system events
 * These are the ONLY events that can be emitted in the system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    // Message Events
    EventType["MESSAGE_RECEIVED"] = "MESSAGE_RECEIVED";
    EventType["MESSAGE_SENT"] = "MESSAGE_SENT";
    EventType["MESSAGE_FAILED"] = "MESSAGE_FAILED";
    // Rule Engine Events
    EventType["KEYWORD_MATCHED"] = "KEYWORD_MATCHED";
    EventType["KEYWORD_NO_MATCH"] = "KEYWORD_NO_MATCH";
    // Action Events
    EventType["ACTION_EXECUTED"] = "ACTION_EXECUTED";
    EventType["ACTION_FAILED"] = "ACTION_FAILED";
    // Reminder Events
    EventType["REMINDER_TRIGGERED"] = "REMINDER_TRIGGERED";
    EventType["REMINDER_SENT"] = "REMINDER_SENT";
    EventType["REMINDER_FAILED"] = "REMINDER_FAILED";
    // Blast/Campaign Events
    EventType["BLAST_CREATED"] = "BLAST_CREATED";
    EventType["BLAST_STARTED"] = "BLAST_STARTED";
    EventType["BLAST_MESSAGE_SENT"] = "BLAST_MESSAGE_SENT";
    EventType["BLAST_MESSAGE_FAILED"] = "BLAST_MESSAGE_FAILED";
    EventType["BLAST_FINISHED"] = "BLAST_FINISHED";
    EventType["BLAST_CANCELLED"] = "BLAST_CANCELLED";
    // WhatsApp Connection Events
    EventType["WA_QR_GENERATED"] = "WA_QR_GENERATED";
    EventType["WA_CONNECTED"] = "WA_CONNECTED";
    EventType["WA_DISCONNECTED"] = "WA_DISCONNECTED";
    EventType["WA_ERROR"] = "WA_ERROR";
    // Data Source Events
    EventType["DATA_SOURCE_FETCHED"] = "DATA_SOURCE_FETCHED";
    EventType["DATA_SOURCE_ERROR"] = "DATA_SOURCE_ERROR";
    // System Events
    EventType["BOT_CREATED"] = "BOT_CREATED";
    EventType["BOT_DELETED"] = "BOT_DELETED";
    EventType["RULE_CREATED"] = "RULE_CREATED";
    EventType["RULE_UPDATED"] = "RULE_UPDATED";
    EventType["RULE_DELETED"] = "RULE_DELETED";
})(EventType || (exports.EventType = EventType = {}));
//# sourceMappingURL=types.js.map