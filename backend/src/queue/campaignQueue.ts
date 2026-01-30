/**
 * Campaign Message Queue
 * ============================================
 * Separate Bull queue for campaign message processing
 * Isolated from reminder queue to prevent conflicts
 */

import Queue from 'bull';
import { logger } from '../utils/logger';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Create campaign queue
export const campaignQueue = new Queue('campaign-messages', {
    redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

// Queue event handlers
campaignQueue.on('error', (error) => {
    logger.error('Campaign queue error', { error: error.message });
});

campaignQueue.on('failed', (job, error) => {
    logger.error('Campaign job failed', {
        job_id: job.id,
        campaign_id: job.data.campaign_id,
        recipient_id: job.data.recipient_id,
        error: error.message,
    });
});

campaignQueue.on('completed', (job) => {
    logger.info('Campaign job completed', {
        job_id: job.id,
        campaign_id: job.data.campaign_id,
        recipient_id: job.data.recipient_id,
    });
});

logger.info('📣 Campaign queue initialized', {
    redis_host: REDIS_HOST,
    redis_port: REDIS_PORT,
    has_password: !!REDIS_PASSWORD,
});
