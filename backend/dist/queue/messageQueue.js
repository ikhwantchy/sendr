"use strict";
/**
 * Message Queue Configuration
 * ENV-driven, stateless, production-ready
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const logger_1 = require("../utils/logger");
// ✅ ENV-driven Redis config (NO hardcoded localhost!)
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
};
// ✅ Single queue for all message sending (campaign + reminder)
exports.messageQueue = new bull_1.default('whatsapp-messages', {
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
exports.messageQueue.on('completed', (job) => {
    logger_1.logger.info('Message sent successfully', {
        job_id: job.id,
        bot_id: job.data.bot_id,
        type: job.data.type,
    });
});
exports.messageQueue.on('failed', (job, err) => {
    logger_1.logger.error('Message send failed', {
        job_id: job?.id,
        bot_id: job?.data?.bot_id,
        type: job?.data?.type,
        error: err.message,
    });
});
exports.messageQueue.on('error', (error) => {
    logger_1.logger.error('Queue error', { error: error.message });
});
// Log queue ready
exports.messageQueue.on('ready', () => {
    logger_1.logger.info('Message queue ready', {
        redis_host: redisConfig.host,
        redis_port: redisConfig.port,
    });
});
logger_1.logger.info('Message queue initialized', {
    redis_host: redisConfig.host,
    redis_port: redisConfig.port,
    has_password: !!redisConfig.password,
});
//# sourceMappingURL=messageQueue.js.map