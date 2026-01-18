/**
 * Quick Create Deadline Reminder via API
 * 
 * Instructions:
 * 1. Update BOT_ID and GROUP_JID below
 * 2. Run: node create-deadline-reminder.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// ⚠️ UPDATE THESE VALUES
const BOT_ID = 'cdff9c0d-fa62-4392-acc6-cdc52db5eb39';  // Your bot ID
const GROUP_JID = 'YOUR_GROUP_JID@g.us';  // Your group JID (e.g., 120363xxxxx@g.us)

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit';

async function createDeadlineReminder() {
    console.log('🚀 Creating Deadline H-3 Reminder...\n');

    const reminderConfig = {
        name: 'Deadline H-3 Reminder',
        bot_id: BOT_ID,
        target_id: GROUP_JID,
        target_type: 'group',
        schedule: 'now',  // Use 'now' for immediate test, change to '0 8 * * *' for daily
        timezone: 'Asia/Jakarta',
        is_active: 1,
        template_config: {
            googleSheetsUrl: SHEET_URL,
            sheetName: 'deadlines',
            isDigestMode: true,

            // Advanced filters (NEW!)
            filters: [
                {
                    column: 'waktu',
                    operator: 'date_within_days',
                    value: 3
                },
                {
                    column: 'done',
                    operator: 'equals',
                    value: 'FALSE',
                    caseInsensitive: true
                }
            ],

            // Sorting
            sort: {
                column: 'waktu',
                order: 'asc'
            },

            // Template with new syntax
            body: `📋 *DAILY DIGEST ({{@today}})*

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
{{catatan}}

{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak dalam 3 hari ke depan!{{/if}}`
        }
    };

    try {
        // First, let's get your groups to find the correct JID
        console.log('📋 Fetching your groups...\n');
        const groupsResponse = await axios.get(`${API_URL}/bots/${BOT_ID}/groups`);

        if (groupsResponse.data.success && groupsResponse.data.groups) {
            console.log('Available Groups:');
            groupsResponse.data.groups.forEach((group, i) => {
                console.log(`${i + 1}. ${group.name}`);
                console.log(`   JID: ${group.jid}\n`);
            });

            console.log('⚠️  Copy the JID of your target group and update GROUP_JID in this script\n');
        }

        // If GROUP_JID is set, create the reminder
        if (GROUP_JID !== 'YOUR_GROUP_JID@g.us') {
            console.log('Creating reminder...\n');

            const response = await axios.post(`${API_URL}/reminders`, reminderConfig);

            if (response.data.success) {
                console.log('✅ Reminder created successfully!');
                console.log(`   Reminder ID: ${response.data.data.id}`);
                console.log(`   Name: ${response.data.data.name}`);
                console.log(`   Schedule: ${response.data.data.schedule}`);
                console.log('\n📌 Reminder will execute immediately (schedule: "now")');
                console.log('   Check your WhatsApp group for the message!');
                console.log('\n💡 To schedule daily at 8 AM, change schedule to: "0 8 * * *"');
            }
        } else {
            console.log('⚠️  Please update GROUP_JID in the script first!');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);

        if (error.response?.status === 404) {
            console.log('\n💡 Tip: Make sure the bot ID is correct');
        }
        if (error.response?.data?.error?.includes('Sheet')) {
            console.log('\n💡 Tip: Make sure Google Sheet is public (Anyone with link can view)');
        }
    }
}

createDeadlineReminder();
