"use strict";
/**
 * Bot Expiration Scheduler
 * Automatically disconnects bots that have passed their expiration date
 * ✅ Runs every 5 minutes
 * ✅ Auto-disconnects expired bots
 * ✅ Pauses associated reminders and campaigns
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botExpirationScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const botRepository_1 = require("../database/repositories/botRepository");
const whatsappAdapter_baileys_1 = require("../adapters/whatsapp/whatsappAdapter.baileys");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
class BotExpirationScheduler {
    isRunning = false;
    /**
     * Start the scheduler
     */
    start() {
        // Run every 5 minutes
        node_cron_1.default.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                logger_1.logger.warn('Bot expiration scheduler already running, skipping...');
                return;
            }
            this.isRunning = true;
            try {
                await this.checkAndDisconnectExpiredBots();
            }
            catch (error) {
                logger_1.logger.error('Bot expiration scheduler error', { error: error.message });
            }
            finally {
                this.isRunning = false;
            }
        });
        logger_1.logger.info('Bot expiration scheduler started (runs every 5 minutes)');
    }
    /**
     * Check for expired bots and disconnect them
     */
    async checkAndDisconnectExpiredBots() {
        try {
            // Get all connected bots that have expired
            const expiredBots = await botRepository_1.botRepository.findExpiredConnectedBots();
            if (expiredBots.length === 0) {
                return;
            }
            logger_1.logger.info('Found expired bots to disconnect', { count: expiredBots.length });
            for (const bot of expiredBots) {
                await this.disconnectExpiredBot(bot);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to check expired bots', { error: error.message });
        }
    }
    /**
     * Disconnect an expired bot and pause its associated tasks
     */
    async disconnectExpiredBot(bot) {
        try {
            logger_1.logger.info('Disconnecting expired bot', {
                bot_id: bot.id,
                bot_name: bot.name,
                expires_at: bot.expires_at
            });
            // 1. Disconnect the WhatsApp session
            try {
                await whatsappAdapter_baileys_1.whatsappAdapter.disconnect(bot.id);
            }
            catch (disconnectError) {
                logger_1.logger.warn('Failed to disconnect bot session', {
                    bot_id: bot.id,
                    error: disconnectError.message
                });
            }
            // 2. Update bot status to disconnected and set expired reason
            await botRepository_1.botRepository.update(bot.id, {
                status: 'disconnected',
                expired_reason: 'Bot subscription has expired. Please contact admin to renew.',
            });
            // 3. Pause all reminders for this bot
            await (0, connection_1.query)(`UPDATE reminders SET is_active = 0 WHERE bot_id = ?`, [bot.id]);
            // 4. Cancel pending campaigns for this bot
            await (0, connection_1.query)(`UPDATE campaigns SET status = 'cancelled' WHERE bot_id = ? AND status IN ('draft', 'scheduled')`, [bot.id]);
            // 5. Log the activity
            await (0, connection_1.logActivity)('bot', `Bot "${bot.name}" auto-disconnected due to subscription expiration`, {
                bot_id: bot.id,
                expires_at: bot.expires_at,
                action: 'auto_expired'
            });
            logger_1.logger.info('Successfully disconnected expired bot', {
                bot_id: bot.id,
                bot_name: bot.name
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to disconnect expired bot', {
                bot_id: bot.id,
                error: error.message
            });
        }
    }
}
exports.botExpirationScheduler = new BotExpirationScheduler();
//# sourceMappingURL=botExpirationScheduler.js.map