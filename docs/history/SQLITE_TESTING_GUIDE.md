# 🧪 SQLITE TESTING GUIDE - MULTI-USER ACCESS

## ⚠️ IMPORTANT: Your system uses SQLite, not PostgreSQL!

---

## 🚀 STEP 1: RUN SQLITE MIGRATIONS

### Option 1: Using Batch File (Easiest)

**Double-click or run:**
```
RUN_SQLITE_MIGRATIONS.bat
```

### Option 2: Manual Command

```bash
cd backend
node migrate-sqlite.js
```

### Expected Output:
```
Starting SQLite migrations...
[1/7] Ensuring campaigns table exists...
✅ Campaigns table exists
[2/7] Adding new columns to campaigns...
✅ Campaigns columns updated
[3/7] Creating indexes...
✅ Indexes created
[4/7] Creating reminders table...
✅ Reminders table created
[5/7] Adding role column to users...
  ✅ Added role column
  ✅ Updated existing users to owner
[6/7] Creating bot_permissions table...
✅ Bot permissions table created
[7/7] Creating user_invitations table...
✅ User invitations table created
✅ Database saved

🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!

✅ Multi-User Access System migrations:
   - users.role column added
   - bot_permissions table created
   - user_invitations table created
```

### ✅ Checklist:
- [ ] All 7 migrations completed
- [ ] No errors
- [ ] "ALL MIGRATIONS COMPLETED SUCCESSFULLY!"

---

## 🔧 STEP 2: START BACKEND

```bash
cd backend
npm run dev
```

### Expected Output:
```
🚀 Server running on port 3001
📡 API: http://localhost:3001/api
🏥 Health: http://localhost:3001/health
✅ Group integration initialized
```

**✅ Backend is running!**

---

## 🌐 STEP 3: TEST BACKEND API

### 3.1 Health Check

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{"status": "healthy"}
```

---

### 3.2 Login

```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}"
```

**Copy the token from response!**

---

### 3.3 Test User Stats

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/users/stats
```

**Expected:**
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

---

## 🎨 STEP 4: TEST FRONTEND

### 4.1 Start Frontend

```bash
cd frontend
npm run dev
```

### 4.2 Open Browser

**Go to:** http://localhost:3000/login

### 4.3 Login & Test

1. ✅ Login
2. ✅ Check sidebar → "Users" menu
3. ✅ Click "Users"
4. ✅ Page loads
5. ✅ Stats display

---

## ✅ SUCCESS CRITERIA

**Minimum to pass:**
- [x] SQLite migrations successful
- [x] Backend starts
- [x] API returns data
- [x] Frontend loads
- [x] Users page accessible

---

## 🐛 TROUBLESHOOTING

### Migration Error: "Cannot find module"

**Solution:**
```bash
cd backend
npm run build
node migrate-sqlite.js
```

### Database File Not Found

**Solution:**
```bash
# Check if database file exists
dir backend\data\database.sqlite

# If not, backend will create it on first run
cd backend
npm run dev
```

### Users Menu Not Showing

**Solution:**
```bash
# Check user role in SQLite
cd backend
node
> const { query } = require('./dist/database/connection-sqlite')
> query('SELECT id, email, role FROM users').then(r => console.log(r.rows))

# Should show role = 'owner'
```

---

## 📊 QUICK TEST (2 minutes)

```bash
# 1. Run migrations
node backend/migrate-sqlite.js

# 2. Start backend
cd backend && npm run dev

# 3. Start frontend (new terminal)
cd frontend && npm run dev

# 4. Browser test
# - Login
# - Check "Users" menu
# - Click "Users"
# - ✅ SUCCESS!
```

---

## 🎉 NEXT STEPS

After successful testing:

1. ✅ Migrations complete
2. ✅ Backend working
3. ✅ Frontend working
4. ✅ Multi-user features ready

**You can now:**
- Invite users
- Assign bot permissions
- Manage user access
- Test full features

---

**Ready to test!** 🚀

Run: `RUN_SQLITE_MIGRATIONS.bat` or `node backend/migrate-sqlite.js`
