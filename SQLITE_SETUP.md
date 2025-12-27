# 🚀 SQLite Setup - Zero Configuration Database!

## ✅ Kenapa SQLite?

- ✅ **No Installation** - Tidak perlu install PostgreSQL
- ✅ **No Configuration** - Tidak perlu setup password, port, dll
- ✅ **Auto-Create** - Database file dibuat otomatis
- ✅ **File-Based** - Database = 1 file `.sqlite`
- ✅ **Portable** - Tinggal copy file database
- ✅ **Perfect for Development** - Setup instant!

---

## 🔧 Cara Pakai SQLite

### Step 1: Install Package (SUDAH SELESAI)
```bash
npm install sql.js
```
✅ Sudah diinstall!

### Step 2: Update Connection Import

Edit file yang pakai database connection, ganti import:

**SEBELUM:**
```typescript
import { query } from './database/connection';
```

**SESUDAH:**
```typescript
import { query } from './database/connection-sqlite';
```

**Files yang perlu diupdate:**
1. `backend/src/api/routes/authRoutes.ts`
2. `backend/src/database/repositories/botRepository.ts`
3. `backend/src/database/repositories/keywordRuleRepository.ts`
4. `backend/src/database/repositories/eventLogRepository.ts`
5. `backend/src/core/events/eventBus.ts`

### Step 3: Update .env (OPTIONAL)

SQLite tidak butuh config, tapi bisa set path:

```env
# SQLite Configuration (optional)
DB_TYPE=sqlite
DB_PATH=./data/database.sqlite
```

### Step 4: Start Backend

```bash
cd backend
npm run dev
```

**Database akan dibuat otomatis di:** `backend/data/database.sqlite`

---

## 📊 Cara Kerja

1. **First Run:**
   - SQLite file tidak ada
   - System create file baru
   - Schema dibuat otomatis
   - Default user & tenant dibuat

2. **Next Runs:**
   - Load existing database file
   - Data tetap ada
   - No setup needed!

3. **Auto-Save:**
   - Database auto-save setiap 5 detik
   - Save juga setelah INSERT/UPDATE/DELETE

---

## 🎯 Quick Switch Script

Saya buatkan script untuk switch otomatis:

**File: `backend/switch-to-sqlite.bat`**

```batch
@echo off
echo Switching to SQLite...

REM Update imports
powershell -Command "(Get-Content 'src/api/routes/authRoutes.ts') -replace 'from ''../../database/connection''', 'from ''../../database/connection-sqlite''' | Set-Content 'src/api/routes/authRoutes.ts'"

powershell -Command "(Get-Content 'src/database/repositories/botRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/botRepository.ts'"

powershell -Command "(Get-Content 'src/database/repositories/keywordRuleRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/keywordRuleRepository.ts'"

powershell -Command "(Get-Content 'src/database/repositories/eventLogRepository.ts') -replace 'from ''../connection''', 'from ''../connection-sqlite''' | Set-Content 'src/database/repositories/eventLogRepository.ts'"

powershell -Command "(Get-Content 'src/core/events/eventBus.ts') -replace 'from ''../../database/connection''', 'from ''../../database/connection-sqlite''' | Set-Content 'src/core/events/eventBus.ts'"

echo Done! SQLite is now active.
echo Database will be created at: backend/data/database.sqlite
pause
```

**Cara pakai:**
```bash
cd backend
switch-to-sqlite.bat
```

---

## 🔄 Kembali ke PostgreSQL

Jika mau balik ke PostgreSQL:

```batch
# Ganti semua 'connection-sqlite' jadi 'connection'
```

---

## 📁 Database Location

**SQLite file:** `backend/data/database.sqlite`

**Backup database:**
```bash
# Tinggal copy file
copy backend\data\database.sqlite backup\database-backup.sqlite
```

**Reset database:**
```bash
# Delete file, akan dibuat ulang
del backend\data\database.sqlite
```

---

## ✅ Keuntungan vs PostgreSQL

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **Setup** | ✅ Zero | ❌ Complex |
| **Speed (Read)** | ✅ Very Fast | ✅ Fast |
| **Speed (Write)** | ⚠️ Good | ✅ Excellent |
| **Concurrent Users** | ⚠️ Limited | ✅ Unlimited |
| **File Size** | ✅ Small | ⚠️ Larger |
| **Backup** | ✅ Copy file | ⚠️ pg_dump |
| **Production** | ⚠️ Small apps | ✅ Any size |

---

## 🎯 Recommendation

**Development:** ✅ Use SQLite (super easy!)
**Production (Small):** ✅ SQLite OK (< 100 concurrent users)
**Production (Large):** ✅ Use PostgreSQL

---

## 🚀 Start Platform dengan SQLite

```bash
# 1. Switch to SQLite
cd backend
switch-to-sqlite.bat

# 2. Start backend
npm run dev

# 3. Start frontend (terminal baru)
cd frontend
npm run dev

# 4. Access dashboard
# http://localhost:3000
```

**Database akan dibuat otomatis!** ✨

---

## 🐛 Troubleshooting

### Database file not created
- Check folder `backend/data/` exists
- Check write permissions
- Check logs in `backend/logs/app.log`

### Data not persisting
- Wait 5 seconds for auto-save
- Or restart backend to force save

### Want to see database
Download **DB Browser for SQLite**:
https://sqlitebrowser.org/

Open file: `backend/data/database.sqlite`

---

**SQLite = Zero Configuration, Maximum Productivity!** 🚀
