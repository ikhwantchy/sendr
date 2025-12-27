/**
 * Feature Repository
 * Manages master feature list
 */

import { db } from '../connection';
import { logger } from '../../utils/logger';

export interface Feature {
    key: string;
    name: string;
    description: string | null;
    category: string | null;
    is_premium: boolean;
    created_at: string;
}

class FeatureRepository {
    /**
     * Get all features
     */
    async findAll(): Promise<Feature[]> {
        const stmt = db.prepare('SELECT * FROM features ORDER BY category, name');
        return stmt.all() as Feature[];
    }

    /**
     * Get feature by key
     */
    async findByKey(key: string): Promise<Feature | null> {
        const stmt = db.prepare('SELECT * FROM features WHERE key = ?');
        return stmt.get(key) as Feature | null;
    }

    /**
     * Get features by category
     */
    async findByCategory(category: string): Promise<Feature[]> {
        const stmt = db.prepare('SELECT * FROM features WHERE category = ? ORDER BY name');
        return stmt.all(category) as Feature[];
    }

    /**
     * Get all premium features
     */
    async findPremium(): Promise<Feature[]> {
        const stmt = db.prepare('SELECT * FROM features WHERE is_premium = 1 ORDER BY name');
        return stmt.all() as Feature[];
    }

    /**
     * Get all free features
     */
    async findFree(): Promise<Feature[]> {
        const stmt = db.prepare('SELECT * FROM features WHERE is_premium = 0 ORDER BY name');
        return stmt.all() as Feature[];
    }

    /**
     * Create new feature
     */
    async create(data: Omit<Feature, 'created_at'>): Promise<Feature> {
        const createdAt = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO features (key, name, description, category, is_premium, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            data.key,
            data.name,
            data.description,
            data.category,
            data.is_premium ? 1 : 0,
            createdAt
        );

        logger.info('Feature created', { key: data.key });

        return {
            ...data,
            created_at: createdAt,
        };
    }

    /**
     * Update feature
     */
    async update(key: string, data: Partial<Omit<Feature, 'key' | 'created_at'>>): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

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

        if (updates.length === 0) return;

        values.push(key);

        const stmt = db.prepare(`
            UPDATE features SET ${updates.join(', ')}
            WHERE key = ?
        `);

        stmt.run(...values);

        logger.info('Feature updated', { key });
    }

    /**
     * Delete feature
     */
    async delete(key: string): Promise<void> {
        const stmt = db.prepare('DELETE FROM features WHERE key = ?');
        stmt.run(key);

        logger.info('Feature deleted', { key });
    }

    /**
     * Check if feature exists
     */
    async exists(key: string): Promise<boolean> {
        const feature = await this.findByKey(key);
        return feature !== null;
    }

    /**
     * Get feature categories
     */
    async getCategories(): Promise<string[]> {
        const stmt = db.prepare('SELECT DISTINCT category FROM features WHERE category IS NOT NULL ORDER BY category');
        const results = stmt.all() as { category: string }[];
        return results.map(r => r.category);
    }
}

export const featureRepository = new FeatureRepository();
