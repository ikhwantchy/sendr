/**
 * Bot Expiration Scheduler
 * Automatically disconnects bots that have passed their expiration date
 * ✅ Runs every 5 minutes
 * ✅ Auto-disconnects expired bots
 * ✅ Pauses associated reminders and campaigns
 */

import cron from 'node-cron';
import { botRepository } from '../database/repositories/botRepository';
import { whatsappAdapter } from '../adapters/whatsapp/whatsappAdapter.baileys';
import { query, logActivity } from '../database/connection';
import { logger } from '../utils/logger';

class BotExpirationScheduler {
    private isRunning = false;

    /**
     * Start the scheduler
     */
    start(): void {
        // Run every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                logger.warn('Bot expiration scheduler already running, skipping...');
                return;
            }

            this.isRunning = true;

            try {
                await this.checkAndDisconnectExpiredBots();
            } catch (error: any) {
                logger.error('Bot expiration scheduler error', { error: error.message });
            } finally {
                this.isRunning = false;
            }
        });

        logger.info('Bot expiration scheduler started (runs every 5 minutes)');
    }

    /**
     * Check for expired bots and disconnect them
     */
    private async checkAndDisconnectExpiredBots(): Promise<void> {
        try {
            // Get all connected bots that have expired
            const expiredBots = await botRepository.findExpiredConnectedBots();

            if (expiredBots.length === 0) {
                return;
            }

            logger.info('Found expired bots to disconnect', { count: expiredBots.length });

            for (const bot of expiredBots) {
                await this.disconnectExpiredBot(bot);
            }
        } catch (error: any) {
            logger.error('Failed to check expired bots', { error: error.message });
        }
    }

    /**
     * Disconnect an expired bot and pause its associated tasks
     */
    private async disconnectExpiredBot(bot: any): Promise<void> {
        try {
            logger.info('Disconnecting expired bot', { 
                bot_id: bot.id, 
                bot_name: bot.name,
                expires_at: bot.expires_at 
            });

            // 1. Disconnect the WhatsApp session
            try {
                await whatsappAdapter.disconnect(bot.id);
            } catch (disconnectError: any) {
                logger.warn('Failed to disconnect bot session', { 
                    bot_id: bot.id, 
                    error: disconnectError.message 
                });
            }

            // 2. Update bot status to disconnected and set expired reason
            await botRepository.update(bot.id, {
                status: 'disconnected',
                expired_reason: 'Bot subscription has expired. Please contact admin to renew.',
            });

            // 3. Pause all reminders for this bot
            await query(
                `UPDATE reminders SET is_active = 0 WHERE bot_id = ?`,
                [bot.id]
            );

            // 4. Cancel pending campaigns for this bot
            await query(
                `UPDATE campaigns SET status = 'cancelled' WHERE bot_id = ? AND status IN ('draft', 'scheduled')`,
                [bot.id]
            );

            // 5. Log the activity
            await logActivity('bot', `Bot "${bot.name}" auto-disconnected due to subscription expiration`, {
                bot_id: bot.id,
                expires_at: bot.expires_at,
                action: 'auto_expired'
            });

            logger.info('Successfully disconnected expired bot', { 
                bot_id: bot.id, 
                bot_name: bot.name 
            });

        } catch (error: any) {
            logger.error('Failed to disconnect expired bot', { 
                bot_id: bot.id, 
                error: error.message 
            });
        }
    }
}

export const botExpirationScheduler = new BotExpirationScheduler();
