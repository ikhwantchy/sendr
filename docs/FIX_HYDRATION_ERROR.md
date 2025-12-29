# 🔧 FIX HYDRATION ERROR

## ❌ ERROR:
```
Unhandled Runtime Error
Error: Hydration failed because the initial UI does not match what was rendered on the server.

Expected server HTML to contain a matching <button> in <div>.
```

## 🔍 PENYEBAB:
- Server-side rendering (SSR) menghasilkan HTML berbeda dengan client
- Biasanya karena:
  1. Conditional rendering based on browser-only state
  2. Random values (Math.random(), Date.now())
  3. Browser-only APIs (localStorage, window)
  4. Third-party components yang tidak SSR-compatible

## ✅ SOLUSI:

### **1. Tambahkan "use client" di Component**
Pastikan semua interactive components punya `'use client'` di top:

```tsx
'use client'

import { useState } from 'react'
// ... rest of component
```

### **2. Gunakan useEffect untuk Client-Only Code**
```tsx
'use client'

import { useEffect, useState } from 'react'

export default function MyComponent() {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])
    
    if (!mounted) return null
    
    return (
        // Your component
    )
}
```

### **3. Dynamic Import dengan ssr: false**
```tsx
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(
    () => import('./MyComponent'),
    { ssr: false }
)
```

## 🛠️ QUICK FIX:

### **Opsi 1: Clear .next Cache**
```bash
cd frontend
rm -rf .next
npm run dev
```

### **Opsi 2: Disable SSR untuk Problematic Page**
Di `app/dashboard/bots/[id]/page.tsx`:
```tsx
export const dynamic = 'force-dynamic'
// or
export const revalidate = 0
```

### **Opsi 3: Wrap Component**
```tsx
'use client'

import { useEffect, useState } from 'react'

export default function ClientOnly({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])
    
    if (!mounted) return null
    
    return <>{children}</>
}
```

## 🚀 RECOMMENDED ACTION:

**Clear Next.js cache dan restart:**

```bash
# Stop frontend
Ctrl + C

# Clear cache
cd frontend
Remove-Item -Recurse -Force .next

# Restart
npm run dev
```

## 📋 CHECKLIST:

- [ ] All interactive components have `'use client'`
- [ ] No browser APIs in server components
- [ ] No random values in initial render
- [ ] Clear .next cache
- [ ] Restart dev server

## 🎯 IF STILL ERROR:

Share screenshot of:
1. The component that's causing error
2. Full error stack trace
3. Browser console errors

---

**TRY CLEARING .NEXT CACHE FIRST!** 🔄
