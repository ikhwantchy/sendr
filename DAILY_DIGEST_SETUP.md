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
5. **PENTING:** Set sharing ke "Anyone with link can view"
6. Done! ✅

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
Tab Name: daily_digest (pilih dari dropdown)

☐ Use Advanced Filters (kosong dulu, ambil semua data)

☑️ Digest Mode (WAJIB aktifkan!)
```

### 4. Schedule
```
Frequency: Daily
Time: 07:00
Timezone: Asia/Jakarta
```

### 5. Message Template (Digest Mode - 3 Bagian)

Setelah Digest Mode aktif, akan muncul **3 field** terpisah:

#### 🟪 Quick Template Presets
Klik salah satu preset untuk auto-fill:
- **📚 Jadwal + Deadline** — Template akademik/kuliah
- **📝 Simple List** — Daftar umum
- **⏰ Deadline Tracker** — H-3 reminder

Atau isi manual:

#### a) Digest Header
```
📋 *DAILY DIGEST*
📅 {{@todayFull}}

━━━━━━━━━━━━━━━━━━━━
```

#### b) Row Template (per item)
```
{{@index}}. *{{nama}}*
⏰ {{waktu}}
📝 {{detail}}
```

#### c) Empty Message (jika data kosong)
```
✅ Tidak ada jadwal atau deadline hari ini.

Enjoy your free time! 🎉
```

### 6. Live Preview
Setelah ketiga field diisi, preview otomatis muncul di panel kanan!
Preview menggunakan data real dari Google Sheets.

### 7. Save & Test
```
1. Klik "Create Reminder"
2. Wait for success message
3. Check WhatsApp group
```

---

## 📊 Contoh Output

```
📋 DAILY DIGEST
📅 Sabtu, 15 Februari 2026

━━━━━━━━━━━━━━━━━━━━

1. *Keamanan Bisnis*
⏰ 18:20-20:00
📝 Ruang Kelas Widya

2. *Interaksi Manusia dan Komputer*
⏰ 18:20-20:00
📝 Dosen Wira Persada

3. *Presentasi IMK*
⏰ 2026-01-20
📝 Kelompok 7 - Materi 9
```

---

## 🔗 Available Variables

### Built-in Variables (Biru)
| Variable | Deskripsi | Contoh Output |
|----------|-----------|---------------|
| `{{@today}}` | Tanggal dd/MM/yyyy | 15/02/2026 |
| `{{@todayFull}}` | Hari, tanggal lengkap | Sabtu, 15 Februari 2026 |
| `{{@dayName}}` | Nama hari | Sabtu |
| `{{@index}}` | Nomor urut (di dalam loop) | 1, 2, 3... |
| `{{@length}}` | Total jumlah data | 5 |

### Sheet Variables (Hijau)
Auto-detected dari kolom Google Sheets lu:
| Variable | Source |
|----------|--------|
| `{{tipe}}` | Kolom "tipe" |
| `{{waktu}}` | Kolom "waktu" |
| `{{nama}}` | Kolom "nama" |
| `{{detail}}` | Kolom "detail" |

💡 **Tips:** Klik variable di panel UI untuk auto-copy!

### Formatters
| Format | Contoh | Output |
|--------|--------|--------|
| `| urgency` | `{{waktu \| urgency}}` | Smart date formatting |
| `| date:dd/MM/yyyy` | `{{waktu \| date:dd/MM/yyyy}}` | Custom date format |
| `| uppercase` | `{{nama \| uppercase}}` | KEAMANAN BISNIS |
| `| capitalize` | `{{nama \| capitalize}}` | Keamanan Bisnis |

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

### Tambah Emoji Custom (Row Template):
```
{{#if tipe == "Jadwal"}}📚{{/if}}{{#if tipe == "Deadline"}}🚨{{/if}} *{{nama}}*
⏰ {{waktu}}
📝 {{detail}}
```

### Filter by Type (Jadwal Only) - Advanced Filters:
```
Advanced Filters:
- Column: tipe
- Operator: equals
- Value: Jadwal
```

### Filter by Date (Deadline H-3) - Advanced Filters:
```
Advanced Filters:
- Column: waktu
- Operator: date_within_days
- Value: 3
```

### Grouped Digest (Jadwal + Deadline terpisah):
Gunakan full template (bukan digest mode) dengan:
```handlebars
📋 *DAILY DIGEST*
📅 {{@todayFull}}

━━━━━━━━━━━━━━━━━━━━
📚 *JADWAL HARI INI*
━━━━━━━━━━━━━━━━━━━━

{{#filter items tipe="Jadwal"}}
{{@index}}. *{{nama}}*
⏰ {{waktu}}
📝 {{detail}}
{{/filter}}

━━━━━━━━━━━━━━━━━━━━
🚨 *DEADLINE*
━━━━━━━━━━━━━━━━━━━━

{{#filter items tipe="Deadline"}}
{{@index}}. *{{nama}}*
📅 {{waktu | urgency}}
📝 {{detail}}
{{/filter}}
```

---

## ✅ Checklist

- [ ] Tab "daily_digest" created
- [ ] Data copied from schedules & deadlines
- [ ] Sheet set to "Anyone with link can view"
- [ ] Reminder created in dashboard
- [ ] Digest Mode enabled
- [ ] Quick Template preset applied OR manual fields filled
- [ ] Live preview shows correct data
- [ ] Schedule set to Daily 07:00
- [ ] Test message sent successfully

---

## 🐛 Troubleshooting

### "Sheet appears empty"
→ Pastikan ada minimal 1 row data (selain header)

### "Connected: 1 rows found"
→ Hapus row dengan #N/A atau formula error

### Template variables gak work
→ Pastikan column names di Sheet cocok dengan variable.
   Variables auto-detected di panel hijau "Variables from Sheet"

### Message gak terkirim
→ Cek bot connected & group JID benar

### Preview kosong / tidak muncul
→ Pastikan ketiga field Digest (Header, Row Template, Empty) sudah diisi.
   Preview butuh waktu ~1.5 detik untuk fetch data.

### Variables tidak muncul di panel
→ Pastikan tab name sudah dipilih dan sheet accessible (public).
   Columns auto-detect setelah 1 detik.

---

**Need help?** Check `GOOGLE_SHEETS_STRUCTURE_GUIDE.md` 📚

**Last Updated:** 15 Februari 2026
