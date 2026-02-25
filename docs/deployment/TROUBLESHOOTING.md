# 🔧 TROUBLESHOOTING - Advanced Filters UI

## ❌ Issue: UI Tidak Muncul

Jika setelah update code, UI Advanced Filters belum muncul di dashboard:

### ✅ Solution 1: Hard Refresh Browser

**Windows/Linux:**
```
Ctrl + Shift + R
```

**Mac:**
```
Cmd + Shift + R
```

Atau:
1. Buka DevTools (F12)
2. Right-click pada refresh button
3. Pilih "Empty Cache and Hard Reload"

---

### ✅ Solution 2: Restart Dev Server

1. **Stop frontend** (Ctrl + C di terminal)
2. **Clear cache:**
   ```bash
   cd frontend
   rm -rf .next
   ```
3. **Start ulang:**
   ```bash
   npm run dev
   ```

---

### ✅ Solution 3: Check Console for Errors

1. Buka DevTools (F12)
2. Klik tab "Console"
3. Lihat apakah ada error merah
4. Screenshot error dan share

**Common Errors:**

**Error: "Cannot find module './AdvancedFilters'"**
- Solution: Pastikan file `AdvancedFilters.tsx` ada di `frontend/src/components/`

**Error: "useAdvancedFilters is not defined"**
- Solution: Pastikan FormData interface sudah diupdate

**Error: "filters.map is not a function"**
- Solution: Pastikan initial state `filters: []` (array, bukan null)

---

## ❌ Issue: "Internal server error while fetching tabs"

Error ini muncul saat Check Connection ke Google Sheets.

### Possible Causes:

1. **Google Sheets URL salah**
2. **Sheet tidak public**
3. **API Key tidak valid**
4. **Backend error**

### ✅ Solutions:

#### 1. Pastikan Sheet Public
1. Buka Google Sheet
2. Click "Share" button
3. Change to "Anyone with the link can view"
4. Copy link

#### 2. Check API Key
File: `backend/.env`
```bash
GOOGLE_SHEETS_API_KEY=AIzaSyAhelMgtQjyIw-5oBdiidr4p9u8S7spLzg
```

Pastikan API key valid dan tidak expired.

#### 3. Check Backend Logs
```bash
cd backend
# Lihat logs untuk error details
```

#### 4. Test API Directly
```bash
curl "http://localhost:3001/api/sheets/test-filter" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "YOUR_SHEET_URL",
    "sheetName": "deadlines",
    "filters": []
  }'
```

---

## ✅ Verification Checklist

Setelah fix, verify:

- [ ] Toggle "Advanced Filters" muncul
- [ ] Toggle bisa di-click (ON/OFF)
- [ ] Saat ON: Preset buttons muncul
- [ ] Saat ON: "+ Add Filter" button muncul
- [ ] Saat OFF: Trigger Column/Value muncul
- [ ] Click preset "H-3 Deadline" → Filters auto-fill
- [ ] Can add/remove filters manually

---

## 🎯 Expected UI

**Toggle OFF (Legacy Mode):**
```
┌─────────────────────────────────┐
│ Advanced Filters                │
│ [OFF] ━━━━━━━━━━━━━━━━━━━━ [ON] │
│                                 │
│ Trigger Column: [Status]        │
│ Trigger Value:  [SEND]          │
└─────────────────────────────────┘
```

**Toggle ON (Advanced Mode):**
```
┌─────────────────────────────────┐
│ Advanced Filters                │
│ [OFF] ━━━━━━━━━━━━━━━━━━━━ [ON] │
│                                 │
│ Quick Presets:                  │
│ [H-3 Deadline] [Today] [Active] │
│                                 │
│ Filter 1:                       │
│ [waktu ▼] [date_within_days ▼]  │
│ [3]  [×]                        │
│                                 │
│ [+ Add Filter]                  │
│                                 │
│ Sort Results:                   │
│ [waktu] [Ascending ▼]           │
└─────────────────────────────────┘
```

---

## 🐛 Still Not Working?

1. **Check file exists:**
   ```bash
   ls frontend/src/components/AdvancedFilters.tsx
   ```

2. **Check import:**
   ```bash
   grep "import AdvancedFilters" frontend/src/components/CreateReminderWizard.tsx
   ```

3. **Check compile errors:**
   - Look at terminal running `npm run dev`
   - Any TypeScript errors?

4. **Try clean build:**
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

---

## 📞 Need Help?

Share screenshot of:
1. Browser console (F12 → Console tab)
2. Terminal running `npm run dev`
3. The UI you're seeing

This will help diagnose the issue!
