# Rencana Integrasi Email Otomatis (Auto-Send Credentials)

Dokumen ini mencatat rencana dan rekomendasi untuk fitur pengiriman email otomatis kepada user baru yang didaftarkan oleh Admin.

## 1. Rekomendasi Email Service Provider (ESP)

Berikut adalah urutan rekomendasi berdasarkan kemudahan integrasi dan biaya:

| Provider | Kelebihan | Kekurangan | Rekomendasi |
| :--- | :--- | :--- | :--- |
| **Resend** | Sangat mudah digunakan (API modern), template cantik bawaan, free tier bagus (3k/bln). | Masih relatif baru dibanding pemain lama. | **Pilihan Utama (Sangat Disarankan)** |
| **SendGrid** | Standar industri, sangat stabil, dashboard tracking lengkap. | Proses verifikasi akun baru kadang ketat. | **Pilihan Kedua (Profesional)** |
| **Mailgun** | Fitur debugging sangat bagus, API handal. | Sedikit lebih kompleks untuk pemula. | **Alternatif Lain** |
| **Gmail SMTP** | Gratis total, tidak perlu daftar provider baru. | Limit rendah (500/hari), resiko akun kena lock, ribet setting "App Password". | **Hanya untuk Testing/MVP** |

## 2. Kebutuhan Teknis (Stack)
- **Library**: `nodemailer` (untuk koneksi SMTP) atau SDK resmi masing-masing provider.
- **Transporter**: Konfigurasi di Backend menggunakan environment variables (`.env`).
- **Template**: HTML Template (Inline CSS) agar tampilan email profesional di HP/Desktop.

## 3. Data yang Akan Dikirim
Setiap kali Admin membuat user baru, email akan berisi:
- **Nama Lengkap**
- **URL Dashboard Login**
- **Email Login**
- **Password Sementara** (Plain text, dikirim sesaat sebelum di-hash ke DB)
- **Instruksi Keamanan** (Rekomendasi ubah password setelah login pertama).

## 4. Langkah Implementasi (Next Steps)
1. Pilih salah satu provider di atas (Saran: **Resend**).
2. Dapatkan API Key atau SMTP Credentials.
3. Buat `emailService.ts` di backend.
4. Update Logic `createUser` di `authController` atau `userService` agar memicu pengiriman email.

---
*Dicatat pada: 31 Januari 2026*
