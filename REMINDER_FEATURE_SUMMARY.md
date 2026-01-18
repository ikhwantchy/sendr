# 📋 Ringkasan Fitur Reminder - WA Automation Platform

## 🎯 Overview

Fitur **Reminder** adalah sistem otomatis untuk mengirim pesan terjadwal ke WhatsApp Groups atau Individual Contacts, dengan dukungan **Google Sheets integration** untuk data dinamis dan **advanced filtering**.

---

## 🏗️ Arsitektur

### Stack & Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | Node.js + TypeScript | Core logic, scheduling, API |
| **Scheduler** | Bull Queue (Redis) | Repeatable jobs untuk cron |
| **Database** | PostgreSQL | Menyimpan reminders, logs, groups |
| **Frontend** | Next.js + React | UI wizard untuk create/edit |
| **Data Source** | Google Sheets API | Dynamic data untuk digest mode |

---

## 📊 Database Schema

### 1. `reminders` Table
```sql
- id (PK)
- tenant_id, bot_id
- name, description
- schedule (cron expression atau 'now')
- timezone (default: Asia/Jakarta)
- is_active (1/0)
- target_type ('group' | 'contact' | 'broadcast')
- target_id (WhatsApp JID atau comma-separated JIDs)
- data_source_id (optional, FK ke data_sources)
- pipeline_config (JSON: filters, transformations)
- template_config (JSON: message template, Google Sheets config)
- last_run_at, next_run_at
- last_status ('success' | 'failed' | 'skipped')
- run_count
```

### 2. `reminder_logs` Table
```sql
- id (PK)
- reminder_id (FK)
- executed_at
- status ('success' | 'failed' | 'skipped')
- message_sent (actual message)
- target_id (recipient JID)
- error_message
- execution_time_ms
```

### 3. `wa_groups` Table
```sql
- id (PK)
- bot_id (FK)
- group_jid (WhatsApp group ID)
- group_name
- participant_count
- is_active
- last_synced_at
```

### 4. `data_sources` Table *(Optional)*
```sql
- id (PK)
- tenant_id
- name
- type ('google_sheets' | 'csv' | 'json' | 'api')
- config (JSON: credentials, spreadsheet_id, etc)
- is_active
- last_synced_at
```

---

## 🚀 Fitur Utama

### 1. Target Audience
- ✅ **WhatsApp Groups** (multi-select dari groups yang aktif)
- ✅ **Individual Contacts** (manual input, CSV upload, atau Google Sheets)

### 2. Scheduling

| Frequency | Cron Expression | Example |
|-----------|----------------|---------|
| **Now** | `'now'` | Langsung kirim |
| **Once** | `MM HH DD MM *` | `0 9 25 12 *` (25 Des jam 9 pagi) |
| **Daily** | `MM HH * * *` | `0 8 * * *` (Setiap hari jam 8 pagi) |
| **Weekly** | `MM HH * * DOW` | `0 8 * * 1,3,5` (Senin, Rabu, Jumat jam 8) |
| **Monthly** | `MM HH DD * *` | `0 8 1 * *` (Tanggal 1 setiap bulan) |

### 3. Data Source

#### A. Static Message
- Simple text message dengan formatting (bold, italic, strikethrough, code)
- Support emoji picker
- Support image attachment (base64)

#### B. Google Sheets Integration

**Dua Mode:**

##### i. Legacy Mode (Trigger-based)
```javascript
{
  triggerColumn: 'done',
  triggerValue: 'FALSE',
  isDigestMode: false
}
```
- Kirim **1 pesan per row** yang match trigger
- Contoh: Kirim reminder ke setiap orang yang `done = FALSE`

##### ii. Advanced Mode (Filter + Sort)
```javascript
{
  useAdvancedFilters: true,
  filters: [
    { column: 'waktu', operator: 'date_within_days', value: 3 },
    { column: 'done', operator: 'equals', value: 'FALSE', caseInsensitive: true }
  ],
  sort: { column: 'waktu', order: 'asc' },
  isDigestMode: true
}
```
- **Digest Mode:** Kirim **1 pesan gabungan** untuk semua rows yang match
- **Operators:** `equals`, `contains`, `date_within_days`, `greater_than`, `less_than`, dll
- **Sorting:** Urutkan data sebelum render

### 4. Message Template

**Template Variables:**
```handlebars
{{@today}}          // Tanggal hari ini
{{@length}}         // Jumlah items yang match
{{@index}}          // Index item (1-based)

{{#if @length > 0}} // Conditional
  {{#each items}}   // Loop items
    {{mk}}          // Column 'mk' dari sheet
    {{judul}}       // Column 'judul' dari sheet
    {{waktu | urgency}} // Custom helper 'urgency'
  {{/each}}
{{/if}}
```

**Custom Helpers:**
- `{{waktu | urgency}}` → Render "🔴 HARI INI", "🟡 BESOK", "🟠 2 hari lagi"

**Example Template:**
```handlebars
📋 *DAILY DIGEST ({{@today}})*

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
{{catatan}}

{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak!{{/if}}
```

**Output:**
```
📋 DAILY DIGEST (18/01/2026)

📅 Deadline ≤ 3 Hari

1. Interaksi Manusia dan Komputer — Presentasi
🟡 BESOK - Sabtu, 18 Januari 2026
Kelompok 7 - Materi 9

2. MPPL — Presentasi
🟠 2 hari lagi - Minggu, 19 Januari 2026
Kelompok 6
```

---

## 🔧 Backend Services

### 1. ReminderService (`reminderService.ts`)

**Methods:**
- `createReminder(data)` → Create reminder + schedule job
- `scheduleReminder(id, type, config, nextRun)` → Add to Bull queue
- `calculateNextRun(type, config)` → Calculate next execution time
- `listReminders(tenantId, botId)` → Get all reminders
- `getReminder(id)` → Get single reminder
- `toggleReminder(id, isActive)` → Pause/resume
- `deleteReminder(id)` → Delete + remove job
- `updateLastRun(id)` → Update execution timestamp

### 2. ReminderSchedulerService (`reminderSchedulerService.ts`)

**Responsibilities:**
- Initialize Bull queue
- Process jobs (fetch data, render template, send message)
- Handle Google Sheets fetching
- Apply filters & sorting
- Render Handlebars template
- Send via WhatsApp adapter
- Log execution results

### 3. Google Sheets Integration

**Endpoints:**
- `GET /api/sheets/tabs?url=...` → Detect available tabs
- `POST /api/sheets/preview-digest` → Live preview dengan data real

**Flow:**
1. User paste Google Sheets URL
2. Backend fetch tabs via Google Sheets API
3. User pilih tab (sheet name)
4. Backend fetch rows, apply filters, render template
5. Preview ditampilkan di frontend (real-time)

---

## 🎨 Frontend UI (`CreateReminderWizard.tsx`)

### Wizard Steps:

1. **Basic Details**
   - Reminder name

2. **Target Audience**
   - Toggle: Groups vs Contacts
   - Group selector (multi-select dengan search)
   - Contact input (manual, CSV, atau Google Sheets)

3. **Data Source**
   - Toggle: Static vs Google Sheets
   - **If Google Sheets:**
     - URL input (auto-detect tabs)
     - Tab selector
     - **Toggle: Legacy vs Advanced Filters**
     - **If Advanced:**
       - `<AdvancedFilters>` component
       - Add multiple filter conditions
       - Set sorting
     - **If Legacy:**
       - Trigger column + value
     - Digest mode toggle

4. **Schedule**
   - Frequency selector (Now, Once, Daily, Weekly, Monthly)
   - Date/time picker
   - Day selector (for weekly)

5. **Message**
   - Rich text editor (bold, italic, strikethrough, code)
   - Emoji picker (8 categories)
   - Image attachment
   - **Live Preview** (if digest mode + Google Sheets)

---

## 📦 Resource Usage

### Memory (RAM)

| Component | Idle | Active |
|-----------|------|--------|
| ReminderService | ~50 MB | ~100 MB |
| Bull Queue (Redis) | ~50 MB | ~100 MB |
| Google Sheets API calls | - | ~50 MB per request |
| **Total** | ~100 MB | ~250 MB |

### CPU
- **Low** saat idle (cron waiting)
- **Medium** saat execute (fetch sheets, render template, send message)
- **Peak** saat multiple reminders execute bersamaan

### Network
- Google Sheets API: ~1-5 KB per row
- WhatsApp send: ~1-10 KB per message (tergantung length + image)

---

## 🔄 Execution Flow

```
Cron Trigger → Bull Queue Job → Check Data Source
                                      ↓
                        ┌─────────────┴─────────────┐
                        ↓                           ↓
                   Static Message          Google Sheets
                        ↓                           ↓
                        ↓                    Fetch Sheets Data
                        ↓                           ↓
                        ↓                    Apply Filters
                        ↓                           ↓
                        ↓                      Sort Data
                        ↓                           ↓
                        ↓                  Render Handlebars
                        ↓                           ↓
                        └─────────────┬─────────────┘
                                      ↓
                            Send to WhatsApp
                                      ↓
                               Log Result
                                      ↓
                          Update last_run_at
```

---

## 🐛 Optimasi untuk 2 GB Server

### 1. Limit Concurrent Jobs
```javascript
// Bull queue config
const reminderQueue = new Queue('reminders', {
  limiter: {
    max: 5,        // Max 5 jobs concurrent
    duration: 1000 // Per second
  }
})
```

### 2. Cache Google Sheets Data
```javascript
// Cache sheets data for 5 minutes
const sheetsCache = new Map()
const CACHE_TTL = 5 * 60 * 1000
```

### 3. Batch Processing
```javascript
// Process reminders in batches
const batchSize = 10
for (let i = 0; i < reminders.length; i += batchSize) {
  const batch = reminders.slice(i, i + batchSize)
  await Promise.all(batch.map(r => processReminder(r)))
}
```

---

## 📈 Scalability

| Metric | 2 GB Server | 4 GB Server | 8 GB Server |
|--------|-------------|-------------|-------------|
| **Max Reminders** | ~50 | ~200 | ~500 |
| **Concurrent Executions** | 5 | 10 | 20 |
| **Google Sheets Rows** | ~500 | ~2000 | ~5000 |

---

## 🎯 Use Cases

### 1. Daily Digest Deadline
- Fetch deadlines dari Google Sheets
- Filter: `waktu <= 3 hari` + `done = FALSE`
- Sort by `waktu` ascending
- Send daily jam 8 pagi

### 2. Weekly Team Meeting
- Static message
- Send every Monday 9 AM
- Target: Team group

### 3. Monthly Report Reminder
- Static message
- Send tanggal 1 setiap bulan
- Target: Multiple groups

### 4. Event Countdown
- Google Sheets dengan event list
- Filter: `event_date - today <= 7 days`
- Send daily

---

## 🔑 Key Features Summary

✅ **Multi-target:** Groups + Contacts  
✅ **Flexible scheduling:** Now, Once, Daily, Weekly, Monthly  
✅ **Google Sheets integration:** Dynamic data  
✅ **Advanced filtering:** Multiple conditions + sorting  
✅ **Digest mode:** Aggregate multiple rows into 1 message  
✅ **Rich text editor:** Bold, italic, emoji, image  
✅ **Live preview:** Real-time preview dengan data dari Sheets  
✅ **Edit mode:** Load existing reminder untuk edit  
✅ **Logging:** Track execution history  
✅ **Pause/Resume:** Toggle active status  

---

## 💾 Memory Footprint (Estimasi)

### Per Reminder
Untuk **1 reminder aktif** dengan **Google Sheets (100 rows)**:
- Service: ~50 MB
- Redis: ~50 MB
- Sheets data: ~10 MB
- **Total: ~110 MB**

### Multiple Reminders
| Reminders | Memory Usage |
|-----------|-------------|
| 10 reminders | ~300-400 MB |
| 50 reminders | ~800 MB - 1 GB |
| 100 reminders | ~1.5 - 2 GB |

---

## 🔐 Security & Best Practices

### 1. Google Sheets Access ✨ **NEW: No API Key Required!**
- **Public Sheets:** Users set their sheets to "Anyone with the link can view"
- **No service account needed** - truly multi-tenant!
- **No API key configuration** - zero setup for users
- **Privacy:** Sheet links are obscure (hard to guess) - safe unless shared publicly
- **Future:** OAuth 2.0 option for private sheets (coming soon)

### 2. Rate Limiting
- Bull queue limiter: max 5 concurrent jobs
- Google Sheets CSV export: No strict quota (public endpoint)
- WhatsApp: max 20 messages per second (Baileys limit)

### 3. Error Handling
- Retry mechanism untuk failed jobs (max 3 retries)
- Logging semua errors ke `reminder_logs`
- Notification ke admin jika reminder failed 3x berturut-turut

### 4. Data Validation
- Validate cron expression sebelum save
- Validate Google Sheets URL format
- Validate target JIDs format
- Sanitize user input di template

---

## 🚨 Known Limitations

1. **Public Sheets Requirement**
   - Sheets must be set to "Anyone with link can view"
   - Not suitable for highly sensitive data (use OAuth option when available)
   - Users must remember to set sharing correctly

2. **Bull Queue Memory**
   - Setiap job ~1-5 MB di Redis
   - Solusi: Set job expiration, cleanup old jobs

3. **WhatsApp Rate Limit**
   - Baileys: max ~20 msg/sec
   - Solusi: Queue messages, add delay

4. **Template Rendering**
   - Complex templates bisa lambat (>1000 rows)
   - Solusi: Limit rows per digest, pagination

---

## 📚 API Reference

### Create Reminder
```http
POST /api/reminders
Authorization: Bearer {token}
Content-Type: application/json

{
  "botId": "uuid",
  "name": "Reminder Name",
  "targetType": "group",
  "targetId": "120363xxx@g.us",
  "schedule": "0 8 * * *",
  "timezone": "Asia/Jakarta",
  "templateConfig": {
    "body": "Message template",
    "googleSheetsUrl": "https://docs.google.com/...",
    "sheetName": "Sheet1",
    "isDigestMode": true,
    "filters": [...],
    "sort": {...}
  }
}
```

### Update Reminder
```http
PUT /api/reminders/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  // Same payload as create
}
```

### Get Reminders
```http
GET /api/reminders?botId={botId}
Authorization: Bearer {token}
```

### Toggle Reminder
```http
PATCH /api/reminders/{id}/toggle
Authorization: Bearer {token}
Content-Type: application/json

{
  "isActive": true
}
```

### Delete Reminder
```http
DELETE /api/reminders/{id}
Authorization: Bearer {token}
```

### Preview Digest
```http
POST /api/sheets/preview-digest
Content-Type: application/json

{
  "url": "https://docs.google.com/...",
  "selectedSheets": ["Sheet1"],
  "template": "{{#each items}}{{name}}{{/each}}",
  "timezone": "Asia/Jakarta",
  "filters": [...],
  "sort": {...}
}
```

---

## 🛠️ Troubleshooting

### Reminder tidak jalan
1. Cek `is_active = 1` di database
2. Cek Bull queue status: `pm2 logs backend | grep "reminder"`
3. Cek Redis connection: `redis-cli ping`
4. Cek cron expression valid: gunakan [crontab.guru](https://crontab.guru)

### Google Sheets error
1. Cek sheets di-set ke "Anyone with link can view"
2. Cek URL format valid
3. Cek sheet name exact match (case-sensitive)
4. Test akses manual: buka URL di incognito browser

### Message tidak terkirim
1. Cek bot connected: `GET /api/bots/{id}/status`
2. Cek target JID valid
3. Cek WhatsApp rate limit
4. Cek logs: `SELECT * FROM reminder_logs WHERE status = 'failed'`

---

## 📝 Development Notes

### File Locations
```
backend/
├── src/
│   ├── modules/reminder/
│   │   └── reminderService.ts          # Core service
│   ├── services/
│   │   └── reminderSchedulerService.ts # Scheduler
│   ├── api/routes/
│   │   └── reminderRoutes.ts           # API endpoints
│   └── database/migrations/
│       └── 004_create_reminders_system.sql

frontend/
└── src/
    └── components/
        ├── CreateReminderWizard.tsx    # Main wizard
        └── AdvancedFilters.tsx         # Filter component
```

### Environment Variables
```env
# Redis (for Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# ✨ NO GOOGLE SHEETS CREDENTIALS NEEDED!
# Users just need to set their sheets to public
```

---

## 🎓 Learning Resources

- [Bull Queue Docs](https://github.com/OptimalBits/bull)
- [Handlebars Docs](https://handlebarsjs.com/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Cron Expression Guide](https://crontab.guru)
- [Baileys WhatsApp Library](https://github.com/WhiskeySockets/Baileys)

---

**Last Updated:** 18 Januari 2026  
**Version:** 1.0  
**Maintainer:** BroBot Team
