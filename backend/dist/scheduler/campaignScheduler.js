"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const connection_1 = require("../database/connection");
const campaignService_1 = require("../modules/campaign/campaignService");
const logger_1 = require("../utils/logger");
/**
 * Campaign Scheduler
 * Checks for scheduled campaigns and starts them
 */
class CampaignScheduler {
    isRunning = false;
    start() {
        // Run every minute
        node_cron_1.default.schedule('* * * * *', async () => {
            if (this.isRunning)
                return;
            this.isRunning = true;
            try {
                await this.checkScheduledCampaigns();
            }
            catch (error) {
                logger_1.logger.error('Campaign scheduler error', { error: error.message });
            }
            finally {
                this.isRunning = false;
            }
        });
        logger_1.logger.info('✅ Campaign scheduler started (every minute)');
    }
    async checkScheduledCampaigns() {
        try {
            // Find 'draft' campaigns that have scheduled_at <= now
            // We use datetime() to ensure correct comparison in SQLite
            const result = await (0, connection_1.query)(`
                SELECT id, name, scheduled_at 
                FROM campaigns 
                WHERE status = 'draft' 
                AND scheduled_at IS NOT NULL 
                AND datetime(scheduled_at) <= datetime('now')
            `);
            const dueCampaigns = result.rows;
            if (dueCampaigns.length > 0) {
                logger_1.logger.info(`📅 Found ${dueCampaigns.length} campaigns due for execution`);
                for (const campaign of dueCampaigns) {
                    try {
                        logger_1.logger.info(`🚀 Starting scheduled campaign: ${campaign.name} (${campaign.id})`);
                        await campaignService_1.campaignService.startCampaign(campaign.id);
                    }
                    catch (err) {
                        logger_1.logger.error(`❌ Failed to start scheduled campaign ${campaign.id}`, { error: err.message });
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to check scheduled campaigns', { error: error.message });
        }
    }
}
exports.default = new CampaignScheduler();
//# sourceMappingURL=campaignScheduler.js.map