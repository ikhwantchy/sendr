/**
 * Enhanced Campaign Service
 * ============================================
 * - Multi-source contact import (Manual, CSV, Google Sheets)
 * - Template variable support
 * - Anti-spam configuration
 * - Campaign analytics
 */

import { query } from '../../database/connection';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface ContactData {
    phone: string;
    name: string;
    [key: string]: string; // Additional custom fields
}

export interface CampaignCreateData {
    tenant_id: string;
    bot_id: string;
    name: string;
    message_template: string;
    contact_source: 'manual' | 'csv' | 'sheets';
    contacts?: ContactData[];  // For manual/csv
    sheets_url?: string;       // For Google Sheets
    sheets_tab?: string;       // Sheet tab name
    delay_preset?: 'safe' | 'moderate' | 'aggressive' | 'custom';
    custom_delay_config?: {
        minDelay: number;
        maxDelay: number;
        batchSize: number;
        batchPauseMin: number;
        batchPauseMax: number;
        dailyLimit: number;
    };
    image_url?: string;
    scheduled_at?: string;
}

class CampaignService {
    /**
     * Get available template variables
     */
    getAvailableVariables(): { variable: string; description: string; example: string }[] {
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
    parseCSVContacts(csvText: string): { contacts: ContactData[], headers: string[] } {
        const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) return { contacts: [], headers: [] };

        // Parse first line (potential header)
        const firstLineValues = this.parseCSVLine(lines[0]);

        // Detection logic for header
        const hasHeader = firstLineValues.some(val => {
            const h = val.toLowerCase().trim();
            return ['nama', 'name', 'phone', 'telp', 'wa', 'whatsapp', 'nomor', 'no', 'hp'].some(k => h.includes(k));
        });

        let headers: string[] = [];
        let dataLines = lines;

        if (hasHeader) {
            headers = firstLineValues.map(h => h.trim().replace(/[^\x20-\x7E]/g, ''));
            dataLines = lines.slice(1);
        } else {
            // Default headers for headerless CSV: phone as first col, name as second
            headers = ['phone', 'name'];
        }

        // Find phone and name column indices
        const phoneIdx = headers.findIndex(h =>
            ['phone', 'telp', 'whatsapp', 'wa', 'hp', 'nomor', 'no', 'telpon'].some(k => h.toLowerCase().includes(k))
        );
        const nameIdx = headers.findIndex(h =>
            ['nama', 'name', 'contact', 'penerima', 'lengkap'].some(k => h.toLowerCase().includes(k))
        );

        const contacts: ContactData[] = [];
        const cleanVarHeaders = headers.map(h => h.toLowerCase());

        for (const line of dataLines) {
            const values = this.parseCSVLine(line);
            if (values.length === 0) continue;

            // Map based on indices found, or fallback to col 0 and 1
            const phoneVal = phoneIdx !== -1 ? values[phoneIdx] : values[0];
            const nameVal = nameIdx !== -1 ? values[nameIdx] : (values.length > 1 ? values[1] : '');

            if (!phoneVal) continue;

            const phone = phoneVal.trim().replace(/\D/g, '');
            const name = nameVal ? nameVal.trim() : '';

            if (!phone) continue;

            // Build contact with all columns as variables
            const contact: ContactData = { phone, name };
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
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.replace(/"/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.replace(/"/g, ''));

        return result;
    }

    /**
     * Fetch contacts from Google Sheets (public)
     */
    async fetchSheetsContacts(url: string, tabName?: string): Promise<{ contacts: ContactData[], headers: string[] }> {
        try {
            // Extract spreadsheet ID
            const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (!match) throw new Error('Invalid Google Sheets URL');

            const spreadsheetId = match[1];

            // Build CSV export URL
            let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
            if (tabName) {
                csvUrl += `&sheet=${encodeURIComponent(tabName)}`;
            }

            const response = await axios.get(csvUrl, { timeout: 30000 });
            const csvText = response.data;

            return this.parseCSVContacts(csvText);
        } catch (error: any) {
            logger.error('Failed to fetch Google Sheets:', error.message);
            throw new Error(`Failed to fetch Google Sheets: ${error.message}`);
        }
    }

    /**
     * Parse manual input contacts (one per line)
     */
    parseManualContacts(text: string): { contacts: ContactData[], headers: string[] } {
        const lines = text.trim().split('\n');
        const contacts: ContactData[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            // Format: phone, name OR phone name OR just phone
            const parts = line.split(/[,\t]+/).map(p => p.trim());

            const phone = parts[0] || '';
            const name = parts.slice(1).join(' ').trim();

            if (!phone || !/\d/.test(phone)) continue;

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
    async createCampaign(data: CampaignCreateData): Promise<any> {
        const {
            tenant_id,
            bot_id,
            name,
            message_template,
            contact_source,
            contacts: providedContacts,
            sheets_url,
            sheets_tab,
            delay_preset = 'moderate',
            custom_delay_config,
            image_url,
            scheduled_at,
        } = data;

        try {
            // 1. Get contacts based on source
            let contacts: ContactData[] = [];

            // If contacts already provided (parsed by frontend or sheet), use them
            if (providedContacts && providedContacts.length > 0) {
                contacts = providedContacts;
            } else if (contact_source === 'sheets' && sheets_url) {
                const response = await this.fetchSheetsContacts(sheets_url, sheets_tab);
                contacts = response.contacts;
            } else if (contact_source === 'manual' && data.contacts) {
                // Should be covered by provideContacts if frontend parsed it
                contacts = data.contacts;
            }

            if (contacts.length === 0) {
                throw new Error('No valid contacts found');
            }

            // 2. Build anti-spam config
            const antiSpamConfig = delay_preset === 'custom' ? custom_delay_config : null;

            // 3. Create campaign
            const campaignId = uuidv4();
            const initialStatus = scheduled_at ? 'scheduled' : 'draft';

            await query(`
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
                const recipientId = uuidv4();

                await query(`
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

            logger.info('📣 Campaign created', {
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
        } catch (error: any) {
            logger.error('Failed to create campaign', { error: error.message });
            throw error;
        }
    }

    /**
     * Start a campaign immediately
     */
    async startCampaign(campaignId: string): Promise<void> {
        const campaignSchedulerService = (await import('../../services/campaignSchedulerService')).default;
        await campaignSchedulerService.startCampaign(campaignId);
    }

    /**
     * Get campaign by ID with recipients summary
     */
    async getCampaign(campaignId: string): Promise<any> {
        try {
            const campaignResult = await query(`
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
            const recipientsResult = await query(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM campaign_recipients
                WHERE campaign_id = ?
                GROUP BY status
            `, [campaignId]);

            const recipientsSummary: Record<string, number> = {};
            for (const row of recipientsResult.rows) {
                recipientsSummary[row.status] = row.count;
            }

            return {
                ...campaign,
                recipients_summary: recipientsSummary,
            };
        } catch (error: any) {
            logger.error('Failed to get campaign', { error: error.message });
            throw error;
        }
    }

    /**
     * List campaigns with filters
     */
    async listCampaigns(
        tenantId: string,
        botId?: string,
        status?: string,
        limit = 50,
        offset = 0
    ): Promise<any[]> {
        try {
            let sql = `
                SELECT c.*, b.name as bot_name
                FROM campaigns c
                LEFT JOIN bots b ON c.bot_id = b.id
                WHERE c.tenant_id = ?
            `;
            const params: any[] = [tenantId];

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

            const result = await query(sql, params);
            return result.rows;
        } catch (error: any) {
            logger.error('Failed to list campaigns', { error: error.message });
            throw error;
        }
    }

    /**
     * Get campaign recipients with pagination
     */
    async getCampaignRecipients(
        campaignId: string,
        status?: string,
        limit = 50,
        offset = 0
    ): Promise<any> {
        try {
            let countSql = 'SELECT COUNT(*) as total FROM campaign_recipients WHERE campaign_id = ?';
            let dataSql = 'SELECT * FROM campaign_recipients WHERE campaign_id = ?';
            const params: any[] = [campaignId];

            if (status) {
                countSql += ' AND status = ?';
                dataSql += ' AND status = ?';
                params.push(status);
            }

            dataSql += ' ORDER BY sent_at DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?';

            const countResult = await query(countSql, params.slice(0, status ? 2 : 1));
            const dataResult = await query(dataSql, [...params, limit, offset]);

            return {
                total: countResult.rows[0]?.total || 0,
                data: dataResult.rows,
                limit,
                offset,
            };
        } catch (error: any) {
            logger.error('Failed to get campaign recipients', { error: error.message });
            throw error;
        }
    }

    /**
     * Retry failed recipients
     */
    async retryFailedRecipients(campaignId: string): Promise<number> {
        try {
            // Reset failed recipients to pending
            const result = await query(`
                UPDATE campaign_recipients 
                SET status = 'pending', error = NULL, sent_at = NULL
                WHERE campaign_id = ? AND status = 'failed'
            `, [campaignId]);

            // Reset campaign counters
            const failedCount = result.changes || 0;
            if (failedCount > 0) {
                await query(`
                    UPDATE campaigns 
                    SET status = 'running', failed_count = 0
                    WHERE id = ?
                `, [campaignId]);

                // Re-start campaign
                await this.startCampaign(campaignId);
            }

            return failedCount;
        } catch (error: any) {
            logger.error('Failed to retry recipients', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete campaign and recipients
     */
    async deleteCampaign(campaignId: string): Promise<void> {
        try {
            // Cancel if running
            const campaignSchedulerService = (await import('../../services/campaignSchedulerService')).default;
            await campaignSchedulerService.cancelCampaign(campaignId);

            // Delete recipients first
            await query('DELETE FROM campaign_recipients WHERE campaign_id = ?', [campaignId]);

            // Delete campaign
            await query('DELETE FROM campaigns WHERE id = ?', [campaignId]);

            logger.info('📣 Campaign deleted', { campaign_id: campaignId });
        } catch (error: any) {
            logger.error('Failed to delete campaign', { error: error.message });
            throw error;
        }
    }

    /**
     * Get campaign statistics
     */
    async getCampaignStats(tenantId: string, botId?: string): Promise<any> {
        try {
            let whereClause = 'WHERE c.tenant_id = ?';
            const params: any[] = [tenantId];

            if (botId) {
                whereClause += ' AND c.bot_id = ?';
                params.push(botId);
            }

            const result = await query(`
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
        } catch (error: any) {
            logger.error('Failed to get campaign stats', { error: error.message });
            throw error;
        }
    }
}

export const campaignService = new CampaignService();
