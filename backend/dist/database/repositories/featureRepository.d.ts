/**
 * Feature Repository
 * Manages master feature list
 */
export interface Feature {
    key: string;
    name: string;
    description: string | null;
    category: string | null;
    is_premium: boolean;
    created_at: string;
}
declare class FeatureRepository {
    /**
     * Get all features
     */
    findAll(): Promise<Feature[]>;
    /**
     * Get feature by key
     */
    findByKey(key: string): Promise<Feature | null>;
    /**
     * Get features by category
     */
    findByCategory(category: string): Promise<Feature[]>;
    /**
     * Get all premium features
     */
    findPremium(): Promise<Feature[]>;
    /**
     * Get all free features
     */
    findFree(): Promise<Feature[]>;
    /**
     * Create new feature
     */
    create(data: Omit<Feature, 'created_at'>): Promise<Feature>;
    /**
     * Update feature
     */
    update(key: string, data: Partial<Omit<Feature, 'key' | 'created_at'>>): Promise<void>;
    /**
     * Delete feature
     */
    delete(key: string): Promise<void>;
    /**
     * Check if feature exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get feature categories
     */
    getCategories(): Promise<string[]>;
}
export declare const featureRepository: FeatureRepository;
export {};
//# sourceMappingURL=featureRepository.d.ts.map