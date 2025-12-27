# ⚠️ QUICK FIX NEEDED

## **PROBLEM:**
Campaign & Reminder services masih pakai PostgreSQL `pool` instead of SQLite `query`!

## **QUICK FIX:**

Saya sudah fix **Reminder Scheduler** ✅

Tapi **Campaign Service** dan **Reminder Service** masih perlu difix.

### **TEMPORARY SOLUTION:**

Untuk sekarang, **DISABLE** reminder scheduler dulu supaya error hilang:

Edit `backend/src/index.ts` line ~100:

**COMMENT OUT:**
```typescript
// ✅ Start reminder scheduler (NEW)
// reminderScheduler.start();  // ← COMMENT THIS
// logger.info('✅ Reminder scheduler started');
```

Jadi:
```typescript
// ✅ Start reminder scheduler (NEW) - DISABLED FOR NOW
// reminderScheduler.start();
// logger.info('✅ Reminder scheduler started');
```

### **THEN RESTART:**
```bash
npm run dev
```

Error akan hilang!

---

## **PROPER FIX (Nanti):**

Saya perlu update:
1. `campaign/campaignService.ts` - Ganti `pool` ke SQLite `query`
2. `reminder/reminderService.ts` - Ganti `pool` ke SQLite `query`
3. `queue/messageWorker.ts` - Ganti `pool` ke SQLite `query`

Ini butuh banyak perubahan SQL syntax (PostgreSQL → SQLite).

---

## **RECOMMENDATION:**

**Option 1: Disable Scheduler (Quick)**
- Comment out `reminderScheduler.start()`
- Campaign & auto-reply will work
- Reminder manual via API masih bisa (tapi ga auto-trigger)

**Option 2: Full Fix (Proper)**
- Saya fix semua services ke SQLite
- Butuh waktu ~30 menit
- Semua fitur akan work

---

**Mau yang mana?**
1. Quick fix (disable scheduler) → Test campaign & auto-reply dulu
2. Full fix → Saya update semua services ke SQLite sekarang

**Reply:** "quick" atau "full"
