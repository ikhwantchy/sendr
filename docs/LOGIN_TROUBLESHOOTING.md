# ❌ LOGIN MASIH GAGAL - TROUBLESHOOTING

## 🔍 KEMUNGKINAN PENYEBAB:

### 1. Backend Belum Di-Rebuild
Backend masih pakai code lama (PostgreSQL syntax)

### 2. Backend Belum Di-Restart  
Perlu restart setelah rebuild

### 3. Build Masih Error
TypeScript compilation failed

---

## ✅ SOLUSI LENGKAP:

### **STEP 1: Check Backend Running**

Apakah backend sedang running?
- Lihat terminal backend
- Harus ada output "Server running on port 3001"

Jika TIDAK running:
```bash
cd backend
npm run dev
```

---

### **STEP 2: Rebuild Backend**

```bash
cd backend
npm run build
```

**Check output:**
- ✅ Jika sukses: "Successfully compiled"
- ❌ Jika error: Share error message

---

### **STEP 3: Restart Backend**

**Stop backend:**
- Tekan Ctrl+C di terminal backend

**Start lagi:**
```bash
npm run dev
```

**Check output:**
- Harus ada: "Server running on port 3001"
- Harus ada: "✅ SQLite database loaded"

---

### **STEP 4: Test API Directly**

**Buka browser baru, paste ini di address bar:**
```
http://localhost:3001/health
```

**Expected response:**
```json
{"status":"healthy"}
```

**Jika error:**
- Backend tidak running
- Port 3001 dipakai aplikasi lain

---

### **STEP 5: Test Login API**

**Buka Console (F12), run:**
```javascript
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'testuser@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(d => console.log('Response:', d))
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "token": "...",
    "user": {...}
  }
}
```

**Jika error:**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## 🐛 DEBUGGING:

### Check 1: Backend Console

**Lihat terminal backend saat login:**
- Ada error message?
- Ada SQL error?
- Share screenshot!

### Check 2: Browser Network Tab

**F12 → Network → Try login:**
- Request ke `/api/auth/login`?
- Status code berapa? (401, 500, etc)
- Response body apa?

### Check 3: Database

**Verify user exists:**
```bash
cd backend
node test-login.js
```

**Should show:**
```
✅ LOGIN TEST PASSED!
```

---

## 🚀 QUICK FIX:

**Run semua ini:**

```bash
# Terminal 1: Backend
cd backend
npm run build
npm run dev

# Terminal 2: Test
node test-login.js
```

**Then try login again!**

---

## 📝 CHECKLIST:

- [ ] Backend running (port 3001)
- [ ] Build successful (no errors)
- [ ] `/health` endpoint works
- [ ] `test-login.js` passes
- [ ] Backend console shows no errors
- [ ] Try login again

---

**SHARE:**
1. Backend console output
2. Browser network tab screenshot
3. Any error messages

**Saya bantu debug!** 🔍
