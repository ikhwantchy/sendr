import { inboxService } from '../src/services/inboxService';
import { botRepository } from '../src/database/repositories/botRepository';
import { query } from '../src/database/connection-sqlite';

async function seedInbox() {
    console.log('Seeding inbox...');
    try {
        const bots = await botRepository.findAll();
        if (bots.length === 0) {
            console.log('No bots found. Exiting.');
            process.exit(0);
        }

        const bot = bots[0];
        console.log(`Using bot ID: ${bot.id} Tenant ID: ${bot.tenant_id}`);

        // Seed 1
        const r1 = await inboxService.handleIncomingMessage(
            bot.tenant_id,
            bot.id,
            '6281234567890',
            'Budi Santos',
            `msg_${Date.now()}_1`,
            'Halo min, apakah produk XYZ masih tersedia?',
            'text'
        );
        console.log('Inserted msg 1:', r1);

        // Seed 2
        const r2 = await inboxService.handleIncomingMessage(
            bot.tenant_id,
            bot.id,
            '6289876543210',
            'Siti Aminah',
            `msg_${Date.now()}_2`,
            'Pesanan saya belum sampai, mohon dicek resi 12345.',
            'text'
        );
        console.log('Inserted msg 2:', r2);

        // Force check
        const convs = await query(`SELECT * FROM inbox_conversations`);
        console.log('Count inside script:', convs.rowCount);

        console.log('✅ Inbox seeded successfully!');
    } catch (error) {
        console.error('Failed to seed inbox:', error);
    }
}

seedInbox();
