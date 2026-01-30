# 📊 Google Sheets Structure Guide - Sendr Reminders

## ✅ **Struktur Sheet yang BENAR**

### **Rule #1: Header di Row 1, Data Mulai Row 2**

```
Row 1: [Header 1] [Header 2] [Header 3] ...
Row 2: [Data 1]   [Data 2]   [Data 3]   ...
Row 3: [Data 1]   [Data 2]   [Data 3]   ...
...
```

### **Rule #2: Gak Boleh Ada Merged Cells di Header**

❌ **SALAH:**
```
| Merged Header Cell      |
| Col A  | Col B  | Col C  |
```

✅ **BENAR:**
```
| Col A  | Col B  | Col C  |
| Data 1 | Data 2 | Data 3 |
```

### **Rule #3: Hindari Formula Error (#N/A, #REF!, dll)**

❌ **SALAH:**
```
| hari   | waktu  | mk     |
| #N/A   | #N/A   | #N/A   |  ← Row ini akan di-skip!
```

✅ **BENAR:**
```
| hari   | waktu  | mk     |
| Senin  | 08:00  | Basis Data |
```

**Note:** Parser otomatis **skip rows** yang semua cell-nya error values atau empty.

---

## 📋 **Contoh Sheet yang Benar**

### **1. Sheet "deadlines" (Deadline Tugas)**

```
| mk                          | judul                | waktu      | done  | catatan              |
|-----------------------------|----------------------|------------|-------|----------------------|
| Basis Data                  | Tugas UTS            | 2026-01-20 | FALSE | Bab 1-5              |
| Pemrograman Web             | Presentasi           | 2026-01-22 | FALSE | Kelompok 3           |
| Interaksi Manusia Komputer  | Laporan Akhir        | 2026-01-25 | FALSE | Min 20 halaman       |
| MPPL                        | Prototype            | 2026-02-01 | TRUE  | Sudah dikumpulkan    |
```

**Column Names:**
- `mk` - Mata kuliah
- `judul` - Judul tugas/deadline
- `waktu` - Tanggal deadline (format: `YYYY-MM-DD` atau `DD/MM/YYYY`)
- `done` - Status (TRUE/FALSE atau YES/NO)
- `catatan` - Catatan tambahan (optional)

**Format Tanggal yang Didukung:**
- ✅ `2026-01-20` (ISO format - RECOMMENDED)
- ✅ `20/01/2026` (DD/MM/YYYY)
- ✅ `20-01-2026` (DD-MM-YYYY)
- ✅ `01/20/2026` (MM/DD/YYYY)

---

### **2. Sheet "schedules" (Jadwal Kuliah)**

```
| day    | start | end   | mk                          | lokasi  |
|--------|-------|-------|-----------------------------|---------|
| Senin  | 08:00 | 10:00 | Basis Data                  | Lab 301 |
| Senin  | 10:00 | 12:00 | Pemrograman Web             | Lab 302 |
| Selasa | 13:00 | 15:00 | Interaksi Manusia Komputer  | Kelas A |
| Rabu   | 08:00 | 10:00 | MPPL                        | Lab 301 |
```

**Column Names:**
- `day` atau `hari` - Nama hari (Senin, Selasa, dst)
- `start` atau `waktu` - Jam mulai (HH:mm)
- `end` - Jam selesai (HH:mm) - optional
- `mk` - Mata kuliah
- `lokasi` atau `ruang` - Lokasi kelas

**Format Waktu:**
- ✅ `08:00` (HH:mm)
- ✅ `08:00-10:00` (range)
- ✅ `8:00` (tanpa leading zero juga OK)

---

### **3. Sheet "events" (Event/Kegiatan)**

```
| nama_event              | tanggal    | waktu | lokasi           | catatan        |
|-------------------------|------------|-------|------------------|----------------|
| Rapat Organisasi        | 2026-01-25 | 14:00 | Ruang Rapat      | Wajib hadir    |
| Workshop AI             | 2026-01-28 | 09:00 | Auditorium       | Bawa laptop    |
| Seminar Nasional        | 2026-02-05 | 08:00 | Gedung Utama     | Dress code: Formal |
```

---

## 🚫 **Common Mistakes (Yang Sering Salah)**

### ❌ **Mistake #1: Empty Sheet (Cuma Header)**

```
| hari   | waktu  | mk     |
|        |        |        |  ← GAK ADA DATA!
```

**Error:** "Sheet appears empty" atau "0 rows found"

**Fix:** Tambahin minimal 1 row data.

---

### ❌ **Mistake #2: Formula Error Rows**

```
| hari   | waktu  | mk     |
| #N/A   | #N/A   | #N/A   |  ← Formula error!
| Senin  | 08:00  | Basis Data |
```

**Error:** Row pertama di-skip, bot cuma detect 1 row data.

**Fix:** 
1. Hapus row dengan error
2. Atau fix formula yang error

---

### ❌ **Mistake #3: Header di Row 2 atau Lebih**

```
(Row 1 kosong)
| hari   | waktu  | mk     |  ← Header di row 2
| Senin  | 08:00  | Basis Data |
```

**Error:** Bot akan anggap row 1 (kosong) sebagai header.

**Fix:** Header HARUS di row 1, data mulai row 2.

---

### ❌ **Mistake #4: Merged Cells di Header**

```
| Jadwal Kuliah Semester 6 |  ← Merged cell
| hari   | waktu  | mk     |  ← Header di row 2
| Senin  | 08:00  | Basis Data |
```

**Error:** Parser bingung, column names jadi salah.

**Fix:** Hapus merged cells, header langsung di row 1.

---

### ❌ **Mistake #5: Inconsistent Column Names**

**Sheet 1:**
```
| hari   | waktu  | mk     |
```

**Sheet 2:**
```
| day    | time   | course |
```

**Error:** Template variables gak match (misal `{{hari}}` gak work di sheet 2).

**Fix:** Pakai column names yang **konsisten** di semua sheets.

---

## 🎯 **Best Practices**

### ✅ **1. Use Simple, Lowercase Column Names**

**Good:**
```
| mk | judul | waktu | done |
```

**Also OK:**
```
| MK | Judul | Waktu | Done |
```

**Avoid:**
```
| Mata Kuliah | Judul Tugas | Tanggal Deadline | Status Selesai |
```
(Spasi di column name bisa bikin ribet di template)

---

### ✅ **2. Use Consistent Date Format**

**Recommended:** `YYYY-MM-DD` (ISO format)

```
| waktu      |
|------------|
| 2026-01-20 |
| 2026-01-25 |
| 2026-02-01 |
```

**Why?** Parser otomatis detect format ini, gak perlu manual parsing.

---

### ✅ **3. Use TRUE/FALSE for Boolean Columns**

```
| done  |
|-------|
| FALSE |
| TRUE  |
| FALSE |
```

**Also OK:**
- `YES` / `NO`
- `1` / `0`
- `✓` / `✗`

**Avoid:**
- `Sudah` / `Belum` (case-sensitive, ribet di filter)

---

### ✅ **4. Add Sample Data Row**

Selalu tambahin **minimal 1 row data** untuk testing:

```
| mk         | judul      | waktu      | done  |
|------------|------------|------------|-------|
| Test MK    | Test Tugas | 2026-12-31 | FALSE |  ← Sample data
```

Nanti bisa dihapus setelah reminder jalan.

---

### ✅ **5. Use Descriptive Tab Names**

**Good:**
- `deadlines`
- `schedules`
- `events`

**Avoid:**
- `Sheet1`
- `Data`
- `Untitled`

---

## 🔍 **How to Verify Your Sheet Structure**

### **Step 1: Check in Browser**

1. Buka sheet di browser
2. Pastikan:
   - ✅ Row 1 = Headers
   - ✅ Row 2+ = Data
   - ✅ Gak ada merged cells di header
   - ✅ Gak ada formula errors (#N/A, #REF!)

### **Step 2: Test CSV Export**

1. Buka sheet URL
2. Tambahkan `/gviz/tq?tqx=out:csv` di akhir URL
3. Contoh:
   ```
   https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv&sheet=deadlines
   ```
4. Browser akan download CSV file
5. Buka CSV, pastikan format benar

### **Step 3: Test in Dashboard**

1. Paste sheet URL di reminder form
2. Klik "Check Connection"
3. Pastikan:
   - ✅ "Connected: X rows found" (X > 0)
   - ✅ Preview nunjukin data yang benar
   - ✅ Gak ada error message

---

## 🐛 **Troubleshooting**

### **Problem: "Sheet appears empty"**

**Possible Causes:**
1. Sheet cuma punya header, gak ada data
2. Semua rows punya formula errors (#N/A)
3. Sheet name salah (case-sensitive!)

**Solution:**
1. Tambahin minimal 1 row data
2. Fix formula errors
3. Cek sheet name exact match

---

### **Problem: "Connected: 1 rows found" (harusnya lebih)**

**Possible Causes:**
1. Ada rows dengan semua cells kosong atau error
2. Data di-hidden (hidden rows)

**Solution:**
1. Unhide semua rows
2. Hapus empty rows
3. Fix formula errors

---

### **Problem: Template variables gak work**

**Example:**
```
Template: {{mk}} - {{judul}}
Output:   - 
```

**Possible Causes:**
1. Column names di sheet gak match dengan template
2. Case-sensitive issue (misal: `MK` vs `mk`)

**Solution:**
1. Cek column names di sheet
2. Update template atau column names biar match
3. Parser case-sensitive, jadi `{{mk}}` ≠ `{{MK}}`

---

## 📚 **Examples for Common Use Cases**

### **Use Case 1: Deadline Reminder (H-3)**

**Sheet Structure:**
```
| mk    | judul      | waktu      | done  | catatan |
|-------|------------|------------|-------|---------|
| BD    | Tugas UTS  | 2026-01-20 | FALSE | Bab 1-5 |
| PW    | Presentasi | 2026-01-22 | FALSE | Kel 3   |
```

**Filter:**
```javascript
{
  column: 'waktu',
  operator: 'date_within_days',
  value: 3
},
{
  column: 'done',
  operator: 'equals',
  value: 'FALSE'
}
```

**Template:**
```handlebars
🚨 *DEADLINE H-3*

{{#each items}}
{{@index}}. {{mk}} - {{judul}}
📅 {{waktu}}
📝 {{catatan}}

{{/each}}
```

---

### **Use Case 2: Jadwal Kuliah Hari Ini**

**Sheet Structure:**
```
| hari  | waktu       | mk    | ruang   | dosen    |
|-------|-------------|-------|---------|----------|
| Senin | 08:00-10:00 | BD    | Lab 301 | Pak Budi |
| Senin | 10:00-12:00 | PW    | Lab 302 | Bu Ani   |
```

**Filter:**
```javascript
{
  column: 'hari',
  operator: 'equals',
  value: '{{@today_day}}' // Auto-detect hari ini
}
```

**Template:**
```handlebars
📚 *JADWAL HARI INI*

{{#each items}}
⏰ {{waktu}}
📖 {{mk}}
🏫 {{ruang}}
👨‍🏫 {{dosen}}

{{/each}}
```

---

## ✅ **Quick Checklist**

Before creating a reminder, verify:

- [ ] Sheet is set to "Anyone with link can view"
- [ ] Row 1 contains headers (column names)
- [ ] Row 2+ contains data (at least 1 row)
- [ ] No merged cells in header row
- [ ] No formula errors (#N/A, #REF!, etc.)
- [ ] Column names match template variables
- [ ] Date format is consistent (YYYY-MM-DD recommended)
- [ ] Tab name is correct (case-sensitive!)

---

**Last Updated:** 18 Januari 2026  
**Version:** 1.0
