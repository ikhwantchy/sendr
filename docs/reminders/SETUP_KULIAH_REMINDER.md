# 🎓 Setup Reminder Jadwal & Deadline Kuliah (Auto-Update dari Google Sheets)

## 📋 Overview

Guide ini akan bantu lu setup **2 jenis reminder**:
1. **Jadwal Kuliah Hari Ini** - Kirim setiap pagi jam 7
2. **Deadline Mendesak** - Kirim setiap pagi jam 8 (deadline ≤ 3 hari)

Kedua reminder ini akan **auto-update** mengikuti data di Google Sheets, jadi lu tinggal update sheet aja, bot otomatis kirim data terbaru!

---

## 🗂️ Step 1: Persiapan Google Sheets

### A. Buat 2 Sheet (dalam 1 file)

**Sheet 1: `jadwal`** - Untuk jadwal kuliah harian
```
| hari      | waktu       | mk                          | ruang    | dosen           |
|-----------|-------------|-----------------------------|----------|-----------------|
| Senin     | 08:00-10:00 | Basis Data                  | Lab 301  | Pak Budi        |
| Senin     | 10:00-12:00 | Pemrograman Web             | Lab 302  | Bu Ani          |
| Selasa    | 13:00-15:00 | Interaksi Manusia Komputer  | Kelas A  | Pak Dedi        |
| Rabu      | 08:00-10:00 | MPPL                        | Lab 301  | Bu Siti         |
```

**Sheet 2: `deadlines`** - Untuk deadline tugas/ujian
```
| mk                          | judul                | waktu      | done  | catatan              |
|-----------------------------|----------------------|------------|-------|----------------------|
| Basis Data                  | Tugas UTS            | 2026-01-20 | FALSE | Bab 1-5              |
| Pemrograman Web             | Presentasi           | 2026-01-22 | FALSE | Kelompok 3           |
| Interaksi Manusia Komputer  | Laporan Akhir        | 2026-01-25 | FALSE | Min 20 halaman       |
| MPPL                        | Prototype            | 2026-02-01 | TRUE  | Sudah dikumpulkan    |
```

### B. ✨ Set Sheet to Public (PENTING!)

**Gak perlu service account atau API key!** Cukup:

1. Buka Google Sheets
2. Klik **Share** (pojok kanan atas)
3. Klik **Change to anyone with the link**
4. Set permission: **Viewer** (read-only)
5. Klik **Done**

**That's it!** 🎉 Bot bisa langsung akses sheet lu tanpa konfigurasi apapun.

> 💡 **Privacy Note:** Link sheet lu itu "obscure" (susah ditebak). Selama lu gak share link ke orang lain, data lu aman. Untuk data super sensitif, bisa pakai OAuth nanti (coming soon).

### C. Copy Sheet URL

Copy URL dari address bar, contoh:
```
https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit
```

Copy URL dari address bar, contoh:
```
https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit
```

---

## 🤖 Step 2: Setup Reminder #1 - Jadwal Kuliah Hari Ini

### Tujuan:
Setiap pagi jam **07:00**, bot kirim jadwal kuliah hari ini ke group.

### Via Dashboard (Recommended):

1. **Login** ke dashboard
2. Pilih **Bot** yang aktif
3. Klik **Reminders** → **Create Reminder**

#### Form Input:

**1. Basic Details**
```
Name: Jadwal Kuliah Hari Ini
```

**2. Target Audience**
```
Type: WhatsApp Groups
Selected Groups: [Pilih group kuliah lu]
```

**3. Data Source**
```
Data Source: Google Sheets Monitor ✅

Google Sheets URL: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit

Sheet/Tab Name: jadwal (pilih dari dropdown)

Filter Mode: Advanced Filters ✅

Filters:
  ┌─────────────────────────────────────────┐
  │ Column: hari                            │
  │ Operator: equals                        │
  │ Value: {{@today_day}}                   │
  │ Case Insensitive: ✅                    │
  └─────────────────────────────────────────┘

Sort:
  Column: waktu
  Order: Ascending (ASC)

Digest Mode: ✅ (Enabled)
```

**4. Schedule**
```
Frequency: Daily
Time: 07:00
Timezone: Asia/Jakarta
```

**5. Message Template**
```handlebars
📚 *JADWAL KULIAH HARI INI*
{{@today}}

{{#if @length > 0}}{{#each items}}⏰ *{{waktu}}*
📖 {{mk}}
🏫 {{ruang}}
👨‍🏫 {{dosen}}

{{/each}}{{else}}🎉 *Tidak ada kuliah hari ini!*
Santai aja bro 😎{{/if}}

_Auto-update dari Google Sheets_
```

**6. Save**
- Klik **Create Reminder**
- Done! ✅

---

### Via API (Alternative):

```bash
POST http://localhost:3001/api/reminders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "botId": "YOUR_BOT_ID",
  "name": "Jadwal Kuliah Hari Ini",
  "targetType": "group",
  "targetId": "120363xxxxx@g.us",
  "schedule": "0 7 * * *",
  "timezone": "Asia/Jakarta",
  "templateConfig": {
    "googleSheetsUrl": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
    "sheetName": "jadwal",
    "isDigestMode": true,
    "useAdvancedFilters": true,
    "filters": [
      {
        "column": "hari",
        "operator": "equals",
        "value": "{{@today_day}}",
        "caseInsensitive": true
      }
    ],
    "sort": {
      "column": "waktu",
      "order": "asc"
    },
    "body": "📚 *JADWAL KULIAH HARI INI*\n{{@today}}\n\n{{#if @length > 0}}{{#each items}}⏰ *{{waktu}}*\n📖 {{mk}}\n🏫 {{ruang}}\n👨‍🏫 {{dosen}}\n\n{{/each}}{{else}}🎉 *Tidak ada kuliah hari ini!*\nSantai aja bro 😎{{/if}}\n\n_Auto-update dari Google Sheets_"
  }
}
```

---

## 📅 Step 3: Setup Reminder #2 - Deadline Mendesak

### Tujuan:
Setiap pagi jam **08:00**, bot kirim list deadline yang **≤ 3 hari** dan **belum selesai**.

### Via Dashboard:

**1. Basic Details**
```
Name: Deadline Mendesak (H-3)
```

**2. Target Audience**
```
Type: WhatsApp Groups
Selected Groups: [Pilih group kuliah lu]
```

**3. Data Source**
```
Data Source: Google Sheets Monitor ✅

Google Sheets URL: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit

Sheet/Tab Name: deadlines

Filter Mode: Advanced Filters ✅

Filters:
  ┌─────────────────────────────────────────┐
  │ 1. Column: waktu                        │
  │    Operator: date_within_days           │
  │    Value: 3                             │
  ├─────────────────────────────────────────┤
  │ 2. Column: done                         │
  │    Operator: equals                     │
  │    Value: FALSE                         │
  │    Case Insensitive: ✅                 │
  └─────────────────────────────────────────┘

Sort:
  Column: waktu
  Order: Ascending (ASC)

Digest Mode: ✅ (Enabled)
```

**4. Schedule**
```
Frequency: Daily
Time: 08:00
Timezone: Asia/Jakarta
```

**5. Message Template**
```handlebars
🚨 *DEADLINE MENDESAK*
{{@today}}

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
📝 {{catatan}}

{{/each}}{{else}}✅ *Tidak ada deadline mendesak!*
Semua tugas aman 🎉{{/if}}

_Auto-update dari Google Sheets_
```

**6. Save**
- Klik **Create Reminder**
- Done! ✅

---

### Via API (Alternative):

```bash
POST http://localhost:3001/api/reminders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "botId": "YOUR_BOT_ID",
  "name": "Deadline Mendesak (H-3)",
  "targetType": "group",
  "targetId": "120363xxxxx@g.us",
  "schedule": "0 8 * * *",
  "timezone": "Asia/Jakarta",
  "templateConfig": {
    "googleSheetsUrl": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
    "sheetName": "deadlines",
    "isDigestMode": true,
    "useAdvancedFilters": true,
    "filters": [
      {
        "column": "waktu",
        "operator": "date_within_days",
        "value": 3
      },
      {
        "column": "done",
        "operator": "equals",
        "value": "FALSE",
        "caseInsensitive": true
      }
    ],
    "sort": {
      "column": "waktu",
      "order": "asc"
    },
    "body": "🚨 *DEADLINE MENDESAK*\n{{@today}}\n\n📅 *Deadline ≤ 3 Hari*\n\n{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}\n{{waktu | urgency}}\n📝 {{catatan}}\n\n{{/each}}{{else}}✅ *Tidak ada deadline mendesak!*\nSemua tugas aman 🎉{{/if}}\n\n_Auto-update dari Google Sheets_"
  }
}
```

---

## 🎯 Step 4: Test Reminder

### Test Jadwal Kuliah:

1. **Buat reminder dengan schedule "now"** (untuk test)
2. Cek WhatsApp group, harusnya muncul:

```
📚 JADWAL KULIAH HARI INI
Sabtu, 18 Januari 2026

⏰ 08:00-10:00
📖 Basis Data
🏫 Lab 301
👨‍🏫 Pak Budi

⏰ 10:00-12:00
📖 Pemrograman Web
🏫 Lab 302
👨‍🏫 Bu Ani

Auto-update dari Google Sheets
```

3. **Ubah schedule ke "0 7 * * *"** (daily jam 7 pagi)

### Test Deadline:

1. **Buat reminder dengan schedule "now"**
2. Cek WhatsApp group, harusnya muncul:

```
🚨 DEADLINE MENDESAK
Sabtu, 18 Januari 2026

📅 Deadline ≤ 3 Hari

1. Basis Data — Tugas UTS
🔴 HARI INI - Senin, 20 Januari 2026
📝 Bab 1-5

2. Pemrograman Web — Presentasi
🟠 2 hari lagi - Rabu, 22 Januari 2026
📝 Kelompok 3

Auto-update dari Google Sheets
```

3. **Ubah schedule ke "0 8 * * *"** (daily jam 8 pagi)

---

## 🔄 Cara Kerja Auto-Update

### Setiap Reminder Execute:

1. **Bot fetch data terbaru** dari Google Sheets
2. **Apply filters** (hari ini / deadline ≤ 3 hari)
3. **Sort data** (by waktu / tanggal)
4. **Render template** dengan data real-time
5. **Kirim ke WhatsApp**

### Jadi lu tinggal:

✅ **Update Google Sheets** (tambah/edit/hapus row)  
✅ **Bot otomatis kirim data terbaru** setiap hari  
❌ **Gak perlu edit reminder** lagi!

---

## 🛠️ Customization Ideas

### 1. Reminder H-7 (Seminggu Sebelum Deadline)

```javascript
{
  "name": "Deadline H-7",
  "schedule": "0 8 * * *",
  "filters": [
    { "column": "waktu", "operator": "date_within_days", "value": 7 },
    { "column": "done", "operator": "equals", "value": "FALSE" }
  ]
}
```

### 2. Reminder H-1 (Besok Deadline!)

```javascript
{
  "name": "Deadline H-1 (URGENT)",
  "schedule": "0 20 * * *", // Jam 8 malam
  "filters": [
    { "column": "waktu", "operator": "date_within_days", "value": 1 },
    { "column": "done", "operator": "equals", "value": "FALSE" }
  ]
}
```

### 3. Reminder Jadwal Besok (Malam Hari)

```javascript
{
  "name": "Jadwal Kuliah Besok",
  "schedule": "0 21 * * *", // Jam 9 malam
  "filters": [
    { "column": "hari", "operator": "equals", "value": "{{@tomorrow_day}}" }
  ]
}
```

### 4. Summary Mingguan (Setiap Minggu)

```javascript
{
  "name": "Summary Deadline Minggu Ini",
  "schedule": "0 8 * * 0", // Setiap Minggu jam 8 pagi
  "filters": [
    { "column": "waktu", "operator": "date_within_days", "value": 7 },
    { "column": "done", "operator": "equals", "value": "FALSE" }
  ]
}
```

---

## 📊 Template Variables Reference

### Built-in Variables:

| Variable | Output | Example |
|----------|--------|---------|
| `{{@today}}` | Tanggal hari ini | "Sabtu, 18 Januari 2026" |
| `{{@today_day}}` | Nama hari ini | "Sabtu" |
| `{{@tomorrow_day}}` | Nama hari besok | "Minggu" |
| `{{@length}}` | Jumlah items | 3 |
| `{{@index}}` | Index item (1-based) | 1, 2, 3 |

### Custom Helpers:

| Helper | Input | Output |
|--------|-------|--------|
| `{{waktu \| urgency}}` | "2026-01-20" | "🔴 HARI INI - Senin, 20 Januari 2026" |
| `{{waktu \| urgency}}` | "2026-01-21" | "🟡 BESOK - Selasa, 21 Januari 2026" |
| `{{waktu \| urgency}}` | "2026-01-23" | "🟠 3 hari lagi - Kamis, 23 Januari 2026" |

### Column Variables (dari Sheet):

Semua column di sheet bisa dipake sebagai variable:
```handlebars
{{mk}}       // Column 'mk'
{{judul}}    // Column 'judul'
{{waktu}}    // Column 'waktu'
{{ruang}}    // Column 'ruang'
{{dosen}}    // Column 'dosen'
{{catatan}}  // Column 'catatan'
{{done}}     // Column 'done'
```

---

## 🎨 Template Formatting

### WhatsApp Markdown:

```handlebars
*Bold Text*          → Bold
_Italic Text_        → Italic
~Strikethrough~      → Strikethrough
```code```          → Monospace

### Emojis:

```
📚 📖 📝 📅 📊 📈 📉
⏰ ⏳ ⌛ 🕐 🕑 🕒
🔴 🟡 🟢 🔵 🟣 🟠
✅ ❌ ⚠️ 🚨 💡 🎯
🎓 🏫 👨‍🏫 👩‍🏫 🧑‍🎓
```

---

## 🐛 Troubleshooting

### Reminder tidak kirim data:

**Cek:**
1. ✅ Sheet di-share dengan service account?
2. ✅ Sheet name exact match (case-sensitive)?
3. ✅ Column names di filter exact match?
4. ✅ Bot connected?
5. ✅ Reminder `is_active = 1`?

**Debug:**
```sql
-- Cek reminder logs
SELECT * FROM reminder_logs 
WHERE reminder_id = 'YOUR_REMINDER_ID' 
ORDER BY executed_at DESC 
LIMIT 10;
```

### Filter tidak work:

**Cek:**
1. ✅ Column name exact match (case-sensitive)
2. ✅ Operator sesuai data type:
   - `date_within_days` → untuk tanggal (YYYY-MM-DD)
   - `equals` → untuk text/boolean
   - `contains` → untuk search text
3. ✅ Value format benar (contoh: "FALSE" bukan "false")

### Template tidak render:

**Cek:**
1. ✅ Syntax Handlebars benar (`{{#if}}...{{/if}}`)
2. ✅ Column name exact match
3. ✅ Closing tags lengkap (`{{#each}}...{{/each}}`)

**Test:**
```bash
POST http://localhost:3001/api/sheets/preview-digest
{
  "url": "YOUR_SHEET_URL",
  "selectedSheets": ["jadwal"],
  "template": "{{#each items}}{{mk}}{{/each}}",
  "filters": [...],
  "sort": {...}
}
```

---

## 📝 Maintenance Tips

### Update Jadwal:

1. Buka Google Sheets
2. Edit row yang mau diubah
3. Save (auto-save)
4. **Done!** Bot otomatis kirim data baru besok pagi

### Tandai Tugas Selesai:

1. Buka Google Sheets (tab `deadlines`)
2. Ubah column `done` dari `FALSE` → `TRUE`
3. Save
4. **Done!** Tugas itu gak akan muncul di reminder lagi

### Tambah Tugas Baru:

1. Buka Google Sheets (tab `deadlines`)
2. Tambah row baru:
   ```
   | MPPL | Laporan Final | 2026-01-30 | FALSE | Min 30 halaman |
   ```
3. Save
4. **Done!** Otomatis muncul di reminder kalau deadline ≤ 3 hari

---

## 🚀 Advanced: Multiple Groups

### Kirim ke Beberapa Group:

**Option 1: Buat 1 Reminder untuk Multiple Groups**
```javascript
{
  "targetType": "group",
  "targetId": "120363xxx@g.us,120363yyy@g.us,120363zzz@g.us"
}
```

**Option 2: Buat Reminder Terpisah per Group**
- Lebih flexible (beda schedule per group)
- Lebih mudah manage

---

## 📊 Example: Complete Setup

### Google Sheets Structure:

**File:** "Kuliah Semester 6"  
**URL:** `https://docs.google.com/spreadsheets/d/ABC123/edit`

**Tab 1: `jadwal`**
```
hari    | waktu       | mk    | ruang   | dosen
--------|-------------|-------|---------|--------
Senin   | 08:00-10:00 | BD    | Lab 301 | Pak Budi
Senin   | 10:00-12:00 | PW    | Lab 302 | Bu Ani
Selasa  | 13:00-15:00 | IMK   | Kelas A | Pak Dedi
```

**Tab 2: `deadlines`**
```
mk  | judul      | waktu      | done  | catatan
----|------------|------------|-------|----------
BD  | Tugas UTS  | 2026-01-20 | FALSE | Bab 1-5
PW  | Presentasi | 2026-01-22 | FALSE | Kel 3
```

### Reminders:

1. **Jadwal Hari Ini** - Daily 07:00
2. **Deadline H-3** - Daily 08:00
3. **Deadline H-7** - Daily 08:00
4. **Deadline H-1** - Daily 20:00

**Total:** 4 reminders, semua auto-update dari 1 Google Sheets!

---

## ✅ Checklist Setup

- [ ] Google Sheets dibuat (2 tabs: `jadwal` & `deadlines`)
- [ ] Sheet di-share dengan service account
- [ ] Bot connected & active
- [ ] Reminder #1 (Jadwal) created & tested
- [ ] Reminder #2 (Deadline H-3) created & tested
- [ ] Schedule diubah dari "now" ke cron expression
- [ ] Test update sheet → verify auto-update works

---

## 🎓 Pro Tips

1. **Gunakan Google Sheets Mobile App** untuk update on-the-go
2. **Set reminder di HP** untuk update sheet setiap dapat tugas baru
3. **Backup sheet** secara berkala (File → Make a copy)
4. **Gunakan conditional formatting** di sheet untuk highlight deadline mendesak
5. **Tambah column "priority"** untuk filter tugas penting

---

**Happy Automating! 🚀**

Kalau ada error atau butuh custom template, tinggal tanya aja bro!
