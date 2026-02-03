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
import { BaseEvent, EventContext, EventType } from './types';
type EventHandler<T = any> = (event: BaseEvent<T>) => Promise<void> | void;
declare class AntiGravityEventBus extends EventEmitter {
    private static instance;
    private handlers;
    private persistEvents;
    private constructor();
    /**
     * Singleton instance
     */
    static getInstance(): AntiGravityEventBus;
    /**
     * Emit an event
     * @param type Event type
     * @param context Event context (MANDATORY)
     * @param payload Event payload
     */
    emit<T = any>(type: EventType, context: EventContext, payload: T): Promise<void>;
    /**
     * Subscribe to an event type
     * @param type Event type to listen for
     * @param handler Handler function
     */
    subscribe<T = any>(type: EventType, handler: EventHandler<T>): () => void;
    /**
     * Subscribe to multiple event types
     */
    subscribeMany(types: EventType[], handler: EventHandler): () => void;
    /**
     * Wait for a specific event (useful for testing)
     */
    waitFor<T = any>(type: EventType, timeout?: number): Promise<BaseEvent<T>>;
    /**
     * Get event statistics
     */
    getStats(): {
        total_event_types: number;
        total_handlers: number;
        handlers_by_type: Record<string, number>;
    };
    /**
     * Clear all handlers (useful for testing)
     */
    clearAll(): void;
    /**
     * Validate event context
     */
    private validateContext;
    /**
     * Execute handler with error handling
     */
    private executeHandler;
    /**
     * Persist event to database
     */
    private persistEvent;
    /**
     * Enable/disable event persistence
     */
    setPersistence(enabled: boolean): void;
}
export declare const eventBus: AntiGravityEventBus;
export { AntiGravityEventBus };
//# sourceMappingURL=eventBus.d.ts.map