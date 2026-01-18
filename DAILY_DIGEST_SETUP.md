# 📋 Daily Digest - Template Setup

## 🎯 Quick Setup (5 Menit)

### Step 1: Buat Tab "daily_digest" di Google Sheets

**Copy-paste struktur ini ke Google Sheets lu:**

```
tipe	waktu	nama	detail
Jadwal	18:20-20:00	Keamanan Bisnis	Ruang Kelas Widya
Jadwal	18:20-20:00	Interaksi Manusia dan Komputer	Dosen Wira Persada
Deadline	2026-01-20	Presentasi IMK	Kelompok 7 - Materi 9
Deadline	2026-01-21	Presentasi Teknokewirausahaan	Kelompok 10 - Materi 10
```

**Cara:**
1. Buka Google Sheets lu
2. Klik **+** di bawah (add new sheet)
3. Rename jadi **"daily_digest"**
4. Copy data di atas, paste di sheet
5. Done! ✅

---

## 📝 Template Data

### Format Jadwal:
```
tipe: Jadwal
waktu: HH:MM-HH:MM (contoh: 08:00-10:00)
nama: Nama Mata Kuliah
detail: Lokasi/Ruang
```

### Format Deadline:
```
tipe: Deadline
waktu: YYYY-MM-DD (contoh: 2026-01-20)
nama: Nama Tugas/Event
detail: Catatan/Kelompok
```

---

## 🤖 Setup Reminder di Dashboard

### 1. Basic Details
```
Name: Daily Digest - Jadwal & Deadline
```

### 2. Target Audience
```
Type: WhatsApp Groups
Selected Groups: [Pilih group kuliah lu]
```

### 3. Data Source
```
☑️ Google Sheets Monitor

Google Sheets URL: [Paste URL sheet lu]
Tab Name: daily_digest

☐ Use Advanced Filters (kosong, ambil semua data)

☑️ Digest Mode (PENTING!)
```

### 4. Schedule
```
Frequency: Daily
Time: 07:00
Timezone: Asia/Jakarta
```

### 5. Message Template

**Copy-paste template ini:**

```handlebars
📋 *DAILY DIGEST*
{{@today}}

━━━━━━━━━━━━━━━━━━━━

{{#each items}}
{{tipe}} *{{nama}}*
⏰ {{waktu}}
📝 {{detail}}

{{/each}}

━━━━━━━━━━━━━━━━━━━━
_Auto-update dari Google Sheets_
```

### 6. Save & Test
```
1. Klik "Create Reminder"
2. Wait for success message
3. Check WhatsApp group (harusnya langsung terkirim kalau schedule = "now")
```

---

## 📊 Contoh Output

```
📋 DAILY DIGEST
Sabtu, 18 Januari 2026

━━━━━━━━━━━━━━━━━━━━

Jadwal *Keamanan Bisnis*
⏰ 18:20-20:00
📝 Ruang Kelas Widya

Jadwal *Interaksi Manusia dan Komputer*
⏰ 18:20-20:00
📝 Dosen Wira Persada

Deadline *Presentasi IMK*
⏰ 2026-01-20
📝 Kelompok 7 - Materi 9

Deadline *Presentasi Teknokewirausahaan*
⏰ 2026-01-21
📝 Kelompok 10 - Materi 10

━━━━━━━━━━━━━━━━━━━━
Auto-update dari Google Sheets
```

---

## 🔄 Cara Update Data

### Tambah Jadwal Baru:
```
1. Buka tab "daily_digest"
2. Tambah row baru:
   tipe: Jadwal
   waktu: 08:00-10:00
   nama: Basis Data
   detail: Lab 301
3. Save (auto-save)
4. Done! Besok pagi otomatis masuk ke reminder
```

### Tambah Deadline Baru:
```
1. Buka tab "daily_digest"
2. Tambah row baru:
   tipe: Deadline
   waktu: 2026-01-25
   nama: Tugas UTS
   detail: Bab 1-5
3. Save
4. Done!
```

### Hapus Data Lama:
```
1. Buka tab "daily_digest"
2. Delete row yang udah lewat
3. Save
```

---

## 🎨 Customization (Optional)

### Tambah Emoji Custom:
```handlebars
{{#each items}}
{{#if (eq tipe "Jadwal")}}📚{{else}}🚨{{/if}} *{{nama}}*
⏰ {{waktu}}
📝 {{detail}}

{{/each}}
```

### Filter by Type (Jadwal Only):
```
Advanced Filters:
- Column: tipe
- Operator: equals
- Value: Jadwal
```

### Filter by Date (Deadline H-3):
```
Advanced Filters:
- Column: waktu
- Operator: date_within_days
- Value: 3
```

---

## ✅ Checklist

- [ ] Tab "daily_digest" created
- [ ] Data copied from schedules & deadlines
- [ ] Sheet set to "Anyone with link can view"
- [ ] Reminder created in dashboard
- [ ] Template pasted correctly
- [ ] Schedule set to Daily 07:00
- [ ] Test message sent successfully

---

## 🐛 Troubleshooting

### "Sheet appears empty"
→ Pastikan ada minimal 1 row data (selain header)

### "Connected: 1 rows found"
→ Hapus row dengan #N/A atau formula error

### Template variables gak work
→ Pastikan column names exact match: `tipe`, `waktu`, `nama`, `detail`

### Message gak terkirim
→ Cek bot connected & group JID benar

---

**Need help?** Check `GOOGLE_SHEETS_STRUCTURE_GUIDE.md` 📚

**Last Updated:** 18 Januari 2026
