# Smart Deadline Reminder - Complete Guide

## Use Case: Academic Deadline Tracker (seperti contoh Anda)

### Google Sheet Structure
```
| mk                              | judul       | waktu      | catatan              | done  | status    | notified_H3 |
|---------------------------------|-------------|------------|----------------------|-------|-----------|-------------|
| Interaksi Manusia dan Komputer  | Presentasi  | 2026-01-06 | Kelompok 7 - Materi 9| FALSE | done      |             |
| Technopreneurship               | Presentasi  | 2026-01-07 | Kelompok 10 - Materi | FALSE | done      |             |
| Kecerdasan Bisnis               | Presentasi  | 2026-01-05 | Kelompok 6 - Tools   | FALSE | done      |             |
| MPPL                            | Presentasi  | 2026-01-06 | Kelompok 6           | FALSE | done      |             |
```

---

## Configuration 1: Daily H-3 Deadline Reminder

### Reminder Config
```json
{
  "name": "Deadline H-3 Reminder",
  "bot_id": "your-bot-id",
  "target_id": "group-jid@g.us",
  "target_type": "group",
  "schedule": "0 8 * * *",
  "timezone": "Asia/Jakarta",
  "is_active": 1,
  "template_config": {
    "googleSheetsUrl": "https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit",
    "sheetName": "deadlines",
    "isDigestMode": true,
    
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
    
    "body": "📋 *DAILY DIGEST ({{@today}})*\n\n📅 *Deadline ≤ 3 Hari*\n\n{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}\n{{waktu | urgency}}\n{{catatan}}\n\n{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak dalam 3 hari ke depan!{{/if}}"
  }
}
```

### Output Example
```
📋 DAILY DIGEST (17/01/2026)

📅 Deadline ≤ 3 Hari

1. Interaksi Manusia dan Komputer — Presentasi
🟡 BESOK - Sabtu, 18 Januari 2026
Kelompok 7 - Materi 9

2. MPPL — Presentasi
🟠 2 hari lagi - Minggu, 19 Januari 2026
Kelompok 6

3. Technopreneurship — Presentasi
🟠 3 hari lagi - Senin, 20 Januari 2026
Kelompok 10 - Materi 10
```

---

## Configuration 2: Grouped by Urgency

### Template with Grouping
```json
{
  "body": "📋 *DEADLINE REMINDER*\n\n{{#group by=\"urgency_level\"}}\n*{{@groupName}}* ({{@groupCount}} items)\n\n{{#items}}• {{mk}} — {{judul}}\n  📅 {{waktu | date:dd/MM/yyyy}}\n  📝 {{catatan}}\n{{/items}}\n\n{{/group}}"
}
```

**Note:** Untuk grouping by urgency, Anda perlu tambah kolom `urgency_level` di sheet atau gunakan formula di Google Sheets.

---

## Configuration 3: Multiple Reminders for Different Stages

### H-7 Warning
```json
{
  "name": "Deadline H-7 Warning",
  "schedule": "0 8 * * 1",
  "filters": [
    {
      "column": "waktu",
      "operator": "date_within_days",
      "value": 7
    },
    {
      "column": "done",
      "operator": "equals",
      "value": "FALSE"
    }
  ],
  "body": "⚠️ *WEEKLY DEADLINE ALERT*\n\nDeadline dalam 1 minggu:\n\n{{#each items}}{{@index}}. {{mk}}\n📅 {{waktu | date:EEEE, dd MMMM}}\n{{/each}}"
}
```

### H-3 Alert
```json
{
  "name": "Deadline H-3 Alert",
  "schedule": "0 8 * * *",
  "filters": [
    {
      "column": "waktu",
      "operator": "date_within_days",
      "value": 3
    },
    {
      "column": "done",
      "operator": "equals",
      "value": "FALSE"
    }
  ],
  "body": "🚨 *URGENT DEADLINE*\n\n{{#each items}}{{@index}}. {{mk}} — {{judul}}\n{{waktu | urgency}}\n{{catatan}}\n\n{{/each}}"
}
```

### H-1 Final Warning
```json
{
  "name": "Deadline H-1 Final Warning",
  "schedule": "0 18 * * *",
  "filters": [
    {
      "column": "waktu",
      "operator": "date_within_days",
      "value": 1
    },
    {
      "column": "done",
      "operator": "equals",
      "value": "FALSE"
    }
  ],
  "body": "🔴 *FINAL WARNING - BESOK DEADLINE!*\n\n{{#each items}}• {{mk}} — {{judul}}\n  {{waktu | urgency}}\n  {{catatan}}\n{{/each}}\n\n⚠️ Jangan lupa selesaikan!"
}
```

---

## Auto-Update Behavior

### How It Works
1. **Setiap reminder jalan** (sesuai schedule), sistem fetch data terbaru dari Google Sheets
2. **Filter otomatis apply** berdasarkan kondisi saat itu
3. **Jika ada data baru** di sheet → otomatis masuk reminder
4. **Jika status berubah jadi "done"** → otomatis tidak muncul lagi
5. **Jika deadline sudah lewat** → otomatis tidak muncul (karena filter `date_within_days`)

### Example Timeline
```
Hari Ini (17 Jan):
- Sheet punya deadline 20 Jan (H-3) → MUNCUL di reminder
- Sheet punya deadline 25 Jan (H-8) → TIDAK MUNCUL (lebih dari 3 hari)

Besok (18 Jan):
- Deadline 20 Jan sekarang H-2 → MASIH MUNCUL
- Deadline 25 Jan sekarang H-7 → TIDAK MUNCUL
- User tambah deadline baru 21 Jan → OTOMATIS MUNCUL (H-3)

Lusa (19 Jan):
- Deadline 20 Jan sekarang H-1 → MASIH MUNCUL
- User ubah status deadline 20 Jan jadi "done" → TIDAK MUNCUL LAGI
- Deadline 21 Jan sekarang H-2 → MASIH MUNCUL

Tanggal 21 Jan:
- Deadline 20 Jan sudah lewat → TIDAK MUNCUL (sudah di luar range H-3)
- Deadline 21 Jan sekarang H-0 (hari ini) → MUNCUL dengan urgency "HARI INI"
```

---

## Use Cases Lain (Bukan Kampus)

### 1. Work Tasks
```json
{
  "name": "Work Deadline Tracker",
  "sheetName": "work_tasks",
  "filters": [
    {
      "column": "deadline",
      "operator": "date_within_days",
      "value": 5
    },
    {
      "column": "status",
      "operator": "not_equals",
      "value": "completed"
    },
    {
      "column": "priority",
      "operator": "in_list",
      "value": ["High", "Critical"]
    }
  ],
  "body": "💼 *WORK TASKS - HIGH PRIORITY*\n\n{{#each items}}{{@index}}. {{task_name}}\n📅 {{deadline | urgency}}\n🎯 Priority: {{priority}}\n👤 Assigned: {{assigned_to}}\n\n{{/each}}"
}
```

### 2. Bills & Payments
```json
{
  "name": "Bills Reminder",
  "sheetName": "bills",
  "filters": [
    {
      "column": "due_date",
      "operator": "date_within_days",
      "value": 3
    },
    {
      "column": "paid",
      "operator": "equals",
      "value": "FALSE"
    }
  ],
  "body": "💰 *TAGIHAN JATUH TEMPO*\n\n{{#each items}}{{@index}}. {{bill_name}}\n💵 {{amount | currency}}\n📅 {{due_date | urgency}}\n🏦 {{payment_method}}\n\n{{/each}}\n\n⚠️ Segera bayar untuk menghindari denda!"
}
```

### 3. Personal Events
```json
{
  "name": "Events Reminder",
  "sheetName": "events",
  "filters": [
    {
      "column": "date",
      "operator": "date_within_days",
      "value": 7
    },
    {
      "column": "cancelled",
      "operator": "not_equals",
      "value": "yes"
    }
  ],
  "body": "📅 *UPCOMING EVENTS*\n\n{{#each items}}{{@index}}. {{event_name}}\n📍 {{location}}\n⏰ {{time}}\n📅 {{date | urgency}}\n\n{{/each}}"
}
```

### 4. Inventory Restock
```json
{
  "name": "Inventory Alert",
  "sheetName": "inventory",
  "filters": [
    {
      "column": "stock",
      "operator": "less_than",
      "value": 10
    },
    {
      "column": "reorder_status",
      "operator": "not_equals",
      "value": "ordered"
    }
  ],
  "body": "📦 *INVENTORY ALERT - LOW STOCK*\n\n{{#each items}}{{@index}}. {{item_name}}\n📊 Stock: {{stock}} (Min: {{min_stock}})\n💰 Price: {{price | currency}}\n🏪 Supplier: {{supplier}}\n\n{{/each}}"
}
```

### 5. Maintenance Schedule
```json
{
  "name": "Maintenance Reminder",
  "sheetName": "maintenance",
  "filters": [
    {
      "column": "next_service",
      "operator": "date_within_days",
      "value": 7
    },
    {
      "column": "completed",
      "operator": "equals",
      "value": "FALSE"
    }
  ],
  "body": "🔧 *MAINTENANCE SCHEDULE*\n\n{{#each items}}{{@index}}. {{equipment}}\n📅 {{next_service | urgency}}\n🔍 Type: {{service_type}}\n📝 {{notes}}\n\n{{/each}}"
}
```

---

## Advanced Features

### 1. Conditional Formatting Based on Days
```
{{#each items}}
{{@index}}. {{mk}} — {{judul}}
{{#if (days_until waktu) == 0}}
🔴 *HARI INI!* - {{waktu | date:dd/MM/yyyy}}
{{/if}}
{{#if (days_until waktu) == 1}}
🟡 *BESOK!* - {{waktu | date:dd/MM/yyyy}}
{{/if}}
{{#if (days_until waktu) > 1}}
🟢 {{waktu | days_until}} hari lagi - {{waktu | date:dd/MM/yyyy}}
{{/if}}
{{catatan}}

{{/each}}
```

### 2. Multiple Status Tracking
```json
{
  "filters": [
    {
      "column": "status",
      "operator": "in_list",
      "value": ["pending", "in_progress", "review"]
    }
  ]
}
```

### 3. Exclude Weekends
Add formula di Google Sheets:
```
=IF(WEEKDAY(A2,2)>5, "weekend", "weekday")
```

Then filter:
```json
{
  "filters": [
    {
      "column": "day_type",
      "operator": "equals",
      "value": "weekday"
    }
  ]
}
```

---

## Best Practices

1. **Use Consistent Column Names**: Stick to one naming convention
2. **Add Status Column**: Always have a status/done column for tracking
3. **Use Date Format DD/MM/YYYY**: Most reliable format
4. **Test Filters First**: Use `/api/sheets/test-filter` before scheduling
5. **Multiple Reminders**: Create different reminders for different urgency levels
6. **Keep Templates Simple**: Start simple, add complexity gradually
7. **Monitor Logs**: Check reminder_logs table for execution history

---

## Troubleshooting

**Q: Reminder tidak kirim padahal ada data**
- Cek filter: Pastikan `done` column value exact match (case-sensitive)
- Cek date format: Harus DD/MM/YYYY atau YYYY-MM-DD
- Test dengan `/api/sheets/test-filter`

**Q: Data lama masih muncul padahal sudah done**
- Pastikan value di column `done` exact match dengan filter value
- Cek case sensitivity: gunakan `caseInsensitive: true`

**Q: Deadline sudah lewat tapi masih muncul**
- Pastikan menggunakan filter `date_within_days` bukan `date_before`
- Cek timezone setting di reminder config

**Q: Reminder kirim data kosong**
- Cek apakah filter terlalu ketat
- Test tanpa filter dulu untuk lihat semua data
- Pastikan sheet name benar
