# 🚀 Auto-Deployment Setup Guide

## Cara Setup Auto-Deploy ke AWS

Setelah setup ini, **setiap kali kamu push ke GitHub, aplikasi otomatis update di server AWS!**

---

## 📋 Step 1: Setup GitHub Secrets

1. **Buka repository GitHub kamu**: https://github.com/ikhwantchy/BroBot

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

## 📋 Step 3: Test Auto-Deploy

1. **Push perubahan ke GitHub**:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```

2. **Monitor deployment**:
   - Buka GitHub repository
   - Klik tab **Actions**
   - Lihat workflow "Auto Deploy to AWS" berjalan
   - Tunggu sampai selesai (✅ hijau = sukses, ❌ merah = error)

3. **Cek preview**:
   - Buka browser: `http://YOUR_SERVER_IP:3000`
   - Perubahan kamu sudah live! 🎉

---

## 🎯 Workflow Harian Kamu:

```bash
# 1. Coding di local
# Edit file, tambah fitur, dll

# 2. Test di localhost (opsional)
npm run dev

# 3. Commit & Push
git add .
git commit -m "Deskripsi update"
git push origin main

# 4. DONE! ✅
# GitHub Actions otomatis:
# - Pull code ke server
# - Install dependencies
# - Build backend & frontend
# - Restart PM2
# Preview langsung tersedia di IP server dalam 1-2 menit!
```

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
   cd ~/brobot
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
- ✅ Push ke GitHub
- ✅ Preview langsung di server AWS
- ✅ Tidak perlu manual SSH & deploy lagi!

**Happy coding! 🚀**
