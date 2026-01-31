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
        const isAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'OWNER';
        const rules = await keywordRuleRepository.findByBot(
            isAdmin ? undefined : req.user!.tenant_id,
            req.params.botId
        );
        res.json({ success: true, data: rules });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/rules/:id - Get rule by ID
router.get('/:id', async (req, res) => {
    try {
        const rule = await keywordRuleRepository.findById(req.params.id, req.user!.tenant_id);
        if (!rule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }
        res.json({ success: true, data: rule });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/rules - Create rule
router.post('/', requireRole(['OWNER', 'OPERATOR', 'USER']), async (req, res) => {
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
router.put('/:id', requireRole(['OWNER', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        const rule = await keywordRuleRepository.update(req.params.id, req.user!.tenant_id, req.body);
        res.json({ success: true, data: rule });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PATCH /api/rules/:id/toggle - Toggle rule active status
router.patch('/:id/toggle', requireRole(['OWNER', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        // Get current rule
        const currentRule = await keywordRuleRepository.findById(req.params.id, req.user!.tenant_id);
        if (!currentRule) {
            return res.status(404).json({ success: false, error: 'Rule not found' });
        }

        // Toggle is_active
        const updatedRule = await keywordRuleRepository.update(req.params.id, req.user!.tenant_id, {
            is_active: currentRule.is_active === 1 ? 0 : 1
        });

        res.json({ success: true, data: updatedRule });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/rules/:id - Delete rule
router.delete('/:id', requireRole(['OWNER', 'OPERATOR', 'USER']), async (req, res) => {
    try {
        await keywordRuleRepository.delete(req.params.id, req.user!.tenant_id);
        res.json({ success: true, message: 'Rule deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
