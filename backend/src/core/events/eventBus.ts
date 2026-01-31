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

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BaseEvent, EventContext, EventType } from './types';
import { logger } from '../../utils/logger';
import { eventLogRepository } from '../../database/repositories/eventLogRepository';

type EventHandler<T = any> = (event: BaseEvent<T>) => Promise<void> | void;

class AntiGravityEventBus extends EventEmitter {
    private static instance: AntiGravityEventBus;
    private handlers: Map<EventType, Set<EventHandler>> = new Map();
    private persistEvents: boolean = true;

    private constructor() {
        super();
        this.setMaxListeners(100); // Allow many listeners
    }

    /**
     * Singleton instance
     */
    public static getInstance(): AntiGravityEventBus {
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
    public async emit<T = any>(
        type: EventType,
        context: EventContext,
        payload: T
    ): Promise<void> {
        // Validate context
        this.validateContext(context);

        // Create event object
        const event: BaseEvent<T> = {
            type,
            context,
            payload,
            event_id: uuidv4(),
            emitted_at: new Date().toISOString(),
        };

        logger.debug(`Event emitted: ${type}`, {
            event_id: event.event_id,
            tenant_id: context.tenant_id,
            bot_id: context.bot_id,
        });

        // Persist event to database (async, non-blocking)
        if (this.persistEvents) {
            this.persistEvent(event).catch((error) => {
                logger.error('Failed to persist event', { error, event });
            });
        }

        // Get handlers for this event type
        const handlers = this.handlers.get(type) || new Set();

        // Execute all handlers (async, non-blocking)
        for (const handler of handlers) {
            this.executeHandler(handler, event).catch((error) => {
                logger.error(`Event handler failed for ${type}`, {
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
    public subscribe<T = any>(
        type: EventType,
        handler: EventHandler<T>
    ): () => void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }

        this.handlers.get(type)!.add(handler as EventHandler);

        logger.info(`Subscribed to event: ${type}`, {
            handler_name: handler.name || 'anonymous',
        });

        // Return unsubscribe function
        return () => {
            this.handlers.get(type)?.delete(handler as EventHandler);
            logger.info(`Unsubscribed from event: ${type}`);
        };
    }

    /**
     * Subscribe to multiple event types
     */
    public subscribeMany(
        types: EventType[],
        handler: EventHandler
    ): () => void {
        const unsubscribers = types.map((type) => this.subscribe(type, handler));

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }

    /**
     * Wait for a specific event (useful for testing)
     */
    public async waitFor<T = any>(
        type: EventType,
        timeout: number = 5000
    ): Promise<BaseEvent<T>> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${type}`));
            }, timeout);

            const handler = (event: BaseEvent<T>) => {
                clearTimeout(timer);
                resolve(event);
            };

            this.once(type, handler);
        });
    }

    /**
     * Get event statistics
     */
    public getStats(): {
        total_event_types: number;
        total_handlers: number;
        handlers_by_type: Record<string, number>;
    } {
        const handlers_by_type: Record<string, number> = {};

        for (const [type, handlers] of this.handlers.entries()) {
            handlers_by_type[type] = handlers.size;
        }

        return {
            total_event_types: this.handlers.size,
            total_handlers: Array.from(this.handlers.values()).reduce(
                (sum, set) => sum + set.size,
                0
            ),
            handlers_by_type,
        };
    }

    /**
     * Clear all handlers (useful for testing)
     */
    public clearAll(): void {
        this.handlers.clear();
        this.removeAllListeners();
        logger.warn('All event handlers cleared');
    }

    /**
     * Validate event context
     */
    private validateContext(context: EventContext): void {
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
    private async executeHandler<T>(
        handler: EventHandler<T>,
        event: BaseEvent<T>
    ): Promise<void> {
        try {
            await handler(event);
        } catch (error) {
            logger.error('Event handler threw error', {
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
    private async persistEvent<T>(event: BaseEvent<T>): Promise<void> {
        try {
            await eventLogRepository.create({
                tenant_id: event.context.tenant_id,
                event_type: event.type,
                event_data: event.payload as any,
                context: event.context,
            });
        } catch (error) {
            logger.error('Failed to persist event to database', { error, event });
        }
    }

    /**
     * Enable/disable event persistence
     */
    public setPersistence(enabled: boolean): void {
        this.persistEvents = enabled;
        logger.info(`Event persistence ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export singleton instance
export const eventBus = AntiGravityEventBus.getInstance();

// Export class for testing
export { AntiGravityEventBus };
