/**
 * WhatsApp Adapter Factory
 * ============================================================
 * Returns the correct adapter based on bot's adapter_type.
 * Keeps all business logic free from adapter-specific code.
 */

import { IWhatsAppAdapter } from './IWhatsAppAdapter';
import { query } from '../../database/connection';
import { logger } from '../../utils/logger';

export type AdapterType = 'baileys' | 'web' | 'meta_cloud';

export async function getAdapterForBot(botId: string): Promise<IWhatsAppAdapter> {
    const result = await query(
        'SELECT adapter_type FROM bots WHERE id = ?',
        [botId]
    );

    if (result.rows.length === 0) {
        throw new Error(`Bot not found: ${botId}`);
    }

    const adapterType: AdapterType = result.rows[0].adapter_type || 'baileys';
    return getAdapterByType(adapterType);
}

export function getAdapterByType(type: AdapterType): IWhatsAppAdapter {
    switch (type) {
        case 'meta_cloud': {
            const { metaCloudAdapter } = require('./whatsappAdapter.meta-cloud');
            return metaCloudAdapter;
        }
        case 'web': {
            const { whatsappAdapter } = require('./whatsappAdapter');
            return whatsappAdapter;
        }
        case 'baileys':
        default: {
            const { whatsappAdapter } = require('./whatsappAdapter.baileys');
            return whatsappAdapter;
        }
    }
}
