# ✅ AUTO-REPLY FEATURE - WORKING VERSION
**Status:** FULLY FUNCTIONAL ✅  
**Date:** 2025-12-27  
**Version:** STABLE - DO NOT MODIFY WITHOUT TESTING

---

## 🎯 CRITICAL FILES - DO NOT BREAK!

### Backend Files (CRITICAL):

1. **`backend/src/database/repositories/keywordRuleRepository.ts`**
   - ✅ Has `parseRule()` method that parses JSON fields from database
   - ✅ Converts `actions` and `metadata` from JSON string to objects
   - **DO NOT REMOVE** the `parseRule()` method or its usage in `findById()`, `findByBot()`, `findByTenant()`

2. **`backend/src/adapters/whatsapp/whatsappAdapter.baileys.ts`**
   - ✅ Auto-initializes bot sessions on startup
   - ✅ Stores socket in Map for message sending
   - ✅ Handles incoming messages and triggers rule engine
   - **DO NOT MODIFY** socket storage logic (line 87: `this.sockets.set(botId, sock)`)

3. **`backend/src/index.ts`**
   - ✅ Auto-reconnects all connected bots on startup (lines 116-138)
   - **DO NOT REMOVE** the bot auto-initialization code block

4. **`backend/src/core/engine/ruleEngine.ts`**
   - ✅ Matches keywords and triggers actions
   - **DO NOT MODIFY** keyword matching logic

5. **`backend/src/core/engine/actionEngine.ts`**
   - ✅ Executes SEND_TEXT actions
   - **DO NOT MODIFY** action execution logic

### Frontend Files (CRITICAL):

1. **`frontend/src/components/modals/CreateRuleModal.tsx`**
   - ✅ Sends `actions` and `metadata` as objects (NOT JSON strings)
   - **DO NOT** add `JSON.stringify()` to actions or metadata (lines 35-42)
   - Backend repository handles stringification

2. **`frontend/src/components/tables/RulesTable.tsx`**
   - ✅ Parses rules data and displays trigger/reply correctly
   - ✅ Maps `rule.keyword` to `trigger` for display
   - ✅ Extracts reply message from `actions` array
   - **DO NOT MODIFY** the data transformation logic (lines 26-76)

---

## 🔧 HOW IT WORKS

### Data Flow:
```
1. User creates rule in frontend
   ↓
2. Frontend sends: { keyword: "halo", actions: [{type: "SEND_TEXT", config: {message: "ya, halo!"}}] }
   ↓
3. Backend repository stringifies to JSON and saves to database
   ↓
4. When fetching, backend parseRule() converts JSON strings back to objects
   ↓
5. Frontend receives clean objects and displays trigger/reply
   ↓
6. When message received, ruleEngine matches keyword
   ↓
7. actionEngine executes SEND_TEXT action via whatsappAdapter
```

### Key Points:
- ✅ **Backend handles JSON stringify/parse** - frontend sends plain objects
- ✅ **Bot auto-reconnects** on server restart via `findConnected()` + `initializeBot()`
- ✅ **Socket stored in Map** immediately after creation (line 87 in adapter)
- ✅ **Fresh data fetching** with `staleTime: 0` and `gcTime: 0`

---

## 🧪 TESTING CHECKLIST

Before deploying ANY changes, verify:

- [ ] Create new rule with keyword "test" → saves successfully
- [ ] Rule displays in dashboard with correct trigger and reply
- [ ] Send WhatsApp message with keyword → bot auto-replies
- [ ] Restart backend → bot auto-reconnects
- [ ] Send message again → auto-reply still works
- [ ] Toggle rule active/inactive → works correctly
- [ ] Delete rule → removes successfully

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ DO NOT:
1. Add `JSON.stringify()` to actions/metadata in CreateRuleModal
2. Remove `parseRule()` method from keywordRuleRepository
3. Remove bot auto-initialization from index.ts
4. Modify socket storage logic in whatsappAdapter
5. Change the `trigger: rule.keyword` mapping in RulesTable
6. Remove `staleTime: 0` from RulesTable query (causes stale data)

### ✅ SAFE TO MODIFY:
1. UI styling/layout (as long as data binding stays the same)
2. Add new fields to rules (but don't break existing fields)
3. Add new action types (but keep SEND_TEXT working)
4. Add validation/error handling
5. Improve logging

---

## 📝 CURRENT WORKING STATE

### Database Schema:
```sql
CREATE TABLE keyword_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    keyword TEXT NOT NULL,           -- ✅ This maps to "trigger" in frontend
    match_type TEXT DEFAULT 'contains',
    scope TEXT DEFAULT 'global',
    scope_target TEXT,
    priority INTEGER DEFAULT 0,
    actions TEXT NOT NULL,            -- ✅ JSON string, parsed by parseRule()
    metadata TEXT DEFAULT '{}',       -- ✅ JSON string, parsed by parseRule()
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Rule Data:
```json
{
  "id": "9eb3f860-c5e1-4476-8f4d-610e3d9dc15a",
  "keyword": "halo",
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "ya, halo!",
        "variables": {}
      }
    }
  ],
  "is_active": 1
}
```

---

## 🚀 VERIFIED WORKING FEATURES

✅ Keyword matching (exact, contains)  
✅ Auto-reply with custom message  
✅ Multiple rules support  
✅ Toggle active/inactive  
✅ Display trigger and reply in dashboard  
✅ Bot auto-reconnect on server restart  
✅ Multi-tenant support (different phone numbers)  
✅ Group and private chat support  

---

## 📞 SUPPORT

If auto-reply breaks after changes:
1. Check if `parseRule()` is still being called
2. Verify `actions` is sent as object (not string) from frontend
3. Check if socket is stored in Map (`this.sockets.set()`)
4. Verify bot auto-initialization runs on startup
5. Check backend logs for "Bot re-initialized" message

**Last Verified Working:** 2025-12-27 10:08 WIB  
**Tested By:** Ikhwan  
**Status:** ✅ PRODUCTION READY
