
import cron from 'node-cron';
import { query } from '../database/connection';
import { campaignService } from '../modules/campaign/campaignService';
import { logger } from '../utils/logger';

/**
 * Campaign Scheduler
 * Checks for scheduled campaigns and starts them
 */
class CampaignScheduler {
    private isRunning = false;

    start() {
        // Run every minute
        cron.schedule('* * * * *', async () => {
            if (this.isRunning) return;
            this.isRunning = true;

            try {
                await this.checkScheduledCampaigns();
            } catch (error: any) {
                logger.error('Campaign scheduler error', { error: error.message });
            } finally {
                this.isRunning = false;
            }
        });

        logger.info('✅ Campaign scheduler started (every minute)');
    }

    private async checkScheduledCampaigns() {
        try {
            // Find 'draft' campaigns that have scheduled_at <= now
            // We use datetime() to ensure correct comparison in SQLite
            const result = await query(`
                SELECT id, name, scheduled_at 
                FROM campaigns 
                WHERE status = 'draft' 
                AND scheduled_at IS NOT NULL 
                AND datetime(scheduled_at) <= datetime('now')
            `);

            const dueCampaigns = result.rows;

            if (dueCampaigns.length > 0) {
                logger.info(`📅 Found ${dueCampaigns.length} campaigns due for execution`);

                for (const campaign of dueCampaigns) {
                    try {
                        logger.info(`🚀 Starting scheduled campaign: ${campaign.name} (${campaign.id})`);
                        await campaignService.startCampaign(campaign.id);
                    } catch (err: any) {
                        logger.error(`❌ Failed to start scheduled campaign ${campaign.id}`, { error: err.message });
                    }
                }
            }
        } catch (error: any) {
            logger.error('Failed to check scheduled campaigns', { error: error.message });
        }
    }
}

export default new CampaignScheduler();
