/**
 * Test Script for Smart Deadline Reminder
 * 
 * Run this to test the deadline reminder functionality
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Your Google Sheets URL from screenshot
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit';

async function testDeadlineReminder() {
    console.log('🧪 Testing Smart Deadline Reminder System\n');

    try {
        // Step 1: Test Filter
        console.log('📋 Step 1: Testing Filter Configuration...');
        const filterTest = await axios.post(`${API_URL}/sheets/test-filter`, {
            url: SHEET_URL,
            sheetName: 'deadlines',
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
            sort: {
                column: 'waktu',
                order: 'asc'
            }
        });

        console.log('✅ Filter Test Results:');
        console.log(`   Total Rows: ${filterTest.data.totalRows}`);
        console.log(`   Filtered Rows: ${filterTest.data.filteredRows}`);
        console.log(`   Columns: ${filterTest.data.columns.join(', ')}\n`);

        if (filterTest.data.filteredRows > 0) {
            console.log('   Sample Data:');
            filterTest.data.data.slice(0, 3).forEach((row, i) => {
                console.log(`   ${i + 1}. ${row.mk} - ${row.judul} (${row.waktu})`);
            });
            console.log('');
        }

        // Step 2: Test Template
        console.log('📝 Step 2: Testing Template Rendering...');
        const template = `📋 *DAILY DIGEST ({{@today}})*

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
{{catatan}}

{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak dalam 3 hari ke depan!{{/if}}`;

        const templateTest = await axios.post(`${API_URL}/sheets/test-template`, {
            template,
            sampleData: filterTest.data.data
        });

        console.log('✅ Template Rendered:\n');
        console.log(templateTest.data.rendered);
        console.log('\n');

        // Step 3: Enhanced Preview (Complete Test)
        console.log('🎨 Step 3: Testing Complete Preview...');
        const preview = await axios.post(`${API_URL}/sheets/preview-enhanced`, {
            url: SHEET_URL,
            sheetName: 'deadlines',
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
            sort: {
                column: 'waktu',
                order: 'asc'
            },
            template
        });

        console.log('✅ Complete Preview:\n');
        console.log(preview.data.preview);
        console.log('\n');

        // Step 4: Show Reminder Configuration
        console.log('⚙️  Step 4: Reminder Configuration to Create:\n');
        const reminderConfig = {
            name: 'Deadline H-3 Reminder',
            bot_id: 'YOUR_BOT_ID',  // Replace with actual bot ID
            target_id: 'YOUR_GROUP_JID@g.us',  // Replace with actual group JID
            target_type: 'group',
            schedule: '0 8 * * *',  // Every day at 8 AM
            timezone: 'Asia/Jakarta',
            is_active: 1,
            template_config: {
                googleSheetsUrl: SHEET_URL,
                sheetName: 'deadlines',
                isDigestMode: true,
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
                sort: {
                    column: 'waktu',
                    order: 'asc'
                },
                body: template
            }
        };

        console.log(JSON.stringify(reminderConfig, null, 2));
        console.log('\n');

        console.log('✅ All tests passed!');
        console.log('\n📌 Next Steps:');
        console.log('1. Update bot_id and target_id in the config above');
        console.log('2. Use the frontend to create the reminder, OR');
        console.log('3. Use POST /api/reminders with the config above');
        console.log('4. Test with "Send Now" to see immediate result');

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);

        if (error.response?.status === 403) {
            console.log('\n⚠️  Sheet Access Error:');
            console.log('   Make sure the Google Sheet is set to "Anyone with the link can view"');
        }
    }
}

// Run the test
testDeadlineReminder();
