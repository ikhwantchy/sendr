"use strict";
/**
 * Users Routes
 * All routes require owner role
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const usersController_1 = require("../controllers/usersController");
const adminAuth_1 = require("../middleware/adminAuth");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication and admin/owner role
router.use(auth_1.authenticate);
router.use(adminAuth_1.requireAdmin);
// List all users
router.get('/', usersController_1.listUsers);
// Get user stats
router.get('/stats', usersController_1.getUserStats);
// Get user detail
router.get('/:id', usersController_1.getUserDetail);
// Invite user
router.post('/invite', usersController_1.inviteUser);
// Update user
router.put('/:id', usersController_1.updateUser);
// Delete user
router.delete('/:id', usersController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=usersRoutes.js.map