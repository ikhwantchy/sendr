/**
 * Campaign Worker - Dedicated Queue Processor
 * ============================================
 * Processes campaign messages with anti-spam features
 * ISOLATED from reminder worker
 */

import { campaignQueue } from './campaignQueue';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Template Variable Replacer
 * Supports multiple formats: [var], {{var}}, {var}
 * Case-insensitive matching
 */
function replaceTemplateVariables(
    template: string,
    variables: Record<string, string>,
    recipientName?: string,
    recipientPhone?: string
): string {
    let result = template;
    const now = new Date();

    // Built-in variables
    const builtInVars: Record<string, string> = {
        // Name variations
        'nama': recipientName || '',
        'name': recipientName || '',
        'Nama': recipientName || '',
        'NAME': recipientName || '',

        // Phone variations
        'phone': recipientPhone || '',
        'Phone': recipientPhone || '',
        'telp': recipientPhone || '',
        'whatsapp': recipientPhone || '',
        'hp': recipientPhone || '',

        // Date/Time
        'tanggal': now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        'date': now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        'hari': now.toLocaleDateString('id-ID', { weekday: 'long' }),
        'day': now.toLocaleDateString('en-US', { weekday: 'long' }),
        'waktu': now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        'time': now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        'jam': now.getHours().toString().padStart(2, '0'),

        // Greeting based on time
        'sapaan': getGreeting(now.getHours()),
        'greeting': getGreeting(now.getHours()),
        'salam': getGreeting(now.getHours()),
    };

    // Merge with custom variables (custom overrides built-in)
    // Normalize all variable keys to handle case-insensitivity
    const allVars: Record<string, string> = {};

    // Add built-in vars
    for (const [key, value] of Object.entries(builtInVars)) {
        allVars[key.toLowerCase()] = value;
    }

    // Add custom vars (lowercase key, but preserve original value)
    for (const [key, value] of Object.entries(variables)) {
        if (value && typeof value === 'string') {
            allVars[key.toLowerCase()] = value;
        }
    }

    // DEBUG: Log all variables
    logger.info('📣 DEBUG - replaceTemplateVariables called:', {
        template,
        recipientName,
        recipientPhone,
        variables: JSON.stringify(variables),
        allVarsKeys: Object.keys(allVars),
    });

    // Find all variable patterns in template and replace them
    // Process {{var}} FIRST before {var} to avoid partial matches
    // Pattern: {{var}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
        const normalizedKey = varName.trim().toLowerCase();
        const replacement = allVars[normalizedKey];
        logger.info('📣 DEBUG - Replacing {{var}}:', { match, varName, normalizedKey, found: replacement !== undefined, replacement });
        return replacement !== undefined ? replacement : match;
    });

    // Pattern: [var]
    result = result.replace(/\[([^\]]+)\]/g, (match, varName) => {
        const normalizedKey = varName.trim().toLowerCase();
        return allVars[normalizedKey] !== undefined ? allVars[normalizedKey] : match;
    });

    // Pattern: {var} (single braces - but be careful not to match already processed doubles)
    result = result.replace(/\{([^{}]+)\}/g, (match, varName) => {
        const normalizedKey = varName.trim().toLowerCase();
        return allVars[normalizedKey] !== undefined ? allVars[normalizedKey] : match;
    });

    logger.info('📣 DEBUG - Final result:', { result });

    return result;
}

/**
 * Get greeting based on hour
 */
function getGreeting(hour: number): string {
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}

/**
 * Human-like typing delay simulation
 */
async function simulateTyping(messageLength: number): Promise<void> {
    // Average typing speed: 40 chars per second with variance
    const baseDelay = Math.ceil(messageLength / 40) * 1000;
    const variance = Math.random() * 500; // 0-500ms variance
    const delay = Math.min(baseDelay + variance, 3000); // Max 3 seconds

    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Campaign Message Worker
 */
campaignQueue.process('send-campaign-message', 1, async (job) => {
    const {
        campaign_id,
        recipient_id,
        bot_id,
        phone,
        name,
        variables,
        template,
        image_url,
        // WABA fields
        campaign_type,
        template_name,
        template_language,
        template_components_json,
    } = job.data;

    logger.info('📣 Processing campaign message', {
        job_id: job.id,
        campaign_id,
        recipient_id,
        phone_suffix: phone?.slice(-4),
    });

    // DEBUG: Log all data received
    logger.info('📣 DEBUG - Job data received:', {
        name,
        variables: JSON.stringify(variables),
        template,
        variablesType: typeof variables,
    });

    try {
        // Check if campaign is still running (not paused/cancelled)
        const campaignResult = await query(
            'SELECT status FROM campaigns WHERE id = ?',
            [campaign_id]
        );

        if (campaignResult.rows.length === 0) {
            throw new Error('Campaign not found');
        }

        const campaignStatus = campaignResult.rows[0].status;

        if (campaignStatus !== 'running') {
            logger.info(`📣 Campaign ${campaign_id} is ${campaignStatus}, skipping message`);
            return { success: false, reason: `Campaign ${campaignStatus}` };
        }

        // Replace template variables
        const message = replaceTemplateVariables(template, variables, name, phone);

        // DEBUG: Log the result
        logger.info('📣 DEBUG - After replacement:', {
            originalTemplate: template,
            finalMessage: message,
        });

        // Simulate human-like typing delay
        await simulateTyping(message.length);

        // Format phone number (Normalize to 62...)
        let formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('8')) {
            // Numbers starting with 8 are usually ID numbers without leading 0 or 62
            formattedPhone = '62' + formattedPhone;
        }

        if (!formattedPhone.includes('@')) {
            formattedPhone = formattedPhone + '@s.whatsapp.net';
        }

        // Import adapter factory
        const { getAdapterForBot } = await import('../adapters/whatsapp/whatsappAdapterFactory');
        const adapter = await getAdapterForBot(bot_id);

        // Send message
        let sentResult;

        if (campaign_type === 'template' && template_name) {
            // ─── WABA Template Message ───────────────────────
            // Build template components with variable substitution
            let components: any[] = [];
            if (template_components_json) {
                try {
                    const componentsDef = typeof template_components_json === 'string'
                        ? JSON.parse(template_components_json)
                        : template_components_json;

                    components = componentsDef.map((comp: any) => ({
                        type: comp.type,
                        sub_type: comp.sub_type,
                        index: comp.index,
                        parameters: (comp.parameters || []).map((p: any) => ({
                            type: 'text',
                            text: variables[p.variable] || p.default || '',
                        })),
                    }));
                } catch (e) {
                    logger.warn('Failed to parse template components', { error: e });
                }
            }

            sentResult = await adapter.sendMessage(bot_id, phone, {
                type: 'template',
                template_name,
                template_language: template_language || 'id',
                template_components: components,
            } as any);
        } else if (image_url) {
            // ─── Image Message (Baileys) ────────────────────
            const isBase64 = image_url.startsWith('data:');
            logger.info('📣 Sending image message', { job_id: job.id, isBase64, imageLength: image_url.length });

            // Format phone for Baileys
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
            else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;
            if (!formattedPhone.includes('@')) formattedPhone = formattedPhone + '@s.whatsapp.net';

            sentResult = await adapter.sendMessage(bot_id, formattedPhone, {
                type: 'image',
                media_url: image_url,
                caption: message,
            });
        } else {
            // ─── Text Message (Baileys) ─────────────────────
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
            else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;
            if (!formattedPhone.includes('@')) formattedPhone = formattedPhone + '@s.whatsapp.net';

            sentResult = await adapter.sendMessage(bot_id, formattedPhone, {
                type: 'text',
                content: message,
            });
        }

        // Log the real message ID from WA
        const waMessageId = sentResult.message_id;

        // Log to messages table
        try {
            await query(`
                INSERT INTO messages (
                    id, bot_id, direction, source,
                    message_type, content, created_at
                ) VALUES (?, ?, 'outbound', 'campaign', ?, ?, CURRENT_TIMESTAMP)
            `, [uuidv4(), bot_id, image_url ? 'image' : 'text', message]);
        } catch (logError) {
            logger.warn('Failed to log campaign message', { error: logError });
        }

        // Update status in a single transaction (or sequential with verification)
        try {
            // 1. Update recipient status only if not already sent (avoids double counting on retry)
            const updateRecipientResult = await query(`
                UPDATE campaign_recipients 
                SET status = 'sent', sent_at = CURRENT_TIMESTAMP, wa_message_id = ?, error = NULL 
                WHERE id = ? AND status != 'sent'
            `, [waMessageId || null, recipient_id]);

            // Note: sql.js query wrapper doesn't provide changes easily in current setup
            // So we'll fetch the status or trust sequential flow, but to be safe:
            // We use a more reliable update for the campaign counter
            await query(`
                UPDATE campaigns 
                SET sent_count = (
                    SELECT COUNT(*) FROM campaign_recipients 
                    WHERE campaign_id = ? AND status = 'sent'
                )
                WHERE id = ?
            `, [campaign_id, campaign_id]);

            logger.info('✅ Recipient and Campaign status updated', {
                recipient_id,
                campaign_id,
                wa_message_id: waMessageId
            });
        } catch (dbError: any) {
            logger.error('❌ Failed to update database status after sending', {
                error: dbError.message,
                recipient_id,
                campaign_id
            });
            // We don't throw here because the message was already sent
        }

        // Check if campaign is complete
        await checkCampaignCompletion(campaign_id);

        return { success: true, sent_at: new Date().toISOString() };

    } catch (error: any) {
        logger.error('📣 Failed to send campaign message', {
            job_id: job.id,
            recipient_id,
            error: error.message,
        });

        // Update recipient status as failed
        await query(`
            UPDATE campaign_recipients 
            SET status = 'failed', sent_at = CURRENT_TIMESTAMP, error = ? 
            WHERE id = ?
        `, [error.message, recipient_id]);

        // Update campaign counters based on actual table state
        await query(`
            UPDATE campaigns 
            SET failed_count = (
                SELECT COUNT(*) FROM campaign_recipients 
                WHERE campaign_id = ? AND status = 'failed'
            )
            WHERE id = ?
        `, [campaign_id, campaign_id]);

        // Check if campaign is complete
        await checkCampaignCompletion(campaign_id);

        throw error;
    }
});

/**
 * Check if campaign is complete and update status
 */
async function checkCampaignCompletion(campaignId: string): Promise<void> {
    try {
        const result = await query(`
            SELECT 
                id,
                total_contacts,
                (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status IN ('sent', 'failed')) as processed_count,
                (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status = 'sent') as actual_sent,
                (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ? AND status = 'failed') as actual_failed
            FROM campaigns 
            WHERE id = ?
        `, [campaignId, campaignId, campaignId, campaignId]);

        if (result.rows.length > 0) {
            const campaign = result.rows[0];
            const totalProcessed = campaign.processed_count;

            // Sync counters just in case
            await query(`
                UPDATE campaigns 
                SET sent_count = ?, failed_count = ?
                WHERE id = ?
            `, [campaign.actual_sent, campaign.actual_failed, campaignId]);

            if (totalProcessed >= campaign.total_contacts) {
                // Determine final status based on results
                // - 'completed' if at least one message sent successfully
                // - 'failed' if all messages failed (0 sent)
                const finalStatus = campaign.actual_sent > 0 ? 'completed' : 'failed';

                await query(`
                    UPDATE campaigns 
                    SET status = ?, completed_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [finalStatus, campaignId]);

                logger.info(`📣 Campaign ${finalStatus}`, {
                    campaign_id: campaignId,
                    sent: campaign.actual_sent,
                    failed: campaign.actual_failed,
                    final_status: finalStatus,
                });
            }
        }
    } catch (error: any) {
        logger.error('Failed to check campaign completion', { error: error.message });
    }
}

logger.info('📣 Campaign worker initialized');
