const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const backendDist = path.resolve(__dirname, '../backend/dist');
const { query, saveDatabase } = require(path.join(backendDist, 'database/connection-sqlite'));
const { v4: uuidv4 } = require('uuid');

const templateBody = `📬 *DAILY DIGEST ({{@date}})*

🗓️ *Jadwal Hari Ini ({{@dayName}})*
━━━━━━━━━━━━━━━━━━━━
{{#if @dayName == 'Senin'}}
1. *Customer Relationship Management (CRM)*
18:20 - 20:00
_Donna Oktar Endras Wanto_

2. *Pendidikan Anti Korupsi*
20:00 - 21:40
_Dini Handayani_
{{/if}}
{{#if @dayName == 'Selasa'}}
1. *Sistem Pengelolaan Content*
18:20 - 20:00
_Chrisantus Tristianto_

2. *Komputer dan Masyarakat*
20:00 - 21:40
_Ghema Nusa Persada_
{{/if}}
{{#if @dayName == 'Rabu'}}
1. *Testing dan Implementasi Sistem*
18:20 - 20:00
_Noprianto_

2. *Optimasi Mesin Pencari*
20:00 - 21:40
_Karno Ganjar Prasetyo_
{{/if}}
{{#if @dayName == 'Kamis'}}
1. *Audit Sistem Informasi*
18:20 - 20:00
_Faruk Muhamad_

2. *Kecakapan Antar Personal*
20:00 - 21:40
_Petrus Sianggian Purba_
{{/if}}
{{#if @dayName == 'Jumat'}}
_Tidak ada perkuliahan hari ini (Libur)._
{{/if}}
{{#if @dayName == 'Sabtu'}}
_Tidak ada perkuliahan hari ini (Libur)._
{{/if}}
{{#if @dayName == 'Minggu'}}
_Tidak ada perkuliahan hari ini (Libur)._
{{/if}}
━━━━━━━━━━━━━━━━━━━━

🧾 *Deadline ≤ 3 Hari*
━━━━━━━━━━━━━━━━━━━━
{{#section "deadlines"}}
{{#each}}
{{@index}}. *{{Mata Kuliah}}* — {{Tugas}}
_{{Deadline | date:EEEE, dd/MM/yyyy}}_
{{#if Keterangan}}Link Pengumpulan : {{Keterangan}}{{/if}}

{{/each}}
{{#if @length == 0}}
_Tidak ada deadline tugas dalam 3 hari ke depan._
{{/if}}
{{/section}}
━━━━━━━━━━━━━━━━━━━━
*Automated Message*
powered by sendr.web.id`;

const templateConfig = {
    googleSheetsUrl: "https://docs.google.com/spreadsheets/d/1ux46toMe8KupZ3Uwu07xg-hZVPb_Gy6TQDYo6o2neQU/edit?gid=8486771#gid=8486771",
    sheetName: "schedules",
    selectedSheets: ["schedules", "deadlines"],
    isDigestMode: true,
    body: templateBody
};

async function main() {
    const tenantId = 'default-tenant-id';
    const botId = '6c43f359-9a56-42ca-80d0-19eaa45ad52e'; // Auto Reply SIFM002
    const targetGroup = '120363403406454973@g.us'; // BOT WA-3
    const reminderName = 'Daily Digest Kuliah 07SIFM002';
    const schedule = '0 8 * * *'; // Every day at 08:00 AM
    const timezone = 'Asia/Jakarta';

    console.log('1. Checking for existing Daily Digest reminder...');
    const existing = await query("SELECT id FROM reminders WHERE bot_id = ? AND name = ?", [botId, reminderName]);

    let reminderId = existing.rows.length > 0 ? existing.rows[0].id : uuidv4();

    console.log(`2. Saving reminder ${reminderId}...`);
    await query(`
        INSERT OR REPLACE INTO reminders (
            id, tenant_id, bot_id, name, description,
            schedule, timezone, is_active, target_type, target_id,
            data_source_id, pipeline_config, template_config,
            created_by, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, 1, 'group', ?,
            NULL, '{}', ?,
            'admin-user-id-1', datetime('now'), datetime('now')
        )
    `, [
        reminderId,
        tenantId,
        botId,
        reminderName,
        'Pengingat Harian Jadwal Kuliah dan Deadline Tugas (Pukul 08:00 WIB)',
        schedule,
        timezone,
        targetGroup,
        JSON.stringify(templateConfig)
    ]);

    saveDatabase();
    console.log('3. Flushed database to disk.');
    await new Promise(r => setTimeout(r, 1000));

    const check = await query("SELECT id, name, schedule, target_id, is_active FROM reminders WHERE id = ?", [reminderId]);
    console.log('✅ Reminder saved successfully:', check.rows);

    // Optional test run
    const testSend = process.argv.includes('--send-now');
    if (testSend) {
        console.log('\n4. Triggering test execution to WhatsApp group...');
        const reminderSchedulerService = require('./dist/services/reminderSchedulerService').default;
        await reminderSchedulerService.executeReminder(reminderId);
        console.log('✅ Test message execution completed!');
    }

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
