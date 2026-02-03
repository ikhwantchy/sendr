"use strict";
/**
 * Anti-Gravity Event Bus
 * Central event system for decoupled module communication
 *
 * Rules:
 * 1. ALL inter-module communication MUST go through events
 * 2. Events are fire-and-forget (async)
 * 3. Event handlers MUST NOT throw errors (catch internally)
 * 4. Context is MANDATORY for tenant isolation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiGravityEventBus = exports.eventBus = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const logger_1 = require("../../utils/logger");
const eventLogRepository_1 = require("../../database/repositories/eventLogRepository");
class AntiGravityEventBus extends events_1.EventEmitter {
    static instance;
    handlers = new Map();
    persistEvents = true;
    constructor() {
        super();
        this.setMaxListeners(100); // Allow many listeners
    }
    /**
     * Singleton instance
     */
    static getInstance() {
        if (!AntiGravityEventBus.instance) {
            AntiGravityEventBus.instance = new AntiGravityEventBus();
        }
        return AntiGravityEventBus.instance;
    }
    /**
     * Emit an event
     * @param type Event type
     * @param context Event context (MANDATORY)
     * @param payload Event payload
     */
    // @ts-ignore
    async emit(type, context, payload) {
        // Validate context
        this.validateContext(context);
        // Create event object
        const event = {
            type,
            context,
            payload,
            event_id: (0, uuid_1.v4)(),
            emitted_at: new Date().toISOString(),
        };
        logger_1.logger.debug(`Event emitted: ${type}`, {
            event_id: event.event_id,
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
        });
        // Persist event to database (async, non-blocking)
        if (this.persistEvents) {
            this.persistEvent(event).catch((error) => {
                logger_1.logger.error('Failed to persist event', { error, event });
            });
        }
        // Get handlers for this event type
        const handlers = this.handlers.get(type) || new Set();
        // Execute all handlers (async, non-blocking)
        for (const handler of handlers) {
            this.executeHandler(handler, event).catch((error) => {
                logger_1.logger.error(`Event handler failed for ${type}`, {
                    error,
                    event_id: event.event_id,
                });
            });
        }
        // Also emit via EventEmitter for real-time listeners
        super.emit(type, event);
    }
    /**
     * Subscribe to an event type
     * @param type Event type to listen for
     * @param handler Handler function
     */
    subscribe(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        logger_1.logger.info(`Subscribed to event: ${type}`, {
            handler_name: handler.name || 'anonymous',
        });
        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler);
            logger_1.logger.info(`Unsubscribed from event: ${type}`);
        };
    }
    /**
     * Subscribe to multiple event types
     */
    subscribeMany(types, handler) {
        const unsubscribers = types.map((type) => this.subscribe(type, handler));
        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }
    /**
     * Wait for a specific event (useful for testing)
     */
    async waitFor(type, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${type}`));
            }, timeout);
            const handler = (event) => {
                clearTimeout(timer);
                resolve(event);
            };
            this.once(type, handler);
        });
    }
    /**
     * Get event statistics
     */
    getStats() {
        const handlers_by_type = {};
        for (const [type, handlers] of this.handlers.entries()) {
            handlers_by_type[type] = handlers.size;
        }
        return {
            total_event_types: this.handlers.size,
            total_handlers: Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0),
            handlers_by_type,
        };
    }
    /**
     * Clear all handlers (useful for testing)
     */
    clearAll() {
        this.handlers.clear();
        this.removeAllListeners();
        logger_1.logger.warn('All event handlers cleared');
    }
    /**
     * Validate event context
     */
    validateContext(context) {
        if (!context.tenant_id) {
            throw new Error('Event context must include tenant_id');
        }
        if (!context.bot_id) {
            throw new Error('Event context must include bot_id');
        }
        if (!context.timestamp) {
            throw new Error('Event context must include timestamp');
        }
        if (context.channel !== 'wa') {
            throw new Error('Event context channel must be "wa"');
        }
    }
    /**
     * Execute handler with error handling
     */
    async executeHandler(handler, event) {
        try {
            await handler(event);
        }
        catch (error) {
            logger_1.logger.error('Event handler threw error', {
                event_type: event.type,
                event_id: event.event_id,
                error,
            });
            // Don't re-throw - handlers must not break the event bus
        }
    }
    /**
     * Persist event to database
     */
    async persistEvent(event) {
        try {
            await eventLogRepository_1.eventLogRepository.create({
                tenant_id: event.context.tenant_id,
                event_type: event.type,
                event_data: event.payload,
                context: event.context,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to persist event to database', { error, event });
        }
    }
    /**
     * Enable/disable event persistence
     */
    setPersistence(enabled) {
        this.persistEvents = enabled;
        logger_1.logger.info(`Event persistence ${enabled ? 'enabled' : 'disabled'}`);
    }
}
exports.AntiGravityEventBus = AntiGravityEventBus;
// Export singleton instance
exports.eventBus = AntiGravityEventBus.getInstance();
//# sourceMappingURL=eventBus.js.map