/**
 * Main Application Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { pool, closePool } from './database/connection';

// Load environment variables
dotenv.config();

// Import core engines (this initializes event subscriptions)
import './core/engine/ruleEngine';
import './core/engine/actionEngine';

// ✅ Import message worker (Bull queue)
import './queue/messageWorker';

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
        await pool.query('SELECT 1');
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
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

    // ✅ Auto-initialize all connected bots
    try {
        const { botRepository } = await import('./database/repositories/botRepository');
        const { whatsappAdapter } = await import('./adapters/whatsapp/whatsappAdapter.baileys');

        const connectedBots = await botRepository.findConnected();

        logger.info(`🔄 Found ${connectedBots.length} connected bots, re-initializing...`);

        for (const bot of connectedBots) {
            try {
                await whatsappAdapter.initializeBot(bot.id);
                logger.info(`✅ Bot re-initialized: ${bot.name} (${bot.id})`);
            } catch (error: any) {
                logger.error(`❌ Failed to re-initialize bot: ${bot.name}`, { error: error.message });
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
