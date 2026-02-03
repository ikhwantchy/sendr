"use strict";
/**
 * Campaign Message Queue
 * ============================================
 * Separate Bull queue for campaign message processing
 * Isolated from reminder queue to prevent conflicts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../utils/logger");
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
// Create campaign queue
exports.campaignQueue = new bull_1.default('campaign-messages', {
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
exports.campaignQueue.on('error', (error) => {
    logger_1.logger.error('Campaign queue error', { error: error.message });
});
exports.campaignQueue.on('failed', (job, error) => {
    logger_1.logger.error('Campaign job failed', {
        job_id: job.id,
        campaign_id: job.data.campaign_id,
        recipient_id: job.data.recipient_id,
        error: error.message,
    });
});
exports.campaignQueue.on('completed', (job) => {
    logger_1.logger.info('Campaign job completed', {
        job_id: job.id,
        campaign_id: job.data.campaign_id,
        recipient_id: job.data.recipient_id,
    });
});
logger_1.logger.info('📣 Campaign queue initialized', {
    redis_host: REDIS_HOST,
    redis_port: REDIS_PORT,
    has_password: !!REDIS_PASSWORD,
});
//# sourceMappingURL=campaignQueue.js.map