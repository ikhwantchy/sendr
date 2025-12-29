# 🚀 BLAST & REMINDER IMPLEMENTATION PLAN

## 📋 **FILES YANG AKAN DIBUAT/DIUBAH:**

### **✅ SUDAH DIBUAT:**

1. ✅ `backend/src/queue/messageQueue.ts` - Queue infrastructure
2. ✅ `backend/src/modules/campaign/campaignService.ts` - Campaign service

---

### **🔄 YANG AKAN DIBUAT SELANJUTNYA:**

#### **Backend - Reminder System:**

3. **`backend/src/modules/reminder/reminderService.ts`**
   - Create reminder
   - Schedule reminder (one-time / recurring)
   - Execute reminder
   - Cancel reminder
   - List reminders

4. **`backend/src/scheduler/reminderScheduler.ts`**
   - Cron job untuk check reminders
   - Support daily, weekly, specific days
   - Execute due reminders

#### **Backend - API Routes:**

5. **`backend/src/api/routes/campaignRoutes.ts`** (UPDATE)
   - POST `/api/campaigns` - Create campaign
   - GET `/api/campaigns` - List campaigns
   - GET `/api/campaigns/:id` - Get campaign status
   - POST `/api/campaigns/:id/send` - Send campaign now
   - DELETE `/api/campaigns/:id` - Delete campaign

6. **`backend/src/api/routes/reminderRoutes.ts`** (NEW)
   - POST `/api/reminders` - Create reminder
   - GET `/api/reminders` - List reminders
   - GET `/api/reminders/:id` - Get reminder
   - PUT `/api/reminders/:id` - Update reminder
   - DELETE `/api/reminders/:id` - Delete reminder

#### **Backend - Database:**

7. **`backend/src/database/migrations/add_reminders_table.sql`** (NEW)
   - Create `reminders` table
   - Fields: id, tenant_id, bot_id, name, message, recipient, schedule_type, schedule_config, next_run_at, last_run_at, is_active, created_at

8. **`backend/src/database/migrations/update_campaigns_table.sql`** (NEW)
   - Add fields: total_contacts, sent_count, failed_count, started_at, completed_at

#### **Frontend - Campaign UI:**

9. **`frontend/src/app/dashboard/campaigns/page.tsx`** (UPDATE)
   - Campaign creation form (full functional)
   - Campaign list with status
   - Progress tracking
   - Send now / Schedule

10. **`frontend/src/components/campaign/CampaignForm.tsx`** (NEW)
    - Campaign name
    - Message template
    - Target selection (all/specific)
    - Contact input (manual/CSV)
    - Schedule date/time

11. **`frontend/src/components/campaign/CampaignList.tsx`** (NEW)
    - Campaign cards with status
    - Progress bars
    - Sent/Failed counts
    - Actions (send/delete)

#### **Frontend - Reminder UI:**

12. **`frontend/src/app/dashboard/reminders/page.tsx`** (NEW)
    - Reminder list
    - Create reminder button
    - Reminder status

13. **`frontend/src/components/reminder/ReminderForm.tsx`** (NEW)
    - Reminder name
    - Message
    - Recipient
    - Schedule type (one-time/daily/weekly/custom)
    - Time selection
    - Day selection (for recurring)

14. **`frontend/src/components/reminder/ReminderList.tsx`** (NEW)
    - Reminder cards
    - Next run time
    - Active/Inactive toggle
    - Edit/Delete actions

#### **Backend - Integration:**

15. **`backend/src/index.ts`** (UPDATE)
    - Import queue processors
    - Import scheduler
    - Start scheduler on boot

16. **`backend/.env.example`** (UPDATE)
    - Add Redis config

---

## 🎯 **FITUR YANG AKAN DIIMPLEMENTASI:**

### **BLAST / CAMPAIGN:**

✅ **Create Campaign**
- Campaign name
- Message template
- Target: All contacts / Specific numbers
- Schedule: Now / Later

✅ **Send Campaign**
- Queue messages (avoid spam)
- Random delay 0-5s per message
- Track sent/failed count
- Update status (sending → completed)

✅ **Campaign Status**
- Total contacts
- Sent count
- Failed count
- Progress percentage
- Started/Completed time

✅ **Campaign List**
- View all campaigns
- Filter by bot
- Status badges
- Delete campaign

---

### **REMINDER:**

✅ **Create Reminder**
- Reminder name
- Message content
- Recipient (phone number)
- Schedule type:
  - **One-time:** Specific date & time
  - **Daily:** Every day at specific time
  - **Weekly:** Specific days (Mon, Tue, etc)
  - **Custom:** Specific dates

✅ **Schedule Reminder**
- Store in database
- Calculate next_run_at
- Cron job checks every minute
- Execute due reminders

✅ **Recurring Reminders**
- Daily: Runs every day at set time
- Weekly: Runs on selected days
- Auto-calculate next run after execution

✅ **Reminder Management**
- List all reminders
- View next run time
- Active/Inactive toggle
- Edit reminder
- Delete reminder

---

## 📊 **DATABASE SCHEMA:**

### **Campaigns Table:**
```sql
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message_template TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'all' | 'specific'
    target_contacts TEXT, -- JSON array
    scheduled_at TIMESTAMP,
    status TEXT DEFAULT 'draft', -- 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);
```

### **Reminders Table:**
```sql
CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient TEXT NOT NULL, -- Phone number
    schedule_type TEXT NOT NULL, -- 'once' | 'daily' | 'weekly' | 'custom'
    schedule_config TEXT, -- JSON config for recurring
    next_run_at TIMESTAMP NOT NULL,
    last_run_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Schedule Config Examples:**
```json
// Daily at 9 AM
{
  "time": "09:00",
  "timezone": "Asia/Jakarta"
}

// Weekly on Mon, Wed, Fri at 10 AM
{
  "time": "10:00",
  "days": [1, 3, 5], // 0=Sun, 1=Mon, etc
  "timezone": "Asia/Jakarta"
}

// One-time
{
  "datetime": "2025-12-25T10:00:00+07:00"
}
```

---

## ⏱️ **ESTIMASI WAKTU:**

| Task | Time | Status |
|------|------|--------|
| Queue Infrastructure | 30 min | ✅ Done |
| Campaign Service | 1 hour | ✅ Done |
| Reminder Service | 1 hour | 🔄 Next |
| Reminder Scheduler | 45 min | 🔄 Next |
| Campaign API Routes | 30 min | 🔄 Next |
| Reminder API Routes | 30 min | 🔄 Next |
| Database Migrations | 20 min | 🔄 Next |
| Campaign Frontend | 1.5 hours | 🔄 Next |
| Reminder Frontend | 1.5 hours | 🔄 Next |
| Testing & Debugging | 1 hour | 🔄 Next |

**Total:** ~8-9 hours

---

## 🚀 **NEXT STEPS:**

Saya akan lanjutkan implement semua files di atas. Prosesnya:

1. ✅ Queue & Campaign Service (DONE)
2. 🔄 Reminder Service & Scheduler
3. 🔄 API Routes (Campaign & Reminder)
4. 🔄 Database Migrations
5. 🔄 Frontend UI (Campaign & Reminder)
6. 🔄 Integration & Testing

**Lanjutkan sekarang?** (Y/N)

Atau ada yang mau diubah dari plan ini?

---

**NOTE:** 
- Redis harus running di localhost:6379
- Jika belum install Redis, perlu install dulu
- Untuk Windows: Download Redis dari https://github.com/microsoftarchive/redis/releases
