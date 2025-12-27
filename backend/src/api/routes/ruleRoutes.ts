import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { keywordRuleRepository } from '../../database/repositories/keywordRuleRepository';

const router = Router();
router.use(authenticate);

// GET /api/rules - List rules
router.get('/', async (req, res) => {
    try {
        const rules = await keywordRuleRepository.findByTenant(req.user!.tenant_id);
        res.json({ success: true, data: rules });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/rules/bot/:botId - List rules by bot
router.get('/bot/:botId', async (req, res) => {
    try {
        const rules = await keywordRuleRepository.findByBot(req.user!.tenant_id, req.params.botId);
        res.json({ success: true, data: rules });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/rules - Create rule
router.post('/', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const rule = await keywordRuleRepository.create({
            ...req.body,
            tenant_id: req.user!.tenant_id,
            created_by: req.user!.id,
        });
        res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/rules/:id - Update rule
router.put('/:id', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        const rule = await keywordRuleRepository.update(req.params.id, req.user!.tenant_id, req.body);
        res.json({ success: true, data: rule });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/rules/:id - Delete rule
router.delete('/:id', requireRole(['OWNER', 'OPERATOR']), async (req, res) => {
    try {
        await keywordRuleRepository.delete(req.params.id, req.user!.tenant_id);
        res.json({ success: true, message: 'Rule deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
