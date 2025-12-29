# ⚠️ CRITICAL: Auto-Reply Components - DO NOT MODIFY

## Status: ✅ WORKING - Last Verified: 2025-12-27

This document lists all critical components for the **Auto-Reply** feature that is currently working.
**DO NOT MODIFY** these files unless explicitly requested by the user.

---

## 🔴 CRITICAL FILES - DO NOT TOUCH

### Backend Core

#### 1. WhatsApp Adapter
**File**: `backend/src/adapters/whatsapp/BaileysAdapter.ts`
- **Critical Functions**:
  - `initialize()` - Bot initialization
  - `handleIncomingMessage()` - Message reception handler
  - `sendMessage()` - Message sending
  - Event listeners for `messages.upsert`
- **Why Critical**: Core message handling and bot connection

#### 2. Keyword Rule Repository
**File**: `backend/src/database/repositories/keywordRuleRepository.ts`
- **Critical Functions**:
  - `findByBotId()` - Fetch rules for a bot
  - `findActiveByBot()` - Get active rules
  - All CRUD operations for keyword rules
- **Why Critical**: Manages auto-reply rules in database

#### 3. Auto-Reply Service/Logic
**File**: `backend/src/services/autoReplyService.ts` (if exists)
- **Critical Functions**:
  - Rule matching logic
  - Keyword detection (equals, contains, regex)
  - Reply execution
- **Why Critical**: Core auto-reply logic

#### 4. Bot Routes
**File**: `backend/src/api/routes/botRoutes.ts`
- **Critical Endpoints**:
  - `POST /api/bots` - Create bot
  - `POST /api/bots/:id/connect` - Connect bot (QR)
  - `POST /api/bots/:id/pause` - Pause bot
  - `POST /api/bots/:id/resume` - Resume bot
  - `GET /api/bots/:id/status` - Check bot status
- **Why Critical**: Bot lifecycle management

#### 5. Rule Routes
**File**: `backend/src/api/routes/ruleRoutes.ts`
- **Critical Endpoints**:
  - `GET /api/rules` - List all rules
  - `GET /api/rules/bot/:botId` - Get rules for specific bot
  - `POST /api/rules` - Create new rule
  - `PUT /api/rules/:id` - Update rule
  - `DELETE /api/rules/:id` - Delete rule
- **Why Critical**: Rule management API

#### 6. Database Connection
**File**: `backend/src/database/connection-sqlite.ts`
- **Critical Functions**:
  - `initDatabase()` - Initialize SQLite
  - `query()` - Execute queries
  - `saveDatabase()` - Persist data
- **Why Critical**: Database operations

#### 7. Database Schema
**File**: `backend/src/database/connection-sqlite.ts` (schema section)
- **Critical Tables**:
  - `bots` - Bot instances
  - `keyword_rules` - Auto-reply rules
  - `users` - User accounts
  - `tenants` - Multi-tenancy
- **Why Critical**: Data structure

---

### Frontend Core

#### 8. Bot Management Page
**File**: `frontend/src/app/dashboard/bots/page.tsx`
- **Critical Features**:
  - Bot list display
  - Create bot modal
  - Connect/Pause/Resume actions
  - QR code display
  - Bot status indicators
- **Why Critical**: User interface for bot management

#### 9. Rules Management Page
**File**: `frontend/src/app/dashboard/rules/page.tsx`
- **Critical Features**:
  - Rules list display
  - Create rule modal
  - Edit/Delete rule actions
  - Keyword and reply input
  - Match type selection (equals, contains, regex)
  - Active/Inactive toggle
- **Why Critical**: User interface for rule management

#### 10. Bot Detail/Connect Page
**File**: `frontend/src/app/dashboard/bots/[id]/connect/page.tsx`
- **Critical Features**:
  - QR code display
  - Connection status polling
  - Auto-refresh QR on expiry
  - Success/Error handling
- **Why Critical**: Bot connection flow

---

## 🟡 IMPORTANT DEPENDENCIES

### NPM Packages (Backend)
- `@whiskeysockets/baileys` - WhatsApp Web API
- `sql.js` - SQLite database
- `qrcode` - QR code generation

### NPM Packages (Frontend)
- `next` - React framework
- Standard React hooks

---

## 🔒 PROTECTED LOGIC FLOWS

### 1. Auto-Reply Flow
```
Incoming Message → BaileysAdapter.handleIncomingMessage()
                 → Fetch active rules from keyword_rules table
                 → Match keyword (equals/contains/regex)
                 → Execute reply action
                 → BaileysAdapter.sendMessage()
```

### 2. Bot Connection Flow
```
User clicks "Connect" → POST /api/bots/:id/connect
                      → BaileysAdapter.initialize()
                      → Generate QR code
                      → Frontend polls status
                      → QR scanned → Bot connected
                      → Save session_data
```

### 3. Rule Creation Flow
```
User creates rule → POST /api/rules
                  → Validate keyword & reply
                  → Insert into keyword_rules table
                  → Rule becomes active
                  → Auto-reply starts working
```

---

## ✅ TESTING CHECKLIST

Before making ANY changes to the codebase, verify these still work:

- [ ] Bot can connect via QR code
- [ ] Bot status shows "connected" after QR scan
- [ ] Can create new auto-reply rule
- [ ] Can edit existing rule
- [ ] Can delete rule
- [ ] Can toggle rule active/inactive
- [ ] Auto-reply responds to exact keyword match
- [ ] Auto-reply responds to contains match
- [ ] Auto-reply responds to regex match (if implemented)
- [ ] Bot can be paused without losing session
- [ ] Bot can be resumed and reconnects automatically
- [ ] Multiple rules work for same bot
- [ ] Rules only trigger for their assigned bot

---

## 🚨 DANGER ZONES

### DO NOT:
1. ❌ Change database schema for `bots` or `keyword_rules` tables
2. ❌ Modify `BaileysAdapter.ts` message handling logic
3. ❌ Change API endpoint paths for bots or rules
4. ❌ Alter session data storage/retrieval mechanism
5. ❌ Modify keyword matching logic (equals, contains, regex)
6. ❌ Change QR code generation/display flow
7. ❌ Alter bot status management (connected, disconnected, etc.)
8. ❌ Modify rule activation/deactivation logic

### SAFE TO DO:
1. ✅ Add NEW tables (campaigns, reminders, etc.)
2. ✅ Add NEW API endpoints (analytics, reports, etc.)
3. ✅ Add NEW frontend pages (analytics, settings, etc.)
4. ✅ Add NEW features that don't touch existing auto-reply code
5. ✅ Improve UI/UX without changing underlying logic
6. ✅ Add logging/monitoring
7. ✅ Add error handling (without changing core logic)

---

## 📝 CHANGE LOG

### 2025-12-27
- ✅ Auto-reply feature confirmed working
- ✅ Dashboard stats endpoint added (separate from auto-reply)
- ✅ Platform Ready section removed from dashboard (UI only)
- ⚠️ **No changes made to auto-reply core components**

---

## 🆘 IF SOMETHING BREAKS

If auto-reply stops working after a change:

1. **Check backend logs** for errors in message handling
2. **Verify bot status** is "connected" in database
3. **Check keyword_rules table** has active rules
4. **Test QR connection** flow from scratch
5. **Verify session_data** is being saved/loaded correctly
6. **Check BaileysAdapter** event listeners are still registered
7. **Revert last changes** to critical files listed above

---

## 📞 CONTACT

If you need to modify any critical component, **ALWAYS**:
1. Ask user for explicit permission
2. Explain what will be changed and why
3. Create backup of current working state
4. Test thoroughly after changes
5. Document what was changed

---

**REMEMBER**: Auto-reply is the core feature. Everything else is secondary.
**PRIORITY**: Keep auto-reply working at all costs.
