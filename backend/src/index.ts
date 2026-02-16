/**
 * Main Application Entry Point
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import { query, closePool } from './database/connection';

// Import core engines (this initializes event subscriptions)
import './core/engine/ruleEngine';
import './core/engine/actionEngine';
import './core/engine/aiEngine';

// ✅ Import message worker (Bull queue) - for reminders
import './queue/messageWorker';

// ✅ Import campaign worker (Bull queue) - SEPARATE from reminder
import './queue/campaignWorker';

// ✅ Import Bro-Bot Service (Student Utility)
import './services/broBotService';

// ✅ Import group integration
import { initializeGroupIntegration } from './integrations/groupIntegration';

// Import API routes
import authRoutes from './api/routes/authRoutes';
import botRoutes from './api/routes/botRoutes';
import ruleRoutes from './api/routes/ruleRoutes';
import campaignRoutes from './api/routes/campaignRoutes';
import reminderRoutes from './api/routes/reminderRoutes';
import dataSourceRoutes from './api/routes/dataSourceRoutes';
import analyticsRoutes from './api/routes/analyticsRoutes';
import usersRoutes from './api/routes/usersRoutes';
import permissionsRoutes from './api/routes/permissionsRoutes';
import invitationsRoutes from './api/routes/invitationsRoutes';
import sheetsRoutes from './api/routes/sheetsRoutes';
import aiRoutes from './api/routes/aiRoutes';
import profileRoutes from './api/routes/profileRoutes';
import llmTargetsRoutes from './api/routes/llmTargetsRoutes';
import adminRoutes from './api/routes/adminRoutes';
import securityRoutes from './api/routes/securityRoutes';
import sheetUpdaterRoutes from './api/routes/sheetUpdaterRoutes';
import lidMappingRoutes from './api/routes/lidMappingRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: true, // Allow any origin (for dev/mobile testing)
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        user_agent: req.get('user-agent'),
    });
    next();
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'Database connection failed',
        });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/datasources', dataSourceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/bots', llmTargetsRoutes); // LLM targets are nested under /api/bots/:botId/llm-targets
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/sheet-updater', sheetUpdaterRoutes);
app.use('/api/lid-mappings', lidMappingRoutes);


// 404 handler
app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.path}`, {
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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
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
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📡 API: http://localhost:${PORT}/api`);
    logger.info(`🏥 Health: http://localhost:${PORT}/health`);

    // ✅ Initialize group integration (auto-sync & commands)
    initializeGroupIntegration();
    logger.info('✅ Group integration initialized');

    // ✅ Auto-initialize all bots with valid sessions
    try {
        const { botRepository } = await import('./database/repositories/botRepository');
        const { whatsappAdapter } = await import('./adapters/whatsapp/whatsappAdapter.baileys');

        const allBots = await botRepository.findAll();

        // Filter to bots that are connected OR have valid session files
        const botsToInitialize = allBots.filter(bot =>
            bot.status === 'connected' || whatsappAdapter.hasValidSession(bot.id)
        );

        logger.info(`🔄 Found ${botsToInitialize.length} bots to initialize (${allBots.length} total)...`);

        for (const bot of botsToInitialize) {
            try {
                const hasSession = whatsappAdapter.hasValidSession(bot.id);
                logger.info(`🔄 Initializing bot: ${bot.name} (status: ${bot.status}, hasSession: ${hasSession})`);

                await whatsappAdapter.initializeBot(bot.id);
                logger.info(`✅ Bot initialized: ${bot.name} (${bot.id})`);
            } catch (error: any) {
                logger.error(`❌ Failed to initialize bot: ${bot.name}`, { error: error.message });
            }
        }

        logger.info('✅ Bot auto-initialization complete');
    } catch (error: any) {
        logger.error('❌ Failed to auto-initialize bots', { error: error.message });
    }

    // ✅ Initialize reminder scheduler
    try {
        const reminderSchedulerService = (await import('./services/reminderSchedulerService')).default;
        await reminderSchedulerService.initialize();
        logger.info('✅ Reminder scheduler initialized');
    } catch (error: any) {
        logger.error('❌ Failed to initialize reminder scheduler', { error: error.message });
    }

    // ✅ Initialize campaign scheduler (ISOLATED from reminder)
    try {
        const campaignSchedulerService = (await import('./services/campaignSchedulerService')).default;
        await campaignSchedulerService.initialize();
        logger.info('📣 Campaign scheduler initialized');
    } catch (error: any) {
        logger.error('❌ Failed to initialize campaign scheduler', { error: error.message });
    }

    // ✅ Initialize bot expiration scheduler
    try {
        const { botExpirationScheduler } = await import('./scheduler/botExpirationScheduler');
        botExpirationScheduler.start();
        logger.info('⏰ Bot expiration scheduler initialized');
    } catch (error: any) {
        logger.error('❌ Failed to initialize bot expiration scheduler', { error: error.message });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    server.close(async () => {
        await closePool();
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');

    server.close(async () => {
        await closePool();
        logger.info('Server closed');
        process.exit(0);
    });
});

export default app;
