# 🔐 SETUP AKUN ASLI - GUIDE

## 🎯 CARA GANTI KE AKUN ASLI

Ada 2 cara untuk pakai akun asli kamu:

---

## ✅ **OPTION 1: UPDATE OWNER (RECOMMENDED)**

Ganti akun owner default ke email & password kamu.

### **STEP 1: Edit Script**

Buka file: `backend/update-owner.js`

**Ganti 3 baris ini:**
```javascript
const newEmail = 'your-email@example.com';  // ← Email kamu
const newName = 'Your Name';                 // ← Nama kamu
const newPassword = 'your-password';         // ← Password kamu
```

**Contoh:**
```javascript
const newEmail = 'ikhwan@vibeproject.com';
const newName = 'Ikhwan';
const newPassword = 'MySecurePass123!';
```

### **STEP 2: Run Script**

```bash
cd backend
node update-owner.js
```

### **STEP 3: Login**

```
Email: ikhwan@vibeproject.com
Password: MySecurePass123!
```

**Done!** ✅

---

## ✅ **OPTION 2: REGISTER NEW OWNER**

Buat akun owner baru lewat registration page.

### **STEP 1: Go to Register**

```
http://localhost:3000/register
```

### **STEP 2: Fill Form**

- Email: your-email@example.com
- Password: your-password
- Name: Your Name
- Tenant Name: Your Company

### **STEP 3: Login**

Use your new credentials!

**Note:** This creates a NEW tenant, separate from default.

---

## 🔄 **COMPARISON:**

| Method | Pros | Cons |
|--------|------|------|
| **Update Owner** | ✅ Keep existing data<br>✅ Same tenant<br>✅ Quick | ❌ Overwrites default |
| **Register New** | ✅ Fresh start<br>✅ Own tenant | ❌ Lose test data<br>❌ New database |

---

## 📝 **RECOMMENDED FLOW:**

### **For Development/Testing:**
Use **Option 1** (Update Owner)
- Keep test data
- Quick switch
- Same tenant

### **For Production:**
Use **Option 2** (Register New)
- Clean slate
- Proper tenant setup
- Professional email

---

## 🚀 **QUICK START (OPTION 1):**

**1. Edit script:**
```bash
# Open in editor
code backend/update-owner.js

# Or edit manually
notepad backend/update-owner.js
```

**2. Change these lines:**
```javascript
const newEmail = 'ikhwan@example.com';    // Your email
const newName = 'Ikhwan';                  // Your name
const newPassword = 'SecurePass123!';      // Your password
```

**3. Run:**
```bash
cd backend
node update-owner.js
```

**4. Login:**
```
Email: ikhwan@example.com
Password: SecurePass123!
```

**5. Verify:**
- ✅ Can login
- ✅ See all bots
- ✅ See "Users" menu
- ✅ Full owner access

---

## 🔒 **SECURITY TIPS:**

**Good Passwords:**
- ✅ At least 12 characters
- ✅ Mix of letters, numbers, symbols
- ✅ Not common words
- ✅ Unique to this app

**Examples:**
```
❌ Bad: password123
❌ Bad: admin
❌ Bad: 12345678

✅ Good: MyApp2024!Secure
✅ Good: Vibe#Project$2024
✅ Good: WA_Auto_Pass!123
```

---

## 🧪 **TESTING:**

**After updating owner:**

**1. Logout current session**

**2. Login with new credentials:**
```
Email: (your new email)
Password: (your new password)
```

**3. Verify:**
- [ ] Login successful
- [ ] See dashboard
- [ ] See all bots
- [ ] See "Users" menu
- [ ] Can create bots
- [ ] Can invite users

---

## 🔄 **RESET TO DEFAULT:**

If you want to go back to default:

```bash
cd backend
node update-owner.js
```

**Change to:**
```javascript
const newEmail = 'admin@example.com';
const newName = 'Admin User';
const newPassword = 'admin123';
```

---

## 📊 **WHAT GETS UPDATED:**

**Updated:**
- ✅ Email
- ✅ Name
- ✅ Password (hashed)
- ✅ updated_at timestamp

**NOT Changed:**
- ✅ User ID (same)
- ✅ Role (still OWNER)
- ✅ Tenant ID (same)
- ✅ All bots
- ✅ All permissions
- ✅ All data

---

## ⚠️ **IMPORTANT NOTES:**

**1. Backup First (Optional):**
```bash
cd backend/data
copy database.sqlite database.sqlite.backup
```

**2. Remember Your Password:**
- Write it down securely
- Use password manager
- Don't forget it!

**3. Email Must Be Valid:**
- Use real email for production
- Can use any email for testing
- Must be unique in database

---

## 🎉 **READY TO USE:**

**Quick Steps:**
1. Edit `backend/update-owner.js`
2. Change email, name, password
3. Run: `node update-owner.js`
4. Login with new credentials
5. Start using your real account!

---

## 📝 **EXAMPLE SESSION:**

```bash
C:\...\backend> node update-owner.js

🔄 Updating owner account...

New owner details:
  Email: ikhwan@vibeproject.com
  Name: Ikhwan
  Password: MySecurePass123!

[1/3] Hashing password...
✅ Password hashed

[2/3] Updating owner account...
✅ Owner account updated

[3/3] Saving database...
✅ Database saved

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 OWNER ACCOUNT UPDATED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 New Login Credentials:
   Email:    ikhwan@vibeproject.com
   Password: MySecurePass123!
   Name:     Ikhwan
   Role:     OWNER

🚀 You can now login with your real account!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**EDIT SCRIPT DAN RUN SEKARANG!** 🚀

File: `backend/update-owner.js`
