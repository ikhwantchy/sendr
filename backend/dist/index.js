"use strict";
/**
 * Main Application Entry Point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = require("./utils/logger");
const connection_1 = require("./database/connection");
// Import core engines (this initializes event subscriptions)
require("./core/engine/ruleEngine");
require("./core/engine/actionEngine");
require("./core/engine/aiEngine");
// ✅ Import message worker (Bull queue) - for reminders
require("./queue/messageWorker");
// ✅ Import campaign worker (Bull queue) - SEPARATE from reminder
require("./queue/campaignWorker");
// ✅ Import group integration
const groupIntegration_1 = require("./integrations/groupIntegration");
// Import API routes
const authRoutes_1 = __importDefault(require("./api/routes/authRoutes"));
const botRoutes_1 = __importDefault(require("./api/routes/botRoutes"));
const ruleRoutes_1 = __importDefault(require("./api/routes/ruleRoutes"));
const campaignRoutes_1 = __importDefault(require("./api/routes/campaignRoutes"));
const reminderRoutes_1 = __importDefault(require("./api/routes/reminderRoutes"));
const dataSourceRoutes_1 = __importDefault(require("./api/routes/dataSourceRoutes"));
const analyticsRoutes_1 = __importDefault(require("./api/routes/analyticsRoutes"));
const usersRoutes_1 = __importDefault(require("./api/routes/usersRoutes"));
const permissionsRoutes_1 = __importDefault(require("./api/routes/permissionsRoutes"));
const invitationsRoutes_1 = __importDefault(require("./api/routes/invitationsRoutes"));
const sheetsRoutes_1 = __importDefault(require("./api/routes/sheetsRoutes"));
const aiRoutes_1 = __importDefault(require("./api/routes/aiRoutes"));
const profileRoutes_1 = __importDefault(require("./api/routes/profileRoutes"));
const llmTargetsRoutes_1 = __importDefault(require("./api/routes/llmTargetsRoutes"));
const adminRoutes_1 = __importDefault(require("./api/routes/adminRoutes"));
const securityRoutes_1 = __importDefault(require("./api/routes/securityRoutes"));
const sheetUpdaterRoutes_1 = __importDefault(require("./api/routes/sheetUpdaterRoutes"));
const lidMappingRoutes_1 = __importDefault(require("./api/routes/lidMappingRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: true, // Allow any origin (for dev/mobile testing)
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        user_agent: req.get('user-agent'),
    });
    next();
});
// Health check
app.get('/health', async (req, res) => {
    try {
        await (0, connection_1.query)('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed',
        });
    }
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/bots', botRoutes_1.default);
app.use('/api/rules', ruleRoutes_1.default);
app.use('/api/campaigns', campaignRoutes_1.default);
app.use('/api/reminders', reminderRoutes_1.default);
app.use('/api/datasources', dataSourceRoutes_1.default);
app.use('/api/analytics', analyticsRoutes_1.default);
app.use('/api/users', usersRoutes_1.default);
app.use('/api/permissions', permissionsRoutes_1.default);
app.use('/api/invitations', invitationsRoutes_1.default);
app.use('/api/sheets', sheetsRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/profile', profileRoutes_1.default);
app.use('/api/bots', llmTargetsRoutes_1.default); // LLM targets are nested under /api/bots/:botId/llm-targets
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/security', securityRoutes_1.default);
app.use('/api/sheet-updater', sheetUpdaterRoutes_1.default);
app.use('/api/lid-mappings', lidMappingRoutes_1.default);
// 404 handler
app.use((req, res) => {
    logger_1.logger.warn(`404 Not Found: ${req.method} ${req.path}`, {
        ip: req.ip,
        headers: req.headers,
    });
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method
    });
});
// Error handler
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
    });
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});
// Start server
const server = app.listen(PORT, async () => {
    logger_1.logger.info(`🚀 Server running on port ${PORT}`);
    logger_1.logger.info(`📡 API: http://localhost:${PORT}/api`);
    logger_1.logger.info(`🏥 Health: http://localhost:${PORT}/health`);
    // ✅ Initialize group integration (auto-sync & commands)
    (0, groupIntegration_1.initializeGroupIntegration)();
    logger_1.logger.info('✅ Group integration initialized');
    // ✅ Auto-initialize all bots with valid sessions
    try {
        const { botRepository } = await Promise.resolve().then(() => __importStar(require('./database/repositories/botRepository')));
        const { whatsappAdapter } = await Promise.resolve().then(() => __importStar(require('./adapters/whatsapp/whatsappAdapter.baileys')));
        const allBots = await botRepository.findAll();
        // Filter to bots that are connected OR have valid session files
        const botsToInitialize = allBots.filter(bot => bot.status === 'connected' || whatsappAdapter.hasValidSession(bot.id));
        logger_1.logger.info(`🔄 Found ${botsToInitialize.length} bots to initialize (${allBots.length} total)...`);
        for (const bot of botsToInitialize) {
            try {
                const hasSession = whatsappAdapter.hasValidSession(bot.id);
                logger_1.logger.info(`🔄 Initializing bot: ${bot.name} (status: ${bot.status}, hasSession: ${hasSession})`);
                await whatsappAdapter.initializeBot(bot.id);
                logger_1.logger.info(`✅ Bot initialized: ${bot.name} (${bot.id})`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to initialize bot: ${bot.name}`, { error: error.message });
            }
        }
        logger_1.logger.info('✅ Bot auto-initialization complete');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to auto-initialize bots', { error: error.message });
    }
    // ✅ Initialize reminder scheduler
    try {
        const reminderSchedulerService = (await Promise.resolve().then(() => __importStar(require('./services/reminderSchedulerService')))).default;
        await reminderSchedulerService.initialize();
        logger_1.logger.info('✅ Reminder scheduler initialized');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize reminder scheduler', { error: error.message });
    }
    // ✅ Initialize campaign scheduler (ISOLATED from reminder)
    try {
        const campaignSchedulerService = (await Promise.resolve().then(() => __importStar(require('./services/campaignSchedulerService')))).default;
        await campaignSchedulerService.initialize();
        logger_1.logger.info('📣 Campaign scheduler initialized');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize campaign scheduler', { error: error.message });
    }
    // ✅ Initialize bot expiration scheduler
    try {
        const { botExpirationScheduler } = await Promise.resolve().then(() => __importStar(require('./scheduler/botExpirationScheduler')));
        botExpirationScheduler.start();
        logger_1.logger.info('⏰ Bot expiration scheduler initialized');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize bot expiration scheduler', { error: error.message });
    }
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        await (0, connection_1.closePool)();
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    server.close(async () => {
        await (0, connection_1.closePool)();
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map