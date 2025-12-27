/**
 * Message Queue Configuration
 * ENV-driven, stateless, production-ready
 */

import Bull from 'bull';
import { logger } from '../utils/logger';

// ✅ ENV-driven Redis config (NO hardcoded localhost!)
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
};

// ✅ Single queue for all message sending (campaign + reminder)
export const messageQueue = new Bull('whatsapp-messages', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed
        removeOnFail: false, // Keep failed for debugging
    },
});

// Queue event handlers
messageQueue.on('completed', (job) => {
    logger.info('Message sent successfully', {
        job_id: job.id,
        bot_id: job.data.bot_id,
        type: job.data.type,
    });
});

messageQueue.on('failed', (job, err) => {
    logger.error('Message send failed', {
        job_id: job?.id,
        bot_id: job?.data?.bot_id,
        type: job?.data?.type,
        error: err.message,
    });
});

messageQueue.on('error', (error) => {
    logger.error('Queue error', { error: error.message });
});

// Log queue ready
messageQueue.on('ready', () => {
    logger.info('Message queue ready', {
        redis_host: redisConfig.host,
        redis_port: redisConfig.port,
    });
});

logger.info('Message queue initialized', {
    redis_host: redisConfig.host,
    redis_port: redisConfig.port,
    has_password: !!redisConfig.password,
});
