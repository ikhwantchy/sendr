# Deployment Guide: Sendr WhatsApp Automation Platform

> **Last updated:** Feb 2026
> **Server:** AWS t3.small (2GB RAM), Ubuntu, PM2, Nginx
> **Domain:** sendr.web.id

---

## ATURAN PENTING (BACA DULU!)

### 1. JANGAN build frontend di server
Server cuma 2GB RAM, `npm run build` frontend PASTI OOM crash.
Frontend di-build **di local**, lalu `.next/` di-push ke git.

### 2. Environment variables untuk API URL
```
frontend/.env.development  → NEXT_PUBLIC_API_URL=http://localhost:3001  (untuk npm run dev)
frontend/.env.production   → NEXT_PUBLIC_API_URL=https://sendr.web.id  (untuk npm run build)
frontend/.env.local        → KOSONGKAN (jangan isi, karena .env.local override semua env)
```

**JANGAN** taruh `NEXT_PUBLIC_API_URL` di `.env.local`!
Next.js `.env.local` override SEMUA environment. Kalau isinya `localhost:3001`,
maka production build juga pakai `localhost:3001` → dashboard MATI di production.

### 3. Install dependency baru di SERVER juga
Kalau menambah package baru di backend (contoh: `multer`), 
**HARUS** install juga di server karena `node_modules` tidak di-push ke git.

```bash
# Di server:
cd ~/Sendr/backend
npm install
```

### 4. Database TIDAK di-track git
`database.sqlite` tidak ada di git. Aman dari overwrite saat `git pull`.
Tapi kalau backend crash-loop, bisa overwrite database dari memory.

---

## Deploy Flow (Local → Production)

### Step 1: Build frontend di LOCAL
```bash
cd frontend
npm run build
```
Pastikan output menunjukkan `Environments: .env.production` (bukan `.env.local` yang isinya localhost).

### Step 2: Stage & commit
```bash
cd ..  # root project

# Stage build artifacts (WAJIB exclude cache, file >100MB ditolak GitHub)
git add -f frontend/.next/ -- ":!frontend/.next/cache/"

# Stage source code changes
git add .

# Commit
git commit -m "build: production build + <deskripsi perubahan>"
```

### Step 3: Push ke GitHub
```bash
git push origin main
```
GitHub Actions akan auto-deploy (SSH ke server → git pull → install deps → restart PM2).

### Step 4: Verifikasi (opsional)
```bash
# SSH ke server
ssh admin@<server-ip>

# Cek PM2 status
npx pm2 status

# Cek backend logs (pastikan tidak ada error)
npx pm2 logs Sendr-backend --lines 20

# Cek apakah crash-loop
npx pm2 show Sendr-backend | grep "restart\|status\|uptime"
# Tunggu 5 detik, jalankan lagi. Kalau restart count naik = crash-loop.
```

---

## Deploy Manual (di server)

### Quick deploy
```bash
cd ~/Sendr
git pull origin main
cd backend && npm install && cd ..
npx pm2 restart Sendr-frontend Sendr-backend
```

### Dengan backup database (RECOMMENDED)
```bash
cd ~/Sendr
./deploy.sh
```
Script `deploy.sh` otomatis backup database sebelum pull.

---

## Troubleshooting

### Dashboard menunjukkan 0 / data hilang

**Penyebab umum:**
1. **API URL masih localhost** — Frontend build pakai `.env.local` yang isinya `localhost:3001`
2. **Backend crash-loop** — Missing dependency, database corrupt
3. **Database overwritten** — Backend crash-loop bisa bikin database kosong

**Diagnosa:**
```bash
# 1. Cek backend error
npx pm2 logs Sendr-backend --err --lines 20

# 2. Cek apakah crash-loop (restart count naik terus)
npx pm2 show Sendr-backend | grep "restart\|uptime"
sleep 5
npx pm2 show Sendr-backend | grep "restart\|uptime"

# 3. Cek database ada isinya
node -e "const fs=require('fs');const s=require('sql.js');s().then(SQL=>{const db=new SQL.Database(fs.readFileSync('data/database.sqlite'));console.log('Users:',db.exec('SELECT COUNT(*) FROM users')[0]?.values);console.log('Bots:',db.exec('SELECT COUNT(*) FROM bots')[0]?.values);db.close()})"

# 4. Cek API bisa diakses
curl -s http://localhost:3001/health
curl -s http://localhost:3001/api/analytics/dashboard-stats
```

**Fix API URL localhost:**
1. Pastikan `frontend/.env.local` KOSONG
2. Pastikan `frontend/.env.production` isinya `NEXT_PUBLIC_API_URL=https://sendr.web.id`
3. Rebuild frontend di local: `cd frontend && npm run build`
4. Push dan deploy

**Fix missing dependency (contoh: multer):**
```bash
# Di server:
cd ~/Sendr/backend
npm install
npx pm2 restart Sendr-backend
```

**Fix database kosong (restore dari backup):**
```bash
# Lihat backup yang tersedia
ls -lh ~/Sendr/backend/data/backups/

# Restore backup terbaru (pilih yang ukurannya besar)
cp ~/Sendr/backend/data/backups/<nama_backup>.sqlite ~/Sendr/backend/data/database.sqlite
npx pm2 restart Sendr-backend
```

### Error: Cannot find module 'xxx'

Backend butuh dependency yang belum terinstall di server.

```bash
cd ~/Sendr/backend
npm install
npx pm2 restart Sendr-backend
```

### Frontend blank / 404

```bash
# Cek frontend logs
npx pm2 logs Sendr-frontend --lines 20

# Restart frontend
npx pm2 restart Sendr-frontend
```

### Browser console: ERR_BLOCKED_BY_CLIENT / Network Error ke localhost

Frontend build pakai API URL `localhost:3001`. Lihat fix "API URL localhost" di atas.

Di browser, buka DevTools (F12) → Console. Kalau ada error `localhost:3001` → masalah env build.

---

## Architecture

```
Browser (sendr.web.id)
    ↓ HTTPS
Nginx (port 443)
    ├── /        → localhost:3000 (Next.js frontend, PM2: Sendr-frontend)
    ├── /api     → localhost:3001 (Express backend, PM2: Sendr-backend)
    └── /socket.io → localhost:3001 (WebSocket)
```

### Key files
```
frontend/
  .env.development          → API URL untuk local dev (localhost:3001)
  .env.production           → API URL untuk production build (sendr.web.id)
  .env.local                → HARUS KOSONG (override semua env)
  .next/                    → Build output (force-added ke git, exclude cache/)
  src/lib/api.ts            → API client (baseURL dari NEXT_PUBLIC_API_URL)

backend/
  data/database.sqlite      → SQLite database (TIDAK di-track git)
  data/backups/             → Auto backup setiap 6 jam
  src/index.ts              → Entry point (port 3001)

.github/workflows/deploy.yml → Auto deploy on push to main
deploy.sh                    → Manual deploy script (with DB backup)
```

### GitHub Actions (deploy.yml)
Trigger: push ke `main`
Steps:
1. SSH ke server
2. `git pull origin main`
3. Backend: `npm install` + `npm run build` + `npm run migrate`
4. Frontend: `npm install` (NO build — sudah dari local)
5. `pm2 restart all`

---

## Database Backup

### Auto backup
Backend otomatis backup database setiap 6 jam ke `backend/data/backups/`.
Naming: `database_auto_YYYYMMDD_HHMMSS.sqlite`
Max 10 backups disimpan (rotate otomatis).

### Manual backup
```bash
cp ~/Sendr/backend/data/database.sqlite ~/Sendr/backend/data/backups/database_manual_$(date +%Y%m%d_%H%M%S).sqlite
```

### Restore
```bash
cp ~/Sendr/backend/data/backups/<backup_file> ~/Sendr/backend/data/database.sqlite
npx pm2 restart Sendr-backend
```

---

## Checklist Sebelum Deploy

- [ ] `npm run build` di `frontend/` sukses tanpa error
- [ ] Build output menunjukkan `Environments: .env.production` (bukan `.env.local` dengan localhost)
- [ ] `frontend/.env.local` KOSONG
- [ ] Kalau ada package baru di backend, sudah `npm install` di server
- [ ] `git add -f frontend/.next/ -- ":!frontend/.next/cache/"`
- [ ] `git push origin main`
- [ ] Cek PM2 status di server setelah deploy (tidak crash-loop)
- [ ] Hard refresh browser (`Ctrl+Shift+R`) untuk test
