# 🚨 URGENT FIX - QR & RULES NOT WORKING

## ❌ MASALAH:
1. QR Code tidak bisa di-scan
2. Rules tidak bisa dibuat

## 🔍 ROOT CAUSE:
Kemungkinan besar **BACKEND ISSUE**:
- Backend crash
- Database disconnect
- WhatsApp session error
- API endpoint error

---

## 🛠️ SOLUSI CEPAT:

### **STEP 1: RESTART BACKEND**

#### **A. Stop All Node Processes:**
```powershell
# Stop semua node process
Get-Process -Name node | Stop-Process -Force

# Verify semua sudah stop
Get-Process -Name node -ErrorAction SilentlyContinue
```

#### **B. Restart Backend:**
```bash
# Masuk ke folder backend
cd backend

# Install dependencies (jika belum)
npm install

# Start backend
npm run dev
```

#### **C. Check Backend Logs:**
Lihat terminal backend untuk error messages.

---

### **STEP 2: CHECK DATABASE**

```bash
# Check MySQL running
# Windows: Services → MySQL → Running?

# Test connection
mysql -u root -p
# Enter password

# Check database
SHOW DATABASES;
USE wa_automation;
SHOW TABLES;
```

---

### **STEP 3: RESTART FRONTEND**

```bash
# Masuk ke folder frontend
cd frontend

# Restart
npm run dev
```

---

## 🔧 DETAILED TROUBLESHOOTING:

### **Problem 1: QR Code Tidak Bisa Di-Scan**

#### **Kemungkinan Penyebab:**
1. **WhatsApp session corrupted**
2. **Backend tidak running**
3. **Socket.IO connection failed**
4. **QR expired**

#### **Solusi:**

**A. Clear WhatsApp Session:**
```bash
# Di folder backend
# Delete session folder
rm -rf .wwebjs_auth
# atau
Remove-Item -Recurse -Force .wwebjs_auth
```

**B. Restart Backend:**
```bash
cd backend
npm run dev
```

**C. Generate New QR:**
1. Refresh browser
2. Click "Connect Bot"
3. Scan QR baru

---

### **Problem 2: Rules Tidak Bisa Dibuat**

#### **Kemungkinan Penyebab:**
1. **Backend endpoint error**
2. **Database table issue**
3. **Validation error**
4. **Field name mismatch**

#### **Solusi:**

**A. Check Backend Endpoint:**
```bash
# Test dengan curl
curl -X POST http://localhost:3001/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "YOUR_BOT_ID",
    "trigger": "test",
    "reply": "test reply",
    "match_type": "contains",
    "is_active": true
  }'
```

**B. Check Database Table:**
```sql
-- Check rules table structure
DESCRIBE rules;

-- Check if table exists
SHOW TABLES LIKE 'rules';

-- Check columns
SHOW COLUMNS FROM rules;
```

**C. Check Backend Logs:**
Lihat error di terminal backend saat create rule.

---

## 📋 COMPLETE RESTART PROCEDURE:

### **1. Stop Everything:**
```powershell
# Stop all node processes
Get-Process -Name node | Stop-Process -Force

# Verify
Get-Process -Name node -ErrorAction SilentlyContinue
```

### **2. Clear Cache (Optional):**
```bash
# Backend
cd backend
rm -rf node_modules
npm install

# Frontend
cd frontend
rm -rf node_modules
rm -rf .next
npm install
```

### **3. Clear WhatsApp Session:**
```bash
cd backend
rm -rf .wwebjs_auth
rm -rf .wwebjs_cache
```

### **4. Restart Database:**
```
Windows: Services → MySQL → Restart
```

### **5. Start Backend:**
```bash
cd backend
npm run dev

# Wait for:
# ✓ Server running on port 3001
# ✓ Database connected
# ✓ WhatsApp client initialized
```

### **6. Start Frontend:**
```bash
cd frontend
npm run dev

# Wait for:
# ✓ Ready on http://localhost:3000
```

### **7. Test:**
```
1. Open http://localhost:3000
2. Login
3. Create/Connect bot
4. Scan QR
5. Try create rule
```

---

## 🔍 CHECK BACKEND LOGS:

### **What to Look For:**

**Good Logs:**
```
✓ Server running on port 3001
✓ Database connected successfully
✓ WhatsApp client initialized
✓ QR Code generated
✓ WhatsApp authenticated
```

**Bad Logs:**
```
✗ Error connecting to database
✗ Port 3001 already in use
✗ Cannot find module
✗ Validation error
✗ Table doesn't exist
```

---

## 🚨 COMMON ERRORS & FIXES:

### **Error: "Port 3001 already in use"**
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process
taskkill /PID <PID> /F
```

### **Error: "Cannot connect to database"**
```bash
# Check MySQL running
# Start MySQL service
net start MySQL80

# Or restart
net stop MySQL80
net start MySQL80
```

### **Error: "Table 'rules' doesn't exist"**
```bash
# Run migrations
cd backend
npm run migrate

# Or manually create
mysql -u root -p wa_automation < migrations/create_rules_table.sql
```

### **Error: "WhatsApp authentication failed"**
```bash
# Clear session
cd backend
rm -rf .wwebjs_auth

# Restart backend
npm run dev
```

---

## 📞 QUICK DIAGNOSTIC:

### **Run This in PowerShell:**
```powershell
# Check processes
Write-Host "=== NODE PROCESSES ===" -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue

# Check ports
Write-Host "`n=== PORT 3001 ===" -ForegroundColor Cyan
netstat -ano | findstr :3001

Write-Host "`n=== PORT 3000 ===" -ForegroundColor Cyan
netstat -ano | findstr :3000

# Check MySQL
Write-Host "`n=== MYSQL SERVICE ===" -ForegroundColor Cyan
Get-Service -Name MySQL* -ErrorAction SilentlyContinue
```

---

## ✅ VERIFICATION CHECKLIST:

After restart, verify:

- [ ] Backend running (http://localhost:3001)
- [ ] Frontend running (http://localhost:3000)
- [ ] MySQL service running
- [ ] Database connected (check backend logs)
- [ ] Can login to frontend
- [ ] Can create bot
- [ ] QR code appears
- [ ] Can scan QR
- [ ] Can create rule

---

## 🎯 RECOMMENDED ACTION:

**DO THIS NOW:**

1. **Stop all node processes**
2. **Clear WhatsApp session**
3. **Restart backend**
4. **Check backend logs**
5. **Restart frontend**
6. **Test QR scan**
7. **Test create rule**

---

## 📸 IF STILL NOT WORKING:

**Share these screenshots:**
1. Backend terminal (full logs)
2. Frontend browser console (F12)
3. Network tab (failed requests)
4. Database tables (`SHOW TABLES;`)

---

**START WITH FULL RESTART!** 🔄

```bash
# 1. Stop all
Get-Process -Name node | Stop-Process -Force

# 2. Clear session
cd backend
rm -rf .wwebjs_auth

# 3. Start backend
npm run dev

# 4. Start frontend (new terminal)
cd frontend
npm run dev

# 5. Test!
```

**GOOD LUCK!** 🍀
