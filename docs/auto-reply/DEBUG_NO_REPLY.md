# 🔍 DEBUG AUTO-REPLY - STEP BY STEP

## ❌ **MASALAH: Bot tidak reply "halo"**

Kemungkinan issues:
1. Rules tidak ter-load dari database
2. Actions masih STRING (belum di-parse correctly)
3. Message handler issue
4. WhatsApp adapter sendMessage issue

---

## 🎯 **DEBUGGING STEPS:**

### **STEP 1: Check Rules via API**

**Open browser, go to:**
```
http://localhost:3001/api/rules
```

**Expected response:**
```json
[
  {
    "id": "...",
    "name": "d",
    "keyword": "halo",
    "match_type": "contains",
    "actions": "[{\"type\":\"SEND_TEXT\",\"config\":{\"message\":\"ya halo\"}}]",
    "is_active": 1
  }
]
```

**Check:**
- ✅ Rule exists?
- ✅ `is_active` = 1?
- ✅ `keyword` = "halo"?
- ✅ `actions` is STRING (will be parsed by engine)?

---

### **STEP 2: Check Backend Logs**

**Setelah kirim "halo", check logs untuk:**

**1. Message Received:**
```
info: Incoming message { content: "halo" }
```

**2. Rule Engine Processing:**
```
debug: Rule Engine processing message
debug: Rules loaded from database { count: X }
```

**3. Keyword Matched:**
```
info: Keyword matched { rule_name: "d" }
```

**4. Action Engine:**
```
debug: Action Engine processing keyword match
info: Executing action { action_type: "SEND_TEXT" }
```

**5. Message Sent:**
```
info: Message sent successfully
```

---

### **STEP 3: Manual Test via Code**

**Create test file:**

`test-action-parse.js`:
```javascript
const actionsString = '[{"type":"SEND_TEXT","config":{"message":"ya halo"}}]';

console.log('Actions (string):', actionsString);
console.log('Type:', typeof actionsString);

const actions = JSON.parse(actionsString);
console.log('Actions (parsed):', actions);
console.log('Type:', typeof actions);
console.log('Is Array:', Array.isArray(actions));

console.log('First action:');
console.log('  Type:', actions[0].type);
console.log('  Config:', actions[0].config);
```

**Run:**
```bash
node test-action-parse.js
```

---

## 📊 **NEXT STEPS:**

**1. Share hasil dari:**
   - `http://localhost:3001/api/rules`
   - Backend logs setelah kirim "halo"

**2. Atau run:**
```bash
cd backend
npm run dev
```

**Lalu kirim "halo" dan copy SEMUA logs yang muncul!**

---

**SHARE LOGS & API RESPONSE!** 🔍
