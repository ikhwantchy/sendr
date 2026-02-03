/**
 * Campaign Message Queue
 * ============================================
 * Separate Bull queue for campaign message processing
 * Isolated from reminder queue to prevent conflicts
 */
import Queue from 'bull';
export declare const campaignQueue: Queue.Queue<any>;
//# sourceMappingURL=campaignQueue.d.ts.map