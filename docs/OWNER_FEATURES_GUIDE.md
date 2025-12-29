# 🔐 OWNER-SPECIFIC FEATURES - IMPLEMENTATION GUIDE

## 🎯 OVERVIEW

**Current State:** Dashboard untuk single user (Owner)

**Target State:** Dashboard dengan multi-user management untuk Owner

---

## 📊 OWNER vs ADMIN vs USER

### **OWNER (You - Super Admin)**
```
✅ Full access ke SEMUA bot
✅ Create/Edit/Delete bot
✅ Manage users (Invite, Edit, Delete)
✅ Assign bot permissions ke user lain
✅ View all analytics
✅ Manage billing/subscription (future)
```

### **ADMIN (User yang di-invite)**
```
✅ Access ke assigned bots only
✅ Create campaigns untuk assigned bots
✅ Create rules untuk assigned bots
✅ View analytics untuk assigned bots
❌ Cannot manage users
❌ Cannot delete bots
```

### **USER (Operator)**
```
✅ View assigned bots only
✅ Create campaigns (if allowed)
❌ Cannot create rules
❌ Cannot edit bot settings
❌ Cannot manage users
```

---

## 🎨 UI CHANGES FOR OWNER

### **1. Sidebar - Add "Users" Menu**

**Current Sidebar:**
```
- Dashboard
- Bots
- Rules
- Campaigns
- Reminders
- Data Sources
- Analytics
```

**New Sidebar (Owner Only):**
```
- Dashboard
- Bots
- Rules
- Campaigns
- Reminders
- Data Sources
- Analytics
- 👥 Users          ← NEW (Owner only)
```

**Implementation:**
```tsx
// frontend/src/components/Sidebar.tsx

const menuItems = [
  { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
  { icon: '🤖', label: 'Bots', href: '/dashboard/bots' },
  { icon: '⚡', label: 'Rules', href: '/dashboard/rules' },
  { icon: '📢', label: 'Campaigns', href: '/dashboard/campaigns' },
  { icon: '⏰', label: 'Reminders', href: '/dashboard/reminders' },
  { icon: '📊', label: 'Data Sources', href: '/dashboard/data-sources' },
  { icon: '📈', label: 'Analytics', href: '/dashboard/analytics' },
  
  // Owner only
  ...(userRole === 'owner' ? [
    { icon: '👥', label: 'Users', href: '/dashboard/users' }
  ] : [])
]
```

---

### **2. Dashboard - Add User Stats Card**

**Current Stats:**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Bots   │ Active Rules │ Campaigns    │ Messages Sent│
│      0       │      0       │      0       │      0       │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**New Stats (Owner Only):**
```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Bots   │ Active Rules │ Campaigns    │ Messages Sent│ Total Users  │
│      0       │      0       │      0       │      0       │      1       │ ← NEW
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

**Implementation:**
```tsx
// frontend/src/app/dashboard/page.tsx

{userRole === 'owner' && (
  <div className="glass rounded-2xl p-6 border border-white/10">
    <div className="flex items-center gap-4 mb-2">
      <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center">
        <span className="text-2xl">👥</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{stats.total_users}</p>
        <p className="text-sm text-gray-400">Total Users</p>
      </div>
    </div>
  </div>
)}
```

---

### **3. Bot Detail Page - Add "Manage Access" Button**

**Current Bot Detail:**
```
┌─────────────────────────────────────┐
│ Bot: as                             │
├─────────────────────────────────────┤
│ Quick Actions:                      │
│ [Add Rules] [New Campaign] [Analytics]
└─────────────────────────────────────┘
```

**New Bot Detail (Owner Only):**
```
┌─────────────────────────────────────┐
│ Bot: as                             │
├─────────────────────────────────────┤
│ Quick Actions:                      │
│ [Add Rules] [New Campaign] [Analytics]
│ [👥 Manage Access]  ← NEW (Owner only)
└─────────────────────────────────────┘
```

**Implementation:**
```tsx
// frontend/src/app/dashboard/bots/[id]/page.tsx

{userRole === 'owner' && (
  <button
    onClick={() => setShowAccessModal(true)}
    className="group p-5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl hover:from-green-500/30 hover:to-emerald-500/30 transition-all text-left hover-lift relative overflow-hidden"
  >
    <div className="text-3xl mb-3 relative z-10">👥</div>
    <h3 className="font-bold text-white text-lg mb-1 relative z-10">
      Manage Access
    </h3>
    <p className="text-sm text-gray-400 relative z-10">
      Assign users to this bot
    </p>
  </button>
)}
```

---

### **4. Bot List - Show User Count**

**Current Bot Card:**
```
┌─────────────────────────────┐
│ as                          │
│ ● connected                 │
│ Created 23/12/2025          │
│                             │
│ [Manage]  [Delete]          │
└─────────────────────────────┘
```

**New Bot Card (Owner Only):**
```
┌─────────────────────────────┐
│ as                          │
│ ● connected                 │
│ Created 23/12/2025          │
│ 👥 2 users assigned  ← NEW  │
│                             │
│ [Manage]  [Delete]          │
└─────────────────────────────┘
```

**Implementation:**
```tsx
// frontend/src/app/dashboard/bots/page.tsx

{userRole === 'owner' && (
  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
    <span>👥</span>
    <span>{bot.users_count || 0} users assigned</span>
  </div>
)}
```

---

## 📝 NEW PAGES FOR OWNER

### **1. Users Management Page**

**Location:** `/dashboard/users`

**Features:**
```
┌─────────────────────────────────────────────────────────┐
│ 👥 User Management                    [+ Invite User]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Name    │ Email          │ Role  │ Bots │ Actions│   │
│ ├──────────────────────────────────────────────────┤   │
│ │ You     │ admin@ex.com   │ Owner │ All  │ -      │   │
│ │ John    │ john@ex.com    │ Admin │ 2    │ [Edit] │   │
│ │ Jane    │ jane@ex.com    │ User  │ 1    │ [Edit] │   │
│ └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- User list table
- Invite user button
- Edit/Delete user actions
- Role badges
- Assigned bots count

---

### **2. Invite User Modal**

**Triggered by:** Click "Invite User" button

**Modal Content:**
```
┌─────────────────────────────────────────┐
│ Invite New User                    [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Email Address:                          │
│ [john@example.com                    ]  │
│                                         │
│ Role:                                   │
│ [Admin ▼]                               │
│ - Admin (Can manage assigned bots)      │
│ - User (View only + limited actions)    │
│                                         │
│ Assign Bots:                            │
│ ☑ as (628123456789)                     │
│ ☑ test (628987654321)                   │
│                                         │
│ Permissions:                            │
│ ☑ Can View                              │
│ ☑ Can Edit Bot Settings                 │
│ ☐ Can Delete Bot                        │
│ ☑ Can Create Campaigns                  │
│ ☑ Can Create Rules                      │
│ ☑ Can View Analytics                    │
│                                         │
│         [Cancel]  [Send Invitation]     │
└─────────────────────────────────────────┘
```

**Features:**
- Email input
- Role selection (Admin/User)
- Multi-select bots
- Granular permissions per bot
- Send invitation email

---

### **3. User Detail Page**

**Location:** `/dashboard/users/[id]`

**Features:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to Users                                         │
├─────────────────────────────────────────────────────────┤
│ 👤 John Doe                                             │
│ john@example.com                                        │
│ Role: Admin                                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Assigned Bots (2):                                      │
│                                                          │
│ ┌────────────────────────────────────────────────┐     │
│ │ as (628123456789)                              │     │
│ │ Permissions:                                   │     │
│ │ ✅ View  ✅ Edit  ❌ Delete                     │     │
│ │ ✅ Campaigns  ✅ Rules  ✅ Analytics            │     │
│ │                                [Edit] [Revoke] │     │
│ └────────────────────────────────────────────────┘     │
│                                                          │
│ ┌────────────────────────────────────────────────┐     │
│ │ test (628987654321)                            │     │
│ │ Permissions:                                   │     │
│ │ ✅ View  ❌ Edit  ❌ Delete                     │     │
│ │ ✅ Campaigns  ❌ Rules  ✅ Analytics            │     │
│ │                                [Edit] [Revoke] │     │
│ └────────────────────────────────────────────────┘     │
│                                                          │
│ Activity Log:                                           │
│ - Created campaign "Promo" on as (2 hours ago)         │
│ - Viewed analytics for test (1 day ago)                │
│                                                          │
│         [Edit User]  [Delete User]                      │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- User info (name, email, role)
- List of assigned bots
- Permissions per bot
- Edit/Revoke access
- Activity log
- Edit/Delete user

---

### **4. Manage Bot Access Modal**

**Triggered by:** Click "Manage Access" on bot detail page

**Modal Content:**
```
┌─────────────────────────────────────────┐
│ Manage Access: as                  [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Users with Access (2):                  │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ John Doe (john@example.com)     │   │
│ │ Role: Admin                     │   │
│ │ ✅ View  ✅ Edit  ❌ Delete      │   │
│ │ ✅ Campaigns  ✅ Rules           │   │
│ │                    [Edit] [×]   │   │
│ └─────────────────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Jane Smith (jane@example.com)   │   │
│ │ Role: User                      │   │
│ │ ✅ View  ❌ Edit  ❌ Delete      │   │
│ │ ✅ Campaigns  ❌ Rules           │   │
│ │                    [Edit] [×]   │   │
│ └─────────────────────────────────┘   │
│                                         │
│ [+ Add User]                            │
│                                         │
│                        [Close]          │
└─────────────────────────────────────────┘
```

**Features:**
- List users with access to this bot
- Show permissions per user
- Edit permissions
- Revoke access
- Add new user

---

## 🔒 PERMISSION CHECKS

### **Frontend Guards**

```tsx
// Check if user is owner
const isOwner = userRole === 'owner'

// Show owner-only features
{isOwner && (
  <Link href="/dashboard/users">
    <MenuItem icon="👥" label="Users" />
  </Link>
)}

// Show manage access button
{isOwner && (
  <button onClick={openAccessModal}>
    Manage Access
  </button>
)}
```

### **Backend Middleware**

```typescript
// Check if user is owner
const requireOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' })
  }
  next()
}

// Use in routes
router.get('/api/users', requireOwner, listUsers)
router.post('/api/users/invite', requireOwner, inviteUser)
router.delete('/api/users/:id', requireOwner, deleteUser)
```

---

## 📊 SUMMARY - OWNER-SPECIFIC FEATURES

### **Sidebar:**
- ✅ Add "Users" menu item (owner only)

### **Dashboard:**
- ✅ Add "Total Users" stat card (owner only)

### **Bot List:**
- ✅ Show user count per bot (owner only)

### **Bot Detail:**
- ✅ Add "Manage Access" button (owner only)

### **New Pages:**
- ✅ `/dashboard/users` - User management
- ✅ `/dashboard/users/[id]` - User detail
- ✅ Invite user modal
- ✅ Manage bot access modal

### **Permissions:**
- ✅ Only owner can invite users
- ✅ Only owner can edit/delete users
- ✅ Only owner can assign bot permissions
- ✅ Only owner can view all users

---

## 🚀 IMPLEMENTATION ORDER

**Phase 1: UI Updates**
```
1. Add "Users" to sidebar (owner only)
2. Add "Total Users" stat to dashboard
3. Add "Manage Access" button to bot detail
4. Add user count to bot cards
```

**Phase 2: User Management**
```
1. Create /dashboard/users page
2. Create invite user modal
3. Create user detail page
4. Create manage bot access modal
```

**Phase 3: Backend**
```
1. Create users API endpoints
2. Create permissions API endpoints
3. Add owner middleware
4. Add permission checks
```

**Phase 4: Testing**
```
1. Test user invitation
2. Test permission assignment
3. Test access control
4. Test edge cases
```

---

**Mau mulai implementasi?** 🚀

Saya bisa mulai dari:
1. **UI Updates** - Add sidebar menu & buttons
2. **User Management Page** - Create users list
3. **Backend API** - Setup endpoints

Pilih mana yang mau duluan! 😊
