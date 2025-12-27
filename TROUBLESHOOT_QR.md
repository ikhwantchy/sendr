# 🔧 TROUBLESHOOTING - QR Code Issues

## ❌ Error: "Failed to generate QR code"

### **Kemungkinan Penyebab:**

1. **Baileys initialization issue**
2. **Session folder permission**
3. **Network/firewall blocking**
4. **Dependency issue**

---

## ✅ **SOLUSI CEPAT:**

### **Option 1: Restart Backend** (Paling Simple)

```bash
# Stop backend (Ctrl+C)
cd backend
npm run dev
```

Lalu coba lagi:
1. Refresh browser (F5)
2. Click "Connect to WhatsApp"
3. Tunggu 5-10 detik

---

### **Option 2: Clear Sessions & Restart**

```bash
# Stop backend (Ctrl+C)

# Delete sessions folder
rm -rf backend/sessions

# Restart
cd backend
npm run dev
```

Lalu coba lagi connect.

---

### **Option 3: Check Backend Logs**

Lihat terminal backend untuk error detail:

**Good logs:**
```
✅ Bot initialized successfully
✅ QR Code generated
✅ QR code found
```

**Bad logs:**
```
❌ Failed to initialize bot
❌ Failed to generate QR code
❌ QR code generation timeout
```

Jika ada error, screenshot dan share!

---

### **Option 4: Reinstall Baileys**

```bash
cd backend
npm uninstall @whiskeysockets/baileys
npm install @whiskeysockets/baileys@latest
npm run dev
```

---

## 🎯 **ALTERNATIF: Pakai Mock Adapter Dulu**

Kalau Baileys masih error, pakai mock adapter untuk testing:

### **Edit `backend/src/api/routes/botRoutes.ts`:**

```typescript
// Ganti dari:
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.baileys';

// Jadi:
import { whatsappAdapter } from '../../adapters/whatsapp/whatsappAdapter.mock';
```

### **Restart backend:**
```bash
npm run dev
```

### **Test:**
- QR akan muncul instant
- Auto-connect setelah 5 detik
- Bisa test semua fitur (simulated)

---

## 📊 **Check System:**

### **1. Check Node Version:**
```bash
node --version
# Should be >= 18.0.0
```

### **2. Check NPM Packages:**
```bash
cd backend
npm list @whiskeysockets/baileys
npm list @hapi/boom
```

### **3. Check Sessions Folder:**
```bash
# Should exist and be writable
ls -la backend/sessions
```

---

## 🔄 **FULL RESET (Last Resort):**

```bash
# Stop backend

# Delete everything
rm -rf backend/node_modules
rm -rf backend/sessions
rm -rf backend/data/database.sqlite

# Reinstall
cd backend
npm install

# Restart
npm run dev
```

Lalu:
1. Refresh browser
2. Create new bot
3. Try connect

---

## 📱 **JIKA MASIH ERROR:**

### **Screenshot yang dibutuhkan:**

1. **Backend terminal** (full error)
2. **Browser console** (F12 → Console)
3. **Network tab** (F12 → Network → filter: connect)

### **Info yang dibutuhkan:**

- Node version: `node --version`
- NPM version: `npm --version`
- OS: Windows/Linux/Mac
- Error message lengkap

---

## ✅ **QUICK FIX SUMMARY:**

**Try in order:**

1. ✅ **Restart backend** (30 seconds)
2. ✅ **Clear sessions** (1 minute)
3. ✅ **Use mock adapter** (2 minutes)
4. ✅ **Reinstall Baileys** (3 minutes)
5. ✅ **Full reset** (5 minutes)

**Salah satu pasti jalan!** 🚀

---

**Coba restart backend dulu dan test lagi!** 😊
