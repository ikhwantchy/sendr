# 🧪 Testing Guide - Ghost Aesthetic UI/UX

## Quick Start

### 1. Install Dependencies (if needed)
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to: `http://localhost:3000`

---

## Testing Checklist

### ✅ Sidebar (Desktop)
- [ ] Sidebar appears on left side with Zinc-950 background
- [ ] Logo shows blue Bot icon with "BroBot" text
- [ ] Navigation items have Lucide icons (LayoutDashboard, Bot, Database, BarChart3)
- [ ] Active page has zinc-800/50 background and blue icon
- [ ] Hover states work (zinc-900/50 background)
- [ ] Toggle button appears (ChevronLeft icon)
- [ ] Clicking toggle collapses sidebar to w-20 (icons only)
- [ ] Collapsed sidebar shows tooltips on hover
- [ ] User profile section shows at bottom
- [ ] Logout button has red hover state

### ✅ Sidebar (Mobile - < 768px)
- [ ] Sidebar is hidden by default
- [ ] Mobile header appears at top (sticky, h-16)
- [ ] Mobile header shows logo and hamburger menu
- [ ] Clicking hamburger opens sidebar with slide-in animation
- [ ] Black backdrop overlay appears (bg-black/80)
- [ ] Clicking backdrop closes sidebar
- [ ] Close button (X) appears in sidebar header
- [ ] Clicking X closes sidebar
- [ ] Sidebar slides out smoothly

### ✅ Dashboard Page
- [ ] Page background is Zinc-950
- [ ] Welcome message shows user name
- [ ] Stats grid shows 4 cards on desktop
- [ ] Stats grid shows 2 columns on tablet (768-1024px)
- [ ] Stats grid shows 1 column on mobile (< 768px)
- [ ] Each stat card has:
  - [ ] Zinc-900/50 background
  - [ ] Lucide icon in zinc-800/50 box
  - [ ] Font-mono number
  - [ ] Emerald trend badge (+%)
  - [ ] Hover lift effect (2px)
- [ ] Quick Actions section shows 3 buttons
- [ ] Quick Actions stack vertically on mobile
- [ ] Arrow icons appear on action buttons
- [ ] Clicking actions navigates to correct pages

### ✅ Bots Page
- [ ] Header shows "WhatsApp Bots" with tracking-tight
- [ ] "Create Bot" button appears (blue-500)
- [ ] Bot cards grid: 3 cols desktop, 2 cols tablet, 1 col mobile
- [ ] Each bot card has:
  - [ ] Zinc-900/50 background
  - [ ] Bot name with truncate
  - [ ] Status badge with Circle icon
  - [ ] Phone number with Phone icon (if connected)
  - [ ] Created date with Calendar icon
  - [ ] "Manage" button (blue-500)
  - [ ] "Delete" button (red/10 with Trash2 icon)
  - [ ] Hover lift effect
- [ ] Empty state shows when no bots
- [ ] Empty state has zinc-800/50 Bot icon
- [ ] "Create Bot" modal opens on button click

### ✅ Create Bot Modal
- [ ] Modal appears with fade-in animation
- [ ] Modal slides in from bottom
- [ ] Background is zinc-900
- [ ] Border is zinc-800/50
- [ ] Header shows "Create New Bot"
- [ ] Input has zinc-800/50 background
- [ ] Input has zinc-700/50 border
- [ ] Focus ring is blue-500
- [ ] "Cancel" button is zinc-800/50
- [ ] "Create" button is blue-500
- [ ] Clicking outside closes modal
- [ ] Escape key closes modal
- [ ] Enter key submits form

### ✅ Create Rule Modal
- [ ] Modal opens with fade-in + slide-in
- [ ] Header has Zap icon in blue/10 box
- [ ] Desktop: Split view (form left, preview right)
- [ ] Mobile: Full-width form, preview hidden
- [ ] Keyword input has zinc-800/50 background
- [ ] RichTextEditor appears for reply
- [ ] WhatsAppPreview shows on desktop (lg:flex)
- [ ] WhatsAppPreview hidden on mobile (hidden lg:flex)
- [ ] Toggle switch works (blue-500 when active)
- [ ] Footer buttons are responsive
- [ ] Modal fits within viewport on mobile

### ✅ Responsive Behavior

#### Desktop (≥ 1024px)
- [ ] Sidebar is 256px wide (expanded)
- [ ] Main content has ml-64 margin
- [ ] Stats grid shows 4 columns
- [ ] Bot cards show 3 columns
- [ ] Modals show split view (form + preview)
- [ ] All hover effects work

#### Tablet (768-1024px)
- [ ] Sidebar is visible
- [ ] Stats grid shows 2 columns
- [ ] Bot cards show 2 columns
- [ ] Modals show split view
- [ ] Touch targets are adequate

#### Mobile (< 768px)
- [ ] Sidebar is hidden
- [ ] Mobile header is visible and sticky
- [ ] Hamburger menu works
- [ ] Stats grid shows 1 column
- [ ] Bot cards show 1 column
- [ ] Modals show full-width form
- [ ] Preview panels are hidden
- [ ] Text doesn't overflow
- [ ] Buttons are touch-friendly (min 44x44px)
- [ ] No horizontal scroll

### ✅ Color Accuracy
- [ ] Page background is #09090b (Zinc-950)
- [ ] Cards are Zinc-900/50
- [ ] Borders are Zinc-800/50
- [ ] Headings are Zinc-100
- [ ] Body text is Zinc-400
- [ ] Meta text is Zinc-500
- [ ] Primary buttons are Blue-500
- [ ] Success badges are Emerald-500
- [ ] Error badges are Red-500
- [ ] No vibrant gradients (cyan/purple/pink)

### ✅ Typography
- [ ] All text uses Inter font
- [ ] Headings have tracking-tight
- [ ] Numbers use font-mono
- [ ] Text hierarchy is clear
- [ ] No text is cut off
- [ ] Truncate works on long names

### ✅ Icons
- [ ] All icons are from Lucide React
- [ ] No emoji icons (🤖, 📊, etc.)
- [ ] Icon sizes are consistent (w-4 h-4 or w-5 h-5)
- [ ] Icons have proper colors (zinc-400, blue-500, etc.)
- [ ] Circle icons appear in status badges

### ✅ Animations
- [ ] Page transitions have fade-in
- [ ] Cards have slide-in-from-bottom-2
- [ ] Sidebar has slide-in-from-left (mobile)
- [ ] Hover lift is 2px (not 4px)
- [ ] Transitions are 200ms (not 300ms)
- [ ] No shimmer effects
- [ ] No gradient animations
- [ ] Loading spinner is blue-500 with zinc-800 track

### ✅ Interactions
- [ ] Hover states work on all interactive elements
- [ ] Focus states show blue-500 ring
- [ ] Buttons have cursor-pointer
- [ ] Disabled states have opacity-50
- [ ] Loading states show spinner
- [ ] Error states show red text
- [ ] Success toasts appear (if Sonner is configured)

---

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Firefox Mobile

### Screen Sizes to Test
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 768px (iPad Portrait)
- [ ] 1024px (iPad Landscape)
- [ ] 1280px (Laptop)
- [ ] 1920px (Desktop)

---

## Common Issues & Fixes

### Issue: Sidebar not collapsing
**Fix**: Check if `isExpanded` state is working in Sidebar.tsx

### Issue: Mobile menu not appearing
**Fix**: Verify `isMobileOpen` state and `translate-x-0` class

### Issue: Colors look wrong
**Fix**: Check if Tailwind is processing the new Zinc colors in globals.css

### Issue: Icons not showing
**Fix**: Ensure `lucide-react` is installed: `npm install lucide-react`

### Issue: Animations not working
**Fix**: Verify `tailwindcss-animate` is installed and Tailwind config includes animations

### Issue: Modal preview not hiding on mobile
**Fix**: Check `hidden lg:flex` class on preview div

### Issue: Horizontal scroll on mobile
**Fix**: Add `overflow-x-hidden` to body or check for elements with fixed widths

---

## Performance Testing

### Lighthouse Scores (Target)
- [ ] Performance: > 90
- [ ] Accessibility: > 95
- [ ] Best Practices: > 95
- [ ] SEO: > 90

### Load Times (Target)
- [ ] First Contentful Paint: < 1.5s
- [ ] Time to Interactive: < 3s
- [ ] Largest Contentful Paint: < 2.5s

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab key navigates through interactive elements
- [ ] Enter key activates buttons
- [ ] Escape key closes modals
- [ ] Arrow keys work in dropdowns (if applicable)

### Screen Reader
- [ ] All images have alt text
- [ ] Buttons have descriptive labels
- [ ] Form inputs have labels
- [ ] Status messages are announced

### Color Contrast
- [ ] Headings (Zinc-100 on Zinc-950): Pass AAA
- [ ] Body text (Zinc-400 on Zinc-950): Pass AA
- [ ] Buttons (White on Blue-500): Pass AAA
- [ ] Links (Blue-500 on Zinc-950): Pass AA

---

## Final Checklist

- [ ] All pages load without errors
- [ ] Console shows no errors or warnings
- [ ] All API calls work (if backend is running)
- [ ] Responsive behavior works on all breakpoints
- [ ] Colors match Ghost aesthetic (Zinc palette)
- [ ] Icons are from Lucide React
- [ ] Typography uses tracking-tight and font-mono
- [ ] Animations are subtle (2px lift, no glows)
- [ ] Mobile menu works perfectly
- [ ] Modals are responsive (split view → full width)
- [ ] No horizontal scroll on any screen size
- [ ] Touch targets are adequate (min 44x44px)
- [ ] Loading states work
- [ ] Empty states look good
- [ ] Error states are clear

---

## Next Steps After Testing

1. **Fix any issues** found during testing
2. **Update remaining pages** (Bot Detail, Tables, etc.) using the patterns guide
3. **Test again** after updates
4. **Deploy to staging** for user testing
5. **Gather feedback** and iterate

---

## Quick Test Commands

```bash
# Start frontend
cd frontend
npm run dev

# Start backend (in separate terminal)
cd backend
npm run dev

# Build for production (to test build)
cd frontend
npm run build
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

---

**Happy Testing! 🚀**
