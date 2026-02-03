"use strict";
/**
 * LID to Phone Mapping Service
 * Handles mapping between WhatsApp LID and phone numbers
 *
 * WhatsApp now uses LID (Linked ID) format for some contacts instead of phone numbers.
 * This service maintains a mapping so we can resolve LID to phone numbers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lidPhoneMappingService = void 0;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
class LidPhoneMappingService {
    /**
     * Get phone number from LID
     */
    async getPhoneByLid(botId, lid) {
        try {
            // Normalize LID (remove @lid suffix if present)
            const cleanLid = lid.replace('@lid', '').replace('@s.whatsapp.net', '');
            logger_1.logger.info('[LidMapping] 🔍 Query params', { botId, lid, cleanLid });
            const result = await (0, connection_1.query)('SELECT phone FROM lid_phone_mappings WHERE bot_id = ? AND lid = ?', [botId, cleanLid]);
            logger_1.logger.info('[LidMapping] 📊 Query result', {
                rowCount: result.rows?.length || 0,
                rows: result.rows,
                firstRow: result.rows?.[0]
            });
            if (result.rows && result.rows.length > 0) {
                const phone = result.rows[0].phone;
                logger_1.logger.info('[LidMapping] ✅ Found phone', { phone });
                return phone;
            }
            logger_1.logger.warn('[LidMapping] ❌ No mapping found');
            return null;
        }
        catch (error) {
            logger_1.logger.error('[LidMapping] Error getting phone by LID:', error.message);
            return null;
        }
    }
    /**
     * Get LID by phone number
     */
    async getLidByPhone(botId, phone) {
        try {
            // Normalize phone
            const cleanPhone = this.normalizePhone(phone);
            const result = await (0, connection_1.query)('SELECT lid FROM lid_phone_mappings WHERE bot_id = ? AND phone = ?', [botId, cleanPhone]);
            if (result.rows.length > 0) {
                return result.rows[0].lid;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('[LidMapping] Error getting LID by phone:', error.message);
            return null;
        }
    }
    /**
     * Create or update a mapping
     */
    async upsertMapping(mapping) {
        try {
            const cleanLid = mapping.lid.replace('@lid', '').replace('@s.whatsapp.net', '');
            const cleanPhone = this.normalizePhone(mapping.phone);
            // Check if mapping exists
            const existing = await (0, connection_1.query)('SELECT id FROM lid_phone_mappings WHERE bot_id = ? AND lid = ?', [mapping.bot_id, cleanLid]);
            if (existing.rows.length > 0) {
                // Update existing
                await (0, connection_1.query)(`
                    UPDATE lid_phone_mappings SET 
                        phone = ?, name = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE bot_id = ? AND lid = ?
                `, [cleanPhone, mapping.name || null, mapping.bot_id, cleanLid]);
                logger_1.logger.info('[LidMapping] Updated mapping', { lid: cleanLid, phone: cleanPhone });
                return { success: true, id: existing.rows[0].id };
            }
            else {
                // Create new
                const id = (0, uuid_1.v4)();
                await (0, connection_1.query)(`
                    INSERT INTO lid_phone_mappings (id, bot_id, lid, phone, name)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, mapping.bot_id, cleanLid, cleanPhone, mapping.name || null]);
                logger_1.logger.info('[LidMapping] Created mapping', { lid: cleanLid, phone: cleanPhone });
                return { success: true, id };
            }
        }
        catch (error) {
            logger_1.logger.error('[LidMapping] Error upserting mapping:', error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get all mappings for a bot
     */
    async getMappingsByBot(botId) {
        try {
            const result = await (0, connection_1.query)('SELECT * FROM lid_phone_mappings WHERE bot_id = ? ORDER BY created_at DESC', [botId]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('[LidMapping] Error getting mappings:', error.message);
            return [];
        }
    }
    /**
     * Delete a mapping
     */
    async deleteMapping(id) {
        try {
            await (0, connection_1.query)('DELETE FROM lid_phone_mappings WHERE id = ?', [id]);
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('[LidMapping] Error deleting mapping:', error.message);
            return { success: false, error: error.message };
        }
    }
    /**
     * Bulk import mappings from an array
     */
    async bulkImport(botId, mappings) {
        let success = 0;
        let failed = 0;
        for (const mapping of mappings) {
            const result = await this.upsertMapping({
                bot_id: botId,
                lid: mapping.lid,
                phone: mapping.phone,
                name: mapping.name
            });
            if (result.success) {
                success++;
            }
            else {
                failed++;
            }
        }
        return { success, failed };
    }
    /**
     * Normalize phone number
     */
    normalizePhone(phone) {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        // Handle Indonesian numbers
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        return cleaned;
    }
}
exports.lidPhoneMappingService = new LidPhoneMappingService();
exports.default = exports.lidPhoneMappingService;
//# sourceMappingURL=lidPhoneMappingService.js.map