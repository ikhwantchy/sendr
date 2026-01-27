/**
 * Campaign Service - CSV Upload + Template Variables
 * ✅ Parses CSV with phone,name columns
 * ✅ Template variable replacement {{name}}
 * ✅ Bull queue job per contact
 * ✅ Tracks sent/failed in campaign_recipients
 */

import { query } from '../../database/connection';
import { messageQueue } from '../../queue/messageQueue';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CampaignData {
    tenant_id: string;
    bot_id: string;
    name: string;
    message_template: string;
    csv_data: Array<{ phone: string; name: string;[key: string]: string }>;
    delay?: number;
    image_url?: string;
    scheduled_at?: string;
}

class CampaignService {
    /**
     * Create campaign from CSV upload
     */
    async createCampaign(data: CampaignData): Promise<any> {
        const { tenant_id, bot_id, name, message_template, csv_data, delay, image_url, scheduled_at } = data;

        try {
            const campaignId = uuidv4();

            // Insert campaign
            await query(
                `INSERT INTO campaigns (
                    id, tenant_id, bot_id, name, message_template, 
                    status, total_contacts, delay, image_url, scheduled_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    campaignId, tenant_id, bot_id, name, message_template,
                    'draft', csv_data.length, delay || 0, image_url || null, scheduled_at || null
                ]
            );

            // Insert recipients
            for (const contact of csv_data) {
                const recipientId = uuidv4();
                const contactVars = { ...contact, nama: contact.name || '' };
                await query(
                    `INSERT INTO campaign_recipients (
                        id, campaign_id, phone, name, variables, status
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        recipientId,
                        campaignId,
                        contact.phone,
                        contact.name || '',
                        JSON.stringify(contactVars),
                        'pending',
                    ]
                );
            }

            logger.info('Campaign created', {
                campaign_id: campaignId,
                total_contacts: csv_data.length,
            });

            return {
                id: campaignId,
                name,
                status: 'draft',
                total_contacts: csv_data.length,
            };
        } catch (error: any) {
            logger.error('Failed to create campaign', { error: error.message });
            throw error;
        }
    }

    /**
     * Start campaign - Queue all recipients
     */
    async startCampaign(campaignId: string): Promise<void> {
        try {
            // Get campaign
            const campaignResult = await query(
                'SELECT * FROM campaigns WHERE id = ?',
                [campaignId]
            );

            if (campaignResult.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            const campaign = campaignResult.rows[0];

            // Update status to running
            await query(
                `UPDATE campaigns 
                SET status = 'running', started_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [campaignId]
            );

            // Get all pending recipients
            const recipientsResult = await query(
                `SELECT * FROM campaign_recipients 
                WHERE campaign_id = ? AND status = 'pending'`,
                [campaignId]
            );

            // Queue each recipient with delay if specified
            const delaySeconds = campaign.delay || 0;
            let currentDelay = 0;

            for (const recipient of recipientsResult.rows) {
                await messageQueue.add(
                    'campaign-message',
                    {
                        type: 'campaign',
                        campaign_id: campaignId,
                        recipient_id: recipient.id,
                        bot_id: campaign.bot_id,
                        phone: recipient.phone,
                        template: campaign.message_template,
                        variables: JSON.parse(recipient.variables || '{}'),
                        image_url: campaign.image_url,
                    },
                    {
                        delay: currentDelay * 1000, // Bull delay is in milliseconds
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    }
                );

                // Increment delay for next recipient
                if (delaySeconds > 0) {
                    currentDelay += delaySeconds;
                }
            }

            logger.info('Campaign started', {
                campaign_id: campaignId,
                recipients: recipientsResult.rows.length,
            });
        } catch (error: any) {
            logger.error('Failed to start campaign', { error: error.message });
            throw error;
        }
    }

    /**
     * Get campaign status
     */
    async getCampaignStatus(campaignId: string): Promise<any> {
        try {
            const result = await query(
                'SELECT * FROM campaigns WHERE id = ?',
                [campaignId]
            );

            if (result.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            return result.rows[0];
        } catch (error: any) {
            logger.error('Failed to get campaign status', { error: error.message });
            throw error;
        }
    }

    /**
     * List campaigns
     */
    async listCampaigns(tenantId?: string | null, botId?: string): Promise<any[]> {
        try {
            let sql = 'SELECT * FROM campaigns';
            const params: any[] = [];
            const conditions: string[] = [];

            if (tenantId) {
                conditions.push('tenant_id = ?');
                params.push(tenantId);
            }

            if (botId) {
                conditions.push('bot_id = ?');
                params.push(botId);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY created_at DESC';

            const result = await query(sql, params);
            return result.rows;
        } catch (error: any) {
            logger.error('Failed to list campaigns', { error: error.message });
            throw error;
        }
    }

    /**
     * Update recipient status
     */
    async updateRecipientStatus(
        recipientId: string,
        status: 'sent' | 'failed',
        error?: string
    ): Promise<void> {
        try {
            await query(
                `UPDATE campaign_recipients 
                SET status = ?, sent_at = CURRENT_TIMESTAMP, error = ? 
                WHERE id = ?`,
                [status, error || null, recipientId]
            );

            // Get campaign_id
            const recipientResult = await query(
                'SELECT campaign_id FROM campaign_recipients WHERE id = ?',
                [recipientId]
            );

            if (recipientResult.rows.length > 0) {
                const campaignId = recipientResult.rows[0].campaign_id;

                // Update campaign counters
                const field = status === 'sent' ? 'sent_count' : 'failed_count';
                await query(
                    `UPDATE campaigns 
                    SET ${field} = COALESCE(${field}, 0) + 1 
                    WHERE id = ?`,
                    [campaignId]
                );

                // Check if campaign is complete
                const campaignResult = await query(
                    `SELECT total_contacts, sent_count, failed_count 
                    FROM campaigns 
                    WHERE id = ?`,
                    [campaignId]
                );

                if (campaignResult.rows.length > 0) {
                    const campaign = campaignResult.rows[0];
                    const totalProcessed =
                        (campaign.sent_count || 0) + (campaign.failed_count || 0);

                    if (totalProcessed >= campaign.total_contacts) {
                        await query(
                            `UPDATE campaigns 
                            SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
                            WHERE id = ?`,
                            [campaignId]
                        );

                        logger.info('Campaign completed', {
                            campaign_id: campaignId,
                            sent: campaign.sent_count,
                            failed: campaign.failed_count,
                        });
                    }
                }
            }
        } catch (error: any) {
            logger.error('Failed to update recipient status', { error: error.message });
        }
    }

    /**
     * Send campaign (alias for startCampaign)
     */
    async sendCampaign(campaignId: string): Promise<void> {
        return this.startCampaign(campaignId);
    }

    /**
     * Delete campaign
     */
    async deleteCampaign(campaignId: string): Promise<void> {
        try {
            // Delete recipients first (foreign key constraint)
            await query(
                'DELETE FROM campaign_recipients WHERE campaign_id = ?',
                [campaignId]
            );

            // Delete campaign
            await query(
                'DELETE FROM campaigns WHERE id = ?',
                [campaignId]
            );

            logger.info('Campaign deleted', { campaign_id: campaignId });
        } catch (error: any) {
            logger.error('Failed to delete campaign', { error: error.message });
            throw error;
        }
    }
}

export const campaignService = new CampaignService();
