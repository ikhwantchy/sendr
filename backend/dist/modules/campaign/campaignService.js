"use strict";
/**
 * Enhanced Campaign Service
 * ============================================
 * - Multi-source contact import (Manual, CSV, Google Sheets)
 * - Template variable support
 * - Anti-spam configuration
 * - Campaign analytics
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignService = void 0;
const connection_1 = require("../../database/connection");
const logger_1 = require("../../utils/logger");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
class CampaignService {
    /**
     * Get available template variables
     */
    getAvailableVariables() {
        return [
            { variable: '[nama]', description: 'Nama penerima', example: 'Budi Santoso' },
            { variable: '[name]', description: 'Nama penerima (English)', example: 'John Doe' },
            { variable: '[phone]', description: 'Nomor telepon', example: '08123456789' },
            { variable: '[sapaan]', description: 'Sapaan otomatis (Pagi/Siang/Sore/Malam)', example: 'Selamat Pagi' },
            { variable: '[greeting]', description: 'Greeting (English)', example: 'Good Morning' },
            { variable: '[tanggal]', description: 'Tanggal hari ini', example: '15 Januari 2026' },
            { variable: '[hari]', description: 'Nama hari', example: 'Senin' },
            { variable: '[waktu]', description: 'Waktu saat kirim', example: '09:30' },
            { variable: '[custom_field]', description: 'Kolom custom dari spreadsheet', example: '(sesuai data)' },
        ];
    }
    /**
     * Parse contacts from CSV text
     */
    parseCSVContacts(csvText) {
        const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0)
            return { contacts: [], headers: [] };
        // Parse first line (potential header)
        const firstLineValues = this.parseCSVLine(lines[0]);
        // Detection logic for header
        const hasHeader = firstLineValues.some(val => {
            const h = val.toLowerCase().trim();
            return ['nama', 'name', 'phone', 'telp', 'wa', 'whatsapp', 'nomor', 'no', 'hp'].some(k => h.includes(k));
        });
        let headers = [];
        let dataLines = lines;
        if (hasHeader) {
            headers = firstLineValues.map(h => h.trim().replace(/[^\x20-\x7E]/g, ''));
            dataLines = lines.slice(1);
        }
        else {
            // Default headers for headerless CSV: phone as first col, name as second
            headers = ['phone', 'name'];
        }
        // Find phone and name column indices
        const phoneIdx = headers.findIndex(h => ['phone', 'telp', 'whatsapp', 'wa', 'hp', 'nomor', 'no', 'telpon'].some(k => h.toLowerCase().includes(k)));
        const nameIdx = headers.findIndex(h => ['nama', 'name', 'contact', 'penerima', 'lengkap'].some(k => h.toLowerCase().includes(k)));
        const contacts = [];
        const cleanVarHeaders = headers.map(h => h.toLowerCase());
        for (const line of dataLines) {
            const values = this.parseCSVLine(line);
            if (values.length === 0)
                continue;
            // Map based on indices found, or fallback to col 0 and 1
            const phoneVal = phoneIdx !== -1 ? values[phoneIdx] : values[0];
            const nameVal = nameIdx !== -1 ? values[nameIdx] : (values.length > 1 ? values[1] : '');
            if (!phoneVal)
                continue;
            const phone = phoneVal.trim().replace(/\D/g, '');
            const name = nameVal ? nameVal.trim() : '';
            if (!phone)
                continue;
            // Build contact with all columns as variables
            const contact = { phone, name };
            cleanVarHeaders.forEach((header, idx) => {
                if (values[idx] !== undefined) {
                    contact[header] = values[idx].trim();
                }
            });
            contacts.push(contact);
        }
        return { contacts, headers };
    }
    /**
     * Parse a single CSV line (handles quoted values with commas)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.replace(/"/g, ''));
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.replace(/"/g, ''));
        return result;
    }
    /**
     * Fetch contacts from Google Sheets (public)
     */
    async fetchSheetsContacts(url, tabName) {
        try {
            // Extract spreadsheet ID
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!match)
                throw new Error('Invalid Google Sheets URL');
            const spreadsheetId = match[1];
            // Build CSV export URL
            let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
            if (tabName) {
                csvUrl += `&sheet=${encodeURIComponent(tabName)}`;
            }
            const response = await axios_1.default.get(csvUrl, { timeout: 30000 });
            const csvText = response.data;
            return this.parseCSVContacts(csvText);
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Google Sheets:', error.message);
            throw new Error(`Failed to fetch Google Sheets: ${error.message}`);
        }
    }
    /**
     * Parse manual input contacts (one per line)
     */
    parseManualContacts(text) {
        const lines = text.trim().split('\n');
        const contacts = [];
        for (const line of lines) {
            if (!line.trim())
                continue;
            // Format: phone, name OR phone name OR just phone
            const parts = line.split(/[,\t]+/).map(p => p.trim());
            const phone = parts[0] || '';
            const name = parts.slice(1).join(' ').trim();
            if (!phone || !/\d/.test(phone))
                continue;
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone) {
                contacts.push({
                    phone: cleanPhone,
                    name: name || '',
                });
            }
        }
        return { contacts, headers: ['phone', 'name'] };
    }
    /**
     * Create a new campaign
     */
    async createCampaign(data) {
        const { tenant_id, bot_id, name, message_template, contact_source, contacts: providedContacts, sheets_url, sheets_tab, delay_preset = 'moderate', custom_delay_config, image_url, scheduled_at, } = data;
        try {
            // 1. Get contacts based on source
            let contacts = [];
            // If contacts already provided (parsed by frontend or sheet), use them
            if (providedContacts && providedContacts.length > 0) {
                contacts = providedContacts;
            }
            else if (contact_source === 'sheets' && sheets_url) {
                const response = await this.fetchSheetsContacts(sheets_url, sheets_tab);
                contacts = response.contacts;
            }
            else if (contact_source === 'manual' && data.contacts) {
                // Should be covered by provideContacts if frontend parsed it
                contacts = data.contacts;
            }
            if (contacts.length === 0) {
                throw new Error('No valid contacts found');
            }
            // 2. Build anti-spam config
            const antiSpamConfig = delay_preset === 'custom' ? custom_delay_config : null;
            // 3. Create campaign
            const campaignId = (0, uuid_1.v4)();
            const initialStatus = scheduled_at ? 'scheduled' : 'draft';
            await (0, connection_1.query)(`
                INSERT INTO campaigns (
                    id, tenant_id, bot_id, name, message_template,
                    status, total_contacts, sent_count, failed_count,
                    delay_preset, anti_spam_config, contact_source,
                    sheets_url, sheets_tab, image_url, scheduled_at,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                campaignId,
                tenant_id,
                bot_id,
                name,
                message_template,
                initialStatus,
                contacts.length,
                delay_preset,
                antiSpamConfig ? JSON.stringify(antiSpamConfig) : null,
                contact_source,
                sheets_url || null,
                sheets_tab || null,
                image_url || null,
                scheduled_at || null,
            ]);
            // 4. Insert recipients
            for (const contact of contacts) {
                const recipientId = (0, uuid_1.v4)();
                await (0, connection_1.query)(`
                    INSERT INTO campaign_recipients (
                        id, campaign_id, phone, name, variables, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                `, [
                    recipientId,
                    campaignId,
                    contact.phone,
                    contact.name,
                    JSON.stringify(contact),
                ]);
            }
            logger_1.logger.info('📣 Campaign created', {
                campaign_id: campaignId,
                name,
                total_contacts: contacts.length,
                status: initialStatus,
            });
            return {
                id: campaignId,
                name,
                status: initialStatus,
                total_contacts: contacts.length,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create campaign', { error: error.message });
            throw error;
        }
    }
    /**
     * Start a campaign immediately
     */
    async startCampaign(campaignId) {
        const campaignSchedulerService = (await Promise.resolve().then(() => __importStar(require('../../services/campaignSchedulerService')))).default;
        await campaignSchedulerService.startCampaign(campaignId);
    }
    /**
     * Get campaign by ID with recipients summary
     */
    async getCampaign(campaignId) {
        try {
            const campaignResult = await (0, connection_1.query)(`
                SELECT c.*, b.name as bot_name, b.phone_number as bot_phone
                FROM campaigns c
                LEFT JOIN bots b ON c.bot_id = b.id
                WHERE c.id = ?
            `, [campaignId]);
            if (campaignResult.rows.length === 0) {
                return null;
            }
            const campaign = campaignResult.rows[0];
            // Get recipients summary
            const recipientsResult = await (0, connection_1.query)(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM campaign_recipients
                WHERE campaign_id = ?
                GROUP BY status
            `, [campaignId]);
            const recipientsSummary = {};
            for (const row of recipientsResult.rows) {
                recipientsSummary[row.status] = row.count;
            }
            return {
                ...campaign,
                recipients_summary: recipientsSummary,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get campaign', { error: error.message });
            throw error;
        }
    }
    /**
     * List campaigns with filters
     */
    async listCampaigns(tenantId, botId, status, limit = 50, offset = 0) {
        try {
            let sql = `
                SELECT c.*, b.name as bot_name
                FROM campaigns c
                LEFT JOIN bots b ON c.bot_id = b.id
                WHERE c.tenant_id = ?
            `;
            const params = [tenantId];
            if (botId) {
                sql += ' AND c.bot_id = ?';
                params.push(botId);
            }
            if (status) {
                sql += ' AND c.status = ?';
                params.push(status);
            }
            sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            const result = await (0, connection_1.query)(sql, params);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to list campaigns', { error: error.message });
            throw error;
        }
    }
    /**
     * Get campaign recipients with pagination
     */
    async getCampaignRecipients(campaignId, status, limit = 50, offset = 0) {
        try {
            let countSql = 'SELECT COUNT(*) as total FROM campaign_recipients WHERE campaign_id = ?';
            let dataSql = 'SELECT * FROM campaign_recipients WHERE campaign_id = ?';
            const params = [campaignId];
            if (status) {
                countSql += ' AND status = ?';
                dataSql += ' AND status = ?';
                params.push(status);
            }
            dataSql += ' ORDER BY sent_at DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?';
            const countResult = await (0, connection_1.query)(countSql, params.slice(0, status ? 2 : 1));
            const dataResult = await (0, connection_1.query)(dataSql, [...params, limit, offset]);
            return {
                total: countResult.rows[0]?.total || 0,
                data: dataResult.rows,
                limit,
                offset,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get campaign recipients', { error: error.message });
            throw error;
        }
    }
    /**
     * Retry failed recipients
     */
    async retryFailedRecipients(campaignId) {
        try {
            // Reset failed recipients to pending
            const result = await (0, connection_1.query)(`
                UPDATE campaign_recipients 
                SET status = 'pending', error = NULL, sent_at = NULL
                WHERE campaign_id = ? AND status = 'failed'
            `, [campaignId]);
            // Reset campaign counters
            const failedCount = result.changes || 0;
            if (failedCount > 0) {
                await (0, connection_1.query)(`
                    UPDATE campaigns 
                    SET status = 'running', failed_count = 0
                    WHERE id = ?
                `, [campaignId]);
                // Re-start campaign
                await this.startCampaign(campaignId);
            }
            return failedCount;
        }
        catch (error) {
            logger_1.logger.error('Failed to retry recipients', { error: error.message });
            throw error;
        }
    }
    /**
     * Delete campaign and recipients
     */
    async deleteCampaign(campaignId) {
        try {
            // Cancel if running
            const campaignSchedulerService = (await Promise.resolve().then(() => __importStar(require('../../services/campaignSchedulerService')))).default;
            await campaignSchedulerService.cancelCampaign(campaignId);
            // Delete recipients first
            await (0, connection_1.query)('DELETE FROM campaign_recipients WHERE campaign_id = ?', [campaignId]);
            // Delete campaign
            await (0, connection_1.query)('DELETE FROM campaigns WHERE id = ?', [campaignId]);
            logger_1.logger.info('📣 Campaign deleted', { campaign_id: campaignId });
        }
        catch (error) {
            logger_1.logger.error('Failed to delete campaign', { error: error.message });
            throw error;
        }
    }
    /**
     * Get campaign statistics
     */
    async getCampaignStats(tenantId, botId) {
        try {
            let whereClause = 'WHERE c.tenant_id = ?';
            const params = [tenantId];
            if (botId) {
                whereClause += ' AND c.bot_id = ?';
                params.push(botId);
            }
            const result = await (0, connection_1.query)(`
                SELECT 
                    COUNT(*) as total_campaigns,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(COALESCE(sent_count, 0)) as total_sent,
                    SUM(COALESCE(failed_count, 0)) as total_failed,
                    SUM(COALESCE(total_contacts, 0)) as total_contacts
                FROM campaigns c
                ${whereClause}
            `, params);
            return result.rows[0] || {};
        }
        catch (error) {
            logger_1.logger.error('Failed to get campaign stats', { error: error.message });
            throw error;
        }
    }
    async updateRecipientStatus(recipientId, status, error) {
        const sentAt = status === 'sent' ? new Date().toISOString() : null;
        await (0, connection_1.query)(`
             UPDATE campaign_recipients
             SET status = ?, error = ?, sent_at = COALESCE(?, sent_at)
             WHERE id = ?
        `, [status, error || null, sentAt, recipientId]);
        // Increment global counters on Campaign
        if (status === 'sent' || status === 'failed') {
            const recipient = await (0, connection_1.query)('SELECT campaign_id FROM campaign_recipients WHERE id = ?', [recipientId]);
            if (recipient.rows.length > 0) {
                const campaignId = recipient.rows[0].campaign_id;
                const col = status === 'sent' ? 'sent_count' : 'failed_count';
                await (0, connection_1.query)(`UPDATE campaigns SET ${col} = ${col} + 1 WHERE id = ?`, [campaignId]);
            }
        }
    }
}
exports.campaignService = new CampaignService();
//# sourceMappingURL=campaignService.js.map