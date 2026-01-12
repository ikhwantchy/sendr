/**
 * AI Assistant API Routes
 * Manage AI configuration and conversations
 */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { llmService } from '../../services/llm/llmService';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/ai/providers
 * Get available LLM providers
 */
router.get('/providers', async (req, res) => {
    try {
        const providers = llmService.getAvailableProviders();
        res.json({
            success: true,
            data: providers
        });
    } catch (error: any) {
        logger.error('Failed to get providers', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ai/test-connection
 * Test AI provider connection
 */
router.post('/test-connection', async (req, res) => {
    try {
        const { provider, apiKey } = req.body;

        if (!provider || !apiKey) {
            return res.status(400).json({
                success: false,
                error: 'Provider and API key are required'
            });
        }

        const isValid = await llmService.testConnection(provider, apiKey);

        res.json({
            success: true,
            data: { isValid }
        });
    } catch (error: any) {
        logger.error('Connection test failed', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai/conversations/:botId
 * Get AI conversations for a bot
 */
router.get('/conversations/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const result = await query(
            `SELECT * FROM ai_conversations 
             WHERE bot_id = ? 
             ORDER BY started_at DESC 
             LIMIT ? OFFSET ?`,
            [botId, Number(limit), Number(offset)]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        logger.error('Failed to get conversations', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai/conversations/:conversationId/messages
 * Get messages for a conversation
 */
router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
        const { conversationId } = req.params;

        const result = await query(
            'SELECT messages FROM ai_conversations WHERE id = ?',
            [conversationId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                error: 'Conversation not found'
            });
        }

        const messages = JSON.parse(result.rows[0].messages || '[]');

        res.json({
            success: true,
            data: messages
        });
    } catch (error: any) {
        logger.error('Failed to get messages', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ai/conversations/:conversationId/end
 * End a conversation
 */
router.post('/conversations/:conversationId/end', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const { conversationId } = req.params;

        await llmService.endConversation(conversationId);

        res.json({
            success: true,
            message: 'Conversation ended'
        });
    } catch (error: any) {
        logger.error('Failed to end conversation', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai/usage/:botId
 * Get AI usage statistics for a bot
 */
router.get('/usage/:botId', async (req, res) => {
    try {
        const { botId } = req.params;
        const { days = 30 } = req.query;

        // Get usage stats
        const result = await query(
            `SELECT 
                provider,
                model,
                COUNT(*) as request_count,
                SUM(tokens_input) as total_input_tokens,
                SUM(tokens_output) as total_output_tokens,
                SUM(cost) as total_cost
             FROM ai_usage 
             WHERE bot_id = ? 
             AND datetime(created_at) >= datetime('now', '-' || ? || ' days')
             GROUP BY provider, model`,
            [botId, Number(days)]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        logger.error('Failed to get usage', { error });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
