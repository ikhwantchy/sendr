/**
 * Event Log Repository
 */

import { query } from '../connection-sqlite';

export interface EventLog {
    id: string;
    tenant_id: string;
    event_type: string;
    event_data: any;
    context: any;
    created_at: string;
}

class EventLogRepository {
    async create(data: {
        tenant_id: string;
        event_type: string;
        event_data: any;
        context: any;
    }): Promise<EventLog> {
        const result = await query(
            `INSERT INTO event_logs (tenant_id, event_type, event_data, context)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
            [
                data.tenant_id,
                data.event_type,
                JSON.stringify(data.event_data),
                JSON.stringify(data.context),
            ]
        );

        return result.rows[0];
    }

    async findByTenant(
        tenantId: string,
        limit: number = 100,
        offset: number = 0
    ): Promise<EventLog[]> {
        const result = await query(
            `SELECT * FROM event_logs 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
            [tenantId, limit, offset]
        );

        return result.rows;
    }

    async findByType(
        tenantId: string,
        eventType: string,
        limit: number = 100
    ): Promise<EventLog[]> {
        const result = await query(
            `SELECT * FROM event_logs 
       WHERE tenant_id = ? AND event_type = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
            [tenantId, eventType, limit]
        );

        return result.rows;
    }

    async deleteOld(daysOld: number = 30): Promise<number> {
        const result = await query(
            `DELETE FROM event_logs 
       WHERE created_at < datetime('now') - INTERVAL '${daysOld} days'`
        );

        return result.rowCount || 0;
    }
}

export const eventLogRepository = new EventLogRepository();
