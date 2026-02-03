"use strict";
/**
 * Permissions Routes
 * All routes require owner role
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permissionsController_1 = require("../controllers/permissionsController");
const checkPermission_1 = require("../middleware/checkPermission");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get user's permissions
router.get('/user/:userId', permissionsController_1.getUserPermissions);
// Get bot's permissions
router.get('/bot/:botId', checkPermission_1.requireOwner, permissionsController_1.getBotPermissions);
// Check access
router.get('/check/:botId/:userId', permissionsController_1.checkAccess);
// Grant/Update permission (owner only)
router.post('/', checkPermission_1.requireOwner, permissionsController_1.grantPermission);
// NEW: Support for granular bot update
router.put('/:userId/:botId', checkPermission_1.requireOwner, permissionsController_1.updatePermission);
// LEGACY: Old single param update
router.put('/:id', checkPermission_1.requireOwner, permissionsController_1.updatePermission);
// Revoke permission
router.delete('/:id', checkPermission_1.requireOwner, permissionsController_1.revokePermission);
exports.default = router;
//# sourceMappingURL=permissionsRoutes.js.map