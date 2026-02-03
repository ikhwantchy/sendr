"use strict";
/**
 * Event Log Repository
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventLogRepository = void 0;
const connection_1 = require("../connection");
class EventLogRepository {
    async create(data) {
        const id = require('uuid').v4();
        await (0, connection_1.query)(`INSERT INTO event_logs (id, tenant_id, event_type, payload, context)
             VALUES (?, ?, ?, ?, ?)`, [
            id,
            data.tenant_id,
            data.event_type,
            JSON.stringify(data.event_data),
            JSON.stringify(data.context),
        ]);
        return {
            id,
            tenant_id: data.tenant_id,
            event_type: data.event_type,
            payload: data.event_data,
            context: data.context,
            created_at: new Date().toISOString()
        };
    }
    async findByTenant(tenantId, limit = 100, offset = 0) {
        const result = await (0, connection_1.query)(`SELECT * FROM event_logs 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`, [tenantId, limit, offset]);
        return result.rows;
    }
    async findByType(tenantId, eventType, limit = 100) {
        const result = await (0, connection_1.query)(`SELECT * FROM event_logs 
       WHERE tenant_id = ? AND event_type = ? 
       ORDER BY created_at DESC 
       LIMIT ?`, [tenantId, eventType, limit]);
        return result.rows;
    }
    async deleteOld(daysOld = 30) {
        const result = await (0, connection_1.query)(`DELETE FROM event_logs 
       WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'`);
        return result.rowCount || 0;
    }
}
exports.eventLogRepository = new EventLogRepository();
//# sourceMappingURL=eventLogRepository.js.map