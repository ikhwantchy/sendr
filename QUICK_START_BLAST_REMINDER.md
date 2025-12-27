# 🚀 QUICK START - BLAST & REMINDER

## ✅ **STEP-BY-STEP SETUP:**

### **1. ENSURE REDIS IS RUNNING**

**Option A: Download Redis for Windows**
- Download: https://github.com/microsoftarchive/redis/releases
- Extract and run `redis-server.exe`

**Option B: Use Docker**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Test Redis:**
```bash
redis-cli ping
# Should return: PONG
```

---

### **2. UPDATE .ENV FILE**

Edit `backend/.env` and add:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_CONCURRENCY=5
CAMPAIGN_MESSAGE_DELAY_MS=2000

# Timezone
TZ=Asia/Jakarta
```

---

### **3. RUN DATABASE MIGRATIONS**

From `backend` directory:

```bash
npx tsx migrate.ts
```

**Expected output:**
```
[1/2] Updating campaigns table...
✅ Campaigns table updated
[2/2] Creating reminders table...
✅ Reminders table created
🎉 All migrations completed successfully!
```

---

### **4. RESTART BACKEND**

```bash
npm run dev
```

**Expected logs:**
```
✅ Message queue initialized
✅ Message queue ready
✅ Queue worker initialized
✅ Reminder scheduler started
🚀 Server running on port 3001
```

---

### **5. TEST AUTO-REPLY (CRITICAL!)**

⚠️ **MUST TEST THIS FIRST!**

1. Send "halo" to your WhatsApp bot
2. Bot should reply "Ya, Halo!"
3. If this doesn't work, **STOP** and report issue!

---

### **6. TEST CAMPAIGN**

**Create a test campaign:**

```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"YOUR_BOT_ID\",
    \"name\": \"Test Campaign\",
    \"message_template\": \"Hello from campaign!\",
    \"target_type\": \"specific\",
    \"target_contacts\": [\"6281234567890\"]
  }"
```

**Check campaign status:**
```bash
curl http://localhost:3001/api/campaigns
```

---

### **7. TEST REMINDER**

**Create a reminder (2 minutes from now):**

```bash
# Calculate time: current time + 2 minutes
# Example: if now is 18:15, set to 18:17

curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"YOUR_BOT_ID\",
    \"name\": \"Test Reminder\",
    \"message\": \"This is a test reminder!\",
    \"recipient\": \"6281234567890\",
    \"schedule_type\": \"once\",
    \"schedule_config\": {
      \"datetime\": \"2025-12-20T18:17:00+07:00\"
    }
  }"
```

**Wait 2 minutes and check if message sent!**

---

### **8. TEST DAILY REMINDER**

```bash
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"YOUR_BOT_ID\",
    \"name\": \"Daily Good Morning\",
    \"message\": \"Good morning!\",
    \"recipient\": \"6281234567890\",
    \"schedule_type\": \"daily\",
    \"schedule_config\": {
      \"time\": \"09:00\"
    }
  }"
```

---

### **9. TEST WEEKLY REMINDER**

```bash
curl -X POST http://localhost:3001/api/reminders \
  -H "Content-Type: application/json" \
  -d "{
    \"bot_id\": \"YOUR_BOT_ID\",
    \"name\": \"Weekly Report Reminder\",
    \"message\": \"Please submit your weekly report!\",
    \"recipient\": \"6281234567890\",
    \"schedule_type\": \"weekly\",
    \"schedule_config\": {
      \"time\": \"17:00\",
      \"days\": [1, 3, 5]
    }
  }"
```

**Days:** 0=Sunday, 1=Monday, 2=Tuesday, etc.

---

## 🐛 **TROUBLESHOOTING:**

### **Redis Connection Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Fix:**
1. Check Redis is running: `redis-cli ping`
2. Check `.env` has correct `REDIS_HOST` and `REDIS_PORT`
3. Restart Redis

---

### **Migration Error:**
```
Cannot find module './dist/database/connection'
```

**Fix:**
1. Build TypeScript first: `npm run build`
2. Or use: `npx tsx migrate.ts`

---

### **Auto-Reply Not Working:**
```
Bot doesn't reply to "halo"
```

**Fix:**
1. Check bot is connected
2. Check rule exists in database
3. Check backend logs for errors
4. Verify rule engine loaded: look for "Rule Engine initialized" in logs

---

### **Reminder Not Triggering:**
```
Reminder created but not sending
```

**Fix:**
1. Check `next_run_at` is in the future
2. Check `is_active = true`
3. Check scheduler logs: "Reminder scheduler started"
4. Wait for next minute (scheduler runs every minute)

---

## 📊 **MONITORING:**

**Check Queue:**
```bash
redis-cli LLEN "bull:whatsapp-messages:wait"
```

**Check Active Jobs:**
```bash
redis-cli LLEN "bull:whatsapp-messages:active"
```

**Check Failed Jobs:**
```bash
redis-cli LLEN "bull:whatsapp-messages:failed"
```

**Clear Queue:**
```bash
redis-cli FLUSHDB
```

---

## ✅ **SUCCESS CHECKLIST:**

- [ ] Redis running
- [ ] .env configured
- [ ] Migrations completed
- [ ] Backend restarted
- [ ] Auto-reply "halo" works ⚠️ **CRITICAL!**
- [ ] Campaign sends messages
- [ ] Reminder triggers on time
- [ ] Daily reminder works
- [ ] Weekly reminder works

---

## 🎉 **ALL DONE!**

**Features Working:**
- ✅ Auto-reply (preserved)
- ✅ Campaign blast
- ✅ One-time reminders
- ✅ Daily reminders
- ✅ Weekly reminders

**Next:** Build frontend UI or use API directly!

---

**Need Help?** Check `BLAST_REMINDER_COMPLETE.md` for full documentation!
