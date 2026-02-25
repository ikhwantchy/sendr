# 🎉 COMPLETE REAL FLOW - TESTING GUIDE

## 🎯 FULL PRODUCTION-READY FLOW

This guide shows you how to test the complete multi-user system exactly as it will work in production!

---

## 📋 FLOW OVERVIEW:

```
1. OWNER creates bot
2. OWNER invites user (assign bot + permissions)
3. User receives invitation link
4. User accepts invitation (set name + password)
5. User logs in
6. User sees ONLY assigned bot with LIMITED permissions
```

---

## 🚀 STEP-BY-STEP TESTING:

### **PHASE 1: OWNER SETUP**

**1. Login as Owner:**
```
URL: http://localhost:3000/login
Email: admin@example.com
Password: admin123
```

**2. Create a Bot:**
- Click "Create Bot" button
- Enter name: "Customer Support Bot"
- Click Create
- ✅ Bot created!

**3. Go to Users Page:**
- Click "Users" in sidebar (owner only!)
- You'll see users management page

**4. Invite a New User:**
- Click "Invite User" button
- Fill in:
  - Email: `newuser@example.com`
  - Role: `OPERATOR`
  - Select bot: `Customer Support Bot`
  - Permissions:
    - ✅ Can View
    - ✅ Can Create Campaigns
    - ✅ Can View Analytics
    - ❌ Can Edit
    - ❌ Can Delete
    - ❌ Can Create Rules
- Click "Send Invitation"

**5. Copy Invitation Link:**
```
Example: http://localhost:3000/accept-invitation?token=abc123...
```

---

### **PHASE 2: USER REGISTRATION**

**6. Open Invitation Link:**
- Open link in **incognito/private window** (or different browser)
- You'll see "Accept Invitation" page

**7. Fill Registration Form:**
- Email: `newuser@example.com` (pre-filled, read-only)
- Role: `OPERATOR` (pre-filled, read-only)
- Name: `John Doe`
- Password: `password123`
- Confirm Password: `password123`
- Click "Create Account"

**8. Success!**
- ✅ Account created
- Redirected to login page

---

### **PHASE 3: USER LOGIN & VERIFICATION**

**9. Login as New User:**
```
Email: newuser@example.com
Password: password123
```

**10. Verify Permissions:**

**✅ SHOULD SEE:**
- Dashboard
- Bots page with ONLY "Customer Support Bot"
- Campaigns page (can create)
- Analytics page (can view)

**❌ SHOULD NOT SEE:**
- "Create Bot" button
- "Users" menu
- Edit/Delete bot buttons
- Rules page (if no permission)
- Other bots

---

## 🧪 TESTING CHECKLIST:

### **As OWNER:**
- [ ] Can create bots
- [ ] Can see "Users" menu
- [ ] Can invite users
- [ ] Can assign specific bots
- [ ] Can set granular permissions
- [ ] Can see all bots
- [ ] Can edit/delete any bot

### **As INVITED USER (OPERATOR):**
- [ ] Can accept invitation
- [ ] Can set own password
- [ ] Can login successfully
- [ ] See ONLY assigned bot
- [ ] NO "Create Bot" button
- [ ] NO "Users" menu
- [ ] Can create campaigns (if granted)
- [ ] Can view analytics (if granted)
- [ ] CANNOT edit bot
- [ ] CANNOT delete bot
- [ ] CANNOT create rules (if not granted)

---

## 📊 PERMISSION SCENARIOS:

### **Scenario 1: View-Only User**
```
Permissions:
- ✅ Can View
- ❌ Everything else

Expected:
- Can see bot details
- Can view analytics
- Cannot create/edit anything
```

### **Scenario 2: Campaign Manager**
```
Permissions:
- ✅ Can View
- ✅ Can Create Campaigns
- ✅ Can View Analytics
- ❌ Edit/Delete/Rules

Expected:
- Can create and manage campaigns
- Can view analytics
- Cannot modify bot settings
- Cannot create rules
```

### **Scenario 3: Full Operator**
```
Permissions:
- ✅ Can View
- ✅ Can Edit
- ✅ Can Create Campaigns
- ✅ Can Create Rules
- ✅ Can View Analytics
- ❌ Can Delete

Expected:
- Almost full access
- Cannot delete bot
- Cannot create new bots
- Cannot manage users
```

---

## 🔧 BACKEND ENDPOINTS:

**Invitation System:**
```
POST   /api/users/invite
  → Owner invites user
  → Returns invitation link

GET    /api/invitations/validate/:token
  → Validates invitation token
  → Returns email, role, expiration

POST   /api/invitations/accept
  → User accepts invitation
  → Creates account
  → Assigns permissions
```

**Permission System:**
```
GET    /api/permissions/user/:userId
  → Get user's bot permissions

POST   /api/permissions
  → Grant bot permission to user

PUT    /api/permissions/:id
  → Update permission

DELETE /api/permissions/:id
  → Revoke permission
```

---

## 🎯 EXPECTED BEHAVIOR:

### **Invitation Link:**
```
http://localhost:3000/accept-invitation?token=abc123...

Token contains:
- Email
- Role
- Expiration (7 days)
- Invited by (owner ID)
```

### **After Acceptance:**
```
1. User account created
2. Password hashed
3. Invitation marked as "accepted"
4. Bot permissions assigned
5. User can login
6. Sees only assigned bots
```

---

## 🔒 SECURITY FEATURES:

**1. Token Expiration:**
- Invitation expires after 7 days
- Cannot be used twice
- Validated on backend

**2. Role-Based Access:**
- Frontend hides unauthorized UI
- Backend blocks unauthorized API calls
- Database enforces permissions

**3. Granular Permissions:**
- Per-bot access control
- Specific action permissions
- Owner can revoke anytime

---

## 🐛 TROUBLESHOOTING:

### **Issue: Invitation link doesn't work**
**Check:**
- Backend running on port 3001
- Token not expired
- Token not already used

### **Issue: User can see all bots**
**Check:**
- User role is not OWNER
- Permissions assigned correctly
- Frontend using `filterBots()`

### **Issue: User can't login**
**Check:**
- Account created successfully
- Password correct
- User status is "active"

---

## ✅ SUCCESS CRITERIA:

**Complete Flow Working:**
1. ✅ Owner can invite users
2. ✅ Invitation link works
3. ✅ User can accept and register
4. ✅ User can login
5. ✅ User sees ONLY assigned bots
6. ✅ Permissions enforced correctly
7. ✅ UI elements hidden based on role
8. ✅ API calls blocked if no permission

---

## 🎉 READY FOR PRODUCTION!

**This flow is production-ready:**
- ✅ Secure invitation system
- ✅ Token-based validation
- ✅ Granular permissions
- ✅ Role-based access control
- ✅ Frontend & backend guards
- ✅ Audit trail (who invited whom)

---

## 📝 QUICK TEST COMMANDS:

**1. Start Backend:**
```bash
cd backend
npm run dev
```

**2. Start Frontend:**
```bash
cd frontend
npm run dev
```

**3. Test as Owner:**
- Login: admin@example.com / admin123
- Create bot
- Invite user
- Copy invitation link

**4. Test as User:**
- Open invitation link (incognito)
- Accept invitation
- Login
- Verify limited access

---

**START TESTING NOW!** 🚀

Follow the steps above to test the complete real production flow!
