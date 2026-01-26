# 🚀 ADMIN PANEL - QUICK INTEGRATION GUIDE

**Last Updated:** 2026-01-23 21:30

---

## ✅ FILES CREATED (21 TOTAL)

### **Backend (16 files)**
1. `backend/src/database/migrations/007_admin_features.sql`
2. `backend/src/services/auditLogService.ts`
3. `backend/src/services/systemSettingsService.ts`
4. `backend/src/services/apiKeyService.ts`
5. `backend/src/services/userInviteService.ts`
6. `backend/src/services/emailService.ts`
7. `backend/src/api/middleware/auditLog.ts`
8. `backend/src/api/middleware/apiKeyAuth.ts`
9. `backend/src/api/middleware/adminAuth.ts`
10. `backend/src/api/controllers/adminController.ts`
11. `backend/src/api/controllers/apiKeysController.ts`
12. `backend/src/api/controllers/invitesController.ts`
13. `backend/src/api/controllers/auditLogsController.ts`
14. `backend/src/api/controllers/systemController.ts`
15. `backend/src/api/routes/adminRoutes.ts`
16. `backend/src/api/routes/inviteRoutes.ts`

### **Frontend (5 files)**
17. `frontend/src/pages/ApiKeysPage.tsx`
18. `frontend/src/pages/SettingsPage.tsx`
19. `frontend/src/pages/AuditLogsPage.tsx`
20. `frontend/src/pages/SystemPage.tsx`
21. `frontend/src/pages/SignupPage.tsx`

---

## 🔧 STEP-BY-STEP INTEGRATION

### **STEP 1: Database Migration**

```bash
cd backend
psql -U postgres -d wa_automation -f src/database/migrations/007_admin_features.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
...
INSERT 0 40
```

---

### **STEP 2: Install Dependencies**

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

---

### **STEP 3: Update Backend Server**

**File:** `backend/src/server.ts` or `backend/src/app.ts`

Add these imports at the top:
```typescript
import adminRoutes from './api/routes/adminRoutes';
import inviteRoutes from './api/routes/inviteRoutes';
import { auditLogMiddleware } from './api/middleware/auditLog';
```

Add middleware and routes (AFTER existing routes):
```typescript
// Optional: Add audit logging to all routes
app.use(auditLogMiddleware);

// Add admin routes
app.use('/api/admin', adminRoutes);

// Add public invite routes
app.use('/api/invites', inviteRoutes);
```

---

### **STEP 4: Update Auth Controller**

**File:** `backend/src/api/controllers/authController.ts`

Add import:
```typescript
import userInviteService from '../../services/userInviteService';
```

In the `signup` function, add after user creation:
```typescript
// Accept invite if token provided
const { inviteToken } = req.body;
if (inviteToken) {
    try {
        await userInviteService.acceptInvite(inviteToken, newUser.id);
    } catch (error) {
        console.error('Failed to accept invite:', error);
    }
}
```

---

### **STEP 5: Add Environment Variables**

**File:** `backend/.env`

Add these variables:
```env
# Email Settings (Optional - for invite emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL (for invite links)
FRONTEND_URL=http://localhost:3000
```

---

### **STEP 6: Update Frontend Routes**

**File:** `frontend/src/App.tsx`

Add imports:
```typescript
import ApiKeysPage from './pages/ApiKeysPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import SystemPage from './pages/SystemPage';
import SignupPage from './pages/SignupPage';
```

Add routes (inside your Routes component):
```typescript
{/* Public Routes */}
<Route path="/signup" element={<SignupPage />} />

{/* Admin Routes (protected) */}
<Route path="/admin/api-keys" element={<ApiKeysPage />} />
<Route path="/admin/settings" element={<SettingsPage />} />
<Route path="/admin/audit-logs" element={<AuditLogsPage />} />
<Route path="/admin/system" element={<SystemPage />} />
```

---

### **STEP 7: Update Sidebar Navigation**

**File:** `frontend/src/components/Sidebar.tsx` (or wherever your nav is)

Add to your navigation items:
```typescript
const adminMenuItems = [
    {
        label: 'API Keys',
        icon: Key,
        path: '/admin/api-keys',
        adminOnly: true
    },
    {
        label: 'Settings',
        icon: Settings,
        path: '/admin/settings',
        adminOnly: true
    },
    {
        label: 'Audit Logs',
        icon: FileText,
        path: '/admin/audit-logs',
        adminOnly: true
    },
    {
        label: 'System',
        icon: Activity,
        path: '/admin/system',
        adminOnly: true
    }
];
```

Filter by admin role:
```typescript
const visibleItems = menuItems.filter(item => 
    !item.adminOnly || user?.role === 'admin'
);
```

---

### **STEP 8: Update API Client**

**File:** `frontend/src/lib/api.ts`

Make sure your axios instance is configured:
```typescript
import axios from 'axios';

export const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add auth token to requests
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

---

### **STEP 9: Restart Servers**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## 🧪 TESTING CHECKLIST

### **Backend Tests**

```bash
# Test dashboard stats
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/admin/dashboard/stats

# Test create invite
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","role":"user"}' \
     http://localhost:3001/api/admin/invites

# Test generate API key
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Key","permissions":{"read":true}}' \
     http://localhost:3001/api/admin/api-keys

# Test system health
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/admin/system/health
```

### **Frontend Tests**

1. ✅ Login as admin user
2. ✅ Navigate to `/admin/api-keys`
3. ✅ Create new API key
4. ✅ Navigate to `/admin/settings`
5. ✅ Update settings in each tab
6. ✅ Test email (if SMTP configured)
7. ✅ Navigate to `/admin/audit-logs`
8. ✅ Filter and search logs
9. ✅ Export logs to CSV
10. ✅ Navigate to `/admin/system`
11. ✅ Check system health
12. ✅ Create database backup
13. ✅ Run maintenance tasks

### **Invite Flow Test**

1. ✅ Go to Users page (if exists)
2. ✅ Click "Invite User" button
3. ✅ Enter email and role
4. ✅ Check email inbox
5. ✅ Click invite link
6. ✅ Navigate to `/signup?token=...`
7. ✅ Fill signup form
8. ✅ Create account
9. ✅ Login with new account

---

## 🔍 TROUBLESHOOTING

### **Migration Fails**

```bash
# Check if tables already exist
psql -U postgres -d wa_automation -c "\dt"

# If tables exist, drop them first (CAUTION!)
psql -U postgres -d wa_automation -c "DROP TABLE IF EXISTS api_keys CASCADE;"
# Repeat for other tables, then re-run migration
```

### **Email Not Sending**

1. Check SMTP settings in `.env`
2. For Gmail, use App Password (not regular password)
3. Test with Settings page → Email tab → "Send Test Email"
4. Check backend logs for errors

### **Routes Not Working**

1. Verify routes are added to `server.ts`
2. Check middleware order (auth before admin routes)
3. Restart backend server
4. Check browser console for errors

### **Frontend Pages Not Loading**

1. Verify routes are added to `App.tsx`
2. Check imports are correct
3. Restart frontend dev server
4. Clear browser cache

---

## 📝 CONFIGURATION

### **Default Settings (can be changed in Settings page)**

```
General:
- Site Name: WA Automation Platform
- Timezone: Asia/Jakarta
- Date Format: DD/MM/YYYY

Email:
- SMTP Host: (not configured)
- SMTP Port: 587
- From Email: noreply@example.com

WhatsApp:
- Max Bots per User: 5
- Max Reminders per Bot: 50
- Message Rate Limit: 30/min

Security:
- Password Min Length: 8
- Max Login Attempts: 5
- Invite Expiry: 7 days

Advanced:
- Cache TTL: 3600 seconds
- Log Retention: 30 days
- Backup Retention: 7 days
```

---

## 🎯 NEXT STEPS

### **Optional Enhancements**

1. **Users Page Integration**
   - Add "Invite User" button
   - Show invite status
   - Resend/revoke buttons

2. **Dashboard Enhancement**
   - Add user stats widget
   - Add system health widget
   - Add quick actions

3. **Additional Features**
   - 2FA authentication
   - IP whitelisting UI
   - Advanced analytics
   - Webhook management

---

## 📞 SUPPORT

**If you encounter issues:**

1. Check this integration guide
2. Review `ADMIN_FINAL_SUMMARY.md`
3. Check backend logs: `npm run dev` output
4. Check frontend console: Browser DevTools
5. Test API endpoints with Postman
6. Review audit logs in `/admin/audit-logs`

---

## ✅ COMPLETION CHECKLIST

- [ ] Migration run successfully
- [ ] Dependencies installed
- [ ] Server.ts updated
- [ ] Auth controller updated
- [ ] Environment variables set
- [ ] Frontend routes added
- [ ] Sidebar navigation updated
- [ ] Backend restarted
- [ ] Frontend restarted
- [ ] API endpoints tested
- [ ] Frontend pages tested
- [ ] Invite flow tested
- [ ] Email sending tested (optional)

---

**Integration Time:** ~30 minutes
**Testing Time:** ~30 minutes
**Total:** ~1 hour

**Ready to go! 🚀**
