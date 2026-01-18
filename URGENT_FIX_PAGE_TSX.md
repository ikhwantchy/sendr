# URGENT FIX - File Corrupted

## Problem
The page.tsx file is now corrupted with syntax errors after failed edits.

## Solution: Git Revert

### Step 1: Check Git Status
```bash
cd "c:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform"
git status
```

### Step 2: Revert page.tsx to Last Working State
```bash
git checkout frontend/src/app/dashboard/bots/[id]/page.tsx
```

### Step 3: Manual Fix (Simple Approach)

After reverting, manually edit the file:

1. Open `frontend/src/app/dashboard/bots/[id]/page.tsx`
2. Find line ~1172 where it says `{activeTab === 'ai-assistant' && (`
3. **DELETE EVERYTHING** from line 1172 to line ~1757 (where it closes with `)}`)
4. **REPLACE** with just this:

```tsx
                {activeTab === 'ai-assistant' && (
                    <div>
                        <AIConfigTable botId={botId} />
                    </div>
                )}
```

5. Save file
6. Refresh browser

## Alternative: Use Search & Replace

1. Open file in VS Code
2. Press `Ctrl+H` (Find & Replace)
3. Enable "Regex" mode (click `.*` button)
4. Find: `{activeTab === 'ai-assistant' &&[\s\S]*?APPLY CONFIGURATION[\s\S]*?</button>[\s\S]*?</div>[\s\S]*?</div>[\s\S]*?</div>[\s\S]*?</div>[\s\S]*?}\)`
5. Replace with:
```
{activeTab === 'ai-assistant' && (
                    <div>
                        <AIConfigTable botId={botId} />
                    </div>
                )}
```
6. Click "Replace"

## Verification

After fix, check:
- No TypeScript errors
- File compiles
- AI Assistant tab shows only the table
- No duplicate sections

## If Git Doesn't Work

If you don't have git or changes aren't committed:

1. **Backup current file** (copy to safe location)
2. **Delete lines 1172-1757** manually
3. **Add the simple component code** shown above
4. Save and test
