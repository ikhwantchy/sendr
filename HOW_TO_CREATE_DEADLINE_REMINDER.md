# Cara Membuat Deadline Reminder - Step by Step

## Opsi 1: Via Dashboard (Recommended - tapi perlu update UI)

**Status:** UI belum support advanced filters yang baru. Perlu update frontend dulu.

---

## Opsi 2: Via API (Untuk Testing Sekarang)

### Step 1: Login & Get Token

**Request:**
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Copy the token!**

---

### Step 2: Get Your Groups

**Request:**
```bash
GET http://localhost:3001/api/bots/cdff9c0d-fa62-4392-acc6-cdc52db5eb39/groups
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "jid": "120363xxxxx@g.us",
      "name": "Group Name",
      ...
    }
  ]
}
```

**Copy the group JID!**

---

### Step 3: Create Deadline Reminder

**Request:**
```bash
POST http://localhost:3001/api/reminders
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Deadline H-3 Reminder",
  "bot_id": "cdff9c0d-fa62-4392-acc6-cdc52db5eb39",
  "target_id": "YOUR_GROUP_JID@g.us",
  "target_type": "group",
  "schedule": "now",
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

**Note:** `schedule: "now"` akan langsung kirim. Ubah ke `"0 8 * * *"` untuk daily jam 8 pagi.

---

### Step 4: Test Immediately

Karena schedule = "now", reminder akan langsung execute dan kirim ke group!

Cek WhatsApp group Anda, seharusnya ada message seperti:

```
📋 DAILY DIGEST (17/01/2026)

📅 Deadline ≤ 3 Hari

1. Interaksi Manusia dan Komputer — Presentasi
🟡 BESOK - Sabtu, 18 Januari 2026
Kelompok 7 - Materi 9

2. MPPL — Presentasi
🟠 2 hari lagi - Minggu, 19 Januari 2026
Kelompok 6
```

---

## Opsi 3: Via Postman (Easiest!)

1. **Download Postman** (jika belum punya)

2. **Import Collection:**
   - Buat collection baru "Sendr API"
   - Tambahkan 3 requests di atas

3. **Set Environment Variables:**
   ```
   base_url: http://localhost:3001/api
   token: (akan diisi setelah login)
   bot_id: cdff9c0d-fa62-4392-acc6-cdc52db5eb39
   group_jid: (akan diisi setelah get groups)
   ```

4. **Run Requests:**
   - Login → Copy token
   - Get Groups → Copy group JID
   - Create Reminder → Done!

---

## Opsi 4: Via Browser Console (Quick & Dirty)

1. **Buka browser** → Login ke dashboard
2. **Buka DevTools** (F12)
3. **Paste di Console:**

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Create reminder
fetch('http://localhost:3001/api/reminders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Deadline H-3 Reminder',
    bot_id: 'cdff9c0d-fa62-4392-acc6-cdc52db5eb39',
    target_id: 'YOUR_GROUP_JID@g.us',  // ⚠️ UPDATE THIS
    target_type: 'group',
    schedule: 'now',
    timezone: 'Asia/Jakarta',
    is_active: 1,
    template_config: {
      googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/1fZsxDxGQ2Sm1KUGkeKmgc-kyNUcP5XBTi-q8S_G3nQ/edit',
      sheetName: 'deadlines',
      isDigestMode: true,
      filters: [
        { column: 'waktu', operator: 'date_within_days', value: 3 },
        { column: 'done', operator: 'equals', value: 'FALSE', caseInsensitive: true }
      ],
      sort: { column: 'waktu', order: 'asc' },
      body: `📋 *DAILY DIGEST ({{@today}})*

📅 *Deadline ≤ 3 Hari*

{{#if @length > 0}}{{#each items}}{{@index}}. *{{mk}}* — {{judul}}
{{waktu | urgency}}
{{catatan}}

{{/each}}{{/if}}{{#if @length == 0}}✅ Tidak ada deadline mendesak!{{/if}}`
    }
  })
})
.then(r => r.json())
.then(data => console.log('✅ Created:', data))
.catch(err => console.error('❌ Error:', err));
```

---

## 🎯 Recommendation

**Untuk sekarang (testing):** Pakai **Opsi 4 (Browser Console)** - paling cepat!

**Untuk production:** Saya perlu **update frontend UI** untuk support advanced filters.

---

## 📝 Next Steps

Setelah test berhasil:

1. ✅ Ubah `schedule` dari `"now"` ke `"0 8 * * *"` (daily jam 8 pagi)
2. ✅ Monitor reminder logs di database
3. ✅ Adjust filters sesuai kebutuhan
4. ✅ Buat reminder tambahan untuk H-7, H-1, dll

Mau saya update frontend UI sekarang atau test dulu via browser console?
