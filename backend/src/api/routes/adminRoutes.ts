import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

// ─── Multer config for image uploads ───────────────────────
const UPLOADS_DIR = path.join(__dirname, '../../../data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
        }
    },
});

// Controllers
import * as adminController from '../controllers/adminController';
import * as apiKeysController from '../controllers/apiKeysController';
import * as invitesController from '../controllers/invitesController';
import * as auditLogsController from '../controllers/auditLogsController';
import * as systemController from '../controllers/systemController';

const router = express.Router();

/**
 * All routes require authentication and admin role
 */
router.use(authenticate);
router.use(requireAdmin);

// ============================================
// DASHBOARD
// ============================================
router.get('/dashboard/stats', adminController.getDashboardStats);

// ============================================
// SETTINGS
// ============================================
router.get('/settings', adminController.getAllSettings);
router.put('/settings', adminController.bulkUpdateSettings);
router.get('/settings/:category', adminController.getSettings);
router.put('/settings/:category', adminController.updateSettings);
router.post('/settings/test-email', adminController.testEmail);

// ============================================
// CACHE
// ============================================
router.post('/cache/clear', adminController.clearCache);

// ============================================
// USER MANAGEMENT
// ============================================
router.post('/users/create', adminController.createUser);

// ============================================
// API KEYS
// ============================================
router.get('/api-keys', apiKeysController.getApiKeys);
router.post('/api-keys', apiKeysController.createApiKey);
router.put('/api-keys/:id', apiKeysController.updateApiKey);
router.post('/api-keys/:id/revoke', apiKeysController.revokeApiKey);
router.delete('/api-keys/:id', apiKeysController.deleteApiKey);
router.get('/api-keys/:id/stats', apiKeysController.getApiKeyStats);

// ============================================
// USER INVITES
// ============================================
router.get('/invites', invitesController.getInvites);
router.post('/invites', invitesController.createInvite);
router.post('/invites/:id/resend', invitesController.resendInvite);
router.post('/invites/:id/revoke', invitesController.revokeInvite);
router.delete('/invites/:id', invitesController.deleteInvite);
router.get('/invites/stats', invitesController.getInviteStats);

// ============================================
// AUDIT LOGS
// ============================================
router.get('/audit-logs', auditLogsController.getAuditLogs);
router.get('/audit-logs/export', auditLogsController.exportAuditLogs);
router.get('/audit-logs/stats', auditLogsController.getAuditLogStats);
router.get('/audit-logs/resource/:type/:id', auditLogsController.getResourceLogs);

// ============================================
// SYSTEM
// ============================================
router.get('/system/health', systemController.getSystemHealth);
router.get('/system/stats', systemController.getSystemStats);
router.post('/system/backup', systemController.createBackup);
router.get('/system/backups', systemController.getBackups);
router.get('/system/backups/download/:filename', systemController.downloadBackup);
router.post('/system/maintenance/optimize-db', systemController.optimizeDatabase);
router.post('/system/maintenance/cleanup-logs', systemController.cleanupLogs);

// ============================================
// GOOGLE SERVICE ACCOUNT (Integrations)
// ============================================
router.get('/google-service-account', adminController.getGoogleServiceAccount);
router.post('/google-service-account', adminController.saveGoogleServiceAccount);
router.delete('/google-service-account', adminController.deleteGoogleServiceAccount);

// ============================================
// IMAGE UPLOAD
// ============================================
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }
    const imageUrl = `/api/public/uploads/${req.file.filename}`;
    res.json({ success: true, url: imageUrl, filename: req.file.filename });
});

router.delete('/upload/:filename', (req, res) => {
    const filename = path.basename(req.params.filename); // prevent directory traversal
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: 'File deleted' });
});

// ============================================
// LANDING PAGE CONTENT MANAGEMENT
// ============================================
router.get('/landing-page', async (req, res) => {
    try {
        const systemSettingsService = (await import('../../services/systemSettingsService')).default;
        const content = await systemSettingsService.get('landing_page', 'content', '{}');
        // content may be a string or already-parsed object depending on data_type
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        res.json({ success: true, content: parsed });
    } catch (error: any) {
        console.error('[Landing] Admin GET error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get landing page content', error: error.message });
    }
});

router.put('/landing-page', async (req, res) => {
    try {
        const systemSettingsService = (await import('../../services/systemSettingsService')).default;
        const auditLogService = (await import('../../services/auditLogService')).default;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, message: 'Content is required' });
        }
        await systemSettingsService.set({
            category: 'landing_page',
            key: 'content',
            value: JSON.stringify(content),
            updated_by: req.user?.id,
        });
        await auditLogService.log({
            user_id: req.user!.id,
            action_type: 'landing_page.update',
            action_category: 'system',
            description: 'Updated landing page content',
            status: 'success'
        });
        res.json({ success: true, message: 'Landing page content updated' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update landing page content', error: error.message });
    }
});

export default router;
