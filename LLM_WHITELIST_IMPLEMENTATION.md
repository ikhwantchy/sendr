# LLM Whitelist System - Implementation Complete

## 📋 Overview
Implemented a whitelist-based system to control which groups/contacts can trigger AI (LLM) responses. This prevents bot loops (like IM3 auto-reply) and controls LLM costs.

## ✅ What Was Implemented

### 1. Database Layer
**File:** `backend/src/database/migrations/009_create_llm_allowed_targets.sql`
- Created `llm_allowed_targets` table
- Fields: `bot_id`, `target_type` (group/contact), `target_jid`, `target_name`
- Indexes for performance
- Unique constraint on `(bot_id, target_jid)`

### 2. Backend API
**File:** `backend/src/api/routes/llmTargetsRoutes.ts`
- `GET /api/bots/:botId/llm-targets` - List allowed targets
- `POST /api/bots/:botId/llm-targets` - Add single target
- `DELETE /api/bots/:botId/llm-targets/:targetId` - Remove target
- `POST /api/bots/:botId/llm-targets/bulk` - Bulk add targets
- All routes protected with authentication
- Bot ownership verification

### 3. AI Engine Integration
**File:** `backend/src/core/engine/aiEngine.ts`
- Added `isTargetAllowed()` method to check whitelist
- Integrated check in `handleNoMatch()` before AI responds
- Logs whitelist checks for debugging
- Fail-safe: if error, deny access (prevents accidental loops)

**Logic Flow:**
```
Message Received
  ↓
No Rule Match
  ↓
AI Engine: handleNoMatch()
  ↓
Check: AI Enabled? ✓
  ↓
Check: Sender in Whitelist? ← NEW!
  ↓
  YES → Continue to AI Response
  NO  → Skip (Silent)
```

### 4. Frontend API Client
**File:** `frontend/src/lib/api.ts`
- Added `api.bots.llmTargets.*` methods
- Type-safe interfaces
- Integrated with existing API client

### 5. Frontend UI
**File:** `frontend/src/app/dashboard/bots/[id]/page.tsx`

**New Section: "Allowed Groups & Contacts"**
- Location: AI Assistant tab, after "AI Personality"
- Features:
  - Multi-select dropdown for groups
  - "Add" button with loading state
  - List of currently allowed targets
  - Remove button (hover to show)
  - Empty state message
  - Count indicator

**States Added:**
- `allowedTargets` - Current whitelist
- `selectedGroups` - Groups to add
- `isLoadingTargets` - Loading state

**Queries Added:**
- Fetch allowed targets
- Fetch available groups
- Auto-refresh on tab switch

**Handlers Added:**
- `handleAddTargets()` - Bulk add groups
- `handleRemoveTarget()` - Remove single target
- Toast notifications for feedback

## 🎯 How It Works

### User Flow:
1. Navigate to Bot Detail → AI Assistant tab
2. Scroll to "Allowed Groups & Contacts" section
3. Select groups from dropdown (Ctrl/Cmd for multiple)
4. Click "Add" button
5. Groups appear in "Currently Allowed" list
6. Hover over target to show remove button

### Backend Flow:
1. Message arrives at bot
2. No auto-reply rule matches
3. AI Engine checks:
   - Is AI enabled? ✓
   - Is sender in whitelist? ← **NEW CHECK**
4. If YES: AI generates response
5. If NO: Silent (no response)

## 🛡️ Benefits

### 1. Prevents Bot Loops
- IM3 auto-reply won't trigger LLM
- Other bots won't create infinite loops
- Only whitelisted targets get AI responses

### 2. Cost Control
- LLM only runs for specific groups/contacts
- No accidental API usage
- Predictable billing

### 3. Selective AI
- Enable AI for customer support group
- Disable for internal team chat
- Fine-grained control

### 4. Easy Management
- Visual UI for adding/removing
- No code changes needed
- Real-time updates

## 🧪 Testing Guide

### Step 1: Run Migration
```bash
cd backend
npm run migrate
```

### Step 2: Start Services
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Step 3: Test UI
1. Login to dashboard
2. Go to any bot → AI Assistant tab
3. Verify "Allowed Groups & Contacts" section appears
4. Try adding a group
5. Verify it appears in the list
6. Try removing a group

### Step 4: Test Whitelist Logic
1. Add a specific group to whitelist
2. Send message from that group (no rule match)
3. Verify AI responds
4. Send message from NON-whitelisted group
5. Verify AI does NOT respond (silent)

### Step 5: Test Bot Loop Prevention
1. Do NOT add IM3 number to whitelist
2. Send message to IM3 auto-reply
3. IM3 replies with auto-message
4. Verify bot does NOT respond to IM3
5. No infinite loop! ✅

## 📊 Database Schema

```sql
CREATE TABLE llm_allowed_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id INTEGER NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('group', 'contact')),
    target_jid TEXT NOT NULL,
    target_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    UNIQUE(bot_id, target_jid)
);
```

## 🔍 Debugging

### Check Logs
```bash
# Backend logs will show:
# - "LLM whitelist check" - Every check
# - "AI fallback skipped: sender not in whitelist" - When blocked
# - "AI generating response..." - When allowed
```

### Check Database
```sql
-- View all allowed targets for a bot
SELECT * FROM llm_allowed_targets WHERE bot_id = 1;

-- Count allowed targets
SELECT COUNT(*) FROM llm_allowed_targets WHERE bot_id = 1;
```

### Check API
```bash
# List allowed targets
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/bots/1/llm-targets

# Add target
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_type":"group","target_jid":"123@g.us","target_name":"Test Group"}' \
  http://localhost:3001/api/bots/1/llm-targets
```

## 🚀 Next Steps (Optional)

1. **Add Contact Support** - Currently only groups, can add individual contacts
2. **Bulk Import** - CSV upload for many targets
3. **Auto-Discovery** - Suggest groups based on activity
4. **Analytics** - Track which groups use AI most
5. **Rate Limiting** - Additional layer per target

## 📝 Notes

- **Default Behavior:** If no targets are whitelisted, AI won't respond to anyone (except DMs if configured)
- **Fail-Safe:** If database error, deny access (prevents loops)
- **Logging:** All whitelist checks are logged for debugging
- **Performance:** Indexed queries for fast lookups

## ✅ Checklist

- [x] Database migration created
- [x] Backend API routes implemented
- [x] AI Engine integration complete
- [x] Frontend API client updated
- [x] Frontend UI component added
- [x] State management implemented
- [x] Handlers and queries added
- [x] Whitelist check in message flow
- [x] Logging for debugging
- [x] Documentation complete

## 🎉 Result

**Before:** Bot responds to everyone → IM3 auto-reply creates infinite loop
**After:** Bot only responds to whitelisted groups → No loops, controlled costs!
