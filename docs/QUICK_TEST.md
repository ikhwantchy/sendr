# 🧪 QUICK TESTING CHECKLIST

## ✅ YANG HARUS LU TEST (Prioritas)

### 1️⃣ DATABASE (WAJIB!)
```bash
cd backend
npm run migrate
```
**✅ PASS:** No errors, tables created

---

### 2️⃣ BACKEND API (WAJIB!)
```bash
# Start backend
npm run dev

# Test health
curl http://localhost:3001/health

# Login & get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'

# Copy token dari response!

# Test user stats (ganti YOUR_TOKEN)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/users/stats
```
**✅ PASS:** 
- Health = "healthy"
- Login dapat token
- User stats return data

---

### 3️⃣ FRONTEND (WAJIB!)
```bash
cd frontend
npm run dev
```

**Test di Browser:**
1. ✅ Login → http://localhost:3000/login
2. ✅ Check Sidebar → Menu "Users" 👥 muncul (owner only)
3. ✅ Click "Users" → Page load tanpa error
4. ✅ Check Stats → 3 cards muncul (Total Users, Admins, Users)
5. ✅ Check Table → User list atau empty state

**✅ PASS:** Semua load tanpa error

---

### 4️⃣ SECURITY (PENTING!)

**Test Owner-Only:**
1. ✅ Login sebagai owner → Menu "Users" muncul
2. ✅ Login sebagai non-owner → Menu "Users" TIDAK muncul
3. ✅ Try API tanpa token → 401 Unauthorized

**✅ PASS:** Security berfungsi

---

## 🚀 SUPER QUICK TEST (2 menit)

```bash
# 1. Migrations
cd backend && npm run migrate

# 2. Backend
npm run dev
# ✅ Check: No errors

# 3. Frontend (terminal baru)
cd frontend && npm run dev
# ✅ Check: No errors

# 4. Browser
# - Login
# - Check sidebar "Users" menu
# - Click "Users"
# - ✅ Page loads = SUCCESS!
```

---

## ❌ TROUBLESHOOTING

**Migration Error:**
```bash
# Check database running
psql -U postgres

# Check .env
cat backend/.env
```

**401 Unauthorized:**
- Re-login untuk get token baru
- Check token di localStorage

**403 Forbidden:**
```sql
-- Set user jadi owner
UPDATE users SET role = 'owner' WHERE email = 'your@email.com';
```

**Users Menu Tidak Muncul:**
- Check user role = 'owner'
- Clear browser cache
- Check localStorage user data

---

## 📊 EXPECTED RESULTS

### API Responses:

**Health Check:**
```json
{"status": "healthy"}
```

**Login:**
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {"role": "owner"}
  }
}
```

**User Stats:**
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

## ✅ SUCCESS CRITERIA

**Backend:**
- [x] Migrations run ✅
- [x] Backend starts ✅
- [x] Health check passes ✅
- [x] Login works ✅
- [x] API returns data ✅

**Frontend:**
- [x] Frontend starts ✅
- [x] Login works ✅
- [x] Sidebar shows "Users" ✅
- [x] Users page loads ✅
- [x] No console errors ✅

**Security:**
- [x] Owner-only menu works ✅
- [x] API protected ✅
- [x] 401 for no token ✅

---

## 🎯 MINIMAL TEST (Paling Cepat)

**Cukup test 3 hal ini:**

1. **Migrations:** `npm run migrate` → No errors
2. **Backend:** `npm run dev` → Starts successfully
3. **Frontend:** Login → Sidebar ada "Users" → Click → Page loads

**✅ Kalau 3 ini pass = System working!**

---

**Total Time:** 2-5 minutes  
**Priority:** Critical  
**Status:** Ready to test! 🚀
