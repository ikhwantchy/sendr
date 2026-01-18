# 🎯 CARA TEST DEADLINE REMINDER - SEKARANG!

## ✅ Opsi 1: Via Browser Console (TERCEPAT - 2 MENIT!)

### Step 1: Buka Dashboard
1. Login ke http://localhost:3000
2. Buka DevTools (F12)
3. Klik tab "Console"

### Step 2: Paste & Run Script Ini

```javascript
// === DEADLINE H-3 REMINDER CREATOR ===
const token = localStorage.getItem('token');
const botId = 'cdff9c0d-fa62-4392-acc6-cdc52db5eb39'; // Your bot ID

// Get groups
fetch(`http://localhost:3001/api/bots/${botId}/groups`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  console.log('📋 Available Groups:');
  data.groups?.forEach((g, i) => {
    console.log(`${i+1}. ${g.name}`);
    console.log(`   JID: ${g.jid}\n`);
  });
  
  if (!data.groups || data.groups.length === 0) {
    console.error('❌ No groups found!');
    return;
  }
  
  // Use first group
  const targetGroup = data.groups[0];
  console.log(`\n🎯 Creating reminder for: ${targetGroup.name}\n`);
  
  // Create reminder with advanced filters
  return fetch('http://localhost:3001/api/reminders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Deadline H-3 Test',
      bot_id: botId,
      target_id: targetGroup.jid,
      target_type: 'group',
      schedule: 'now', // Send immediately for testing
      timezone: 'Asia/Jakarta',
      is_active: 1,
      template_config: {
        googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit',
        sheetName: 'deadlines',
        isDigestMode: true,
        
        // ✨ ADVANCED FILTERS (NEW!)
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
        
        // Sorting
        sort: {
          column: 'waktu',
          order: 'asc'
        },
        
        // ✨ ENHANCED TEMPLATE (NEW!)
        body: `📋 *DAILY DIGEST ({{@today}})*

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
{{catatan}}

{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak dalam 3 hari ke depan!{{/if}}`
      }
    })
  });
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('\n✅ REMINDER CREATED SUCCESSFULLY!');
    console.log('📱 Check your WhatsApp group NOW!\n');
    console.log('Reminder Details:');
    console.log('  ID:', data.data.id);
    console.log('  Name:', data.data.name);
    console.log('  Schedule:', data.data.schedule);
    console.log('\n💡 To schedule daily at 8 AM, update the reminder with:');
    console.log('  schedule: "0 8 * * *"');
  } else {
    console.error('❌ Failed to create reminder:', data);
  }
})
.catch(err => {
  console.error('❌ Error:', err);
  console.log('\n💡 Troubleshooting:');
  console.log('  1. Make sure you are logged in');
  console.log('  2. Check if bot is connected');
  console.log('  3. Verify Google Sheet is public');
});
```

### Step 3: Cek WhatsApp
Buka WhatsApp group Anda - reminder sudah terkirim! 🎉

---

## ✅ Opsi 2: Via Dashboard UI (Setelah Update)

### Status: 🚧 IN PROGRESS

Saya sudah buat komponen `AdvancedFilters.tsx` yang siap digunakan. Untuk mengintegrasikannya ke UI:

1. **Import component** di `CreateReminderWizard.tsx`
2. **Add state** untuk filters
3. **Add toggle** "Use Advanced Filters" di bagian Trigger Logic
4. **Replace** Trigger Column/Value dengan Advanced Filters component

### Preview UI yang akan ditambahkan:

```
┌─────────────────────────────────────────────┐
│ Trigger Logic                               │
│                                             │
│ ☑ Google Sheets Monitor                    │
│                                             │
│ [Google Sheets URL]  [Tab Name ▼]          │
│ [Check Connection]                          │
│                                             │
│ ┌─ Use Advanced Filters ─────────────────┐ │
│ │ ☐ Legacy Mode (Trigger Column/Value)   │ │
│ │ ☑ Advanced Mode (Multiple Filters)     │ │
│ │                                         │ │
│ │ Quick Presets:                          │ │
│ │ [H-3 Deadline] [Today Only] [Active]   │ │
│ │                                         │ │
│ │ Filter 1:                               │ │
│ │ [waktu ▼] [date_within_days ▼] [3]     │ │
│ │                                         │ │
│ │ Filter 2:                               │ │
│ │ [done ▼] [equals ▼] [FALSE] [Aa] [×]   │ │
│ │                                         │ │
│ │ [+ Add Filter]                          │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 🎯 Hasil yang Akan Anda Dapat

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

## 📝 Update Reminder ke Daily Schedule

Setelah test berhasil, update reminder untuk jalan setiap hari:

```javascript
const token = localStorage.getItem('token');
const reminderId = 'YOUR_REMINDER_ID'; // From console output

fetch(`http://localhost:3001/api/reminders/${reminderId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    schedule: '0 8 * * *', // Every day at 8 AM
    is_active: 1
  })
})
.then(r => r.json())
.then(data => console.log('✅ Updated to daily schedule:', data));
```

---

## 🔧 Troubleshooting

### "No groups found"
- Pastikan bot sudah connected
- Refresh halaman dan coba lagi

### "Failed to fetch sheet"
- Pastikan Google Sheet URL benar
- Pastikan sheet setting: "Anyone with the link can view"
- Pastikan sheet name "deadlines" ada

### "Reminder created but no message"
- Cek apakah ada data di sheet yang match filter
- Cek kolom "waktu" format: DD/MM/YYYY atau YYYY-MM-DD
- Cek kolom "done" value: FALSE (uppercase)

### "Template not rendering correctly"
- Pastikan kolom names match: mk, judul, waktu, catatan
- Cek console untuk error messages

---

## 💡 Next Steps

1. ✅ **Test sekarang** dengan script di atas
2. ✅ **Verify** hasil di WhatsApp
3. ✅ **Update** schedule ke daily jika sudah OK
4. ⏳ **Wait** untuk UI update (optional)

---

## 📚 Documentation

Lihat file lengkap untuk detail:
- `SMART_DEADLINE_REMINDER_COMPLETE.md` - Overview lengkap
- `DEADLINE_REMINDER_GUIDE.md` - Use cases & examples
- `SHEETS_API_REFERENCE.md` - API reference

---

**READY TO TEST? Copy script di atas dan paste di Console!** 🚀
