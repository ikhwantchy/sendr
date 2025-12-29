# 🎉 TEST USER - READY TO USE!

## 🚀 CARA PAKAI (2 LANGKAH)

### **STEP 1: Create Test User**

**Double-click file ini:**
```
CREATE_TEST_USER.bat
```

**Atau di terminal:**
```bash
cd backend
node create-test-user.js
```

**Output:**
```
🎉 TEST USER CREATED SUCCESSFULLY!

📝 Login Credentials:
   Email:    testuser@example.com
   Password: password123
   Role:     admin
```

---

### **STEP 2: Login!**

**1. Logout dari owner account**

**2. Login dengan:**
- Email: `testuser@example.com`
- Password: `password123`

**3. Check hasil:**
- ✅ Cuma lihat 1 bot (bukan semua)
- ✅ Menu "Users" TIDAK ada
- ✅ Bisa create campaigns
- ❌ Tidak bisa edit/delete bot

---

## 📊 WHAT TEST USER CAN DO

**✅ Allowed:**
- View assigned bot
- Create campaigns
- View analytics

**❌ Not Allowed:**
- Edit bot settings
- Delete bot
- Create rules
- See other bots
- Manage users

---

## 🔄 COMPARISON

### **Owner Account:**
```
Bots Page:
- Bot 1 ✅
- Bot 2 ✅
- Bot 3 ✅
- (All bots visible)

Sidebar:
- 👥 Users (visible)
```

### **Test User Account:**
```
Bots Page:
- Bot 1 ✅
- (Only assigned bot visible)

Sidebar:
- (No Users menu)
```

---

## 🧪 TESTING CHECKLIST

After login as test user:

- [ ] Login successful
- [ ] See only 1 bot (not all)
- [ ] "Users" menu NOT visible
- [ ] Can click on assigned bot
- [ ] Can create campaign
- [ ] Cannot see owner's other bots

---

## 🔧 TROUBLESHOOTING

### Issue: Script error

**Check:**
1. Backend compiled: `npm run build`
2. Database exists: `backend/data/database.sqlite`

### Issue: No bots found

**Solution:**
1. Login as owner
2. Create at least 1 bot
3. Run script again

### Issue: Login failed

**Check credentials:**
- Email: `testuser@example.com` (exact)
- Password: `password123` (exact)

---

## 📝 QUICK REFERENCE

**Test User:**
- Email: `testuser@example.com`
- Password: `password123`
- Role: `admin`

**Script Location:**
- `CREATE_TEST_USER.bat` (Windows)
- `backend/create-test-user.js` (Node script)

**What It Does:**
1. Gets owner ID
2. Gets first bot ID
3. Creates test user
4. Assigns bot permissions
5. Ready to login!

---

## 🎯 READY!

**Run script:**
```bash
CREATE_TEST_USER.bat
```

**Then login:**
- testuser@example.com
- password123

**Check filtering works!** ✅
