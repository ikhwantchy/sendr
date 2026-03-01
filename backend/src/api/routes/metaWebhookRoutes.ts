/**
 * Meta Webhook Routes
 * ============================================================
 * Handles Meta Cloud API webhook verification and incoming messages.
 * Must be registered BEFORE auth middleware (webhooks are unauthenticated).
 */

import { Router, Request, Response } from 'express';
import { metaCloudAdapter } from '../../adapters/whatsapp/whatsappAdapter.meta-cloud';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/webhooks/meta
 * Webhook verification challenge from Meta
 */
router.get('/meta', (req: Request, res: Response) => {
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        logger.info('[Meta Webhook] Verification successful');
        res.status(200).send(challenge);
    } else {
        logger.warn('[Meta Webhook] Verification failed - invalid token or mode');
        res.sendStatus(403);
    }
});

/**
 * POST /api/webhooks/meta
 * Incoming messages from Meta
 * IMPORTANT: Must respond with 200 within 5 seconds
 */
router.post('/meta', async (req: Request, res: Response) => {
    // Always respond 200 immediately to Meta
    res.sendStatus(200);

    try {
        const body = req.body;

        // Get phone_number_id from the webhook payload
        const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
        if (!phoneNumberId) return;

        // Find bot by phone_number_id
        const botResult = await query(
            `SELECT b.id, b.tenant_id, b.meta_app_secret 
             FROM bots b
             WHERE b.meta_phone_number_id = ? AND b.adapter_type = 'meta_cloud'
             LIMIT 1`,
            [phoneNumberId]
        );

        if (botResult.rows.length === 0) {
            logger.warn('[Meta Webhook] No bot found for phone_number_id', { phoneNumberId });
            return;
        }

        const bot = botResult.rows[0];

        // Verify signature if app_secret is configured
        if (bot.meta_app_secret) {
            const signature = req.headers['x-hub-signature-256'] as string;
            if (signature) {
                const rawBody = JSON.stringify(body);
                const isValid = metaCloudAdapter.verifyWebhookSignature(rawBody, signature, bot.meta_app_secret);
                if (!isValid) {
                    logger.warn('[Meta Webhook] Invalid signature, ignoring', { bot_id: bot.id });
                    return;
                }
            }
        }

        await metaCloudAdapter.processWebhook(body, bot.id, bot.tenant_id);

    } catch (error: any) {
        logger.error('[Meta Webhook] Error processing webhook', { error: error.message });
    }
});

export default router;
