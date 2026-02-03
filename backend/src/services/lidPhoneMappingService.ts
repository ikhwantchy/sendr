/**
 * LID to Phone Mapping Service
 * Handles mapping between WhatsApp LID and phone numbers
 * 
 * WhatsApp now uses LID (Linked ID) format for some contacts instead of phone numbers.
 * This service maintains a mapping so we can resolve LID to phone numbers.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

export interface LidPhoneMapping {
    id?: string;
    bot_id: string;
    lid: string;
    phone: string;
    name?: string;
    created_at?: string;
    updated_at?: string;
}

class LidPhoneMappingService {
    
    /**
     * Get phone number from LID
     */
    async getPhoneByLid(botId: string, lid: string): Promise<string | null> {
        try {
            // Normalize LID (remove @lid suffix if present)
            const cleanLid = lid.replace('@lid', '').replace('@s.whatsapp.net', '');
            
            logger.info('[LidMapping] 🔍 Query params', { botId, lid, cleanLid });
            
            const result = await query(
                'SELECT phone FROM lid_phone_mappings WHERE bot_id = ? AND lid = ?',
                [botId, cleanLid]
            );
            
            logger.info('[LidMapping] 📊 Query result', { 
                rowCount: result.rows?.length || 0, 
                rows: result.rows,
                firstRow: result.rows?.[0]
            });
            
            if (result.rows && result.rows.length > 0) {
                const phone = result.rows[0].phone;
                logger.info('[LidMapping] ✅ Found phone', { phone });
                return phone;
            }
            
            logger.warn('[LidMapping] ❌ No mapping found');
            return null;
        } catch (error: any) {
            logger.error('[LidMapping] Error getting phone by LID:', error.message);
            return null;
        }
    }

    /**
     * Get LID by phone number
     */
    async getLidByPhone(botId: string, phone: string): Promise<string | null> {
        try {
            // Normalize phone
            const cleanPhone = this.normalizePhone(phone);
            
            const result = await query(
                'SELECT lid FROM lid_phone_mappings WHERE bot_id = ? AND phone = ?',
                [botId, cleanPhone]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0].lid;
            }
            
            return null;
        } catch (error: any) {
            logger.error('[LidMapping] Error getting LID by phone:', error.message);
            return null;
        }
    }

    /**
     * Create or update a mapping
     */
    async upsertMapping(mapping: LidPhoneMapping): Promise<{ success: boolean; id?: string; error?: string }> {
        try {
            const cleanLid = mapping.lid.replace('@lid', '').replace('@s.whatsapp.net', '');
            const cleanPhone = this.normalizePhone(mapping.phone);
            
            // Check if mapping exists
            const existing = await query(
                'SELECT id FROM lid_phone_mappings WHERE bot_id = ? AND lid = ?',
                [mapping.bot_id, cleanLid]
            );
            
            if (existing.rows.length > 0) {
                // Update existing
                await query(`
                    UPDATE lid_phone_mappings SET 
                        phone = ?, name = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE bot_id = ? AND lid = ?
                `, [cleanPhone, mapping.name || null, mapping.bot_id, cleanLid]);
                
                logger.info('[LidMapping] Updated mapping', { lid: cleanLid, phone: cleanPhone });
                return { success: true, id: existing.rows[0].id };
            } else {
                // Create new
                const id = uuidv4();
                await query(`
                    INSERT INTO lid_phone_mappings (id, bot_id, lid, phone, name)
                    VALUES (?, ?, ?, ?, ?)
                `, [id, mapping.bot_id, cleanLid, cleanPhone, mapping.name || null]);
                
                logger.info('[LidMapping] Created mapping', { lid: cleanLid, phone: cleanPhone });
                return { success: true, id };
            }
        } catch (error: any) {
            logger.error('[LidMapping] Error upserting mapping:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all mappings for a bot
     */
    async getMappingsByBot(botId: string): Promise<LidPhoneMapping[]> {
        try {
            const result = await query(
                'SELECT * FROM lid_phone_mappings WHERE bot_id = ? ORDER BY created_at DESC',
                [botId]
            );
            
            return result.rows;
        } catch (error: any) {
            logger.error('[LidMapping] Error getting mappings:', error.message);
            return [];
        }
    }

    /**
     * Delete a mapping
     */
    async deleteMapping(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            await query('DELETE FROM lid_phone_mappings WHERE id = ?', [id]);
            return { success: true };
        } catch (error: any) {
            logger.error('[LidMapping] Error deleting mapping:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk import mappings from an array
     */
    async bulkImport(botId: string, mappings: { lid: string; phone: string; name?: string }[]): Promise<{ success: number; failed: number }> {
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
            } else {
                failed++;
            }
        }
        
        return { success, failed };
    }

    /**
     * Normalize phone number
     */
    private normalizePhone(phone: string): string {
        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Handle Indonesian numbers
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }
        
        return cleaned;
    }
}

export const lidPhoneMappingService = new LidPhoneMappingService();
export default lidPhoneMappingService;
