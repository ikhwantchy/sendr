# ✅ AUTO-REPLY RULES - FIXED!

## 🎯 MASALAH YANG SUDAH DIPERBAIKI:

### 1. ❌ Action Type Undefined
**Masalah:** Backend expect `SEND_TEXT` tapi frontend kirim `reply`

**Solusi:** Update action format:
```typescript
// ❌ SALAH (old)
{
  type: 'reply',
  content: 'message'
}

// ✅ BENAR (new)
{
  type: 'SEND_TEXT',
  config: {
    message: 'message',
    variables: {}
  }
}
```

### 2. ❌ Rules Tidak Muncul di List
**Kemungkinan:** API tidak return data atau frontend tidak parse dengan benar

---

## 🧪 TEST STEPS:

### **1. Delete Old Rules (Format Salah)**
Rules lama masih pakai format salah, harus dihapus manual dari database:

```sql
-- Connect to database
-- backend/data/database.sqlite

-- Check existing rules
SELECT id, name, keyword, actions FROM keyword_rules;

-- Delete all rules (start fresh)
DELETE FROM keyword_rules;
```

### **2. Create New Rule**
1. Refresh browser (Ctrl + F5)
2. Click "+ Create Rule"
3. Fill form:
   - Keyword: `halo`
   - Reply: `Ya, halo! Ada yang bisa saya bantu?`
4. Click "Create Rule"
5. ✅ Should see success toast

### **3. Verify in Database**
```sql
SELECT * FROM keyword_rules;
```

Should see:
```
actions: [{"type":"SEND_TEXT","config":{"message":"...","variables":{}}}]
```

### **4. Test Auto-Reply**
1. Send WhatsApp message: "halo"
2. ✅ Bot should reply: "Ya, halo! Ada yang bisa saya bantu?"

---

## 📊 BACKEND ACTION TYPES:

Backend ActionEngine supports:
- ✅ `SEND_TEXT` - Send text message
- ✅ `SEND_IMAGE` - Send image with caption
- ✅ `FETCH_SPREADSHEET` - Fetch data from spreadsheet
- ✅ `COMPOSE_MESSAGE` - Compose message from template
- ✅ `TRIGGER_REMINDER` - Schedule reminder

For auto-reply, use `SEND_TEXT`!

---

## 🔧 IF RULES STILL NOT SHOWING:

### **Check API Response:**
```javascript
// In browser console (F12)
fetch('http://localhost:3001/api/rules/bot/YOUR_BOT_ID')
  .then(r => r.json())
  .then(console.log)
```

### **Check Frontend Code:**
File: `frontend/src/app/dashboard/bots/[id]/page.tsx`

Look for:
```typescript
const { data: rules } = useQuery({
  queryKey: ['rules', botId],
  queryFn: () => api.rules.getByBot(botId)
})
```

Make sure it's parsing response correctly!

---

## ✅ VERIFICATION CHECKLIST:

- [ ] Old rules deleted
- [ ] New rule created with correct format
- [ ] Rule shows in database with `SEND_TEXT` type
- [ ] Rule shows in frontend list
- [ ] WhatsApp auto-reply works
- [ ] No errors in backend logs

---

## 🎊 SUCCESS CRITERIA:

1. ✅ Create rule - no errors
2. ✅ Rule appears in list
3. ✅ Send keyword in WhatsApp
4. ✅ Bot replies automatically
5. ✅ No errors in backend logs

---

**NOW TEST IT!** 🚀

Delete old rules, create new one, test in WhatsApp!
