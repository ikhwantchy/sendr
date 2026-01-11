# 🔧 Deployment Troubleshooting Guide

## 📋 Cara Cek Error di GitHub Actions

### Step 1: Buka GitHub Actions
1. Buka repository: https://github.com/ikhwantchy/BroBot
2. Klik tab **Actions** (di atas)
3. Kamu akan lihat list workflow runs

### Step 2: Klik Workflow yang Gagal
1. Cari workflow dengan ❌ merah (failed)
2. Klik pada workflow yang paling baru (paling atas)
3. Kamu akan masuk ke halaman detail workflow

### Step 3: Lihat Error Details
1. Klik job **"deploy"** (biasanya satu-satunya job)
2. Klik step yang gagal (ada ❌ merah)
3. Baca error message di log

---

## 🔍 Common Errors & Solutions

### Error 1: SSH Connection Failed
```
Error: ssh: connect to host XX.XX.XX.XX port 22: Connection refused
```

**Penyebab:**
- GitHub Secrets salah (AWS_HOST, AWS_USERNAME, atau AWS_SSH_KEY)
- Server AWS mati/tidak bisa diakses
- Security Group AWS tidak allow port 22

**Solusi:**
1. **Cek GitHub Secrets:**
   - Buka: Settings → Secrets and variables → Actions
   - Pastikan ada 3 secrets:
     - `AWS_HOST` - IP address server (contoh: `13.123.45.67`)
     - `AWS_USERNAME` - Username SSH (biasanya `ubuntu`)
     - `AWS_SSH_KEY` - Isi lengkap file `.pem` kamu

2. **Cek Server AWS:**
   - Buka AWS Console
   - Pastikan instance running (status: ✅ Running)
   - Cek Security Group: port 22 harus allow dari 0.0.0.0/0

3. **Test SSH Manual:**
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   ```
   Jika gagal, berarti masalah di server/network, bukan di GitHub Actions.

---

### Error 2: Directory Not Found
```
Error: cd: /home/ubuntu/brobot: No such file or directory
```

**Penyebab:**
- Folder `brobot` belum ada di server
- Nama folder salah

**Solusi:**
1. **SSH ke server:**
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   ```

2. **Clone repository:**
   ```bash
   cd ~
   git clone https://github.com/ikhwantchy/BroBot.git brobot
   cd brobot
   ```

3. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   npm run build
   
   # Frontend
   cd ../frontend
   npm install
   npm run build
   ```

4. **Setup PM2:**
   ```bash
   # Install PM2 globally
   sudo npm install -g pm2
   
   # Start backend
   cd ~/brobot/backend
   pm2 start npm --name "brobot-backend" -- run dev
   
   # Start frontend
   cd ~/brobot/frontend
   pm2 start npm --name "brobot-frontend" -- run dev
   
   # Save PM2 config
   pm2 save
   pm2 startup
   ```

---

### Error 3: Build Failed
```
Error: npm run build failed
```

**Penyebab:**
- Dependencies tidak terinstall
- TypeScript errors
- Memory habis (RAM server terlalu kecil)

**Solusi:**

**Option A: Fix di Local Dulu**
1. Test build di local:
   ```bash
   cd backend
   npm run build
   
   cd ../frontend
   npm run build
   ```
2. Fix semua error yang muncul
3. Commit & push lagi

**Option B: Skip Build (Development Mode)**
1. Edit `.github/workflows/deploy.yml`
2. Ganti:
   ```yaml
   # Update Backend
   cd backend
   npm install
   npm run build  # ← HAPUS INI
   pm2 restart brobot-backend
   
   # Update Frontend
   cd ../frontend
   npm install
   npm run build  # ← HAPUS INI
   pm2 restart brobot-frontend
   ```
   
   Jadi:
   ```yaml
   # Update Backend
   cd backend
   npm install
   pm2 restart brobot-backend
   
   # Update Frontend
   cd ../frontend
   npm install
   pm2 restart brobot-frontend
   ```

3. Commit & push

**Option C: Increase Server RAM**
- Upgrade AWS instance ke t3.small atau lebih besar

---

### Error 4: PM2 Process Not Found
```
Error: [PM2][ERROR] Process brobot-backend not found
```

**Penyebab:**
- PM2 process belum pernah di-start
- PM2 process mati/crashed

**Solusi:**
1. **SSH ke server:**
   ```bash
   ssh -i your-key.pem ubuntu@your-server-ip
   ```

2. **Cek PM2 status:**
   ```bash
   pm2 status
   ```

3. **Start process jika belum ada:**
   ```bash
   cd ~/brobot/backend
   pm2 start npm --name "brobot-backend" -- run dev
   
   cd ~/brobot/frontend
   pm2 start npm --name "brobot-frontend" -- run dev
   
   pm2 save
   ```

4. **Atau restart jika sudah ada:**
   ```bash
   pm2 restart brobot-backend
   pm2 restart brobot-frontend
   ```

---

## 🚀 Manual Deployment (Jika GitHub Actions Gagal)

Jika GitHub Actions terus gagal, kamu bisa deploy manual:

### Step 1: SSH ke Server
```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

### Step 2: Pull Latest Code
```bash
cd ~/brobot
git pull origin main
```

### Step 3: Update Backend
```bash
cd backend
npm install
# npm run build  # Skip jika RAM kecil
pm2 restart brobot-backend
```

### Step 4: Update Frontend
```bash
cd ../frontend
npm install
# npm run build  # Skip jika RAM kecil
pm2 restart brobot-frontend
```

### Step 5: Check Status
```bash
pm2 status
pm2 logs
```

### Step 6: Test
Buka browser: `http://YOUR_SERVER_IP:3000`

---

## 📊 Monitoring Commands

### Cek Status PM2
```bash
pm2 status
```

### Lihat Logs
```bash
# All logs
pm2 logs

# Backend only
pm2 logs brobot-backend

# Frontend only
pm2 logs brobot-frontend

# Last 100 lines
pm2 logs --lines 100
```

### Restart Services
```bash
# Restart all
pm2 restart all

# Restart specific
pm2 restart brobot-backend
pm2 restart brobot-frontend
```

### Stop Services
```bash
pm2 stop all
pm2 delete all
```

---

## ✅ Quick Fix Checklist

Jika deployment gagal, coba ini secara berurutan:

1. ✅ **Cek GitHub Secrets** - Pastikan AWS_HOST, AWS_USERNAME, AWS_SSH_KEY benar
2. ✅ **Cek Server AWS** - Instance running? Security Group allow port 22?
3. ✅ **Test SSH Manual** - Bisa SSH ke server?
4. ✅ **Cek Folder** - Folder `~/brobot` ada?
5. ✅ **Cek PM2** - Process running? `pm2 status`
6. ✅ **Cek Logs** - Ada error? `pm2 logs`
7. ✅ **Manual Deploy** - Pull code & restart PM2
8. ✅ **Test Browser** - Buka `http://YOUR_SERVER_IP:3000`

---

## 🆘 Need Help?

### Cara Share Error untuk Debugging:

1. **Screenshot GitHub Actions error:**
   - Buka workflow yang gagal
   - Screenshot error message
   
2. **Copy PM2 logs:**
   ```bash
   pm2 logs --lines 50 --nostream > logs.txt
   cat logs.txt
   ```
   
3. **Share info:**
   - Screenshot error
   - PM2 logs
   - Server specs (RAM, CPU)
   - AWS instance type

---

## 🎯 Best Practices

1. **Test di Local Dulu**
   - Selalu test `npm run build` di local sebelum push
   - Fix semua TypeScript errors

2. **Commit Message yang Jelas**
   ```bash
   git commit -m "Fix: Login authentication issue"
   git commit -m "Feature: Add campaigns under development page"
   ```

3. **Monitor Deployment**
   - Selalu cek GitHub Actions setelah push
   - Jika gagal, fix immediately

4. **Backup Database**
   ```bash
   # Di server
   cd ~/brobot/backend/data
   cp database.sqlite database.sqlite.backup
   ```

5. **Use Development Mode di Server**
   - Jika RAM kecil, pakai `npm run dev` instead of build
   - Lebih cepat, less memory

---

**Happy Deploying! 🚀**
