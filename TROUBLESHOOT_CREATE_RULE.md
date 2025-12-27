# 🔧 TROUBLESHOOTING: CREATE RULE GAGAL

## ❌ MASALAH:
"Failed to create rule" - Rule tidak bisa dibuat

## 🔍 DEBUGGING STEPS:

### **1. Check Browser Console (F12)**
Buka Developer Tools dan lihat:

#### **Console Tab:**
```
Cari error message merah
Lihat detail error dari backend
```

#### **Network Tab:**
```
1. Refresh page
2. Buka Create Rule modal
3. Isi form
4. Click "Create Rule"
5. Lihat request ke /api/rules
6. Click request tersebut
7. Lihat tab "Response" untuk error detail
```

---

## 🧪 TEST MANUAL:

### **Test dengan cURL:**
```bash
curl -X POST http://localhost:3001/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "MASUKKAN_BOT_ID_DISINI",
    "trigger": "halo",
    "reply": "Ya, halo!",
    "match_type": "contains",
    "is_active": true
  }'
```

Ganti `MASUKKAN_BOT_ID_DISINI` dengan bot ID yang sebenarnya.

---

## 🔎 KEMUNGKINAN PENYEBAB:

### **1. Backend Endpoint Tidak Ada**
**Check:** Apakah ada route `POST /api/rules` di backend?

**File:** `backend/src/routes/ruleRoutes.js` atau similar

**Solusi:** Pastikan endpoint exists dan berfungsi

---

### **2. Field Name Mismatch**
**Frontend mengirim:**
```json
{
  "bot_id": "123",
  "trigger": "halo",
  "reply": "Ya, halo!",
  "match_type": "contains",
  "is_active": true
}
```

**Backend expect:**
```json
{
  "bot_id": "123",
  "keyword": "halo",  ← BEDA!
  "response": "Ya, halo!",  ← BEDA!
  "match_type": "contains",
  "is_active": true
}
```

**Solusi:** Sesuaikan field names

---

### **3. Validation Error**
Backend mungkin require field tambahan:
- `user_id`
- `platform_id`
- dll

**Check:** Lihat error response di Network tab

---

### **4. Database Issue**
- Table `rules` tidak ada
- Column tidak sesuai
- Foreign key constraint

**Check:** Lihat backend logs

---

### **5. Authentication Issue**
- Token tidak valid
- User tidak authorized

**Check:** Lihat response status code (401/403)

---

## 🛠️ SOLUSI CEPAT:

### **Opsi 1: Check Backend Logs**
```bash
# Di terminal backend
npm run dev

# Lihat error saat create rule
```

### **Opsi 2: Test Endpoint Langsung**
Gunakan Postman atau cURL untuk test endpoint

### **Opsi 3: Check Database**
```sql
-- Check table structure
DESCRIBE rules;

-- Check if table exists
SHOW TABLES LIKE 'rules';
```

---

## 📋 CHECKLIST:

- [ ] Backend server running?
- [ ] Database connected?
- [ ] Table `rules` exists?
- [ ] Route `POST /api/rules` exists?
- [ ] Field names match?
- [ ] Validation rules met?
- [ ] Authentication working?
- [ ] CORS configured?

---

## 🔧 QUICK FIX:

### **Jika Backend Expect Field Berbeda:**

Update `CreateRuleModal.tsx`:
```typescript
const createMutation = useMutation({
    mutationFn: async (data: any) => {
        // Map frontend fields to backend fields
        const backendData = {
            bot_id: botId,
            keyword: data.trigger,      // ← Map trigger to keyword
            response: data.reply,        // ← Map reply to response
            match_type: data.match_type,
            is_active: data.is_active
        }
        return await api.rules.create(backendData)
    },
    // ...
})
```

---

## 📞 NEXT STEPS:

1. **Buka Browser Console (F12)**
2. **Lihat Network tab**
3. **Try create rule lagi**
4. **Screenshot error response**
5. **Share screenshot untuk debugging**

---

## 🎯 EXPECTED BACKEND RESPONSE:

### **Success (201):**
```json
{
  "success": true,
  "message": "Rule created successfully",
  "data": {
    "id": "rule_123",
    "bot_id": "bot_456",
    "trigger": "halo",
    "reply": "Ya, halo!",
    "match_type": "contains",
    "is_active": true,
    "created_at": "2025-12-24T13:00:00Z"
  }
}
```

### **Error (400/500):**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Field 'trigger' is required",
  "details": { ... }
}
```

---

## 🚨 URGENT:

**PERLU LIHAT:**
1. Browser Console error
2. Network tab response
3. Backend logs

**Tanpa info ini, sulit debug!**

---

**BUKA F12 → NETWORK TAB → TRY CREATE RULE → SCREENSHOT ERROR!** 📸
