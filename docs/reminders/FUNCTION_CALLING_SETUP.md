# Setup Function Calling (Cuaca & Traffic)

## Fitur Baru ✨

Bot sekarang bisa:
- ✅ **Cek cuaca real-time** untuk lokasi manapun di Indonesia (dan dunia!)
- ✅ **Cek kondisi traffic** antar kota
- ✅ Otomatis panggil API kalau user tanya soal cuaca/lalu lintas
- ✅ **GRATIS UNLIMITED** - Pakai OpenMeteo (no API key needed!)

## Cara Kerja

1. User: "Cuaca di Tangerang Selatan gimana?"
2. LLM deteksi butuh data cuaca → panggil `get_weather("Tangerang Selatan")`
3. API ambil data real-time dari OpenMeteo
4. LLM jawab: "Cuaca di Tangerang Selatan sekarang cerah ☀️, suhu 32°C"

## Setup

### Weather API (OpenMeteo) ✅

**TIDAK PERLU SETUP!** OpenMeteo adalah API gratis yang:
- ✅ Unlimited requests
- ✅ Tidak perlu API key
- ✅ Tidak perlu daftar
- ✅ Data real-time akurat
- ✅ Support seluruh dunia

**Langsung jalan!** Tinggal restart backend dan coba.

### Traffic API (Coming Soon)

Untuk sekarang pakai data mock. Nanti bisa integrate dengan:
- Google Maps Directions API
- TomTom Traffic API

## Testing

**Test cuaca:**
```
@Akun Testing cuaca di Jakarta gimana?
@Akun Testing panas ga hari ini?
```

**Test traffic:**
```
@Akun Testing kondisi jalan Jakarta ke Tangerang gimana?
@Akun Testing macet ga dari Serpong ke BSD?
```

## Contoh Response

**Cuaca:**
> Cuaca di Tangerang Selatan sekarang berawan ☁️, suhu 30°C. Kelembaban 75%, angin 3.2 m/s.

**Traffic:**
> Kondisi jalan Jakarta ke Tangerang Selatan saat ini ramai 🟡. Estimasi waktu tempuh 45-60 menit.

## Technical Details

- **Function Calling**: Menggunakan Gemini Function Calling API
- **Tools**: `get_weather()`, `get_traffic()`
- **Fallback**: Kalau API error, otomatis pakai data mock
- **Performance**: Tambahan ~1-2 detik untuk panggil API eksternal

## Disable Function Calling

Kalau mau matikan fitur ini, edit `llmService.ts`:
```typescript
const config: LLMConfig = {
    // ...
    enableTools: false  // Tambahkan ini
};
```
