"use strict";
/**
 * Feature Repository
 * Manages master feature list
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureRepository = void 0;
const connection_1 = require("../connection");
const logger_1 = require("../../utils/logger");
class FeatureRepository {
    /**
     * Get all features
     */
    async findAll() {
        const stmt = connection_1.db.prepare('SELECT * FROM features ORDER BY category, name');
        return stmt.all();
    }
    /**
     * Get feature by key
     */
    async findByKey(key) {
        const stmt = connection_1.db.prepare('SELECT * FROM features WHERE key = ?');
        return stmt.get(key);
    }
    /**
     * Get features by category
     */
    async findByCategory(category) {
        const stmt = connection_1.db.prepare('SELECT * FROM features WHERE category = ? ORDER BY name');
        return stmt.all(category);
    }
    /**
     * Get all premium features
     */
    async findPremium() {
        const stmt = connection_1.db.prepare('SELECT * FROM features WHERE is_premium = 1 ORDER BY name');
        return stmt.all();
    }
    /**
     * Get all free features
     */
    async findFree() {
        const stmt = connection_1.db.prepare('SELECT * FROM features WHERE is_premium = 0 ORDER BY name');
        return stmt.all();
    }
    /**
     * Create new feature
     */
    async create(data) {
        const createdAt = new Date().toISOString();
        const stmt = connection_1.db.prepare(`
            INSERT INTO features (key, name, description, category, is_premium, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(data.key, data.name, data.description, data.category, data.is_premium ? 1 : 0, createdAt);
        logger_1.logger.info('Feature created', { key: data.key });
        return {
            ...data,
            created_at: createdAt,
        };
    }
    /**
     * Update feature
     */
    async update(key, data) {
        const updates = [];
        const values = [];
        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            values.push(data.description);
        }
        if (data.category !== undefined) {
            updates.push('category = ?');
            values.push(data.category);
        }
        if (data.is_premium !== undefined) {
            updates.push('is_premium = ?');
            values.push(data.is_premium ? 1 : 0);
        }
        if (updates.length === 0)
            return;
        values.push(key);
        const stmt = connection_1.db.prepare(`
            UPDATE features SET ${updates.join(', ')}
            WHERE key = ?
        `);
        stmt.run(...values);
        logger_1.logger.info('Feature updated', { key });
    }
    /**
     * Delete feature
     */
    async delete(key) {
        const stmt = connection_1.db.prepare('DELETE FROM features WHERE key = ?');
        stmt.run(key);
        logger_1.logger.info('Feature deleted', { key });
    }
    /**
     * Check if feature exists
     */
    async exists(key) {
        const feature = await this.findByKey(key);
        return feature !== null;
    }
    /**
     * Get feature categories
     */
    async getCategories() {
        const stmt = connection_1.db.prepare('SELECT DISTINCT category FROM features WHERE category IS NOT NULL ORDER BY category');
        const results = stmt.all();
        return results.map(r => r.category);
    }
}
exports.featureRepository = new FeatureRepository();
//# sourceMappingURL=featureRepository.js.map