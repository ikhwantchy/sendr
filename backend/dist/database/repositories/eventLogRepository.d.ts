/**
 * Event Log Repository
 */
export interface EventLog {
    id: string;
    tenant_id: string;
    event_type: string;
    payload: any;
    context: any;
    created_at: string;
}
declare class EventLogRepository {
    create(data: {
        tenant_id: string;
        event_type: string;
        event_data: any;
        context: any;
    }): Promise<EventLog>;
    findByTenant(tenantId: string, limit?: number, offset?: number): Promise<EventLog[]>;
    findByType(tenantId: string, eventType: string, limit?: number): Promise<EventLog[]>;
    deleteOld(daysOld?: number): Promise<number>;
}
export declare const eventLogRepository: EventLogRepository;
export {};
//# sourceMappingURL=eventLogRepository.d.ts.map