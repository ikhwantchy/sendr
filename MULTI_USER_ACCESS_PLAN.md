# 🔐 MULTI-USER ACCESS & PERMISSIONS - IMPLEMENTATION PLAN

## 🎯 OBJECTIVE

Implementasi sistem multi-user dengan role-based access control dimana:
- **Admin** dapat memberikan akses ke user lain
- **User** hanya bisa akses bot yang di-assign ke mereka
- **Permissions** granular per bot

---

## 📊 ARCHITECTURE

### **User Roles:**
```
1. OWNER (Super Admin)
   - Full access ke semua bot
   - Manage users
   - Assign permissions
   
2. ADMIN
   - Manage assigned bots
   - Create campaigns
   - View analytics
   
3. USER (Operator)
   - View assigned bots
   - Create campaigns (if allowed)
   - Limited access
```

---

## 🗄️ DATABASE SCHEMA

### **1. Users Table (Existing)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'owner', 'admin', 'user'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Bot Permissions Table (NEW)**
```sql
CREATE TABLE bot_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Permissions
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_create_campaigns BOOLEAN DEFAULT true,
  can_create_rules BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT true,
  
  -- Metadata
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(bot_id, user_id)
);

CREATE INDEX idx_bot_permissions_user ON bot_permissions(user_id);
CREATE INDEX idx_bot_permissions_bot ON bot_permissions(bot_id);
```

### **3. User Invitations Table (NEW)**
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  invited_by UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_invitations_token (token),
  INDEX idx_invitations_email (email)
);
```

---

## 🚀 FEATURES TO IMPLEMENT

### **Phase 1: User Management (Admin)**

#### **1.1 User List Page**
```
Location: /dashboard/users

Features:
- List all users
- Show role (Owner, Admin, User)
- Show assigned bots count
- Invite new user button
- Edit/Delete user
```

#### **1.2 Invite User Modal**
```
Fields:
- Email
- Role (Admin/User)
- Assign Bots (multi-select)
- Permissions per bot:
  ☑ Can View
  ☑ Can Edit
  ☑ Can Delete
  ☑ Can Create Campaigns
  ☑ Can Create Rules
  ☑ Can View Analytics
```

#### **1.3 User Detail Page**
```
Location: /dashboard/users/[id]

Sections:
- User Info (name, email, role)
- Assigned Bots
- Permissions per bot
- Activity log
- Edit/Revoke access
```

---

### **Phase 2: Permission Enforcement**

#### **2.1 Bot List Filtering**
```typescript
// Only show bots user has access to
const { data: bots } = useQuery({
  queryKey: ['bots', userId],
  queryFn: async () => {
    const response = await api.bots.listUserBots(userId)
    return response.data.data
  }
})
```

#### **2.2 Permission Checks**
```typescript
// Check if user can perform action
const canCreateCampaign = (botId: string) => {
  const permission = userPermissions.find(p => p.bot_id === botId)
  return permission?.can_create_campaigns || false
}

// Disable button if no permission
<button 
  disabled={!canCreateCampaign(botId)}
  onClick={...}
>
  New Campaign
</button>
```

#### **2.3 Route Protection**
```typescript
// Middleware to check permissions
const checkBotAccess = async (botId: string, userId: string, action: string) => {
  const permission = await db.bot_permissions.findOne({
    bot_id: botId,
    user_id: userId
  })
  
  if (!permission) return false
  
  switch(action) {
    case 'view': return permission.can_view
    case 'edit': return permission.can_edit
    case 'delete': return permission.can_delete
    case 'create_campaign': return permission.can_create_campaigns
    case 'create_rule': return permission.can_create_rules
    case 'view_analytics': return permission.can_view_analytics
    default: return false
  }
}
```

---

### **Phase 3: Invitation System**

#### **3.1 Send Invitation**
```typescript
// Admin sends invitation
const inviteUser = async (email: string, role: string, botIds: string[]) => {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  
  await db.user_invitations.create({
    email,
    role,
    invited_by: currentUserId,
    token,
    expires_at: expiresAt
  })
  
  // Send email with invitation link
  await sendEmail({
    to: email,
    subject: 'Invitation to BroBot',
    body: `Click here to accept: ${APP_URL}/accept-invitation?token=${token}`
  })
}
```

#### **3.2 Accept Invitation**
```
Location: /accept-invitation?token=xxx

Flow:
1. Verify token
2. Show invitation details
3. User creates account (if new)
4. User logs in (if existing)
5. Assign permissions
6. Redirect to dashboard
```

---

## 📝 API ENDPOINTS

### **User Management**

```typescript
// List users
GET /api/users
Response: { users: User[] }

// Get user detail
GET /api/users/:id
Response: { user: User, permissions: Permission[] }

// Invite user
POST /api/users/invite
Body: { email, role, bot_ids, permissions }
Response: { invitation: Invitation }

// Update user
PUT /api/users/:id
Body: { name, role }
Response: { user: User }

// Delete user
DELETE /api/users/:id
Response: { success: true }
```

### **Permissions**

```typescript
// Get user permissions
GET /api/permissions/user/:userId
Response: { permissions: Permission[] }

// Get bot permissions
GET /api/permissions/bot/:botId
Response: { permissions: Permission[] }

// Grant permission
POST /api/permissions
Body: { bot_id, user_id, permissions }
Response: { permission: Permission }

// Update permission
PUT /api/permissions/:id
Body: { permissions }
Response: { permission: Permission }

// Revoke permission
DELETE /api/permissions/:id
Response: { success: true }
```

### **Bots (Updated)**

```typescript
// List user's bots (filtered by permissions)
GET /api/bots/user/:userId
Response: { bots: Bot[] }

// Check bot access
GET /api/bots/:botId/check-access/:userId
Response: { has_access: boolean, permissions: Permission }
```

---

## 🎨 UI COMPONENTS

### **1. User Management Page**

```tsx
// frontend/src/app/dashboard/users/page.tsx

export default function UsersPage() {
  return (
    <div>
      <h1>User Management</h1>
      
      <button onClick={() => setShowInviteModal(true)}>
        Invite User
      </button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Bots</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td><Badge>{user.role}</Badge></td>
              <td>{user.bots_count} bots</td>
              <td>
                <button>Edit</button>
                <button>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### **2. Invite User Modal**

```tsx
// frontend/src/components/InviteUserModal.tsx

export default function InviteUserModal({ onClose }: any) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'user',
    bot_ids: [],
    permissions: {
      can_view: true,
      can_edit: false,
      can_delete: false,
      can_create_campaigns: true,
      can_create_rules: false,
      can_view_analytics: true,
    }
  })
  
  return (
    <Modal>
      <h2>Invite User</h2>
      
      <input 
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={...}
      />
      
      <select value={formData.role} onChange={...}>
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
      
      <h3>Assign Bots</h3>
      <MultiSelect
        options={bots}
        value={formData.bot_ids}
        onChange={...}
      />
      
      <h3>Permissions</h3>
      <Checkbox 
        label="Can View"
        checked={formData.permissions.can_view}
        onChange={...}
      />
      <Checkbox 
        label="Can Edit"
        checked={formData.permissions.can_edit}
        onChange={...}
      />
      {/* ... more permissions */}
      
      <button onClick={handleInvite}>Send Invitation</button>
    </Modal>
  )
}
```

### **3. Permission Badge**

```tsx
// frontend/src/components/PermissionBadge.tsx

export function PermissionBadge({ permission, botId }: any) {
  const hasAccess = permission?.can_view || false
  
  if (!hasAccess) {
    return <Badge color="red">No Access</Badge>
  }
  
  const permissions = []
  if (permission.can_edit) permissions.push('Edit')
  if (permission.can_delete) permissions.push('Delete')
  if (permission.can_create_campaigns) permissions.push('Campaigns')
  if (permission.can_create_rules) permissions.push('Rules')
  
  return (
    <div>
      <Badge color="green">Access</Badge>
      <span>{permissions.join(', ')}</span>
    </div>
  )
}
```

---

## 🔒 SECURITY CONSIDERATIONS

### **1. Backend Validation**
```typescript
// Always check permissions on backend
router.post('/api/campaigns', async (req, res) => {
  const { bot_id } = req.body
  const userId = req.user.id
  
  // Check permission
  const hasAccess = await checkBotAccess(bot_id, userId, 'create_campaign')
  if (!hasAccess) {
    return res.status(403).json({ error: 'No permission' })
  }
  
  // Proceed with campaign creation
  // ...
})
```

### **2. Frontend Guards**
```typescript
// Hide/disable UI elements based on permissions
const { data: permissions } = useQuery({
  queryKey: ['permissions', userId],
  queryFn: async () => {
    const response = await api.permissions.getUserPermissions(userId)
    return response.data.data
  }
})

// Use in components
{permissions?.can_create_campaigns && (
  <button onClick={createCampaign}>New Campaign</button>
)}
```

### **3. Row-Level Security (PostgreSQL)**
```sql
-- Enable RLS
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see bots they have access to
CREATE POLICY bot_access_policy ON bots
  FOR SELECT
  USING (
    id IN (
      SELECT bot_id FROM bot_permissions 
      WHERE user_id = current_user_id()
    )
    OR owner_id = current_user_id()
  );
```

---

## 📋 IMPLEMENTATION STEPS

### **Step 1: Database Setup**
```
1. Create migration for bot_permissions table
2. Create migration for user_invitations table
3. Add indexes
4. Run migrations
```

### **Step 2: Backend API**
```
1. Create permissions controller
2. Create users controller
3. Add permission middleware
4. Update bots controller (filter by permissions)
5. Add invitation endpoints
```

### **Step 3: Frontend - User Management**
```
1. Create /dashboard/users page
2. Create InviteUserModal component
3. Create UserDetailPage
4. Add permission checks to existing pages
```

### **Step 4: Frontend - Permission Enforcement**
```
1. Create usePermissions hook
2. Add permission checks to bot list
3. Add permission checks to campaign creation
4. Add permission checks to rules
5. Disable/hide buttons based on permissions
```

### **Step 5: Invitation Flow**
```
1. Create /accept-invitation page
2. Add email service integration
3. Create invitation email template
4. Test invitation flow
```

### **Step 6: Testing**
```
1. Test user invitation
2. Test permission assignment
3. Test permission enforcement
4. Test edge cases (revoke access, etc)
```

---

## 🎯 PRIORITY

**High Priority:**
- ✅ Database schema
- ✅ Permission middleware
- ✅ User management page
- ✅ Invite user flow
- ✅ Bot list filtering

**Medium Priority:**
- ✅ Permission badges
- ✅ User detail page
- ✅ Activity log

**Low Priority:**
- ✅ Email notifications
- ✅ Advanced permissions
- ✅ Audit trail

---

## 📊 ESTIMATED TIMELINE

```
Phase 1: Database & Backend API     - 2-3 hours
Phase 2: User Management UI         - 2-3 hours
Phase 3: Permission Enforcement     - 2-3 hours
Phase 4: Invitation System          - 1-2 hours
Phase 5: Testing & Polish           - 1-2 hours

Total: 8-13 hours
```

---

## ✅ NEXT STEPS

**Ready to start?**

1. **Database Migration** - Create tables
2. **Backend API** - Implement endpoints
3. **Frontend UI** - User management page
4. **Permission Checks** - Enforce access control
5. **Testing** - Verify everything works

**Mau mulai dari mana?**
- Database setup dulu?
- Backend API dulu?
- Frontend UI dulu?

Let me know! 🚀
