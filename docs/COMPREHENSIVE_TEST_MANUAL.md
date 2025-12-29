# 🧪 COMPREHENSIVE TESTING - MANUAL GUIDE

## ⚠️ IMPORTANT: Follow steps in order!

---

## 📋 STEP 1: RUN MIGRATIONS (CRITICAL!)

### Open Terminal 1:

```bash
cd "c:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform\backend"
npm run migrate
```

### Expected Output:
```
✅ Running migration: 006_create_bot_permissions.sql
✅ Running migration: 007_create_user_invitations.sql
✅ Running migration: 008_add_user_role.sql
✅ All migrations completed successfully
```

### ✅ Checklist:
- [ ] No errors in output
- [ ] All 3 migrations ran
- [ ] "completed successfully" message

### ❌ If Error:
```bash
# Check database connection
psql -U postgres

# Check .env file
cat .env

# Try again
npm run migrate
```

**⏸️ STOP HERE if migrations fail!**

---

## 🔧 STEP 2: START BACKEND

### Same Terminal (Terminal 1):

```bash
# Still in backend folder
npm run dev
```

### Expected Output:
```
🚀 Server running on port 3001
📡 API: http://localhost:3001/api
🏥 Health: http://localhost:3001/health
✅ Group integration initialized
```

### ✅ Checklist:
- [ ] Server starts on port 3001
- [ ] No error messages
- [ ] "Group integration initialized"

### ❌ If Error:
- Check port 3001 not in use
- Check database connection
- Check .env configuration

**⏸️ STOP HERE if backend doesn't start!**

**✅ Backend is now running - DO NOT close this terminal!**

---

## 🌐 STEP 3: TEST BACKEND API

### Open NEW Terminal (Terminal 2):

### 3.1 Health Check

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-23T...",
  "uptime": 123.456
}
```

**✅ Checklist:**
- [ ] Status = "healthy"
- [ ] Response received

---

### 3.2 Login & Get Token

**⚠️ IMPORTANT: Replace with YOUR credentials!**

```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "...",
      "role": "owner"
    }
  }
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] Token received
- [ ] User role = "owner"

**📝 COPY THE TOKEN!** You'll need it for next steps.

**Example token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTYxNjE2MTYxNn0.xxxxx
```

---

### 3.3 Test User Stats (Owner Only)

**⚠️ Replace YOUR_TOKEN with actual token from step 3.2!**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/users/stats
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 0,
    "admin_count": 0,
    "user_count": 0
  }
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] Stats returned (even if all 0)
- [ ] No 401/403 error

**❌ If 403 Forbidden:**
```sql
-- Connect to database and run:
UPDATE users SET role = 'owner' WHERE email = 'YOUR_EMAIL';
```

---

### 3.4 Test List Users

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/users
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] Data is array (empty or with users)

---

### 3.5 Test Invite User

```bash
curl -X POST http://localhost:3001/api/users/invite -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"email\":\"testuser@example.com\",\"role\":\"admin\",\"bot_ids\":[],\"permissions\":{\"can_view\":true,\"can_edit\":false,\"can_create_campaigns\":true}}"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "...",
      "email": "testuser@example.com",
      "role": "admin",
      "token": "...",
      "expires_at": "..."
    },
    "invitation_link": "http://localhost:3000/accept-invitation?token=..."
  }
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] Invitation created
- [ ] Token generated
- [ ] Invitation link returned

---

### 3.6 Test Get User Permissions

**First, get your user ID from database or login response**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/permissions/user/YOUR_USER_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] Data is array

---

### 3.7 Test Check Access

**Get bot ID from your database**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/permissions/check/BOT_ID/USER_ID
```

**Expected Response (Owner):**
```json
{
  "success": true,
  "data": {
    "has_access": true,
    "is_owner": true,
    "permissions": {
      "can_view": true,
      "can_edit": true,
      "can_delete": true,
      "can_create_campaigns": true,
      "can_create_rules": true,
      "can_view_analytics": true
    }
  }
}
```

**✅ Checklist:**
- [ ] Success = true
- [ ] has_access = true
- [ ] is_owner = true (for owner)

---

## 🎨 STEP 4: START FRONTEND

### Open NEW Terminal (Terminal 3):

```bash
cd "c:\Users\ikhwa\Documents\Ikhwan\Vibe Project\WA Automation Platform\frontend"
npm run dev
```

### Expected Output:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
- Ready in X.Xs
```

**✅ Checklist:**
- [ ] Frontend starts successfully
- [ ] Running on port 3000
- [ ] No errors

**✅ Frontend is now running - DO NOT close this terminal!**

---

## 🌐 STEP 5: TEST FRONTEND UI

### 5.1 Open Browser

**Open:** http://localhost:3000/login

**✅ Checklist:**
- [ ] Login page loads
- [ ] No errors in browser console (F12)

---

### 5.2 Login Test

**Enter your credentials and login**

**✅ Checklist:**
- [ ] Login successful
- [ ] Redirected to /dashboard
- [ ] Token saved in localStorage (check DevTools → Application → Local Storage)

**Check localStorage:**
```javascript
// Open browser console (F12) and run:
localStorage.getItem('token')
localStorage.getItem('user')
```

---

### 5.3 Sidebar Test (CRITICAL!)

**Look at the sidebar on the left**

**✅ Checklist:**
- [ ] Sidebar displays correctly
- [ ] All menu items visible:
  - Dashboard
  - Bots
  - Rules
  - Campaigns
  - Reminders
  - Data Sources
  - Analytics
  - **👥 Users** ← NEW! (should be at bottom)

**📸 Screenshot the sidebar for verification**

**❌ If "Users" menu NOT visible:**
1. Check user role in localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('user')).role
   // Should return: "owner"
   ```
2. If not "owner", update database:
   ```sql
   UPDATE users SET role = 'owner' WHERE email = 'YOUR_EMAIL';
   ```
3. Logout and login again

---

### 5.4 Users Page Test

**Click on "Users" menu**

**✅ Checklist:**
- [ ] URL changes to /dashboard/users
- [ ] Page loads without errors
- [ ] No errors in console (F12)

**Check Network Tab (F12 → Network):**
- [ ] GET /api/users - Status 200
- [ ] GET /api/users/stats - Status 200

---

### 5.5 Users Page - UI Elements

**Verify all elements display:**

**Header:**
- [ ] Title: "User Management"
- [ ] Subtitle: "Manage user access and permissions"
- [ ] "Invite User" button (top right)

**Stats Cards (3 cards):**
- [ ] Card 1: Total Users (👥 icon)
- [ ] Card 2: Admins (👨‍💼 icon)
- [ ] Card 3: Users (👤 icon)
- [ ] All cards show numbers (0 if no users)

**User List:**
- [ ] Table with headers: Name, Email, Role, Bots, Actions
- [ ] OR Empty state: "No users yet"
- [ ] Empty state has "Invite User" button

**📸 Screenshot the users page**

---

### 5.6 Invite Modal Test

**Click "Invite User" button**

**✅ Checklist:**
- [ ] Modal opens
- [ ] Shows "Invite User" title
- [ ] Shows "Feature coming soon!" message
- [ ] Has "Close" button
- [ ] Click "Close" → Modal closes

**Note:** Full invite modal is placeholder. Backend API is ready!

---

## 🔒 STEP 6: SECURITY TESTS

### 6.1 Test Owner-Only Access

**If you have another user account (non-owner):**

1. **Logout** from current session
2. **Login** with non-owner account
3. **Check Sidebar:**
   - [ ] "Users" menu should NOT appear
4. **Try direct access:** http://localhost:3000/dashboard/users
   - [ ] Page loads but API calls fail with 403

**✅ Expected:**
- Users menu hidden for non-owner
- API returns 403 Forbidden

---

### 6.2 Test Unauthenticated Access

**Open NEW Incognito/Private window**

**Try API without token:**
```bash
curl http://localhost:3001/api/users/stats
```

**Expected Response:**
```json
{
  "error": "No token provided"
}
```

**Status Code:** 401

**✅ Checklist:**
- [ ] 401 Unauthorized
- [ ] Error message returned
- [ ] No data leaked

---

## 📊 STEP 7: DATABASE VERIFICATION

### 7.1 Check Tables

**Connect to PostgreSQL:**

```bash
psql -U postgres -d your_database_name
```

**Run queries:**

```sql
-- Check bot_permissions table
SELECT * FROM bot_permissions;

-- Check user_invitations table
SELECT * FROM user_invitations;

-- Check users role column
SELECT id, email, role FROM users;

-- Check if owner role is set
SELECT * FROM users WHERE role = 'owner';
```

**✅ Checklist:**
- [ ] bot_permissions table exists
- [ ] user_invitations table exists
- [ ] users.role column exists
- [ ] At least one user has role = 'owner'

---

### 7.2 Check Indexes

```sql
-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('bot_permissions', 'user_invitations');
```

**Expected Indexes:**
- idx_bot_permissions_user
- idx_bot_permissions_bot
- idx_bot_permissions_granted_by
- idx_invitations_token
- idx_invitations_email
- idx_invitations_invited_by

**✅ Checklist:**
- [ ] All indexes created
- [ ] No missing indexes

---

## ✅ FINAL CHECKLIST

### Backend ✅
- [ ] Migrations ran successfully
- [ ] Backend starts without errors
- [ ] Health check passes
- [ ] Login works and returns token
- [ ] User stats API works (200)
- [ ] List users API works (200)
- [ ] Invite user API works (200)
- [ ] Permissions API works (200)
- [ ] Owner-only routes protected (403 for non-owner)
- [ ] Unauthenticated requests blocked (401)

### Frontend ✅
- [ ] Frontend starts successfully
- [ ] Login works
- [ ] Redirects to dashboard after login
- [ ] Sidebar shows "Users" menu (owner only)
- [ ] Users page loads (/dashboard/users)
- [ ] Stats cards display correctly
- [ ] User list renders (table or empty state)
- [ ] Invite modal opens/closes
- [ ] API integration works (Network tab shows 200)
- [ ] Non-owner cannot see Users menu
- [ ] No console errors

### Database ✅
- [ ] bot_permissions table created
- [ ] user_invitations table created
- [ ] users.role column added
- [ ] Indexes created
- [ ] At least one owner user exists

### Security ✅
- [ ] Owner-only menu works
- [ ] API protected with JWT
- [ ] 401 for missing token
- [ ] 403 for non-owner access
- [ ] Token stored in localStorage

---

## 📊 TEST RESULTS SUMMARY

**Total Tests:** 50+

**Passed:** _____ / 50+

**Failed:** _____ / 50+

**Critical Issues:** _____

**Minor Issues:** _____

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: Migrations Fail
**Solution:**
```bash
# Check database
psql -U postgres

# Check .env
cat backend/.env

# Verify database exists
psql -U postgres -l
```

### Issue: 401 Unauthorized
**Solution:**
- Re-login to get fresh token
- Check token in localStorage
- Verify token not expired

### Issue: 403 Forbidden
**Solution:**
```sql
UPDATE users SET role = 'owner' WHERE email = 'YOUR_EMAIL';
```

### Issue: Users Menu Not Showing
**Solution:**
1. Check localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('user')).role
   ```
2. Should be "owner"
3. If not, update database and re-login

### Issue: API Calls Fail
**Solution:**
- Check backend is running
- Check port 3001 accessible
- Check CORS settings
- Check network tab for errors

---

## 🎉 SUCCESS CRITERIA

**System is working if:**

✅ **All Backend Tests Pass** (10/10)
✅ **All Frontend Tests Pass** (11/11)
✅ **All Database Tests Pass** (5/5)
✅ **All Security Tests Pass** (4/4)

**Minimum to pass:**
- Migrations successful
- Backend API working
- Frontend loads
- Users page accessible
- No critical errors

---

## 📝 NOTES

**Time Required:** 15-20 minutes

**Prerequisites:**
- PostgreSQL running
- Node.js installed
- Backend & Frontend dependencies installed

**Terminals Needed:**
- Terminal 1: Backend (npm run dev)
- Terminal 2: Testing commands
- Terminal 3: Frontend (npm run dev)

---

**Testing Complete!** 🎉

**Next Steps:**
1. Review test results
2. Fix any failures
3. Document issues
4. Deploy if all pass

**Questions?** Check `TESTING_GUIDE.md` for more details.
