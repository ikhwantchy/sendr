# 🚀 Manual Deployment Setup Guide

## Cara Setup Manual Deploy ke AWS

Setelah setup ini, **kamu bisa deploy ke server AWS kapan aja dengan 1 klik di GitHub!**

---

## 📋 Step 1: Setup GitHub Secrets

1. **Buka repository GitHub kamu**: https://github.com/ikhwantchy/Sendr

2. **Masuk ke Settings**:
   - Klik tab **Settings** (di kanan atas)
   - Klik **Secrets and variables** → **Actions**
   - Klik **New repository secret**

3. **Tambahkan 3 secrets ini**:

### Secret 1: AWS_HOST
- **Name**: `AWS_HOST`
- **Value**: IP address server AWS kamu (contoh: `13.123.45.67`)

### Secret 2: AWS_USERNAME
- **Name**: `AWS_USERNAME`
- **Value**: Username SSH kamu (biasanya `ubuntu` atau `ec2-user`)

### Secret 3: AWS_SSH_KEY
- **Name**: `AWS_SSH_KEY`
- **Value**: Isi lengkap file `.pem` kamu
  
  **Cara copy isi file .pem:**
  - Windows: Buka file `.pem` dengan Notepad
  - Copy semua isinya (dari `-----BEGIN RSA PRIVATE KEY-----` sampai `-----END RSA PRIVATE KEY-----`)
  - Paste ke GitHub Secret

---

## 📋 Step 2: Setup SSH di Server (Opsional tapi Recommended)

Jika kamu mau pakai SSH key biasa (bukan .pem):

```bash
# Di local machine kamu (Windows PowerShell)
# Generate SSH key jika belum punya
ssh-keygen -t rsa -b 4096

# Copy public key
cat ~/.ssh/id_rsa.pub
```

Lalu di **server AWS**:
```bash
# SSH ke server
ssh -i your-key.pem ubuntu@your-server-ip

# Tambahkan public key
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Paste public key kamu, save (Ctrl+X, Y, Enter)

# Set permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

---

## 📋 Step 3: Test Manual Deploy

1. **Push perubahan ke GitHub**:
   ```bash
   git add .
   git commit -m "Test manual deploy"
   git push origin main
   ```

2. **Trigger deployment manual**:
   - Buka GitHub repository
   - Klik tab **Actions**
   - Klik workflow **"Deploy to AWS"** (di sidebar kiri)
   - Klik tombol **"Run workflow"** (kanan atas)
   - Klik **"Run workflow"** hijau
   - Tunggu sampai selesai (✅ hijau = sukses, ❌ merah = error)

3. **Cek preview**:
   - Buka browser: `http://YOUR_SERVER_IP:3000`
   - Perubahan kamu sudah live! 🎉

---

## 🎯 Workflow Harian Kamu:

### 1. Coding & Testing di Local
```bash
# Edit file, tambah fitur, dll
# Test di localhost
npm run dev
```

### 2. Push ke GitHub (Tidak Auto-Deploy)
```bash
git add .
git commit -m "Update feature X"
git push origin main
```

### 3. Deploy Manual (Kapan Kamu Mau)
1. **Buka GitHub repository**: https://github.com/ikhwantchy/Sendr
2. **Klik tab Actions**
3. **Klik workflow "Deploy to AWS"** (di sidebar kiri)
4. **Klik tombol "Run workflow"** (kanan atas)
5. **(Opsional)** Isi reason: "Deploy feature X"
6. **Klik "Run workflow"** hijau
7. **Tunggu 1-2 menit** sampai selesai ✅

### 4. Preview Tersedia!
- Buka: `http://YOUR_SERVER_IP:3000`
- Perubahan kamu sudah live! 🎉

---

## 🔍 Monitoring & Troubleshooting

### Cek Status Deployment:
- **GitHub**: Repository → **Actions** tab
- **Server**: SSH dan jalankan `pm2 status`

### Jika Deployment Gagal:

1. **Cek GitHub Actions logs**:
   - Klik workflow yang gagal
   - Baca error message

2. **Common issues**:
   - ❌ **SSH connection failed**: Cek AWS_HOST, AWS_USERNAME, AWS_SSH_KEY di GitHub Secrets
   - ❌ **Build failed**: SSH ke server, cek logs: `pm2 logs`
   - ❌ **Port not accessible**: Cek AWS Security Group (port 3000, 3001 harus open)

3. **Manual fix di server**:
   ```bash
   ssh user@your-server-ip
   cd ~/Sendr
   ./deploy.sh  # Run manual deploy script
   ```

---

## 📁 Files yang Dibuat:

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `deploy.sh` - Manual deploy script untuk server
- `AUTO_DEPLOY_SETUP.md` - File ini

---

## ✅ Checklist Setup:

- [ ] GitHub Secrets sudah ditambahkan (AWS_HOST, AWS_USERNAME, AWS_SSH_KEY)
- [ ] SSH key sudah di-setup di server (opsional)
- [ ] Test push ke GitHub
- [ ] Cek Actions tab - workflow berjalan
- [ ] Preview tersedia di `http://YOUR_SERVER_IP:3000`

---

## 🎉 Selamat!

Sekarang kamu bisa:
- ✅ Coding di local
- ✅ Test di localhost
- ✅ Push ke GitHub (tidak auto-deploy)
- ✅ Deploy kapan aja dengan 1 klik di GitHub
- ✅ Preview langsung di server AWS
- ✅ Kontrol penuh kapan mau deploy!

**Happy coding! 🚀**
