import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

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
router.post('/system/maintenance/optimize-db', systemController.optimizeDatabase);
router.post('/system/maintenance/cleanup-logs', systemController.cleanupLogs);

export default router;
