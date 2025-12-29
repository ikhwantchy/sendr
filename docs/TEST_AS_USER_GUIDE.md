# 🧪 CARA TEST SEBAGAI USER - STEP BY STEP

## 🚀 CARA TERCEPAT (5 MENIT)

### **STEP 1: Buka Database**

```bash
cd backend/data
sqlite3 database.sqlite
```

---

### **STEP 2: Get Bot ID & Owner ID**

**Di SQLite prompt, run:**
```sql
-- Get bot ID
SELECT id, name FROM bots;

-- Get owner ID  
SELECT id, email, role FROM users WHERE role = 'owner';
```

**Copy:**
- Bot ID (contoh: `bot-abc123`)
- Owner ID (contoh: `owner-xyz789`)

---

### **STEP 3: Create Test User**

**Copy-paste ini di SQLite (ganti YOUR_BOT_ID dan YOUR_OWNER_ID):**

```sql
-- Create test user (password: "password123")
INSERT INTO users (id, email, name, password, role, created_at, updated_at)
VALUES (
  'test-user-001',
  'testuser@example.com',
  'Test User',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO',
  'admin',
  datetime('now'),
  datetime('now')
);

-- Assign bot permissions (GANTI YOUR_BOT_ID dan YOUR_OWNER_ID!)
INSERT INTO bot_permissions (
  id, bot_id, user_id,
  can_view, can_edit, can_delete,
  can_create_campaigns, can_create_rules, can_view_analytics,
  granted_by, granted_at, updated_at
)
VALUES (
  'perm-test-001',
  'YOUR_BOT_ID',
  'test-user-001',
  1, 0, 0,
  1, 0, 1,
  'YOUR_OWNER_ID',
  datetime('now'),
  datetime('now')
);
```

---

### **STEP 4: Verify**

```sql
-- Check user created
SELECT id, email, name, role FROM users WHERE email = 'testuser@example.com';

-- Check permissions
SELECT * FROM bot_permissions WHERE user_id = 'test-user-001';

-- Exit SQLite
.quit
```

---

### **STEP 5: TEST LOGIN!**

**1. Logout dari owner account**
- Click "Logout" di sidebar

**2. Login sebagai test user:**
- Email: `testuser@example.com`
- Password: `password123`

**3. Check hasil:**
- ✅ Login berhasil
- ✅ Redirect ke dashboard
- ✅ **Cuma lihat 1 bot** (yang di-assign)
- ✅ Menu "Users" TIDAK muncul (bukan owner)

---

## 🎯 EXPECTED RESULTS

### **Sebagai Owner:**
```
Sidebar:
- Dashboard
- Bots (ALL bots)
- Rules
- Campaigns
- Reminders
- Data Sources
- Analytics
- 👥 Users ← MUNCUL!

Bots Page:
- See ALL bots
```

### **Sebagai Test User (Admin):**
```
Sidebar:
- Dashboard
- Bots (ONLY assigned bot)
- Rules
- Campaigns
- Reminders
- Data Sources
- Analytics
(NO Users menu!)

Bots Page:
- See ONLY 1 bot (yang di-assign)
```

---

## 🔧 TROUBLESHOOTING

### Issue: Password hash tidak work

**Solution:** Use this exact hash (for password "password123"):
```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO
```

### Issue: User tidak bisa login

**Check:**
```sql
-- Verify user exists
SELECT * FROM users WHERE email = 'testuser@example.com';

-- Check password field not empty
SELECT email, password FROM users WHERE email = 'testuser@example.com';
```

### Issue: User login tapi lihat semua bots

**Check:**
```sql
-- Verify role is NOT owner
SELECT email, role FROM users WHERE email = 'testuser@example.com';
-- Should be: admin or user, NOT owner

-- Check permissions exist
SELECT * FROM bot_permissions WHERE user_id = 'test-user-001';
-- Should return at least 1 row
```

---

## 📝 QUICK REFERENCE

**Test User Credentials:**
- Email: `testuser@example.com`
- Password: `password123`
- Role: `admin`

**What Test User Can Do:**
- ✅ View assigned bot
- ✅ Create campaigns
- ✅ View analytics
- ❌ Edit bot
- ❌ Delete bot
- ❌ Create rules
- ❌ See other bots
- ❌ Manage users

---

## 🎉 SUCCESS CHECKLIST

After login as test user:

- [ ] Login successful
- [ ] Redirected to dashboard
- [ ] See only 1 bot (not all)
- [ ] "Users" menu NOT visible
- [ ] Can click on assigned bot
- [ ] Can create campaign (if permission granted)
- [ ] Cannot see owner's other bots

---

**READY TO TEST!** 🚀

**Steps:**
1. Run SQL script
2. Logout from owner
3. Login as testuser@example.com / password123
4. Check bot filtering works!
