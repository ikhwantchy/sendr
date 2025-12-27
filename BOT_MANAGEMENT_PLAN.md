# 🤖 BOT MANAGEMENT SYSTEM - IMPLEMENTATION PLAN

## 📋 OVERVIEW

Sistem multi-tenant bot management dengan role-based access control dan feature permissions. Admin dapat membuat bot, assign ke client/user, dan mengatur fitur apa saja yang bisa digunakan oleh masing-masing user.

---

## 🎯 USER ROLES & PERMISSIONS

### 1. **ADMIN (Super User)**
- ✅ Create/Delete bots
- ✅ Assign bots to clients/users
- ✅ Configure feature permissions per bot per user
- ✅ View all bots in system
- ✅ Full access to all features

### 2. **CLIENT/USER**
- ✅ View assigned bots only
- ✅ Use features based on permissions granted by admin
- ✅ Cannot create/delete bots
- ✅ Cannot modify feature permissions

---

## 🗄️ DATABASE SCHEMA

### **1. Bots Table (Already Exists - Need Updates)**
```sql
CREATE TABLE bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    owner_id TEXT,                    -- NEW: User ID of bot owner
    created_by TEXT NOT NULL,         -- NEW: Admin who created the bot
    status TEXT DEFAULT 'disconnected',
    phone_number TEXT,
    qr_code TEXT,
    qr_expires_at TEXT,
    last_connected_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    -- Bot Settings
    max_daily_messages INTEGER DEFAULT 1000,  -- NEW: Daily message limit
    is_active BOOLEAN DEFAULT 1,              -- NEW: Bot active/inactive
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### **2. Bot Users (NEW - User Access to Bots)**
```sql
CREATE TABLE bot_users (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,        -- Admin who assigned
    assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    
    UNIQUE(bot_id, user_id)
);
```

### **3. Bot Feature Permissions (NEW)**
```sql
CREATE TABLE bot_feature_permissions (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,        -- e.g., 'auto_reply', 'campaigns', 'reminders'
    is_enabled BOOLEAN DEFAULT 1,
    
    -- Feature-specific limits (optional)
    daily_limit INTEGER,              -- e.g., max campaigns per day
    monthly_limit INTEGER,            -- e.g., max messages per month
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(bot_id, user_id, feature_key)
);
```

### **4. Feature Definitions (NEW - Master Features)**
```sql
CREATE TABLE features (
    key TEXT PRIMARY KEY,             -- e.g., 'auto_reply'
    name TEXT NOT NULL,               -- e.g., 'Auto Reply'
    description TEXT,
    category TEXT,                    -- e.g., 'automation', 'messaging', 'analytics'
    is_premium BOOLEAN DEFAULT 0,     -- Premium feature flag
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Default Features
INSERT INTO features (key, name, description, category, is_premium) VALUES
('auto_reply', 'Auto Reply', 'Automatic message responses based on keywords', 'automation', 0),
('campaigns', 'Broadcast Campaigns', 'Send bulk messages to multiple contacts', 'messaging', 0),
('reminders', 'Scheduled Reminders', 'Schedule messages for groups', 'automation', 0),
('analytics', 'Analytics Dashboard', 'View bot performance and statistics', 'analytics', 1),
('data_sources', 'Data Sources', 'Connect external data sources', 'integration', 1),
('webhooks', 'Webhooks', 'Integrate with external APIs', 'integration', 1),
('ai_responses', 'AI Responses', 'AI-powered automatic responses', 'automation', 1);
```

---

## 🎨 UI/UX DESIGN

### **PAGE 1: Bot List (Main Page)**

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 WhatsApp Bots                    [+ Create Bot] (Admin) │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Search bots...] [Filter: All ▼] [Sort: Name ▼]            │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🟢 Customer Service Bot                               │  │
│  │ Owner: John Doe (@johndoe)                            │  │
│  │ Status: Connected • 234 messages today                │  │
│  │ Features: Auto Reply, Campaigns, Reminders            │  │
│  │                                                         │  │
│  │ [Manage] [QR Code] [Disconnect]                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⚪ Sales Bot                                           │  │
│  │ Owner: Jane Smith (@janesmith)                        │  │
│  │ Status: Disconnected • Last active: 2 hours ago       │  │
│  │ Features: Auto Reply, Analytics                       │  │
│  │                                                         │  │
│  │ [Manage] [Connect] [Settings]                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **PAGE 2: Create Bot Modal (Admin Only)**

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Bot                                         [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Bot Name *                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Customer Service Bot                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Bot Owner *                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Select user... ▼                                     │    │
│  │  • John Doe (@johndoe)                               │    │
│  │  • Jane Smith (@janesmith)                           │    │
│  │  • Bob Wilson (@bobwilson)                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Daily Message Limit                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1000                                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Enable Features                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☑ Auto Reply                                         │    │
│  │ ☑ Broadcast Campaigns                                │    │
│  │ ☑ Scheduled Reminders                                │    │
│  │ ☐ Analytics Dashboard (Premium)                      │    │
│  │ ☐ Data Sources (Premium)                             │    │
│  │ ☐ Webhooks (Premium)                                 │    │
│  │ ☐ AI Responses (Premium)                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Cancel]                              [Create Bot]          │
└─────────────────────────────────────────────────────────────┘
```

### **PAGE 3: Bot Management Page**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Bots                                              │
│                                                               │
│  🤖 Customer Service Bot                                     │
│  Owner: John Doe (@johndoe)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  TABS: [Connection] [Settings] [Users] [Features] [Stats]   │
│                                                               │
│  ═══════════════════════════════════════════════════════════ │
│  CONNECTION TAB                                               │
│  ═══════════════════════════════════════════════════════════ │
│                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │ Connection Status       │  │ QR Code                 │   │
│  │                         │  │                         │   │
│  │ Status: 🟢 Connected   │  │  [QR Code Image]        │   │
│  │ Phone: +62812345678    │  │                         │   │
│  │ Connected: 2h ago      │  │  Connected!             │   │
│  │                         │  │                         │   │
│  │ [Disconnect Bot]        │  │                         │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **PAGE 4: Bot Settings Tab**

```
┌─────────────────────────────────────────────────────────────┐
│  SETTINGS TAB                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Basic Information                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Bot Name                                             │    │
│  │ Customer Service Bot                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Bot Owner                                            │    │
│  │ John Doe (@johndoe) ▼                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Limits & Restrictions                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Daily Message Limit                                  │    │
│  │ 1000                                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Bot Status                                           │    │
│  │ ● Active  ○ Inactive                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Danger Zone                                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Delete Bot] - This action cannot be undone          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [Cancel]                              [Save Changes]         │
└─────────────────────────────────────────────────────────────┘
```

### **PAGE 5: Users Tab (Assign Users)**

```
┌─────────────────────────────────────────────────────────────┐
│  USERS TAB                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Assigned Users                          [+ Assign User]     │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👤 John Doe (@johndoe)                                │  │
│  │ Role: Owner • Assigned: 5 days ago                    │  │
│  │ Features: All features enabled                        │  │
│  │                                                         │  │
│  │ [Manage Features] [Remove Access]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 👤 Jane Smith (@janesmith)                            │  │
│  │ Role: User • Assigned: 2 days ago                     │  │
│  │ Features: Auto Reply, Campaigns                       │  │
│  │                                                         │  │
│  │ [Manage Features] [Remove Access]                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **PAGE 6: Features Tab (Feature Permissions)**

```
┌─────────────────────────────────────────────────────────────┐
│  FEATURES TAB                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Configure feature access for each user                      │
│                                                               │
│  Select User: [John Doe ▼]                                   │
│                                                               │
│  ═══════════════════════════════════════════════════════════ │
│  AUTOMATION FEATURES                                          │
│  ═══════════════════════════════════════════════════════════ │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ☑ Auto Reply                                          │  │
│  │   Automatic message responses based on keywords       │  │
│  │   Daily Limit: [Unlimited ▼]                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ☑ Scheduled Reminders                                 │  │
│  │   Schedule messages for groups                        │  │
│  │   Daily Limit: [10 ▼]                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ☐ AI Responses (Premium) 👑                           │  │
│  │   AI-powered automatic responses                      │  │
│  │   [Upgrade to enable]                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ═══════════════════════════════════════════════════════════ │
│  MESSAGING FEATURES                                           │
│  ═══════════════════════════════════════════════════════════ │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ☑ Broadcast Campaigns                                 │  │
│  │   Send bulk messages to multiple contacts             │  │
│  │   Daily Limit: [5 campaigns ▼]                        │  │
│  │   Monthly Limit: [100 campaigns ▼]                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [Cancel]                              [Save Changes]         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 BACKEND API ENDPOINTS

### **Bot Management**

```typescript
// 1. List Bots (with filtering)
GET /api/bots
Query params: 
  - owner_id (optional)
  - status (optional)
  - search (optional)
Response: { success: true, data: Bot[] }

// 2. Create Bot (Admin only)
POST /api/bots
Body: {
  name: string,
  owner_id: string,
  max_daily_messages?: number,
  enabled_features: string[] // ['auto_reply', 'campaigns', ...]
}
Response: { success: true, data: Bot }

// 3. Update Bot
PUT /api/bots/:id
Body: {
  name?: string,
  owner_id?: string,
  max_daily_messages?: number,
  is_active?: boolean
}
Response: { success: true, data: Bot }

// 4. Delete Bot (Admin only)
DELETE /api/bots/:id
Response: { success: true }

// 5. Get Bot Details
GET /api/bots/:id
Response: { success: true, data: Bot }
```

### **User Assignment**

```typescript
// 1. Assign User to Bot
POST /api/bots/:id/users
Body: {
  user_id: string,
  enabled_features: string[]
}
Response: { success: true, data: BotUser }

// 2. Remove User from Bot
DELETE /api/bots/:id/users/:user_id
Response: { success: true }

// 3. List Bot Users
GET /api/bots/:id/users
Response: { success: true, data: BotUser[] }
```

### **Feature Permissions**

```typescript
// 1. Update User Feature Permissions
PUT /api/bots/:id/users/:user_id/features
Body: {
  features: [
    {
      feature_key: 'campaigns',
      is_enabled: true,
      daily_limit: 5,
      monthly_limit: 100
    },
    ...
  ]
}
Response: { success: true, data: BotFeaturePermission[] }

// 2. Get User Feature Permissions
GET /api/bots/:id/users/:user_id/features
Response: { success: true, data: BotFeaturePermission[] }

// 3. Check Feature Access (Middleware)
GET /api/bots/:id/features/:feature_key/check
Response: { 
  success: true, 
  data: { 
    has_access: boolean,
    daily_limit: number,
    daily_usage: number,
    monthly_limit: number,
    monthly_usage: number
  } 
}
```

### **Features Master**

```typescript
// 1. List All Features
GET /api/features
Response: { success: true, data: Feature[] }

// 2. Get Feature Details
GET /api/features/:key
Response: { success: true, data: Feature }
```

---

## 🔐 MIDDLEWARE & PERMISSIONS

### **1. Feature Access Middleware**

```typescript
// Check if user has access to specific feature
export const checkFeatureAccess = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const userId = req.user.id;
    
    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has access to this bot
    const botUser = await botUserRepository.findByBotAndUser(botId, userId);
    if (!botUser || !botUser.is_active) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this bot'
      });
    }
    
    // Check feature permission
    const permission = await featurePermissionRepository.findByBotUserFeature(
      botId, 
      userId, 
      featureKey
    );
    
    if (!permission || !permission.is_enabled) {
      return res.status(403).json({
        success: false,
        error: `Feature '${featureKey}' is not enabled for you`
      });
    }
    
    // Check daily/monthly limits
    const usage = await getFeatureUsage(botId, userId, featureKey);
    
    if (permission.daily_limit && usage.daily >= permission.daily_limit) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit exceeded for this feature'
      });
    }
    
    if (permission.monthly_limit && usage.monthly >= permission.monthly_limit) {
      return res.status(429).json({
        success: false,
        error: 'Monthly limit exceeded for this feature'
      });
    }
    
    // Attach permission to request
    req.featurePermission = permission;
    next();
  };
};

// Usage in routes:
router.post('/bots/:botId/campaigns', 
  authenticate,
  checkFeatureAccess('campaigns'),
  campaignController.create
);
```

---

## 📊 IMPLEMENTATION PHASES

### **Phase 1: Database & Backend (Week 1)**
- [ ] Create new database tables
- [ ] Create repositories for new tables
- [ ] Implement API endpoints
- [ ] Create middleware for feature access
- [ ] Add validation and error handling
- [ ] Write unit tests

### **Phase 2: Frontend - Bot List (Week 2)**
- [ ] Update Bots page with new design
- [ ] Add filtering and search
- [ ] Show bot owner and features
- [ ] Add Create Bot modal (admin only)
- [ ] Implement bot status indicators

### **Phase 3: Frontend - Bot Management (Week 3)**
- [ ] Create Bot Management page with tabs
- [ ] Implement Connection tab
- [ ] Implement Settings tab
- [ ] Implement Users tab
- [ ] Implement Features tab
- [ ] Add Stats tab (analytics)

### **Phase 4: Feature Permissions UI (Week 4)**
- [ ] Create feature permission management UI
- [ ] Add feature limit configuration
- [ ] Implement user assignment flow
- [ ] Add bulk permission updates
- [ ] Create permission templates

### **Phase 5: Testing & Polish (Week 5)**
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation

---

## 🎯 KEY FEATURES SUMMARY

### **For Admin:**
1. ✅ Create bots and assign to clients
2. ✅ Configure feature permissions per user
3. ✅ Set usage limits (daily/monthly)
4. ✅ View all bots and their status
5. ✅ Manage bot settings and ownership
6. ✅ Remove user access
7. ✅ View usage statistics

### **For Client/User:**
1. ✅ View assigned bots only
2. ✅ Use enabled features
3. ✅ See feature limits and usage
4. ✅ Connect/disconnect bots
5. ✅ View bot statistics
6. ❌ Cannot create/delete bots
7. ❌ Cannot modify permissions

---

## 🔒 SECURITY CONSIDERATIONS

1. **Role-Based Access Control (RBAC)**
   - Admin vs Client/User roles
   - Feature-level permissions
   - Bot-level access control

2. **Usage Limits**
   - Daily message limits
   - Feature-specific limits
   - Rate limiting on API endpoints

3. **Audit Trail**
   - Log all permission changes
   - Track who assigned/removed access
   - Monitor feature usage

4. **Data Isolation**
   - Users only see their assigned bots
   - Tenant-level data separation
   - Secure bot credentials

---

## 📈 FUTURE ENHANCEMENTS

1. **Permission Templates**
   - Pre-defined permission sets (Basic, Pro, Enterprise)
   - Quick assignment of common configurations

2. **Usage Analytics**
   - Feature usage reports
   - Cost tracking per bot
   - Performance metrics

3. **Billing Integration**
   - Usage-based billing
   - Feature-based pricing
   - Subscription management

4. **Notifications**
   - Alert when limits are reached
   - Notify on permission changes
   - Bot status notifications

---

**Ready to implement?** 🚀

Let me know if you want to start with Phase 1 (Database & Backend) or if you need any clarification on the design!
