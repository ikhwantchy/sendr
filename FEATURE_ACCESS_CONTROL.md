# 🎯 FEATURE-BASED ACCESS CONTROL - DETAILED IMPLEMENTATION

## 📋 KONSEP UTAMA

### **Admin Role:**
- ✅ Mengatur **akses fitur** per bot per user
- ✅ Set limits (daily/monthly) per fitur
- ✅ Enable/disable fitur untuk user tertentu
- ❌ **TIDAK** manage konten (keywords, messages, dll)

### **Client/User Role:**
- ✅ **Manage konten** untuk fitur yang di-enable
- ✅ Create/edit/delete rules, campaigns, reminders
- ✅ Lihat analytics untuk fitur yang di-enable
- ❌ **TIDAK** bisa akses fitur yang di-lock
- ❌ **TIDAK** bisa ubah feature permissions

---

## 🎨 UI BEHAVIOR - FEATURE-BASED RENDERING

### **Scenario 1: User dengan Auto Reply Only**

#### **Sidebar Navigation:**
```
┌─────────────────────────┐
│ 🏠 Dashboard            │ ✅ Visible
│ 🤖 Bots                 │ ✅ Visible (assigned bots only)
│ ⚡ Rules (Auto Reply)   │ ✅ Visible & Enabled
│ 📢 Campaigns            │ 🔒 Hidden/Locked
│ ⏰ Reminders            │ 🔒 Hidden/Locked
│ 📊 Analytics            │ 🔒 Hidden/Locked
└─────────────────────────┘
```

#### **Bot Detail Page:**
```
┌─────────────────────────────────────────┐
│ Customer Service Bot                    │
│ Tabs: [Connection] [Rules] [Settings]  │ ✅ Only enabled tabs
│                                         │
│ ❌ NO Campaigns tab                     │
│ ❌ NO Reminders tab                     │
│ ❌ NO Analytics tab                     │
└─────────────────────────────────────────┘
```

### **Scenario 2: User dengan Auto Reply + Campaigns**

#### **Sidebar Navigation:**
```
┌─────────────────────────┐
│ 🏠 Dashboard            │ ✅ Visible
│ 🤖 Bots                 │ ✅ Visible
│ ⚡ Rules (Auto Reply)   │ ✅ Visible & Enabled
│ 📢 Campaigns            │ ✅ Visible & Enabled
│ ⏰ Reminders            │ 🔒 Hidden/Locked
│ 📊 Analytics            │ 🔒 Hidden/Locked
└─────────────────────────┘
```

### **Scenario 3: User dengan All Features**

#### **Sidebar Navigation:**
```
┌─────────────────────────┐
│ 🏠 Dashboard            │ ✅ Visible
│ 🤖 Bots                 │ ✅ Visible
│ ⚡ Rules (Auto Reply)   │ ✅ Visible & Enabled
│ 📢 Campaigns            │ ✅ Visible & Enabled
│ ⏰ Reminders            │ ✅ Visible & Enabled
│ 📊 Analytics            │ ✅ Visible & Enabled
│ 🔌 Data Sources         │ ✅ Visible & Enabled
└─────────────────────────┘
```

---

## 🔧 BACKEND IMPLEMENTATION

### **1. Get User Feature Permissions API**

```typescript
// GET /api/users/me/features
// Returns all features user has access to across all their bots

interface UserFeatureAccess {
  bot_id: string;
  bot_name: string;
  features: {
    feature_key: string;
    feature_name: string;
    is_enabled: boolean;
    daily_limit: number | null;
    daily_usage: number;
    monthly_limit: number | null;
    monthly_usage: number;
  }[];
}

export const getUserFeatures = async (req: Request, res: Response) => {
  const userId = req.user.id;
  
  // Get all bots user has access to
  const botUsers = await botUserRepository.findByUserId(userId);
  
  const result: UserFeatureAccess[] = [];
  
  for (const botUser of botUsers) {
    const bot = await botRepository.findById(botUser.bot_id);
    const permissions = await featurePermissionRepository.findByBotAndUser(
      botUser.bot_id,
      userId
    );
    
    // Get usage stats
    const features = await Promise.all(
      permissions.map(async (perm) => {
        const usage = await getFeatureUsage(
          botUser.bot_id,
          userId,
          perm.feature_key
        );
        
        return {
          feature_key: perm.feature_key,
          feature_name: await getFeatureName(perm.feature_key),
          is_enabled: perm.is_enabled,
          daily_limit: perm.daily_limit,
          daily_usage: usage.daily,
          monthly_limit: perm.monthly_limit,
          monthly_usage: usage.monthly,
        };
      })
    );
    
    result.push({
      bot_id: bot.id,
      bot_name: bot.name,
      features: features.filter(f => f.is_enabled),
    });
  }
  
  res.json({ success: true, data: result });
};
```

### **2. Feature Access Middleware (Enhanced)**

```typescript
// Middleware to check feature access
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { botId } = req.params;
    const userId = req.user.id;
    
    // Admin bypass
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check bot access
    const botUser = await botUserRepository.findByBotAndUser(botId, userId);
    if (!botUser?.is_active) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this bot',
      });
    }
    
    // Check feature permission
    const permission = await featurePermissionRepository.findByBotUserFeature(
      botId,
      userId,
      featureKey
    );
    
    if (!permission?.is_enabled) {
      return res.status(403).json({
        success: false,
        error: `Feature '${featureKey}' is not enabled for you`,
        feature_key: featureKey,
      });
    }
    
    // Check limits
    const usage = await getFeatureUsage(botId, userId, featureKey);
    
    if (permission.daily_limit && usage.daily >= permission.daily_limit) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit exceeded',
        limit: permission.daily_limit,
        usage: usage.daily,
      });
    }
    
    if (permission.monthly_limit && usage.monthly >= permission.monthly_limit) {
      return res.status(429).json({
        success: false,
        error: 'Monthly limit exceeded',
        limit: permission.monthly_limit,
        usage: usage.monthly,
      });
    }
    
    // Attach to request
    req.featurePermission = permission;
    req.featureUsage = usage;
    
    next();
  };
};
```

### **3. Apply Middleware to Routes**

```typescript
// Rules (Auto Reply)
router.get('/bots/:botId/rules', 
  authenticate, 
  requireFeature('auto_reply'),
  ruleController.list
);

router.post('/bots/:botId/rules', 
  authenticate, 
  requireFeature('auto_reply'),
  ruleController.create
);

// Campaigns
router.get('/bots/:botId/campaigns', 
  authenticate, 
  requireFeature('campaigns'),
  campaignController.list
);

router.post('/bots/:botId/campaigns', 
  authenticate, 
  requireFeature('campaigns'),
  campaignController.create
);

// Reminders
router.get('/bots/:botId/reminders', 
  authenticate, 
  requireFeature('reminders'),
  reminderController.list
);

router.post('/bots/:botId/reminders', 
  authenticate, 
  requireFeature('reminders'),
  reminderController.create
);

// Analytics
router.get('/bots/:botId/analytics', 
  authenticate, 
  requireFeature('analytics'),
  analyticsController.get
);
```

---

## 🎨 FRONTEND IMPLEMENTATION

### **1. Feature Context Provider**

```typescript
// contexts/FeatureContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface FeaturePermission {
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
  daily_limit: number | null;
  daily_usage: number;
  monthly_limit: number | null;
  monthly_usage: number;
}

interface BotFeatures {
  bot_id: string;
  bot_name: string;
  features: FeaturePermission[];
}

interface FeatureContextType {
  botFeatures: BotFeatures[];
  loading: boolean;
  hasFeature: (botId: string, featureKey: string) => boolean;
  getFeaturePermission: (botId: string, featureKey: string) => FeaturePermission | null;
  refresh: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | null>(null);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const [botFeatures, setBotFeatures] = useState<BotFeatures[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      const response = await api.get('/users/me/features');
      setBotFeatures(response.data.data);
    } catch (error) {
      console.error('Failed to fetch features:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const hasFeature = (botId: string, featureKey: string): boolean => {
    const bot = botFeatures.find(b => b.bot_id === botId);
    if (!bot) return false;
    
    const feature = bot.features.find(f => f.feature_key === featureKey);
    return feature?.is_enabled || false;
  };

  const getFeaturePermission = (botId: string, featureKey: string): FeaturePermission | null => {
    const bot = botFeatures.find(b => b.bot_id === botId);
    if (!bot) return null;
    
    return bot.features.find(f => f.feature_key === featureKey) || null;
  };

  return (
    <FeatureContext.Provider value={{
      botFeatures,
      loading,
      hasFeature,
      getFeaturePermission,
      refresh: fetchFeatures,
    }}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within FeatureProvider');
  }
  return context;
};
```

### **2. Feature Guard Component**

```typescript
// components/FeatureGuard.tsx
import { useFeatures } from '@/contexts/FeatureContext';
import { useParams } from 'next/navigation';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLocked?: boolean; // Show locked state instead of hiding
}

export function FeatureGuard({ 
  feature, 
  children, 
  fallback = null,
  showLocked = false 
}: FeatureGuardProps) {
  const { botId } = useParams();
  const { hasFeature, loading } = useFeatures();

  if (loading) {
    return <div>Loading...</div>;
  }

  const hasAccess = hasFeature(botId as string, feature);

  if (!hasAccess) {
    if (showLocked) {
      return (
        <div className="glass rounded-2xl border border-white/10 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-500/20 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Feature Locked</h3>
          <p className="text-gray-400">This feature is not enabled for your account.</p>
          <p className="text-sm text-gray-500 mt-2">Contact your administrator to enable this feature.</p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### **3. Dynamic Sidebar Navigation**

```typescript
// components/Sidebar.tsx
import { useFeatures } from '@/contexts/FeatureContext';
import { useParams } from 'next/navigation';

export default function Sidebar() {
  const { botId } = useParams();
  const { hasFeature, loading } = useFeatures();
  const pathname = usePathname();

  // Define all possible navigation items with feature requirements
  const allNavItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <HomeIcon />,
      feature: null, // Always visible
    },
    {
      name: 'Bots',
      href: '/dashboard/bots',
      icon: <BotIcon />,
      feature: null, // Always visible
    },
    {
      name: 'Rules',
      href: '/dashboard/rules',
      icon: <RulesIcon />,
      feature: 'auto_reply',
    },
    {
      name: 'Campaigns',
      href: '/dashboard/campaigns',
      icon: <CampaignIcon />,
      feature: 'campaigns',
    },
    {
      name: 'Reminders',
      href: '/dashboard/reminders',
      icon: <ReminderIcon />,
      feature: 'reminders',
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: <AnalyticsIcon />,
      feature: 'analytics',
    },
    {
      name: 'Data Sources',
      href: '/dashboard/datasources',
      icon: <DataIcon />,
      feature: 'data_sources',
    },
  ];

  // Filter navigation based on features
  const navigation = allNavItems.filter(item => {
    // Always show items without feature requirement
    if (!item.feature) return true;
    
    // If no bot selected, hide feature-specific items
    if (!botId) return false;
    
    // Check if user has access to this feature
    return hasFeature(botId as string, item.feature);
  });

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="logo">BroBot</div>

      {/* Navigation */}
      <nav>
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={pathname === item.href ? 'active' : ''}
          >
            {item.icon}
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
```

### **4. Bot Detail Page with Dynamic Tabs**

```typescript
// app/dashboard/bots/[id]/page.tsx
import { FeatureGuard } from '@/components/FeatureGuard';
import { useFeatures } from '@/contexts/FeatureContext';

export default function BotDetailPage() {
  const { botId } = useParams();
  const { hasFeature } = useFeatures();

  // Define all possible tabs
  const allTabs = [
    { key: 'connection', label: 'Connection', feature: null },
    { key: 'rules', label: 'Rules', feature: 'auto_reply' },
    { key: 'campaigns', label: 'Campaigns', feature: 'campaigns' },
    { key: 'reminders', label: 'Reminders', feature: 'reminders' },
    { key: 'analytics', label: 'Analytics', feature: 'analytics' },
    { key: 'settings', label: 'Settings', feature: null },
  ];

  // Filter tabs based on features
  const availableTabs = allTabs.filter(tab => {
    if (!tab.feature) return true;
    return hasFeature(botId as string, tab.feature);
  });

  return (
    <div className="p-8">
      <h1>Bot Management</h1>

      {/* Dynamic Tabs */}
      <div className="tabs">
        {availableTabs.map(tab => (
          <button key={tab.key} className="tab">
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content with Feature Guards */}
      <div className="tab-content">
        {/* Connection - Always visible */}
        <ConnectionTab />

        {/* Rules - Only if auto_reply enabled */}
        <FeatureGuard feature="auto_reply">
          <RulesTab />
        </FeatureGuard>

        {/* Campaigns - Only if campaigns enabled */}
        <FeatureGuard feature="campaigns">
          <CampaignsTab />
        </FeatureGuard>

        {/* Reminders - Only if reminders enabled */}
        <FeatureGuard feature="reminders">
          <RemindersTab />
        </FeatureGuard>

        {/* Analytics - Only if analytics enabled */}
        <FeatureGuard feature="analytics">
          <AnalyticsTab />
        </FeatureGuard>

        {/* Settings - Always visible */}
        <SettingsTab />
      </div>
    </div>
  );
}
```

### **5. Feature Usage Display**

```typescript
// components/FeatureUsageBar.tsx
import { useFeatures } from '@/contexts/FeatureContext';

interface FeatureUsageBarProps {
  botId: string;
  feature: string;
}

export function FeatureUsageBar({ botId, feature }: FeatureUsageBarProps) {
  const { getFeaturePermission } = useFeatures();
  const permission = getFeaturePermission(botId, feature);

  if (!permission) return null;

  const { daily_limit, daily_usage, monthly_limit, monthly_usage } = permission;

  // Show daily usage if limit exists
  if (daily_limit) {
    const percentage = (daily_usage / daily_limit) * 100;
    const isNearLimit = percentage >= 80;

    return (
      <div className="glass rounded-xl p-4 border border-white/10 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Daily Usage</span>
          <span className={`text-sm font-bold ${isNearLimit ? 'text-orange-400' : 'text-cyan-400'}`}>
            {daily_usage} / {daily_limit}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {isNearLimit && (
          <p className="text-xs text-orange-400 mt-2">
            ⚠️ You're approaching your daily limit
          </p>
        )}
      </div>
    );
  }

  return null;
}
```

---

## 📝 EXAMPLE USER FLOWS

### **Flow 1: User dengan Auto Reply Only**

1. **Login** → Dashboard
2. **Sidebar** menampilkan:
   - ✅ Dashboard
   - ✅ Bots
   - ✅ Rules (Auto Reply)
   - 🔒 Campaigns (Hidden)
   - 🔒 Reminders (Hidden)
   - 🔒 Analytics (Hidden)

3. **Click Bot** → Bot Detail Page
4. **Tabs** yang muncul:
   - ✅ Connection
   - ✅ Rules
   - ✅ Settings
   - ❌ Campaigns (Not shown)
   - ❌ Reminders (Not shown)
   - ❌ Analytics (Not shown)

5. **Rules Tab**:
   - ✅ Bisa create/edit/delete rules
   - ✅ Set keywords dan responses
   - ✅ Lihat usage stats
   - ✅ Test rules

### **Flow 2: User dengan Campaigns Only**

1. **Login** → Dashboard
2. **Sidebar** menampilkan:
   - ✅ Dashboard
   - ✅ Bots
   - ✅ Campaigns
   - 🔒 Rules (Hidden)
   - 🔒 Reminders (Hidden)

3. **Click Bot** → Bot Detail Page
4. **Tabs** yang muncul:
   - ✅ Connection
   - ✅ Campaigns
   - ✅ Settings
   - ❌ Rules (Not shown)

5. **Campaigns Tab**:
   - ✅ Create campaign
   - ✅ Upload contacts
   - ✅ Send broadcast
   - ✅ View campaign stats
   - ⚠️ Daily limit: 5 campaigns
   - ⚠️ Usage bar showing 2/5 used

### **Flow 3: Admin**

1. **Login** → Dashboard
2. **Sidebar** menampilkan **semua fitur**
3. **Extra menu**:
   - ✅ User Management
   - ✅ Feature Permissions
   - ✅ System Settings

4. **Bot Management**:
   - ✅ Create/delete bots
   - ✅ Assign users
   - ✅ Configure feature permissions
   - ✅ Set limits
   - ✅ View all bots

---

## 🎯 KEY BENEFITS

### **For Admin:**
1. ✅ **Granular Control** - Enable/disable features per user per bot
2. ✅ **Usage Limits** - Prevent abuse dengan daily/monthly limits
3. ✅ **Easy Management** - UI untuk manage permissions
4. ✅ **Audit Trail** - Track siapa punya akses apa

### **For Users:**
1. ✅ **Clean UI** - Hanya lihat fitur yang bisa dipakai
2. ✅ **No Confusion** - Tidak ada locked features yang membingungkan
3. ✅ **Full Control** - Manage konten untuk enabled features
4. ✅ **Usage Visibility** - Lihat limit dan usage mereka

---

## 🚀 IMPLEMENTATION PRIORITY

### **Phase 1: Core Feature Access (Week 1)**
- [ ] Database tables & migrations
- [ ] Feature permission repository
- [ ] Feature access middleware
- [ ] User features API endpoint

### **Phase 2: Frontend Foundation (Week 2)**
- [ ] FeatureContext provider
- [ ] FeatureGuard component
- [ ] Dynamic sidebar navigation
- [ ] Feature usage components

### **Phase 3: Bot Management UI (Week 3)**
- [ ] Admin: Feature permission management
- [ ] Admin: User assignment flow
- [ ] User: Dynamic bot detail tabs
- [ ] User: Feature-specific pages

### **Phase 4: Testing & Polish (Week 4)**
- [ ] Test all permission scenarios
- [ ] Test limit enforcement
- [ ] UI/UX refinement
- [ ] Documentation

---

**Apakah ini sesuai dengan yang kamu maksud?** 🎯

Kalau sudah OK, saya bisa mulai implement dari Phase 1! 🚀
