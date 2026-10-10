const path = require('path');
const backendDist = path.resolve(__dirname, '../backend/dist');
const googleSheetsService = require(path.join(backendDist, 'services/googleSheetsService')).default;
const enhancedTemplateRenderer = require(path.join(backendDist, 'services/enhancedTemplateRenderer')).default;

const spreadsheetId = '1ux46toMe8KupZ3Uwu07xg-hZVPb_Gy6TQDYo6o2neQU';

async function test() {
    console.log('1. Fetching sheets...');
    const allSheets = await googleSheetsService.fetchMultipleSheets(spreadsheetId, ['schedules', 'deadlines', 'deadlines_input']);

    const sheetsData = {};
    for (const s of allSheets) {
        sheetsData[s.sheetName] = googleSheetsService.convertToObjects(s);
        console.log(`- ${s.sheetName}: ${sheetsData[s.sheetName].length} rows`, sheetsData[s.sheetName]);
    }



    const template = `📬 *DAILY DIGEST ({{@date}})*

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

    console.log('\n2. Rendering template...');
    const rendered = enhancedTemplateRenderer.render(template, {
        data: [],
        sheetsData,
        timezone: 'Asia/Jakarta'
    });

    console.log('\n================ RENDERED OUTPUT ================');
    console.log(rendered);
    console.log('=================================================');
}

test().catch(console.error);
