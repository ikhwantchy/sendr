/**
 * Script: Clean Old Footer from AI Conversation History
 * 
 * The old footer "—— Automated Message powered by sendr.web.id" was hardcoded
 * and got saved into conversation histories. The AI then learned from these
 * histories and kept appending the footer. This script cleans those records.
 * 
 * Run: cd backend && npx tsx scripts/clean-conversation-history.ts
 */

import { query } from '../src/database/connection';
import { logger } from '../src/utils/logger';

const FOOTER_PATTERNS = [
    ' —— Automated Message powered by sendr.web.id',
    '\n—— Automated Message powered by sendr.web.id',
    '—— Automated Message powered by sendr.web.id',
    '\n\n\n—\nAutomated Message\npowered by sendr.web.id',
    '\n\n—\nAutomated System Randomizer\npowered by sendr.web.id',
    ' —— Automated System Randomizer powered by sendr.web.id',
];

async function cleanConversationHistory() {
    console.log('🧹 Starting conversation history cleanup...\n');

    try {
        // Fetch all conversations that have messages
        const result = await query(
            `SELECT id, bot_id, contact_id, messages FROM ai_conversations WHERE messages IS NOT NULL AND messages != '[]'`,
            []
        );

        console.log(`📊 Found ${result.rows.length} conversations to process\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const conv of result.rows) {
            try {
                const messages: Array<{ role: string; content: string }> = JSON.parse(conv.messages || '[]');
                let wasModified = false;

                const cleanedMessages = messages.map(msg => {
                    let content = msg.content || '';
                    const originalContent = content;

                    // Remove all footer patterns
                    for (const pattern of FOOTER_PATTERNS) {
                        while (content.includes(pattern)) {
                            content = content.replace(pattern, '');
                            wasModified = true;
                        }
                    }

                    // Also remove any trailing em-dashes or double dashes at end of message
                    const cleanedContent = content.trimEnd();
                    if (cleanedContent !== originalContent.trimEnd()) {
                        wasModified = true;
                    }

                    return { ...msg, content: cleanedContent };
                });

                if (wasModified) {
                    await query(
                        'UPDATE ai_conversations SET messages = ? WHERE id = ?',
                        [JSON.stringify(cleanedMessages), conv.id]
                    );
                    updatedCount++;
                    console.log(`✅ Cleaned conversation ${conv.id} (bot: ${conv.bot_id})`);
                } else {
                    skippedCount++;
                }
            } catch (parseErr) {
                console.error(`❌ Failed to parse conversation ${conv.id}:`, parseErr);
            }
        }

        console.log(`\n🎉 Done!`);
        console.log(`   ✅ Updated: ${updatedCount} conversations`);
        console.log(`   ⏭️  Skipped (clean): ${skippedCount} conversations`);

    } catch (err) {
        console.error('❌ Error during cleanup:', err);
        process.exit(1);
    }

    process.exit(0);
}

cleanConversationHistory();
