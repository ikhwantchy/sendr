# 📐 Bot Detail Page - Exact Layout Specification

## Overview Tab Structure (CRITICAL)

### Layout Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ ├─ Bot Name (Large, tracking-tight)                        │
│ ├─ Phone Number (with icon)                                │
│ └─ Status Pill (Connected/Disconnected)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TABS (Horizontal Scrollable on Mobile)                     │
│ [Overview] [Rules] [Campaigns] [Reminders] [Settings]      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TOP ROW - Grid Cols 3 (Responsive: 1 → 3)                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │   CARD 1    │ │   CARD 2    │ │   CARD 3    │           │
│ │             │ │             │ │             │           │
│ │ Total       │ │ Active      │ │ Campaigns   │           │
│ │ Messages    │ │ Rules       │ │             │           │
│ │             │ │             │ │             │           │
│ │ [Blue Icon] │ │ [Zinc Icon] │ │[Purple Icon]│           │
│ │ 1,234       │ │ 5           │ │ 0           │           │
│ │ Bot active  │ │ 1 total rule│ │ 0 active    │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ BOTTOM ROW - Grid Cols 2 (Responsive: 1 → 2)               │
│ ┌───────────────────────┐ ┌───────────────────────┐        │
│ │   LEFT PANEL          │ │   RIGHT PANEL         │        │
│ │   Bot Status          │ │   Reminders           │        │
│ │                       │ │                       │        │
│ │ Connection: Connected │ │ Active: 2             │        │
│ │ Session: Active       │ │ Total: 5              │        │
│ │ Last Activity: ...    │ │                       │        │
│ │                       │ │ ─────────────────     │        │
│ │ ─────────────────     │ │ View all reminders →  │        │
│ │ [PAUSE BOT BUTTON]    │ │                       │        │
│ │ (Full Width, Yellow)  │ │                       │        │
│ └───────────────────────┘ └───────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Header Section
```tsx
<div className="mb-8">
  <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-3 tracking-tight">
    {bot.name}
  </h1>
  <div className="flex flex-wrap items-center gap-3">
    {/* Phone Number */}
    <div className="flex items-center gap-2 text-zinc-400 text-sm">
      <Phone className="w-4 h-4 text-zinc-600" />
      <span className="font-mono">{bot.phone_number}</span>
    </div>
    {/* Status Pill */}
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
      <Circle className="w-2 h-2 fill-current" />
      <span>Connected</span>
    </div>
  </div>
</div>
```

**Colors:**
- Connected: `bg-emerald-500/10 border-emerald-500/20 text-emerald-500`
- Disconnected: `bg-zinc-500/10 border-zinc-500/20 text-zinc-500`

---

### 2. Tabs Section (Horizontal Scrollable)
```tsx
<div className="mb-8">
  <div className="flex overflow-x-auto no-scrollbar border-b border-zinc-800/50 gap-1">
    {tabs.map((tab) => (
      <button className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap">
        <span>{tab.name}</span>
        {/* Active indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
      </button>
    ))}
  </div>
</div>
```

**Key Classes:**
- `overflow-x-auto` - Horizontal scroll on mobile
- `no-scrollbar` - Hide scrollbar
- `whitespace-nowrap` - Prevent text wrapping
- Active tab: `text-zinc-100`, Inactive: `text-zinc-500`

---

### 3. Top Row - 3 Cards (Grid Cols 3)

#### Card Structure:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Card Template */}
  <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
    {/* Icon */}
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-blue-500" />
      </div>
    </div>
    {/* Number */}
    <div className="text-3xl font-bold text-zinc-100 mb-1 font-mono tracking-tight">
      1,234
    </div>
    {/* Subtext */}
    <div className="text-sm text-zinc-500">
      Bot is active
    </div>
  </div>
</div>
```

#### Card 1: Total Messages
- **Icon**: `MessageSquare` (Lucide)
- **Icon Color**: Blue-500
- **Background**: `bg-blue-500/10`
- **Number**: `stats.totalMessages` (font-mono, tracking-tight)
- **Subtext**: "Bot is active" (if connected) or "Connect to start tracking"

#### Card 2: Active Rules
- **Icon**: `Zap` (Lucide)
- **Icon Color**: Zinc-400
- **Background**: `bg-zinc-800/50`
- **Number**: `stats.activeRules` (font-mono, tracking-tight)
- **Subtext**: "X total rule(s)"

#### Card 3: Campaigns
- **Icon**: `Megaphone` (Lucide)
- **Icon Color**: Purple-400
- **Background**: `bg-purple-500/10`
- **Number**: `stats.totalCampaigns` (font-mono, tracking-tight)
- **Subtext**: "X active broadcast(s)"

---

### 4. Bottom Row - 2 Panels (Grid Cols 2)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Left Panel */}
  <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
    {/* Content */}
  </div>
  
  {/* Right Panel */}
  <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
    {/* Content */}
  </div>
</div>
```

#### Left Panel: Bot Status

**Structure:**
```tsx
<div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">
    Bot Status
  </h3>
  
  {/* Status Items */}
  <div className="space-y-3 mb-6">
    {/* Connection */}
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">Connection</span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-emerald-400">Connected</span>
      </div>
    </div>
    
    {/* Session */}
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">Session</span>
      <span className="text-sm text-zinc-100">Active</span>
    </div>
    
    {/* Last Activity */}
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">Last Activity</span>
      <span className="text-sm text-zinc-100 font-mono">Dec 31, 10:24 PM</span>
    </div>
  </div>
  
  {/* Full-Width Button */}
  <div className="pt-4 border-t border-zinc-800/50">
    <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600/10 border border-yellow-600/20 text-yellow-600 rounded-xl hover:bg-yellow-600/20 transition-all font-medium text-sm">
      <Pause className="w-4 h-4" />
      Pause Bot
    </button>
  </div>
</div>
```

**Button Colors:**
- **Pause**: `bg-yellow-600/10 border-yellow-600/20 text-yellow-600`
- **Resume**: `bg-emerald-500/10 border-emerald-500/20 text-emerald-500`

#### Right Panel: Reminders

**Structure:**
```tsx
<div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
  <h3 className="text-lg font-semibold text-zinc-100 mb-4 tracking-tight">
    Reminders
  </h3>
  
  {/* Stats */}
  <div className="space-y-4 mb-6">
    {/* Active */}
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">Active</span>
      <span className="text-2xl font-bold text-emerald-500 font-mono tracking-tight">
        2
      </span>
    </div>
    
    {/* Total */}
    <div className="flex items-center justify-between">
      <span className="text-zinc-500 text-sm">Total</span>
      <span className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">
        5
      </span>
    </div>
  </div>
  
  {/* View All Link */}
  <div className="pt-4 border-t border-zinc-800/50">
    <button className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors">
      <span>View all reminders</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</div>
```

**Number Colors:**
- **Active**: `text-emerald-500` (Green, large 2xl)
- **Total**: `text-zinc-100` (White, medium lg)

---

## Responsive Behavior

### Desktop (≥ 768px)
```css
Top Row: grid-cols-3 (3 cards side by side)
Bottom Row: grid-cols-2 (2 panels side by side)
Tabs: Horizontal row, no scroll needed
```

### Mobile (< 768px)
```css
Top Row: grid-cols-1 (3 cards stacked vertically)
Bottom Row: grid-cols-1 (2 panels stacked vertically)
Tabs: Horizontal scroll with no-scrollbar
```

---

## Color Reference

### Status Colors
```tsx
// Connected
bg-emerald-500/10 border-emerald-500/20 text-emerald-500

// Disconnected
bg-zinc-500/10 border-zinc-500/20 text-zinc-500

// Pause Button (Warning)
bg-yellow-600/10 border-yellow-600/20 text-yellow-600

// Resume Button (Success)
bg-emerald-500/10 border-emerald-500/20 text-emerald-500
```

### Icon Backgrounds
```tsx
// Blue (Messages)
bg-blue-500/10 with text-blue-500

// Zinc (Rules)
bg-zinc-800/50 with text-zinc-400

// Purple (Campaigns)
bg-purple-500/10 with text-purple-400
```

### Text Hierarchy
```tsx
// Headings
text-zinc-100 tracking-tight

// Numbers
text-zinc-100 font-mono tracking-tight

// Subtext/Labels
text-zinc-500

// Meta
text-zinc-400
```

---

## Typography Specifications

### Headings
- **Bot Name**: `text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight`
- **Section Titles**: `text-lg font-semibold text-zinc-100 tracking-tight`
- **Tab Names**: `text-sm font-medium`

### Numbers
- **Large Stats**: `text-3xl font-bold text-zinc-100 font-mono tracking-tight`
- **Medium Stats**: `text-2xl font-bold text-emerald-500 font-mono tracking-tight`
- **Small Stats**: `text-lg font-semibold text-zinc-100 font-mono tracking-tight`

### Body Text
- **Labels**: `text-sm text-zinc-500`
- **Values**: `text-sm text-zinc-100`
- **Phone Number**: `text-sm text-zinc-400 font-mono`

---

## Icon Specifications

### Lucide Icons Used
```tsx
import { 
    ChevronLeft,      // Back button
    MessageSquare,    // Total Messages
    Zap,              // Active Rules
    Megaphone,        // Campaigns
    Circle,           // Status indicator
    Phone,            // Phone number
    Pause,            // Pause button
    Play,             // Resume button
    ArrowRight        // View all link
} from 'lucide-react'
```

### Icon Sizes
- **Card Icons**: `w-5 h-5`
- **Button Icons**: `w-4 h-4`
- **Status Dot**: `w-2 h-2`
- **Header Icons**: `w-4 h-4`

---

## Animation Classes

```tsx
// Page transition
animate-fade-in

// Card hover
hover:bg-zinc-900/80 transition-all

// Button hover
hover:bg-yellow-600/20 transition-all

// Status dot pulse
animate-pulse (for connected status)
```

---

## Critical Requirements Checklist

- [x] **Top Row**: EXACTLY 3 cards (grid-cols-3)
- [x] **Bottom Row**: EXACTLY 2 panels (grid-cols-2)
- [x] **Card 1**: Total Messages with Blue icon
- [x] **Card 2**: Active Rules with Zinc icon
- [x] **Card 3**: Campaigns with Purple icon
- [x] **Left Panel**: Bot Status with full-width Pause/Resume button
- [x] **Right Panel**: Reminders with Active (green) and Total (white) numbers
- [x] **Tabs**: Horizontal scrollable on mobile
- [x] **Typography**: tracking-tight on all numbers and headings
- [x] **Font**: font-mono on all numbers
- [x] **Colors**: Zinc-950 background, Zinc-900/50 cards, Zinc-800/50 borders
- [x] **Status**: Emerald-500 (Connected), Red-500 (Disconnected), Yellow-600 (Pause)

---

**Result**: A pixel-perfect Premium Dark Mode bot detail page matching Linear/Vercel aesthetic with exact layout specifications.
