# Fix Double Section Issue

## Problem
AI Assistant tab showing duplicate sections:
1. Old "ALLOWED GROUPS & CONTACTS" section
2. New "AI Configurations" table

## Root Cause
Browser is showing cached version of old `AIAssistantTab.tsx` component.

## Solution

### Step 1: Clear Frontend Cache
```bash
cd frontend
rm -rf .next
rm -rf node_modules/.cache
```

### Step 2: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Hard Refresh Browser
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Or clear browser cache:
- Chrome: DevTools → Network tab → "Disable cache" checkbox
- Then refresh

## Verification

After refresh, you should see ONLY:
- ✅ "AI Configurations" section with table
- ✅ "+ Create Configuration" button
- ✅ Search box
- ✅ Table with columns: Name, Status, Target, Provider, Model, Actions

You should NOT see:
- ❌ "ALLOWED GROUPS & CONTACTS" heading
- ❌ "Add Groups" button
- ❌ Multi-select dropdown
- ❌ Old list-style UI

## Files Status
- ✅ `AIAssistantTab.tsx` - DELETED (old file)
- ✅ `AIConfigTable.tsx` - CREATED (new file)
- ✅ `page.tsx` - UPDATED (using new component)

## If Still Showing Double

1. **Check import in page.tsx:**
   ```typescript
   import AIConfigTable from '@/components/AIConfigTable'  // ✅ Correct
   import AIAssistantTab from '@/components/AIAssistantTab' // ❌ Should not exist
   ```

2. **Check component usage:**
   ```tsx
   {activeTab === 'ai-assistant' && (
       <div>
           <AIConfigTable botId={botId} />  {/* ✅ Only this */}
       </div>
   )}
   ```

3. **Verify file deleted:**
   ```bash
   ls frontend/src/components/AIAssistantTab.tsx
   # Should return: "No such file"
   ```

4. **Nuclear option - Full rebuild:**
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install
   npm run dev
   ```
