"use strict";
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
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminAuth_1 = require("../middleware/adminAuth");
// Controllers
const adminController = __importStar(require("../controllers/adminController"));
const apiKeysController = __importStar(require("../controllers/apiKeysController"));
const invitesController = __importStar(require("../controllers/invitesController"));
const auditLogsController = __importStar(require("../controllers/auditLogsController"));
const systemController = __importStar(require("../controllers/systemController"));
const router = express_1.default.Router();
/**
 * All routes require authentication and admin role
 */
router.use(auth_1.authenticate);
router.use(adminAuth_1.requireAdmin);
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
// ============================================
// GOOGLE SERVICE ACCOUNT (Integrations)
// ============================================
router.get('/google-service-account', adminController.getGoogleServiceAccount);
router.post('/google-service-account', adminController.saveGoogleServiceAccount);
router.delete('/google-service-account', adminController.deleteGoogleServiceAccount);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map