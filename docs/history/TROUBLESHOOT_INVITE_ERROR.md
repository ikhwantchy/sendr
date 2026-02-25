# 🔍 TROUBLESHOOTING - INVITE USER ERROR

## ❌ ERROR: "Failed to invite user"

Kemungkinan penyebab dan solusi:

---

## 🔧 SOLUTION 1: RESTART BACKEND

**Backend belum reload setelah fix!**

```bash
cd backend

# Stop backend (Ctrl+C)
# Then start again:
npm run dev
```

**Wait for:**
```
Server running on port 3001
✅ SQLite database loaded
```

**Then try invite again!**

---

## 🔧 SOLUTION 2: CHECK BACKEND CONSOLE

**Look for errors in backend terminal:**

**Common errors:**
```
❌ Cannot find module '../config/database'
❌ Query error
❌ Owner access required
❌ table users has no column named...
```

**If you see errors, share them!**

---

## 🔧 SOLUTION 3: CHECK BROWSER NETWORK TAB

**1. Open DevTools (F12)**

**2. Go to Network tab**

**3. Try invite user again**

**4. Look for `/api/users/invite` request**

**5. Check:**
- Status code (should be 200)
- Response body
- Error message

**Share screenshot if error!**

---

## 🔧 SOLUTION 4: VERIFY DATABASE

**Check if user_invitations table exists:**

```bash
cd backend/data
sqlite3 database.sqlite

.tables
# Should show: user_invitations

.schema user_invitations
# Should show table structure

.quit
```

---

## 🔧 SOLUTION 5: TEST API DIRECTLY

**Test invite API in browser console:**

```javascript
// Open Console (F12)
const token = localStorage.getItem('token');

fetch('http://localhost:3001/api/users/invite', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    role: 'OPERATOR',
    bot_ids: [],
    permissions: {
      can_view: true,
      can_create_campaigns: true
    }
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
.catch(e => console.error('Error:', e))
```

**Check response!**

---

## 🔧 SOLUTION 6: VERIFY OWNER ROLE

**Check your user role in database:**

```bash
cd backend
node -e "const {query} = require('./dist/database/connection-sqlite'); query('SELECT id, email, role FROM users').then(r => { console.log(JSON.stringify(r.rows, null, 2)); process.exit(0); })"
```

**Should show:**
```json
[
  {
    "id": "...",
    "email": "admin@example.com",
    "role": "OWNER"  // ← Must be OWNER (uppercase)
  }
]
```

---

## 🔧 SOLUTION 7: CHECK MIDDLEWARE

**Verify checkPermission.js has case-insensitive check:**

File: `backend/src/middleware/checkPermission.js`

Line 12 should be:
```javascript
if (req.user.role?.toLowerCase() !== 'owner') {
```

NOT:
```javascript
if (req.user.role !== 'owner') {  // ❌ Wrong
```

---

## 🔧 SOLUTION 8: REBUILD (if using tsx)

**If backend uses tsx, no build needed, just restart!**

```bash
cd backend
# Ctrl+C to stop
npm run dev
```

---

## 📝 QUICK CHECKLIST:

**Before inviting:**
- [ ] Backend running on port 3001
- [ ] No errors in backend console
- [ ] Logged in as OWNER
- [ ] Role is 'OWNER' (uppercase)
- [ ] checkPermission.js has case-insensitive check
- [ ] Frontend can reach backend

**To test:**
- [ ] Open browser console
- [ ] Try invite
- [ ] Check Network tab
- [ ] Look for error message
- [ ] Share error details

---

## 🆘 IF STILL NOT WORKING:

**Share these:**

1. **Backend console output** (when you try invite)
2. **Browser Network tab** (screenshot of /api/users/invite request)
3. **Browser Console** (any errors)
4. **Your user role** (from database check)

---

## 🚀 MOST LIKELY FIX:

**99% of the time it's:**

**RESTART BACKEND!**

```bash
cd backend
# Ctrl+C
npm run dev
```

**Wait for "Server running on port 3001"**

**Then try again!**

---

**TRY RESTART BACKEND FIRST!** 🔄

Most issues fixed by simple restart!
