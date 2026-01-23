# ADMIN MENU STRUCTURE - INVITE-ONLY SYSTEM
**For Internal/Enterprise WA Automation Platform**

---

## 📱 MENU STRUCTURE OVERVIEW

### **TOTAL NEW TABS: 8-10 Menu Utama**

```
ADMIN PANEL
├── 📊 Dashboard (NEW)
├── 👥 Users (ENHANCED)
├── 🤖 Bots (Existing - Minor Updates)
├── 📅 Reminders (Existing)
├── 💬 Auto-Replies (Existing)
├── 🔑 API Keys (NEW)
├── 📈 Analytics (NEW)
├── 📋 Audit Logs (NEW)
├── ⚙️ Settings (NEW)
└── 🛠️ System (NEW)
```

---

## 🎯 DETAILED MENU BREAKDOWN

### **1. 📊 DASHBOARD** (NEW - Priority #1)
**Route:** `/admin/dashboard`

**Sections:**
```
┌─────────────────────────────────────────┐
│ OVERVIEW STATS (4 Cards)                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │Users │ │Bots  │ │Msgs  │ │Active│   │
│ │  25  │ │  18  │ │ 1.2K │ │  12  │   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
├─────────────────────────────────────────┤
│ SYSTEM HEALTH                           │
│ ● Database: Connected                   │
│ ● Redis: Connected                      │
│ ● WhatsApp: 12/18 bots online          │
│ ● Queue: 3 jobs pending                │
├─────────────────────────────────────────┤
│ RECENT ACTIVITY (Live Feed)             │
│ • User "john@email.com" logged in       │
│ • Bot "Sales Bot" sent 15 messages      │
│ • Reminder "Daily Digest" executed      │
├─────────────────────────────────────────┤
│ QUICK ACTIONS                           │
│ [+ Create User] [Clear Cache] [Backup]  │
└─────────────────────────────────────────┘
```

**Features:**
- Real-time stats
- System health indicators
- Activity feed (last 50 actions)
- Quick action buttons
- Charts (messages over time, bot status)

---

### **2. 👥 USERS** (ENHANCED - Priority #2)
**Route:** `/admin/users`

**Current:** Basic user list
**Enhanced:**

```
┌─────────────────────────────────────────┐
│ USERS MANAGEMENT                        │
│                                         │
│ [+ Invite User] [Import] [Export]       │
│                                         │
│ Search: [____________] Filter: [All ▼]  │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Email          │ Role  │ Status │ ⚙│││
│ ├─────────────────────────────────────┤│
│ │ admin@mail.com │ Admin │ Active │ ⚙│││
│ │ john@mail.com  │ User  │ Active │ ⚙│││
│ │ jane@mail.com  │ User  │ Banned │ ⚙│││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**New Features:**
- **Invite User** (Send invite email with token)
- **User Details Page** (Activity log, stats, bots owned)
- **Suspend/Ban User** (Disable account)
- **Force Password Reset**
- **View User Activity** (Login history, actions)
- **Bulk Actions** (Export, bulk suspend)

**Invite Flow:**
```
1. Admin clicks "Invite User"
2. Enter email + select role
3. System generates invite token
4. Send email with signup link
5. User clicks link → Set password → Account created
6. No public signup page needed
```

---

### **3. 🔑 API KEYS** (NEW - Priority #3)
**Route:** `/admin/api-keys`

```
┌─────────────────────────────────────────┐
│ API KEYS MANAGEMENT                     │
│                                         │
│ [+ Generate New Key]                    │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Name       │ Key      │ Requests │ ⚙│││
│ ├─────────────────────────────────────┤│
│ │ Mobile App │ sk_xxx   │ 1,234    │ ⚙│││
│ │ Zapier     │ sk_yyy   │ 456      │ ⚙│││
│ │ Internal   │ sk_zzz   │ 89       │ ⚙│││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Features:**
- Generate API key with custom name
- Set permissions (read-only, write, admin)
- Set rate limit per key
- Set expiration date
- Revoke/delete keys
- View usage stats
- IP whitelisting (optional)

**API Key Format:**
```
sk_live_1234567890abcdef1234567890abcdef
```

---

### **4. 📈 ANALYTICS** (NEW - Priority #4)
**Route:** `/admin/analytics`

```
┌─────────────────────────────────────────┐
│ ANALYTICS DASHBOARD                     │
│                                         │
│ Date Range: [Last 30 Days ▼]           │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ MESSAGES SENT                       ││
│ │ ▁▂▃▅▇█▇▅▃▂▁ (Chart)                ││
│ │ Total: 12,345 | Success: 98.5%     ││
│ └─────────────────────────────────────┘│
│                                         │
│ ┌──────────────┐ ┌──────────────┐     │
│ │ TOP BOTS     │ │ TOP USERS    │     │
│ │ Sales: 5.2K  │ │ John: 3.1K   │     │
│ │ Support: 3.8K│ │ Jane: 2.4K   │     │
│ └──────────────┘ └──────────────┘     │
│                                         │
│ [Export Report]                         │
└─────────────────────────────────────────┘
```

**Metrics:**
- Messages sent (daily, weekly, monthly)
- Success/failure rate
- Messages by bot
- Messages by user
- Peak usage times
- Average delivery time
- Error rate trends

**Export:**
- CSV, PDF, Excel
- Scheduled email reports

---

### **5. 📋 AUDIT LOGS** (NEW - Priority #5)
**Route:** `/admin/logs`

```
┌─────────────────────────────────────────┐
│ AUDIT LOGS                              │
│                                         │
│ Type: [All ▼] User: [All ▼]            │
│ Date: [Last 7 Days ▼]                   │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ Time    │ User  │ Action        │ IP│││
│ ├─────────────────────────────────────┤│
│ │ 10:23   │ admin │ Created bot   │ ::│││
│ │ 10:15   │ john  │ Sent message  │ ::│││
│ │ 09:45   │ jane  │ Logged in     │ ::│││
│ └─────────────────────────────────────┘│
│                                         │
│ [Export Logs]                           │
└─────────────────────────────────────────┘
```

**Log Types:**
1. **User Activity**
   - Login/logout
   - Password changes
   - Profile updates

2. **Bot Actions**
   - Bot created/edited/deleted
   - Connection status changes
   - QR code scanned

3. **Reminder Actions**
   - Reminder created/edited/deleted
   - Execution logs
   - Failed executions

4. **System Events**
   - Service restarts
   - Errors & exceptions
   - Config changes

5. **API Requests**
   - Endpoint called
   - Response code
   - Response time

**Features:**
- Search & filter
- Export logs
- Auto-delete old logs (retention policy)
- Real-time log streaming (optional)

---

### **6. ⚙️ SETTINGS** (NEW - Priority #6)
**Route:** `/admin/settings`

**Tabs:**

#### **6.1 General**
```
Site Name: [WA Automation Platform]
Contact Email: [admin@example.com]
Support URL: [https://support.example.com]
Timezone: [Asia/Jakarta ▼]
Date Format: [DD/MM/YYYY ▼]
```

#### **6.2 Email**
```
SMTP Host: [smtp.gmail.com]
SMTP Port: [587]
Username: [noreply@example.com]
Password: [••••••••]
From Name: [WA Platform]
[Test Email]
```

#### **6.3 WhatsApp**
```
Max Bots per User: [5]
Max Reminders per Bot: [50]
Message Rate Limit: [30] messages/minute
Session Timeout: [24] hours
Auto-reconnect: [✓] Enabled
```

#### **6.4 Security**
```
Password Min Length: [8]
Require Uppercase: [✓]
Require Numbers: [✓]
Require Symbols: [✓]
Password Expiration: [90] days
Max Login Attempts: [5]
Lockout Duration: [30] minutes
```

#### **6.5 Advanced**
```
Enable Caching: [✓]
Cache TTL: [3600] seconds
Queue Max Jobs: [100]
Job Timeout: [300] seconds
Debug Mode: [  ] (Disabled)
```

---

### **7. 🛠️ SYSTEM** (NEW - Priority #7)
**Route:** `/admin/system`

**Tabs:**

#### **7.1 Backup & Restore**
```
┌─────────────────────────────────────────┐
│ DATABASE BACKUP                         │
│                                         │
│ [Create Backup Now]                     │
│                                         │
│ Scheduled Backups: [✓] Enabled          │
│ Frequency: [Daily ▼] at [02:00]         │
│ Retention: [7] days                     │
│                                         │
│ BACKUP HISTORY                          │
│ ┌─────────────────────────────────────┐│
│ │ Date       │ Size   │ Status    │ ⚙│││
│ ├─────────────────────────────────────┤│
│ │ 2026-01-23 │ 45 MB  │ Success   │ ⚙│││
│ │ 2026-01-22 │ 44 MB  │ Success   │ ⚙│││
│ └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

#### **7.2 Maintenance**
```
DATABASE
[Optimize Database] [Rebuild Indexes]
[Clear Old Logs] [Archive Data]

CACHE
[Clear All Cache] [View Cache Stats]

QUEUE
[Pause Queue] [Resume Queue]
[Clear Failed Jobs] [Retry Failed Jobs]
```

#### **7.3 Health Check**
```
✓ Database: Connected (12ms)
✓ Redis: Connected (3ms)
✓ Disk Space: 45.2 GB free (78%)
✓ Memory: 2.1 GB / 4 GB (52%)
✓ CPU: 23% usage

⚠ WhatsApp: 12/18 bots connected
✓ Queue: 3 jobs pending
```

---

## 🎯 MENU PRIORITY FOR INVITE-ONLY SYSTEM

### **Phase 1: Critical (Week 1-2)**
1. ✅ **Dashboard** - System overview
2. ✅ **Users (Enhanced)** - Invite system
3. ✅ **API Keys** - External integrations
4. ✅ **Settings (Basic)** - General config

### **Phase 2: Important (Week 3-4)**
5. ✅ **Analytics** - Usage insights
6. ✅ **Audit Logs** - Activity tracking
7. ✅ **System (Backup)** - Data protection

### **Phase 3: Nice-to-Have (Month 2)**
8. ✅ **System (Maintenance)** - Advanced tools
9. ✅ **Settings (Advanced)** - Fine-tuning

---

## 🔐 INVITE-ONLY SYSTEM FLOW

### **User Registration Flow:**

```
┌─────────────────────────────────────────┐
│ ADMIN SIDE                              │
└─────────────────────────────────────────┘
1. Admin goes to /admin/users
2. Clicks "Invite User"
3. Enters:
   - Email: john@example.com
   - Role: User
   - (Optional) Custom message
4. System generates invite token
5. Email sent to john@example.com

┌─────────────────────────────────────────┐
│ USER SIDE                               │
└─────────────────────────────────────────┘
6. User receives email:
   "You've been invited to WA Platform"
   [Accept Invitation]
7. Clicks link → /signup?token=abc123
8. Signup page (token validated):
   - Name: [John Doe]
   - Password: [••••••••]
   - Confirm: [••••••••]
9. Submit → Account created
10. Redirect to /login
11. Login with email + password

┌─────────────────────────────────────────┐
│ SECURITY                                │
└─────────────────────────────────────────┘
- Token expires after 7 days
- Token single-use only
- Email must match invite
- No public signup page
- Admin can revoke invite before use
```

---

## 📊 FINAL MENU STRUCTURE

### **Sidebar Navigation:**

```
┌──────────────────────┐
│ WA PLATFORM          │
├──────────────────────┤
│ 📊 Dashboard         │ ← NEW
├──────────────────────┤
│ 👥 Users             │ ← ENHANCED
│ 🤖 Bots              │ ← Existing
│ 📅 Reminders         │ ← Existing
│ 💬 Auto-Replies      │ ← Existing
├──────────────────────┤
│ 🔑 API Keys          │ ← NEW
│ 📈 Analytics         │ ← NEW
│ 📋 Audit Logs        │ ← NEW
├──────────────────────┤
│ ⚙️ Settings          │ ← NEW
│ 🛠️ System            │ ← NEW
├──────────────────────┤
│ 👤 Profile           │ ← Existing
│ 🚪 Logout            │ ← Existing
└──────────────────────┘
```

---

## 🎯 SUMMARY

### **Total Menu Items:**
- **Existing:** 5 (Dashboard basic, Bots, Reminders, Auto-Replies, Profile)
- **New:** 5 (Dashboard enhanced, API Keys, Analytics, Audit Logs, Settings, System)
- **Enhanced:** 1 (Users)

### **Total New Tabs: 6 Major Tabs**
1. Dashboard (Enhanced)
2. Users (Enhanced with Invite)
3. API Keys (New)
4. Analytics (New)
5. Audit Logs (New)
6. Settings (New)
7. System (New)

### **Development Estimate:**
- **Phase 1 (Critical):** 2-3 weeks
  - Dashboard
  - User Invite System
  - API Keys
  - Basic Settings

- **Phase 2 (Important):** 2-3 weeks
  - Analytics
  - Audit Logs
  - Backup System

- **Phase 3 (Polish):** 1-2 weeks
  - Advanced Settings
  - System Maintenance
  - UI/UX refinements

**Total: 5-8 weeks untuk complete admin panel**

---

## 🔒 SECURITY BENEFITS (Invite-Only)

✅ **No Public Signup** - Prevents spam accounts
✅ **Admin Control** - Full control over who can access
✅ **Email Verification** - Built-in via invite
✅ **Role Assignment** - Admin sets role before invite
✅ **Audit Trail** - Track who invited whom
✅ **Revocable Invites** - Cancel before user accepts
✅ **Token Expiration** - Time-limited invites
✅ **Single Use** - Token can't be reused

---

**RECOMMENDATION:**
Start dengan Phase 1 (Dashboard, User Invite, API Keys, Settings) untuk MVP admin panel yang functional dan secure! 🚀
