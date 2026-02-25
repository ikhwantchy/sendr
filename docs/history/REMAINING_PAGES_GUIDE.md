# 🎯 Remaining Pages - Ghost Aesthetic Implementation Guide

## Pages Already Updated ✅
1. ✅ Sidebar (with mobile responsive menu)
2. ✅ Dashboard Layout
3. ✅ Dashboard Home Page
4. ✅ Bots List Page
5. ✅ Create Rule Modal

---

## Pages to Update 🔄

### 1. **Bot Detail Page** (`dashboard/bots/[id]/page.tsx`)
**Current State**: Uses old gradient theme
**Required Changes**:
- Replace gradient colors with Zinc palette
- Update tabs to be horizontally scrollable on mobile (`overflow-x-auto no-scrollbar`)
- Replace custom SVG icons with Lucide icons
- Update status badges to minimal Circle icon design
- Make stats grid responsive (1 → 2 → 3 columns)

**Key Components**:
```tsx
import { Bot, Zap, Megaphone, Clock, Settings, Phone, Calendar, Circle, ChevronLeft } from 'lucide-react'

// Tabs - Mobile scrollable
<div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/50">
  {tabs.map((tab) => (
    <button className="flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap">
      <Icon className="w-4 h-4" />
      <span>{tab.name}</span>
    </button>
  ))}
</div>

// Status Badge
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Connected</span>
</div>
```

---

### 2. **Rules Table** (`components/tables/RulesTable.tsx`)
**Current State**: Table layout
**Required Changes**:
- Desktop: Keep table layout with Zinc styling
- Mobile: Convert to card view (stack vertically)
- Replace SVG icons with Lucide (Zap, ToggleLeft, Edit, Trash2)
- Minimal toggle switches
- Subtle hover states

**Responsive Pattern**:
```tsx
// Desktop Table
<div className="hidden md:block">
  <table className="w-full">
    {/* Table content */}
  </table>
</div>

// Mobile Cards
<div className="md:hidden space-y-3">
  {rules.map((rule) => (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

### 3. **Campaigns Table** (`components/tables/CampaignsTable.tsx`)
**Current State**: Table layout
**Required Changes**:
- Same responsive pattern as Rules Table
- Status badges with Circle icons
- Progress bars with Zinc colors
- Lucide icons: Megaphone, Clock, Users, Send

---

### 4. **Reminders Table** (`components/tables/RemindersTable.tsx`)
**Current State**: Table layout
**Required Changes**:
- Same responsive pattern
- Lucide icons: Clock, Calendar, Repeat, Edit, Trash2
- Minimal schedule display
- Toggle switches for active state

---

### 5. **Create Campaign Modal** (`modals/CreateCampaignModal.tsx`)
**Current State**: Old gradient theme
**Required Changes**:
- Split view (55/45) on desktop
- Full-width on mobile (hide preview)
- Zinc-themed inputs
- File upload with minimal design
- Progress indicator with Zinc colors

---

### 6. **Create Reminder Modal** (`modals/CreateReminderModal.tsx`)
**Current State**: Old gradient theme
**Required Changes**:
- Split view layout
- Date/time pickers with Zinc theme
- Schedule type selector (minimal radio buttons)
- Group selector dropdown

---

### 7. **Analytics Page** (`dashboard/analytics/page.tsx`)
**Current State**: Unknown
**Required Changes**:
- Responsive chart grid
- Minimal chart colors (Blue, Emerald)
- Stats cards with Zinc theme
- Date range picker with Zinc styling

---

### 8. **Data Sources Page** (`dashboard/datasources/page.tsx`)
**Current State**: Unknown
**Required Changes**:
- Responsive card grid
- Google Sheets icon (Lucide: Sheet)
- Connection status badges
- Minimal sync indicators

---

### 9. **Users Page** (`dashboard/users/page.tsx`)
**Current State**: Unknown
**Required Changes**:
- Responsive table → card view
- Role badges with Zinc colors
- Invite user modal with Zinc theme
- User avatar with gradient (Blue → Emerald)

---

## 🎨 Design Patterns to Follow

### Color Usage
```tsx
// Backgrounds
bg-zinc-950        // Page background
bg-zinc-900/50     // Card background
bg-zinc-800/50     // Hover state

// Borders
border-zinc-800/50 // Default border
border-zinc-700/50 // Hover border

// Text
text-zinc-100      // Headings
text-zinc-400      // Body
text-zinc-500      // Meta/labels
text-zinc-600      // Disabled

// Accents
text-blue-500      // Primary action
text-emerald-500   // Success
text-red-500       // Error/delete
text-yellow-500    // Warning
```

### Status Badges
```tsx
// Connected/Success
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Connected</span>
</div>

// Disconnected/Inactive
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-zinc-500/10 border-zinc-500/20 text-zinc-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Disconnected</span>
</div>

// Error
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-red-500/10 border-red-500/20 text-red-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Error</span>
</div>

// Warning/Pending
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Pending</span>
</div>
```

### Buttons
```tsx
// Primary
<button className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all text-sm">
  Create
</button>

// Secondary
<button className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-all font-medium text-sm">
  Cancel
</button>

// Danger
<button className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all font-medium text-sm">
  Delete
</button>
```

### Cards
```tsx
<div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/80 hover:border-zinc-700/50 transition-all duration-200 hover-lift">
  {/* Card content */}
</div>
```

### Inputs
```tsx
<input
  type="text"
  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
  placeholder="Enter value..."
/>
```

### Toggle Switch
```tsx
<button
  type="button"
  onClick={() => setActive(!active)}
  className={`relative w-11 h-6 rounded-full transition-colors ${
    active ? 'bg-blue-500' : 'bg-zinc-700'
  }`}
>
  <div
    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
      active ? 'translate-x-5' : 'translate-x-0'
    }`}
  />
</button>
```

### Loading Spinner
```tsx
<div className="relative w-12 h-12">
  <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
</div>
```

### Empty State
```tsx
<div className="text-center py-16 bg-zinc-900/50 border border-dashed border-zinc-800/50 rounded-2xl">
  <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-800/50 rounded-2xl mb-4">
    <Icon className="w-8 h-8 text-zinc-600" />
  </div>
  <h3 className="text-lg font-semibold text-zinc-100 mb-2">No items yet</h3>
  <p className="text-zinc-400 text-sm mb-6">Create your first item to get started</p>
  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all text-sm">
    Create Item
  </button>
</div>
```

---

## 📱 Mobile Responsive Patterns

### Grid Layouts
```tsx
// Stats: 1 → 2 → 4
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Cards: 1 → 2 → 3
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Two columns: 1 → 2
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

### Tabs (Horizontal Scroll)
```tsx
<div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/50 gap-1">
  {tabs.map((tab) => (
    <button className="flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap">
      {/* Tab content */}
    </button>
  ))}
</div>
```

### Table → Card View
```tsx
// Desktop Table
<div className="hidden md:block overflow-x-auto">
  <table className="w-full">
    {/* Table */}
  </table>
</div>

// Mobile Cards
<div className="md:hidden space-y-3">
  {items.map((item) => (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
      {/* Stacked content */}
    </div>
  ))}
</div>
```

### Modal Responsive
```tsx
<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
    {/* Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <div>{/* Form */}</div>
      <div className="hidden lg:block">{/* Preview */}</div>
    </div>
  </div>
</div>
```

---

## 🚀 Quick Start for Each Page

1. Import Lucide icons at the top
2. Replace all gradient backgrounds with Zinc colors
3. Update borders to `border-zinc-800/50`
4. Replace custom SVGs with Lucide icons
5. Add responsive grid classes
6. Implement mobile card view for tables
7. Update status badges with Circle icons
8. Add `hover-lift` to interactive cards
9. Use `tracking-tight` for headings
10. Test on mobile (< 768px), tablet (768-1024px), desktop (> 1024px)

---

## ✅ Checklist for Each Component

- [ ] Lucide icons imported and used
- [ ] Zinc color palette applied
- [ ] Responsive grid implemented
- [ ] Mobile card view (for tables)
- [ ] Horizontal scroll tabs (if applicable)
- [ ] Status badges with Circle icons
- [ ] Minimal hover states (2px lift)
- [ ] Font-mono for data/numbers
- [ ] Tracking-tight for headings
- [ ] Touch-friendly button sizes (min 44x44px)
- [ ] No text overflow (truncate)
- [ ] Smooth transitions (200-300ms)
- [ ] Tested on mobile, tablet, desktop

---

**Next Action**: Start with Bot Detail Page, then move to Tables, then Modals, then remaining pages.
