# 🎯 INTEGRATION GUIDE: Advanced Filters ke Dashboard UI

## ✅ Status
- ✅ Backend: 100% Complete & Ready
- ✅ Frontend Component: Created (`AdvancedFilters.tsx`)
- ✅ FormData Interface: Updated
- ⏳ UI Integration: Manual steps below

---

## 📦 Yang Sudah Dibuat

1. **`AdvancedFilters.tsx`** - Reusable filter builder component
2. **FormData Interface** - Updated dengan fields baru:
   - `useAdvancedFilters: boolean`
   - `filters: FilterCondition[]`
   - `sort: { column, order } | null`

---

## 🔧 Cara Integrate ke CreateReminderWizard.tsx

### Step 1: Import sudah ditambahkan ✅
```typescript
import AdvancedFilters from './AdvancedFilters'
```

### Step 2: FormData interface sudah diupdate ✅
```typescript
interface FormData {
    // ... existing fields
    useAdvancedFilters: boolean
    filters: Array<{
        column: string
        operator: string
        value: any
        value2?: any
        caseInsensitive?: boolean
    }>
    sort: {
        column: string
        order: 'asc' | 'desc'
    } | null
    // ... rest
}
```

### Step 3: Initial state sudah diupdate ✅
```typescript
const [formData, setFormData] = useState<FormData>({
    // ... existing
    useAdvancedFilters: false,
    filters: [],
    sort: null,
    // ... rest
})
```

### Step 4: Replace Trigger Inputs Section (Manual)

**Lokasi:** Line ~1137-1163 di `CreateReminderWizard.tsx`

**Cari bagian ini:**
```typescript
{/* 5. Trigger Inputs */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
    <div className="space-y-2">
        <label>Trigger Column Header</label>
        <input ... />
    </div>
    <div className="space-y-2">
        <label>Trigger Value</label>
        <input ... />
    </div>
</div>
```

**Replace dengan:**
```typescript
{/* 5. Filter Mode Toggle */}
<div className="pt-2 space-y-4">
    {/* Toggle Switch */}
    <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div>
            <div className="font-medium text-white text-sm">Advanced Filters</div>
            <div className="text-xs text-zinc-500">Use multiple filters with operators (H-3, date ranges, etc.)</div>
        </div>
        <button
            type="button"
            onClick={() => setFormData({ ...formData, useAdvancedFilters: !formData.useAdvancedFilters })}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${formData.useAdvancedFilters ? 'bg-emerald-600' : 'bg-zinc-700'}`}
        >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.useAdvancedFilters ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>

    {formData.useAdvancedFilters ? (
        /* Advanced Mode */
        <div className="animate-in fade-in slide-in-from-top-2">
            <AdvancedFilters
                filters={formData.filters}
                onChange={(filters) => setFormData({ ...formData, filters })}
                availableColumns={formData.csvPreview.length > 0 ? formData.csvPreview[0].split(',').map(c => c.trim()) : []}
            />
            
            {/* Sorting */}
            <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Sort Results (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="text"
                        value={formData.sort?.column || ''}
                        onChange={e => setFormData({ 
                            ...formData, 
                            sort: e.target.value ? { column: e.target.value, order: formData.sort?.order || 'asc' } : null 
                        })}
                        placeholder="Column name (e.g. waktu)"
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                    />
                    <select
                        value={formData.sort?.order || 'asc'}
                        onChange={e => setFormData({ 
                            ...formData, 
                            sort: formData.sort ? { ...formData.sort, order: e.target.value as 'asc' | 'desc' } : null 
                        })}
                        className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                        disabled={!formData.sort?.column}
                    >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                    </select>
                </div>
            </div>
        </div>
    ) : (
        /* Legacy Mode - Keep existing trigger column/value inputs */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Column Header</label>
                <div className="relative">
                    <input
                        type="text"
                        value={formData.triggerColumn}
                        onChange={e => setFormData({ ...formData, triggerColumn: e.target.value })}
                        placeholder="Status"
                        className="w-full pl-4 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                    />
                </div>
                <p className="text-[10px] text-zinc-500">Column to check (e.g. "Status")</p>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Value</label>
                <input
                    type="text"
                    value={formData.triggerValue}
                    onChange={e => setFormData({ ...formData, triggerValue: e.target.value })}
                    placeholder="SEND"
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-400 placeholder-zinc-700 font-bold focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
                <p className="text-[10px] text-zinc-500">Value to match (e.g. "SEND")</p>
            </div>
        </div>
    )}
</div>
```

### Step 5: Update Submit Handler (Manual)

**Lokasi:** Cari bagian `mutationFn` di CreateReminderWizard.tsx (~line 367-456)

**Tambahkan di template_config:**
```typescript
template_config: {
    googleSheetsUrl: formData.contactSheetUrl,
    sheetName: formData.sheetName,
    isDigestMode: formData.isDigestMode,
    
    // Legacy support
    ...(formData.useAdvancedFilters ? {} : {
        triggerColumn: formData.triggerColumn,
        triggerValue: formData.triggerValue,
    }),
    
    // NEW: Advanced filters
    ...(formData.useAdvancedFilters && formData.filters.length > 0 ? {
        filters: formData.filters,
        sort: formData.sort,
    } : {}),
    
    body: formData.message,
    image_url: imageUrl || undefined,
}
```

---

## 🎯 Hasil Akhir

Setelah integration, UI akan terlihat seperti ini:

```
┌─────────────────────────────────────────────┐
│ Google Sheets Monitor                       │
│                                             │
│ [URL Input]  [Tab Dropdown]  [Check]       │
│                                             │
│ ┌─ Advanced Filters ──────────────────┐    │
│ │ Toggle: [OFF] Legacy  [ON] Advanced │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ === ADVANCED MODE (when ON) ===            │
│ Quick Presets:                              │
│ [H-3 Deadline] [Today Only] [Active]       │
│                                             │
│ Filter 1:                                   │
│ [waktu ▼] [date_within_days ▼] [3]  [×]   │
│                                             │
│ Filter 2:                                   │
│ [done ▼] [equals ▼] [FALSE] [Aa] [×]      │
│                                             │
│ [+ Add Filter]                              │
│                                             │
│ Sort Results:                               │
│ [waktu] [Ascending ▼]                      │
│                                             │
│ === LEGACY MODE (when OFF) ===             │
│ Trigger Column: [Status]                    │
│ Trigger Value:  [SEND]                      │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing

1. **Toggle OFF (Legacy Mode)**:
   - Isi Trigger Column: `done`
   - Isi Trigger Value: `FALSE`
   - Create reminder → Works like before

2. **Toggle ON (Advanced Mode)**:
   - Click "H-3 Deadline" preset
   - Filters auto-filled:
     - Filter 1: `waktu` `date_within_days` `3`
     - Filter 2: `done` `equals` `FALSE`
   - Add sort: `waktu` `asc`
   - Create reminder → Uses new system!

---

## 💡 Benefits

1. **Backward Compatible**: Legacy mode tetap ada
2. **User Friendly**: Preset buttons untuk quick setup
3. **Powerful**: Multiple filters dengan berbagai operators
4. **Visual**: Clear UI untuk build complex filters
5. **Flexible**: Easy to add/remove filters

---

## 📝 Notes

- Backend sudah 100% support advanced filters
- Component `AdvancedFilters.tsx` sudah ready
- Tinggal copy-paste code di Step 4 & 5
- Atau bisa pakai console method dulu sambil integrate UI nanti

---

**READY TO INTEGRATE?** Follow steps 4 & 5 above! 🚀
