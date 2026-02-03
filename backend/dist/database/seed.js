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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const connection_1 = require("./connection");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function seed() {
    console.log('🌱 Starting seed...');
    try {
        // Helper to handle placeholders and timestamps based on DB type
        const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase();
        const isSqlite = dbType === 'sqlite' || dbType !== 'postgres';
        const p = (n) => isSqlite ? '?' : `$${n}`;
        const now = isSqlite ? 'CURRENT_TIMESTAMP' : 'NOW()';
        // 1. Ensure Default Tenant Exists
        let tenantId = 'default-tenant-id'; // Match the ID from schema
        // Check by slug first (to avoid unique constraint error)
        const slugCheck = await (0, connection_1.query)(`SELECT * FROM tenants WHERE slug = ${p(1)}`, ['default']);
        if (slugCheck.rows.length > 0) {
            console.log('ℹ️ Default tenant found (by slug)');
            tenantId = slugCheck.rows[0].id;
        }
        else {
            // Check by ID just in case
            const idCheck = await (0, connection_1.query)(`SELECT * FROM tenants WHERE id = ${p(1)}`, [tenantId]);
            if (idCheck.rows.length === 0) {
                console.log('Creating default tenant...');
                await (0, connection_1.query)(`
                    INSERT INTO tenants (id, name, slug, created_at, updated_at)
                    VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${now}, ${now})
                 `, [tenantId, 'Default Tenant', 'default']);
            }
        }
        // 2. Check if admin exists
        const check = await (0, connection_1.query)(`SELECT * FROM users WHERE email = ${p(1)}`, ['admin@example.com']);
        if (check.rows.length === 0) {
            console.log('Creating admin user...');
            const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
            try {
                await (0, connection_1.query)(`
                    INSERT INTO users (id, tenant_id, email, password_hash, name, role, status, created_at, updated_at)
                    VALUES (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)}, ${p(7)}, ${now}, ${now})
                `, ['default-user-id', tenantId, 'admin@example.com', hashedPassword, 'Admin User', 'OWNER', 'active']);
                console.log('✅ Admin user created');
                console.log('   Email: admin@example.com');
                console.log('   Password: admin123');
            }
            catch (insertError) {
                console.error('❌ Failed to insert admin user:', insertError);
                throw insertError;
            }
        }
        else {
            console.log('ℹ️  Admin user already exists');
        }
        console.log('✅ Seed completed successfully');
        // Forced save for SQLite
        try {
            const { saveDatabase } = await Promise.resolve().then(() => __importStar(require('./connection-sqlite')));
            saveDatabase();
            console.log('💾 Database saved to disk');
        }
        catch (e) { }
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}
seed();
//# sourceMappingURL=seed.js.map