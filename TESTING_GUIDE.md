# 🧪 TESTING GUIDE - MULTI-USER ACCESS SYSTEM

## 📋 TESTING CHECKLIST

Ikuti steps ini secara berurutan untuk memastikan semua fungsi berjalan dengan baik.

---

## 🚀 STEP 1: RUN MIGRATIONS (WAJIB!)

**Lokasi:** Backend directory

```bash
cd backend
npm run migrate
```

**Expected Output:**
```
✅ Running migration: 006_create_bot_permissions.sql
✅ Running migration: 007_create_user_invitations.sql
✅ Running migration: 008_add_user_role.sql
✅ All migrations completed successfully
```

**Jika Error:**
- Check database connection di `.env`
- Pastikan PostgreSQL running
- Check migration files ada di `backend/migrations/`

**✅ PASS Criteria:**
- Migrations run tanpa error
- Tables `bot_permissions`, `user_invitations` created
- Column `role` added to `users` table

---

## 🔧 STEP 2: RESTART BACKEND

```bash
# Masih di folder backend
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📡 API: http://localhost:3001/api
🏥 Health: http://localhost:3001/health
✅ Group integration initialized
```

**Check Console:**
- ✅ No errors
- ✅ Port 3001 active
- ✅ Database connected

**✅ PASS Criteria:**
- Backend starts successfully
- No error messages
- API accessible

---

## 🌐 STEP 3: TEST BACKEND API

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

**✅ PASS:** Status = "healthy"

---

### 3.2 Login & Get Token

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
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

**✅ PASS:** 
- Success = true
- Token received
- User role = "owner"

**⚠️ IMPORTANT:** Copy token untuk testing selanjutnya!

---

### 3.3 Test User Stats (Owner Only)

**Replace `YOUR_TOKEN` dengan token dari step 3.2**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/users/stats
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

**✅ PASS:**
- Success = true
- Stats returned (even if 0)

**❌ FAIL (403):**
- User bukan owner
- Check user role di database

---

### 3.4 Test List Users (Owner Only)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/users
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

**✅ PASS:**
- Success = true
- Data is array (empty atau ada users)

---

### 3.5 Test Invite User (Owner Only)

```bash
curl -X POST http://localhost:3001/api/users/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "role": "admin",
    "bot_ids": [],
    "permissions": {
      "can_view": true,
      "can_edit": false,
      "can_create_campaigns": true
    }
  }'
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

**✅ PASS:**
- Success = true
- Invitation created
- Token generated
- Link returned

---

### 3.6 Test Get User Permissions

**Replace `USER_ID` dengan ID user dari database**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/permissions/user/USER_ID
```

**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

**✅ PASS:**
- Success = true
- Data is array

---

### 3.7 Test Grant Permission (Owner Only)

**Replace `BOT_ID` dan `USER_ID`**

```bash
curl -X POST http://localhost:3001/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "BOT_ID",
    "user_id": "USER_ID",
    "can_view": true,
    "can_edit": false,
    "can_delete": false,
    "can_create_campaigns": true,
    "can_create_rules": false,
    "can_view_analytics": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "bot_id": "...",
    "user_id": "...",
    "can_view": true,
    "can_create_campaigns": true,
    ...
  }
}
```

**✅ PASS:**
- Success = true
- Permission created

---

### 3.8 Test Check Access

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/permissions/check/BOT_ID/USER_ID
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
      ...
    }
  }
}
```

**Expected Response (Non-Owner with Permission):**
```json
{
  "success": true,
  "data": {
    "has_access": true,
    "is_owner": false,
    "permissions": {
      "can_view": true,
      "can_edit": false,
      ...
    }
  }
}
```

**✅ PASS:**
- Success = true
- Access status correct

---

## 🎨 STEP 4: TEST FRONTEND

### 4.1 Start Frontend

```bash
cd frontend
npm run dev
```

**Expected:**
- Frontend runs on http://localhost:3000
- No errors in console

---

### 4.2 Login Test

1. **Open:** http://localhost:3000/login
2. **Login** dengan credentials owner
3. **Check:** Redirect ke /dashboard

**✅ PASS:**
- Login successful
- Redirected to dashboard
- Token saved in localStorage

---

### 4.3 Sidebar Test (Owner Only)

**Di Dashboard:**

1. **Check Sidebar** - Harus ada menu "Users" 👥
2. **Check Position** - Menu "Users" di bawah "Analytics"
3. **Check Visibility** - Menu "Users" HANYA muncul untuk owner

**✅ PASS:**
- "Users" menu visible (owner)
- Menu styled correctly
- Icon displayed

**❌ FAIL:**
- Menu tidak muncul → Check user role
- Menu muncul untuk non-owner → Check conditional rendering

---

### 4.4 Users Page Test

**Click "Users" menu:**

1. **URL:** Should navigate to `/dashboard/users`
2. **Page Load:** Users page loads successfully
3. **Stats Cards:** 3 cards displayed:
   - Total Users
   - Admins
   - Users
4. **User List:** Table or empty state displayed
5. **Invite Button:** "Invite User" button visible

**✅ PASS:**
- Page loads without errors
- Stats display correctly
- UI renders properly

**Check Console:**
- No errors
- API calls successful

---

### 4.5 Users Page - API Integration Test

**Open Browser DevTools (F12) → Network Tab:**

1. **Refresh** users page
2. **Check Network Requests:**
   - `GET /api/users` - Should return 200
   - `GET /api/users/stats` - Should return 200

**✅ PASS:**
- Both API calls successful (200)
- Data displayed correctly
- No 401/403 errors

**❌ FAIL (401):**
- Token expired → Re-login
- Token missing → Check localStorage

**❌ FAIL (403):**
- User bukan owner → Check role in database

---

### 4.6 Invite Modal Test (Placeholder)

1. **Click** "Invite User" button
2. **Check:** Modal opens
3. **Check:** Shows "Feature coming soon" message
4. **Click** "Close" button
5. **Check:** Modal closes

**✅ PASS:**
- Modal opens/closes correctly
- No errors

---

## 🔒 STEP 5: SECURITY TESTS

### 5.1 Test Owner-Only Access

**Test dengan non-owner user:**

1. **Login** sebagai non-owner (admin/user)
2. **Check Sidebar:** Menu "Users" TIDAK muncul
3. **Try Direct Access:** http://localhost:3000/dashboard/users
4. **Check:** Page should load but API calls fail with 403

**✅ PASS:**
- Menu hidden for non-owner
- API returns 403 for non-owner

---

### 5.2 Test Unauthenticated Access

**Logout dan test:**

```bash
# Without token
curl http://localhost:3001/api/users/stats
```

**Expected Response:**
```json
{
  "error": "No token provided"
}
```

**Status Code:** 401

**✅ PASS:**
- 401 Unauthorized
- No data leaked

---

### 5.3 Test Permission Enforcement

**Create user tanpa permission:**

1. **Grant** permission dengan `can_view: false`
2. **Try** access bot
3. **Check:** Should be denied

**✅ PASS:**
- Permission enforced
- Access denied correctly

---

## 📊 STEP 6: DATABASE VERIFICATION

### 6.1 Check Tables Created

**Connect to PostgreSQL:**

```sql
-- Check bot_permissions table
SELECT * FROM bot_permissions;

-- Check user_invitations table
SELECT * FROM user_invitations;

-- Check users role column
SELECT id, email, role FROM users;
```

**✅ PASS:**
- Tables exist
- Columns correct
- Data structure valid

---

### 6.2 Check Indexes

```sql
-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('bot_permissions', 'user_invitations');
```

**Expected Indexes:**
- `idx_bot_permissions_user`
- `idx_bot_permissions_bot`
- `idx_invitations_token`
- `idx_invitations_email`

**✅ PASS:**
- All indexes created

---

## ✅ FINAL CHECKLIST

### Backend ✅
- [ ] Migrations run successfully
- [ ] Backend starts without errors
- [ ] Health check passes
- [ ] Login works
- [ ] User stats API works
- [ ] List users API works
- [ ] Invite user API works
- [ ] Permissions API works
- [ ] Owner-only routes protected
- [ ] Unauthenticated requests blocked

### Frontend ✅
- [ ] Frontend starts successfully
- [ ] Login works
- [ ] Sidebar shows "Users" (owner only)
- [ ] Users page loads
- [ ] Stats display correctly
- [ ] User list renders
- [ ] API integration works
- [ ] Invite modal opens/closes
- [ ] Non-owner cannot see Users menu
- [ ] No console errors

### Database ✅
- [ ] bot_permissions table created
- [ ] user_invitations table created
- [ ] users.role column added
- [ ] Indexes created
- [ ] Data structure correct

---

## 🐛 TROUBLESHOOTING

### Issue: Migrations Fail
**Solution:**
```bash
# Check database connection
psql -U postgres -d your_database

# Re-run migrations
cd backend
npm run migrate
```

### Issue: 401 Unauthorized
**Solution:**
- Check token in localStorage
- Re-login to get fresh token
- Check token expiration

### Issue: 403 Forbidden
**Solution:**
- Check user role in database
- Ensure user is owner
- Update role if needed:
  ```sql
  UPDATE users SET role = 'owner' WHERE email = 'your@email.com';
  ```

### Issue: Users Menu Not Showing
**Solution:**
- Check user role in localStorage
- Clear cache and reload
- Check Sidebar.tsx conditional rendering

### Issue: API Calls Fail
**Solution:**
- Check backend is running
- Check CORS settings
- Check API_URL in frontend .env

---

## 📝 TESTING SUMMARY

**Total Tests:** 25+

**Categories:**
- ✅ Database (5 tests)
- ✅ Backend API (8 tests)
- ✅ Frontend UI (6 tests)
- ✅ Security (3 tests)
- ✅ Integration (3 tests)

**Time Required:** 15-20 minutes

**Priority:**
1. **Critical:** Steps 1-3 (Database, Backend, API)
2. **Important:** Step 4 (Frontend)
3. **Optional:** Steps 5-6 (Security, Database verification)

---

## 🎯 QUICK TEST (5 minutes)

**Minimal testing untuk verify basic functionality:**

```bash
# 1. Run migrations
cd backend && npm run migrate

# 2. Start backend
npm run dev

# 3. Test health
curl http://localhost:3001/health

# 4. Login & get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'

# 5. Test user stats (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/users/stats

# 6. Start frontend
cd frontend && npm run dev

# 7. Open browser
# - Login
# - Check sidebar for "Users" menu
# - Click "Users"
# - Verify page loads
```

**✅ If all pass → System working!**

---

**Happy Testing!** 🚀
