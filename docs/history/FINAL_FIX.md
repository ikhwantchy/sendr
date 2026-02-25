# 🔧 Final Fix - Database Connection

## Masalah
Backend tidak bisa connect ke database meskipun password sudah diisi.

## Solusi

### Step 1: Cek Connection di pgAdmin

1. Buka **pgAdmin**
2. Klik **PostgreSQL 17** server
3. Lihat **Properties** → **Connection**
4. Catat:
   - Host
   - Port
   - Username
   - Password (jika ada)

### Step 2: Update .env dengan Info yang Benar

Edit `backend\.env`:

**Jika password kosong di pgAdmin:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=postgres
DB_PASSWORD=
DB_SSL=false
```

**Jika pakai password:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=postgres
DB_PASSWORD=111111
DB_SSL=false
```

**Coba juga dengan 127.0.0.1:**
```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=wa_automation
DB_USER=postgres
DB_PASSWORD=111111
DB_SSL=false
```

### Step 3: Restart Backend

```cmd
# Stop backend (Ctrl+C)
# Start lagi
npm run dev
```

---

## Alternative: Bypass Database untuk Testing

Jika masih error, kita bisa buat mock authentication untuk testing:

1. Edit `backend\src\api\routes\authRoutes.ts`
2. Tambahkan bypass mode untuk development

Mau saya buatkan bypass mode? Atau coba fix connection dulu?
