/**
 * Campaign Scheduler Service
 * ============================================
 * ISOLATED from Reminder Scheduler
 * Handles scheduled campaign execution with anti-spam features
 */

import cron from 'node-cron';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

interface AntiSpamConfig {
    minDelay: number;      // Minimum delay between messages (seconds)
    maxDelay: number;      // Maximum delay between messages (seconds)
    batchSize: number;     // Messages per batch before long pause
    batchPauseMin: number; // Minimum pause between batches (seconds)
    batchPauseMax: number; // Maximum pause between batches (seconds)
    dailyLimit: number;    // Max messages per bot per day
    peakHoursAvoid: boolean; // Avoid sending during peak hours
}

// Default anti-spam configuration - SAFE for WhatsApp
const DEFAULT_ANTI_SPAM: AntiSpamConfig = {
    minDelay: 8,           // 8 seconds minimum
    maxDelay: 25,          // 25 seconds maximum (random between min-max)
    batchSize: 15,         // Send 15 messages, then pause
    batchPauseMin: 60,     // 1 minute minimum batch pause
    batchPauseMax: 180,    // 3 minutes maximum batch pause
    dailyLimit: 1000,      // Max 1000 messages per day per bot
    peakHoursAvoid: false, // Optional: avoid 9-11 AM and 7-9 PM
};

class CampaignSchedulerService {
    private schedulerTask: cron.ScheduledTask | null = null;
    private isProcessing: boolean = false;

    /**
     * Initialize campaign scheduler
     * Runs every minute to check for scheduled campaigns
     */
    async initialize() {
        try {
            // Check every minute for scheduled campaigns
            this.schedulerTask = cron.schedule('* * * * *', async () => {
                if (!this.isProcessing) {
                    await this.processScheduledCampaigns();
                }
            }, {
                scheduled: true,
                timezone: 'Asia/Jakarta'
            });

            logger.info('📣 Campaign Scheduler initialized (runs every minute)');
        } catch (error: any) {
            logger.error('Failed to initialize campaign scheduler:', error);
        }
    }

    /**
     * Process scheduled campaigns that are due
     */
    private async processScheduledCampaigns() {
        this.isProcessing = true;

        try {
            const now = new Date().toISOString();

            // Find campaigns that are scheduled and due
            const result = await query(`
                SELECT * FROM campaigns 
                WHERE status = 'scheduled' 
                AND scheduled_at <= ?
                ORDER BY scheduled_at ASC
            `, [now]);

            if (result.rows.length > 0) {
                logger.info(`📣 Found ${result.rows.length} scheduled campaigns to process`);

                for (const campaign of result.rows) {
                    await this.startCampaign(campaign.id);
                }
            }
        } catch (error: any) {
            logger.error('Error processing scheduled campaigns:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start a campaign - queue all recipients with anti-spam delays
     */
    async startCampaign(campaignId: string): Promise<void> {
        try {
            // Get campaign details
            const campaignResult = await query(
                'SELECT * FROM campaigns WHERE id = ?',
                [campaignId]
            );

            if (campaignResult.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            const campaign = campaignResult.rows[0];

            // Parse anti-spam config
            let antiSpamConfig: AntiSpamConfig = DEFAULT_ANTI_SPAM;
            if (campaign.anti_spam_config) {
                try {
                    antiSpamConfig = { ...DEFAULT_ANTI_SPAM, ...JSON.parse(campaign.anti_spam_config) };
                } catch (e) {
                    // Use defaults
                }
            }

            // Check daily limit
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const sentTodayResult = await query(`
                SELECT COUNT(*) as count FROM campaign_recipients cr
                JOIN campaigns c ON cr.campaign_id = c.id
                WHERE c.bot_id = ? AND cr.sent_at >= ? AND cr.status = 'sent'
            `, [campaign.bot_id, todayStart.toISOString()]);

            const sentToday = sentTodayResult.rows[0]?.count || 0;

            if (sentToday >= antiSpamConfig.dailyLimit) {
                logger.warn(`⚠️ Daily limit reached for bot ${campaign.bot_id}. Rescheduling campaign.`);

                // Reschedule to next day at 8 AM
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(8, 0, 0, 0);

                await query(
                    `UPDATE campaigns SET scheduled_at = ? WHERE id = ?`,
                    [tomorrow.toISOString(), campaignId]
                );
                return;
            }

            // Update status to running
            await query(
                `UPDATE campaigns SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [campaignId]
            );

            // Get all pending recipients
            const recipientsResult = await query(
                `SELECT * FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'`,
                [campaignId]
            );

            // Import message queue
            const { campaignQueue } = await import('../queue/campaignQueue');

            // Calculate delays with anti-spam logic
            let currentDelay = 0;
            let messagesInBatch = 0;

            for (const recipient of recipientsResult.rows) {
                // Random delay between messages
                const messageDelay = this.getRandomDelay(antiSpamConfig.minDelay, antiSpamConfig.maxDelay);
                currentDelay += messageDelay * 1000; // Convert to ms

                messagesInBatch++;

                // Batch pause logic
                if (messagesInBatch >= antiSpamConfig.batchSize) {
                    const batchPause = this.getRandomDelay(antiSpamConfig.batchPauseMin, antiSpamConfig.batchPauseMax);
                    currentDelay += batchPause * 1000;
                    messagesInBatch = 0;
                    logger.info(`📣 Batch pause: ${batchPause}s after ${antiSpamConfig.batchSize} messages`);
                }

                // For WABA template campaigns, no anti-spam delay needed (Meta handles rate limits)
                const isWabaTemplate = campaign.campaign_type === 'template';
                if (isWabaTemplate) {
                    currentDelay = messagesInBatch * 500; // 500ms stagger for WABA
                }

                // Queue the message
                await campaignQueue.add(
                    'send-campaign-message',
                    {
                        campaign_id: campaignId,
                        recipient_id: recipient.id,
                        bot_id: campaign.bot_id,
                        phone: recipient.phone,
                        name: recipient.name,
                        variables: JSON.parse(recipient.variables || '{}'),
                        template: campaign.message_template,
                        image_url: campaign.image_url,
                        // WABA template fields
                        campaign_type: campaign.campaign_type || 'freetext',
                        template_name: campaign.template_name,
                        template_language: campaign.template_language || 'id',
                        template_components_json: campaign.template_components_json,
                    },
                    {
                        delay: currentDelay,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000, // 5 seconds initial backoff
                        },
                        removeOnComplete: true,
                        removeOnFail: false,
                    }
                );
            }

            const estimatedTime = Math.ceil(currentDelay / 60000); // Convert to minutes
            logger.info(`📣 Campaign ${campaignId} queued: ${recipientsResult.rows.length} messages, ~${estimatedTime} minutes`);

        } catch (error: any) {
            logger.error('Failed to start campaign:', error);

            // Mark campaign as failed
            await query(
                `UPDATE campaigns SET status = 'failed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [campaignId]
            );

            throw error;
        }
    }

    /**
     * Get random delay between min and max (inclusive)
     */
    private getRandomDelay(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Pause a running campaign
     */
    async pauseCampaign(campaignId: string): Promise<void> {
        try {
            await query(
                `UPDATE campaigns SET status = 'paused' WHERE id = ? AND status = 'running'`,
                [campaignId]
            );

            // Remove pending jobs from queue
            const { campaignQueue } = await import('../queue/campaignQueue');
            const jobs = await campaignQueue.getJobs(['delayed', 'waiting']);

            for (const job of jobs) {
                if (job.data.campaign_id === campaignId) {
                    await job.remove();
                }
            }

            logger.info(`⏸️ Campaign ${campaignId} paused`);
        } catch (error: any) {
            logger.error('Failed to pause campaign:', error);
            throw error;
        }
    }

    /**
     * Resume a paused campaign
     */
    async resumeCampaign(campaignId: string): Promise<void> {
        try {
            // Get campaign and re-queue pending recipients
            await query(
                `UPDATE campaigns SET status = 'running' WHERE id = ? AND status = 'paused'`,
                [campaignId]
            );

            // Re-start with remaining recipients
            await this.startCampaign(campaignId);

            logger.info(`▶️ Campaign ${campaignId} resumed`);
        } catch (error: any) {
            logger.error('Failed to resume campaign:', error);
            throw error;
        }
    }

    /**
     * Cancel a campaign
     */
    async cancelCampaign(campaignId: string): Promise<void> {
        try {
            await query(
                `UPDATE campaigns SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [campaignId]
            );

            // Remove pending jobs from queue
            const { campaignQueue } = await import('../queue/campaignQueue');
            const jobs = await campaignQueue.getJobs(['delayed', 'waiting']);

            for (const job of jobs) {
                if (job.data.campaign_id === campaignId) {
                    await job.remove();
                }
            }

            logger.info(`❌ Campaign ${campaignId} cancelled`);
        } catch (error: any) {
            logger.error('Failed to cancel campaign:', error);
            throw error;
        }
    }

    /**
     * Get anti-spam presets
     */
    getAntiSpamPresets(): Record<string, AntiSpamConfig> {
        return {
            'safe': {
                minDelay: 15,
                maxDelay: 45,
                batchSize: 10,
                batchPauseMin: 120,
                batchPauseMax: 300,
                dailyLimit: 100,
                peakHoursAvoid: true,
            },
            'moderate': {
                minDelay: 8,
                maxDelay: 25,
                batchSize: 15,
                batchPauseMin: 60,
                batchPauseMax: 180,
                dailyLimit: 200,
                peakHoursAvoid: false,
            },
            'aggressive': {
                minDelay: 5,
                maxDelay: 15,
                batchSize: 25,
                batchPauseMin: 30,
                batchPauseMax: 90,
                dailyLimit: 500,
                peakHoursAvoid: false,
            },
        };
    }

    /**
     * Stop scheduler
     */
    stop() {
        if (this.schedulerTask) {
            this.schedulerTask.stop();
            this.schedulerTask = null;
            logger.info('📣 Campaign Scheduler stopped');
        }
    }
}

export default new CampaignSchedulerService();
