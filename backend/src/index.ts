/**
 * Main Application Entry Point
 */

import dotenv from 'dotenv';
dotenv.config();

// Trigger restart 3
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
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

// ❌ Bro-Bot Service DISABLED - conflicts with Rule Engine's SEND_SHEET_DATA
// It was sending "Mencari tugas..." + errors because it uses wrong spreadsheet ID
// All keyword handling is now done via Rule Engine + Action Engine
// import './services/broBotService';

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
import metaWebhookRoutes from './api/routes/metaWebhookRoutes';
import inboxRoutes from './api/routes/inboxRoutes';

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

// ✅ Meta Webhook - BEFORE auth middleware (no JWT needed)
app.use('/api/webhooks', metaWebhookRoutes);

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
app.use('/api/inbox', inboxRoutes);

// Public endpoint - landing page content (no auth)
app.get('/api/public/landing-page', async (req, res) => {
    try {
        const { default: systemSettingsService } = await import('./services/systemSettingsService');
        const content = await systemSettingsService.get('landing_page', 'content', '{}');
        // content may be a string or already-parsed object depending on data_type
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        res.json({ success: true, content: parsed });
    } catch (error: any) {
        console.error('[Landing] Public endpoint error:', error.message);
        res.json({ success: true, content: {} });
    }
});

// Public endpoint - serve uploaded images (no auth, cross-origin allowed)
const UPLOADS_DIR = path.join(__dirname, '../data/uploads');
app.get('/api/public/uploads/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // prevent directory traversal
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }
    // Override helmet's restrictive CORP header for images
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(filePath);
});


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

    // ✅ Initialize Socket.IO
    try {
        const { socketService } = await import('./services/socketService');
        socketService.initialize(server);
    } catch (error: any) {
        logger.error('❌ Failed to initialize Socket.IO', { error: error.message });
    }

    // ✅ Initialize group integration (auto-sync & commands)
    initializeGroupIntegration();
    logger.info('✅ Group integration initialized');

    // ✅ Auto-initialize all bots with valid sessions
    try {
        const { botRepository } = await import('./database/repositories/botRepository');
        const { whatsappAdapter } = await import('./adapters/whatsapp/whatsappAdapter.baileys');

        const allBots = await botRepository.findAll();

        // Separate Baileys bots and Meta WABA bots
        const baileysBots = allBots.filter((bot: any) =>
            (!bot.adapter_type || bot.adapter_type === 'baileys' || bot.adapter_type === 'web') &&
            (bot.status === 'connected' || whatsappAdapter.hasValidSession(bot.id))
        );
        const metaBots = allBots.filter((bot: any) =>
            bot.adapter_type === 'meta_cloud' && bot.meta_phone_number_id && bot.meta_access_token
        );

        logger.info(`🔄 Found ${baileysBots.length} Baileys bots, ${metaBots.length} WABA bots to initialize...`);

        // Initialize Baileys bots
        for (const bot of baileysBots) {
            try {
                await whatsappAdapter.initializeBot(bot.id);
                logger.info(`✅ Baileys bot initialized: ${bot.name}`);
            } catch (error: any) {
                logger.error(`❌ Failed to initialize bot: ${bot.name}`, { error: error.message });
            }
        }

        // Initialize WABA bots
        if (metaBots.length > 0) {
            const { metaCloudAdapter } = await import('./adapters/whatsapp/whatsappAdapter.meta-cloud');
            for (const bot of metaBots) {
                try {
                    await metaCloudAdapter.initializeBot(bot.id);
                    logger.info(`✅ WABA bot initialized: ${bot.name}`);
                } catch (error: any) {
                    logger.warn(`⚠️ WABA bot init skipped: ${bot.name}`, { error: error.message });
                }
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



