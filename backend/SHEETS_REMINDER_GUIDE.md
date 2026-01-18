# Enhanced Google Sheets Reminder System

## Overview

Sistem reminder Google Sheets yang telah ditingkatkan dengan fitur-fitur powerful dan mudah digunakan untuk berbagai use case.

## Fitur Utama

### 1. **Smart Data Processing**
- Filter data dengan berbagai kondisi (equals, contains, date filters, dll)
- Sort dan group data
- Transform data (uppercase, date format, number format, dll)
- Auto-detect column names (tidak perlu hardcode nama kolom)

### 2. **Flexible Template Rendering**
- Loop through data dengan `{{#each}}`
- Conditional rendering dengan `{{#if}}`
- Grouping dengan `{{#group}}`
- Filters/formatters (uppercase, date, currency, dll)
- Built-in variables (@today, @now, dll)

---

## Cara Penggunaan

### Use Case 1: Daily Schedule Reminder

**Google Sheet Structure:**
```
| Hari   | Mata Kuliah | Waktu      | Dosen        | Ruang |
|--------|-------------|------------|--------------|-------|
| Senin  | Matematika  | 08:00-10:00| Dr. Budi     | A101  |
| Senin  | Fisika      | 10:00-12:00| Prof. Ani    | B202  |
| Selasa | Kimia       | 08:00-10:00| Dr. Citra    | C303  |
```

**Filter Configuration:**
```json
{
  "filters": [
    {
      "column": "Hari",
      "operator": "equals",
      "value": "Senin"
    }
  ]
}
```

**Template:**
```
🗓️ *Jadwal Hari Ini - {{@today_name}}*

{{#each items}}
{{@index}}. {{Mata Kuliah}}
⏰ {{Waktu}}
👨‍🏫 {{Dosen}}
📍 {{Ruang}}

{{/each}}
```

**Output:**
```
🗓️ *Jadwal Hari Ini - Senin*

1. Matematika
⏰ 08:00-10:00
👨‍🏫 Dr. Budi
📍 A101

2. Fisika
⏰ 10:00-12:00
👨‍🏫 Prof. Ani
📍 B202
```

---

### Use Case 2: Urgent Deadline Reminder

**Google Sheet Structure:**
```
| Task          | Deadline   | Status    | Priority |
|---------------|------------|-----------|----------|
| Essay Sejarah | 20/01/2026 | Pending   | High     |
| Lab Report    | 18/01/2026 | In Progress| Medium  |
| Quiz Prep     | 25/01/2026 | Pending   | Low      |
```

**Filter Configuration:**
```json
{
  "filters": [
    {
      "column": "Deadline",
      "operator": "date_within_days",
      "value": 3
    },
    {
      "column": "Status",
      "operator": "not_equals",
      "value": "Done"
    }
  ],
  "sort": {
    "column": "Deadline",
    "order": "asc"
  }
}
```

**Template:**
```
⚠️ *Deadline Alert - {{@today}}*

{{#if @length > 0}}
Ada {{@length}} tugas yang harus diselesaikan dalam 3 hari:

{{#each items}}
{{@index}}. {{Task}}
📅 {{Deadline | date:dd MMM yyyy}}
🎯 Priority: {{Priority | uppercase}}
📊 Status: {{Status}}

{{/each}}
{{/if}}

{{#if @length == 0}}
✅ Tidak ada deadline mendesak!
{{/if}}
```

---

### Use Case 3: Attendance Tracker

**Google Sheet Structure:**
```
| Nama     | Status | Waktu Check-in | Keterangan |
|----------|--------|----------------|------------|
| Ahmad    | Hadir  | 08:05          | -          |
| Budi     | Izin   | -              | Sakit      |
| Citra    | Hadir  | 08:10          | -          |
| Doni     | Alpha  | -              | -          |
```

**Filter Configuration:**
```json
{
  "filters": [
    {
      "column": "Status",
      "operator": "not_equals",
      "value": "Hadir"
    }
  ]
}
```

**Template:**
```
📊 *Laporan Kehadiran - {{@today}}*

{{#group by="Status"}}
*{{@groupName}}* ({{@groupCount}} orang):
{{#items}}
• {{Nama}}{{#if Keterangan}} - {{Keterangan}}{{/if}}
{{/items}}

{{/group}}
```

---

### Use Case 4: Inventory Alert

**Google Sheet Structure:**
```
| Item      | Stock | Min Stock | Supplier    | Price  |
|-----------|-------|-----------|-------------|--------|
| Kertas A4 | 5     | 10        | Toko ABC    | 50000  |
| Tinta HP  | 15    | 10        | Toko XYZ    | 75000  |
| Stapler   | 3     | 5         | Toko ABC    | 25000  |
```

**Filter Configuration:**
```json
{
  "filters": [
    {
      "column": "Stock",
      "operator": "less_than",
      "value": "{{Min Stock}}"
    }
  ]
}
```

**Template:**
```
🚨 *Inventory Alert*

Stok berikut perlu di-reorder:

{{#each items}}
{{@index}}. {{Item}}
📦 Stock: {{Stock}} (Min: {{Min Stock}})
🏪 Supplier: {{Supplier}}
💰 Price: {{Price | currency}}

{{/each}}

Total items: {{@length}}
```

---

### Use Case 5: Event Reminder with Grouping

**Google Sheet Structure:**
```
| Event        | Date       | Time  | Category  | Location |
|--------------|------------|-------|-----------|----------|
| Team Meeting | 18/01/2026 | 09:00 | Work      | Room A   |
| Lunch        | 18/01/2026 | 12:00 | Personal  | Cafe     |
| Workshop     | 18/01/2026 | 14:00 | Work      | Hall B   |
| Gym          | 18/01/2026 | 18:00 | Personal  | Gym      |
```

**Filter Configuration:**
```json
{
  "filters": [
    {
      "column": "Date",
      "operator": "date_today"
    }
  ]
}
```

**Template:**
```
📅 *Agenda Hari Ini - {{@today_name}}*

{{#group by="Category"}}
*{{@groupName | uppercase}}*

{{#items}}
⏰ {{Time}} - {{Event}}
📍 {{Location}}
{{/items}}

{{/group}}
```

---

## Available Filters

### String Filters
- `equals` - Exact match
- `not_equals` - Not equal
- `contains` - Contains substring
- `not_contains` - Does not contain
- `starts_with` - Starts with
- `ends_with` - Ends with
- `in_list` - Value in list
- `is_empty` - Empty or null
- `not_empty` - Not empty

### Number Filters
- `greater_than` - Greater than
- `less_than` - Less than
- `between` - Between two values

### Date Filters
- `date_equals` - Date equals
- `date_before` - Before date
- `date_after` - After date
- `date_between` - Between two dates
- `date_today` - Is today
- `date_within_days` - Within X days from today

---

## Available Template Formatters

- `{{value | uppercase}}` - UPPERCASE
- `{{value | lowercase}}` - lowercase
- `{{value | capitalize}}` - Capitalize
- `{{value | trim}}` - Remove whitespace
- `{{value | number}}` - Format as number (1,000)
- `{{value | currency}}` - Format as Rupiah (Rp 1,000)
- `{{value | date:dd/MM/yyyy}}` - Format date
- `{{value | default:N/A}}` - Default value if empty
- `{{value | truncate:50}}` - Truncate to 50 chars
- `{{value | replace:old:new}}` - Replace text

---

## Built-in Variables

- `{{@today}}` - Today's date (dd/MM/yyyy)
- `{{@today_name}}` - Day name (Senin, Selasa, etc)
- `{{@today_date}}` - Day number
- `{{@today_month}}` - Month name
- `{{@today_year}}` - Year
- `{{@now}}` - Current time (HH:mm)
- `{{@datetime}}` - Current datetime
- `{{@index}}` - Loop index (1-based)
- `{{@index0}}` - Loop index (0-based)
- `{{@first}}` - Is first item
- `{{@last}}` - Is last item
- `{{@length}}` - Total items count
- `{{@groupName}}` - Group name (in group context)
- `{{@groupCount}}` - Items in group (in group context)

---

## API Integration Example

```javascript
// Backend endpoint to process and send reminder
POST /api/reminders/process

{
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Schedule",
  "config": {
    "filters": [
      {
        "column": "Hari",
        "operator": "equals",
        "value": "Senin"
      }
    ],
    "sort": {
      "column": "Waktu",
      "order": "asc"
    }
  },
  "template": "🗓️ Jadwal Hari Ini\n\n{{#each items}}\n{{@index}}. {{Mata Kuliah}}\n{{Waktu}}\n{{/each}}"
}
```

---

## Tips & Best Practices

1. **Use Smart Column Detection**: Sistem akan otomatis mencari kolom dengan nama yang mirip
2. **Combine Multiple Filters**: Gunakan multiple filters untuk hasil yang lebih spesifik
3. **Use Grouping for Better Organization**: Group data berdasarkan kategori untuk pesan yang lebih terstruktur
4. **Apply Formatters**: Gunakan formatters untuk membuat output lebih readable
5. **Test with Preview**: Selalu test template dengan preview sebelum dijadwalkan

---

## Migration dari Sistem Lama

Jika Anda menggunakan template lama, sistem masih support format lama:
- `{{#LOOP}}...{{/LOOP}}` → Gunakan `{{#each items}}...{{/each}}`
- `{VARIABLE}` → Gunakan `{{VARIABLE}}`
- Hardcoded column names → Gunakan smart column detection

---

## Troubleshooting

**Q: Data tidak muncul di template**
A: Pastikan nama kolom di filter sesuai dengan nama kolom di Google Sheet (case-insensitive)

**Q: Date filter tidak bekerja**
A: Pastikan format tanggal di sheet adalah DD/MM/YYYY atau DD-MM-YYYY

**Q: Template menampilkan `{{variable}}` mentah**
A: Pastikan nama variable sesuai dengan nama kolom di sheet

**Q: Loop tidak menghasilkan output**
A: Cek apakah data sudah difilter dengan benar dan ada data yang tersisa

---

## Contoh Lengkap: Academic Reminder System

**Sheet 1: Jadwal**
```
| Hari   | Mata Kuliah | Waktu      | Dosen     | Ruang |
|--------|-------------|------------|-----------|-------|
| Senin  | Matematika  | 08:00-10:00| Dr. Budi  | A101  |
```

**Sheet 2: Tugas**
```
| Mata Kuliah | Tugas      | Deadline   | Status  |
|-------------|------------|------------|---------|
| Matematika  | Essay      | 20/01/2026 | Pending |
```

**Reminder Configuration:**
```json
{
  "schedule": "0 7 * * *",
  "sheets": {
    "jadwal": {
      "name": "Jadwal",
      "filters": [
        { "column": "Hari", "operator": "equals", "value": "{{@today_name}}" }
      ]
    },
    "tugas": {
      "name": "Tugas",
      "filters": [
        { "column": "Deadline", "operator": "date_within_days", "value": 3 }
      ]
    }
  },
  "template": "..."
}
```

Dengan sistem baru ini, Anda bisa dengan mudah membuat reminder untuk berbagai keperluan tanpa perlu coding!
