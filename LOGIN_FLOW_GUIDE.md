# 🔐 LOGIN FLOW - COMPLETE GUIDE

## ✅ CURRENT STATUS

**What's Working:**
- ✅ Login page exists (`/login`)
- ✅ Backend auth endpoint (`/api/auth/login`)
- ✅ JWT authentication
- ✅ User data with role saved to localStorage
- ✅ Permission-based filtering

**What Needs Backend:**
- ⏳ Accept invitation endpoint (frontend ready, backend TODO)

---

## 🔄 COMPLETE USER FLOW

### **Scenario 1: Owner Login** (Working ✅)

```
1. Owner goes to /login
2. Enters email & password
3. Backend validates
4. Returns token + user data (role: "owner")
5. Frontend saves to localStorage
6. Redirects to /dashboard
7. Sees ALL bots (no filtering)
```

---

### **Scenario 2: Invited User** (Needs Backend)

**Step 1: Accept Invitation**
```
1. User receives invitation link
   Example: http://localhost:3000/accept-invitation?token=abc123

2. User clicks link → Opens accept page

3. Frontend validates token (TODO: needs backend endpoint)
   Current: Mock data
   Needed: GET /api/invitations/validate/:token

4. Shows invitation details:
   - Email: user@example.com
   - Role: admin

5. User fills form:
   - Name: John Doe
   - Password: ••••••
   - Confirm Password: ••••••

6. Submits form (TODO: needs backend endpoint)
   Current: Calls api.auth.register (doesn't exist)
   Needed: POST /api/invitations/accept

7. Backend creates user account:
   - Email from invitation
   - Name & password from form
   - Role from invitation
   - Assigns bot permissions

8. Success → Redirects to /login
```

**Step 2: Login**
```
1. User goes to /login
2. Enters email & password (just created)
3. Backend validates (/api/auth/login) ✅ Already works!
4. Returns token + user data (role: "admin" or "user")
5. Frontend saves to localStorage
6. Redirects to /dashboard
7. usePermissions hook loads
8. Sees ONLY assigned bots (filtered!)
```

---

## 🔧 WHAT'S NEEDED

### Backend Endpoints (2 endpoints)

**1. Validate Invitation Token**
```
GET /api/invitations/validate/:token

Response:
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "role": "admin",
    "invited_by": "owner@example.com",
    "expires_at": "2025-12-30T..."
  }
}
```

**2. Accept Invitation**
```
POST /api/invitations/accept

Body:
{
  "token": "abc123",
  "name": "John Doe",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin"
    }
  }
}

Actions:
1. Validate token
2. Check not expired
3. Create user account
4. Hash password
5. Assign bot permissions from invitation
6. Mark invitation as accepted
7. Return success
```

---

## 💡 WORKAROUND (Temporary)

**Until backend endpoints are ready, you can:**

### Option 1: Manual User Creation (Database)

```sql
-- Create user manually in database
INSERT INTO users (id, email, name, password, role, created_at)
VALUES (
  'user-id-123',
  'user@example.com',
  'Test User',
  '$2a$10$...', -- bcrypt hash of password
  'admin',
  CURRENT_TIMESTAMP
);

-- Assign bot permissions
INSERT INTO bot_permissions (id, bot_id, user_id, can_view, can_create_campaigns, granted_by)
VALUES (
  'perm-id-123',
  'bot-id-here',
  'user-id-123',
  1,
  1,
  'owner-id-here'
);
```

Then user can login normally!

---

### Option 2: Use Existing Register (If Available)

If you have a `/api/auth/register` endpoint:

```javascript
// In accept-invitation page, change to:
const response = await api.auth.register({
  email: invitationData.email,
  name: formData.name,
  password: formData.password,
  role: invitationData.role,
})
```

---

## 🎯 RECOMMENDED SOLUTION

**Quick Implementation (10 minutes):**

Create backend controller for accept invitation:

```javascript
// backend/src/controllers/invitationsController.js

const acceptInvitation = async (req, res) => {
  try {
    const { token, name, password } = req.body

    // 1. Find invitation
    const invitation = await query(
      'SELECT * FROM user_invitations WHERE token = $1 AND accepted_at IS NULL',
      [token]
    )

    if (!invitation.rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired invitation' })
    }

    const inv = invitation.rows[0]

    // 2. Check expiration
    if (new Date(inv.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation expired' })
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 4. Create user
    const userId = crypto.randomUUID()
    await query(
      'INSERT INTO users (id, email, name, password, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, inv.email, name, hashedPassword, inv.role]
    )

    // 5. Mark invitation as accepted
    await query(
      'UPDATE user_invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [inv.id]
    )

    // 6. Return success
    res.json({
      success: true,
      data: {
        user: {
          id: userId,
          email: inv.email,
          name,
          role: inv.role
        }
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

---

## 📝 SUMMARY

**Current State:**
- ✅ Login works for existing users
- ✅ Permission filtering works
- ✅ Accept invitation UI ready
- ⏳ Accept invitation backend needed

**Login Process:**
1. User accepts invitation (creates account)
2. User logs in at `/login` (same as owner)
3. System loads permissions
4. Dashboard shows filtered bots

**Next Steps:**
1. Implement accept invitation backend
2. OR use manual user creation
3. Test login flow
4. Verify permission filtering

---

**Login is the SAME for everyone - only what they SEE is different!** 🔐
