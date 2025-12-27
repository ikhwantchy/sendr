# 🔴 BOT DISCONNECT ISSUE - SOLUTIONS

## ⚠️ **PROBLEM:**

Bot disconnect terus dan harus scan QR ulang!

**Root causes:**
1. Session tidak tersimpan dengan benar
2. WhatsApp kick session karena suspicious activity
3. Tidak ada keepalive mechanism
4. Auto-reconnect terlalu agresif

---

## 🔧 **QUICK FIXES:**

### **Fix 1: Disable Auto-Reconnect (Temporary)**

Auto-reconnect yang terlalu cepat bisa bikin WhatsApp curiga!

**Edit:** `backend/src/adapters/whatsapp/whatsappAdapter.baileys.ts`

**Find line ~225:**
```typescript
if (shouldReconnect) {
    // Auto-reconnect
    setTimeout(() => {
        this.initializeBot(botId).catch(err => {
            logger.error('Failed to reconnect', { error: err, bot_id: botId });
        });
    }, 5000); // ← 5 seconds TOO FAST!
}
```

**Change to:**
```typescript
if (shouldReconnect) {
    // Auto-reconnect with longer delay
    logger.info('Will reconnect in 30 seconds...', { bot_id: botId });
    setTimeout(() => {
        this.initializeBot(botId).catch(err => {
            logger.error('Failed to reconnect', { error: err, bot_id: botId });
        });
    }, 30000); // ← 30 seconds (safer!)
}
```

---

### **Fix 2: Check Auth Files**

Session files might be corrupted!

**Check:**
```bash
dir backend\data\auth_info_multi\YOUR_BOT_ID
```

**Should see:**
- `creds.json` ← Main session file
- `app-state-sync-*.json` ← Sync files

**If files missing or corrupted:**
1. Delete bot in frontend
2. Delete folder: `backend\data\auth_info_multi\YOUR_BOT_ID`
3. Create new bot
4. Scan QR fresh

---

### **Fix 3: Add Keepalive**

WhatsApp might think bot is inactive!

**Edit:** `backend/src/adapters/whatsapp/whatsappAdapter.baileys.ts`

**After line ~88 (after setupEventHandlers):**
```typescript
// ✅ Add keepalive ping
setInterval(() => {
    if (sock.ws.readyState === sock.ws.OPEN) {
        sock.sendPresenceUpdate('available', undefined);
    }
}, 30000); // Ping every 30 seconds
```

---

### **Fix 4: Prevent Multiple Instances**

Make sure only ONE backend instance running!

**Check:**
```bash
# Windows
tasklist | findstr node

# Should see only ONE node.exe for backend
```

**If multiple:**
```bash
# Kill all
taskkill /F /IM node.exe

# Restart backend
cd backend
npm run dev
```

---

## 🎯 **RECOMMENDED APPROACH:**

**Step 1:** Apply Fix 1 (slower reconnect)  
**Step 2:** Restart backend  
**Step 3:** If still disconnects, apply Fix 3 (keepalive)  
**Step 4:** If STILL disconnects, delete & recreate bot (Fix 2)

---

## 📝 **WHY THIS HAPPENS:**

**Common causes:**
1. **Network instability** - WiFi drops
2. **WhatsApp anti-spam** - Too many messages/reconnects
3. **Session corruption** - Files not saved properly
4. **Multiple logins** - Same number on multiple devices
5. **WhatsApp updates** - Server-side changes

---

## ⚠️ **IMPORTANT:**

**DON'T:**
- ❌ Reconnect too fast (< 10 seconds)
- ❌ Send too many messages at once
- ❌ Run multiple backend instances
- ❌ Use same number on multiple bots

**DO:**
- ✅ Wait 30+ seconds before reconnect
- ✅ Limit message rate (2-3 seconds delay)
- ✅ Keep session files backed up
- ✅ Monitor connection status

---

## 🔍 **DEBUG:**

**Check logs for:**
```
WhatsApp disconnected
reason: ...
```

**Common reasons:**
- `401` = Logged out (need new QR)
- `408` = Timeout (network issue)
- `428` = Connection lost (temporary)
- `500` = Server error (WhatsApp side)

---

## 💡 **BEST PRACTICE:**

**For production:**
1. Use dedicated phone number for bot
2. Don't use personal WhatsApp
3. Keep bot online 24/7 (VPS/cloud)
4. Monitor connection status
5. Alert on disconnect
6. Auto-backup session files

---

**Try Fix 1 first (slower reconnect)!**

Let me know if it still disconnects!
