# 🎯 Bot Detail Page - Quick Reference Card

## Layout at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│ Bot Name (3xl, tracking-tight)                              │
│ 📞 +62 812 3456 7890  ● Connected                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [Overview] [Rules] [Campaigns] [Reminders] [Settings]      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┐
│ 💬 Total Messages│ ⚡ Active Rules  │ 📢 Campaigns     │
│ 1,234            │ 5                │ 0                │
│ Bot is active    │ 1 total rule     │ 0 active         │
└──────────────────┴──────────────────┴──────────────────┘

┌─────────────────────────────┬─────────────────────────────┐
│ Bot Status                  │ Reminders                   │
│ Connection: ● Connected     │ Active: 2                   │
│ Session: Active             │ Total: 5                    │
│ Last Activity: Dec 31, 10PM │                             │
│ ─────────────────────────   │ ─────────────────────────   │
│ [⏸ PAUSE BOT]              │ View all reminders →        │
└─────────────────────────────┴─────────────────────────────┘
```

---

## Color Palette

| Element | Color | Class |
|---------|-------|-------|
| Background | #09090b | `bg-zinc-950` |
| Cards | #0e0e11 | `bg-zinc-900/50` |
| Borders | Zinc-800/50 | `border-zinc-800/50` |
| Headings | Zinc-100 | `text-zinc-100` |
| Subtext | Zinc-500 | `text-zinc-500` |
| Connected | Emerald-500 | `text-emerald-500` |
| Disconnected | Zinc-500 | `text-zinc-500` |
| Pause Button | Yellow-600 | `text-yellow-600` |
| Resume Button | Emerald-500 | `text-emerald-500` |

---

## Typography

| Element | Class |
|---------|-------|
| Bot Name | `text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight` |
| Section Titles | `text-lg font-semibold text-zinc-100 tracking-tight` |
| Large Numbers | `text-3xl font-bold text-zinc-100 font-mono tracking-tight` |
| Medium Numbers | `text-2xl font-bold text-emerald-500 font-mono tracking-tight` |
| Small Numbers | `text-lg font-semibold text-zinc-100 font-mono tracking-tight` |
| Labels | `text-sm text-zinc-500` |
| Values | `text-sm text-zinc-100` |
| Phone Number | `text-sm text-zinc-400 font-mono` |

---

## Icons (Lucide React)

| Purpose | Icon | Color |
|---------|------|-------|
| Total Messages | `MessageSquare` | Blue-500 |
| Active Rules | `Zap` | Zinc-400 |
| Campaigns | `Megaphone` | Purple-400 |
| Status Dot | `Circle` | Emerald-500/Zinc-500 |
| Phone | `Phone` | Zinc-600 |
| Pause | `Pause` | Yellow-600 |
| Resume | `Play` | Emerald-500 |
| View All | `ArrowRight` | Blue-500 |
| Back | `ChevronLeft` | Zinc-500 |

---

## Grid Structure

```tsx
// Top Row - 3 Cards
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card1 /> <Card2 /> <Card3 />
</div>

// Bottom Row - 2 Panels
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <BotStatus /> <Reminders />
</div>
```

---

## Status Badge Template

```tsx
// Connected
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Connected</span>
</div>

// Disconnected
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border bg-zinc-500/10 border-zinc-500/20 text-zinc-500">
  <Circle className="w-2 h-2 fill-current" />
  <span>Disconnected</span>
</div>
```

---

## Button Templates

```tsx
// Pause Button (Full Width, Yellow)
<button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600/10 border border-yellow-600/20 text-yellow-600 rounded-xl hover:bg-yellow-600/20 transition-all font-medium text-sm">
  <Pause className="w-4 h-4" />
  Pause Bot
</button>

// Resume Button (Full Width, Emerald)
<button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all font-medium text-sm">
  <Play className="w-4 h-4" />
  Resume Bot
</button>
```

---

## Card Template

```tsx
<div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-900/80 transition-all">
  {/* Icon */}
  <div className="flex items-center justify-between mb-4">
    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
      <MessageSquare className="w-5 h-5 text-blue-500" />
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
```

---

## Responsive Breakpoints

| Screen | Top Row | Bottom Row | Tabs |
|--------|---------|------------|------|
| Mobile (< 768px) | 1 column | 1 column | Scroll |
| Tablet (768-1024px) | 3 columns | 2 columns | Row |
| Desktop (≥ 1024px) | 3 columns | 2 columns | Row |

---

## Critical Classes

```css
/* Layout */
grid-cols-1 md:grid-cols-3    /* Top row */
grid-cols-1 md:grid-cols-2    /* Bottom row */

/* Tabs */
overflow-x-auto no-scrollbar   /* Mobile scroll */
whitespace-nowrap              /* Prevent wrap */

/* Typography */
tracking-tight                 /* Headings & numbers */
font-mono                      /* All numbers */

/* Colors */
bg-zinc-950                    /* Page background */
bg-zinc-900/50                 /* Card background */
border-zinc-800/50             /* Borders */
text-zinc-100                  /* Headings */
text-zinc-500                  /* Subtext */

/* Status */
bg-emerald-500/10              /* Connected bg */
border-emerald-500/20          /* Connected border */
text-emerald-500               /* Connected text */

bg-yellow-600/10               /* Pause bg */
border-yellow-600/20           /* Pause border */
text-yellow-600                /* Pause text */
```

---

## Animation Classes

```css
animate-fade-in                /* Page transition */
animate-pulse                  /* Status dot */
hover:bg-zinc-900/80          /* Card hover */
hover:bg-yellow-600/20        /* Button hover */
transition-all                 /* Smooth transitions */
```

---

## Quick Copy-Paste

### Import Statement
```tsx
import { 
    ChevronLeft, MessageSquare, Zap, Megaphone, 
    Circle, Phone, Pause, Play, ArrowRight 
} from 'lucide-react'
```

### Grid Wrapper
```tsx
<div className="space-y-6">
  {/* Top Row */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* 3 cards */}
  </div>
  
  {/* Bottom Row */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* 2 panels */}
  </div>
</div>
```

---

**File**: `dashboard/bots/[id]/page.tsx`
**Design**: Premium Dark Mode (Linear/Vercel inspired)
**Status**: ✅ Complete
