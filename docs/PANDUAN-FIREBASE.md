# Tahap 2 — Firebase (login sungguhan & data bersama)

Tujuan: semua pengguna melihat data yang sama, dan setiap akun PD masuk dengan email + kata sandi.

## Yang akan dipakai (paket gratis Spark)
- **Authentication** (email & kata sandi) → menggantikan `assets/js/auth.js`.
- **Cloud Firestore** → menggantikan penyimpanan browser di `assets/js/data/store.js`.
- **Storage** → gambar infografis.
- **Hosting** (opsional) → menggantikan GitHub Pages.

Cloud Functions **tidak** dipakai (butuh paket berbayar). Penarikan API Sinergi nanti bisa lewat GitHub Actions terjadwal.

## Yang perlu disiapkan Galih
1. Buka https://console.firebase.google.com → **Add project** → nama mis. `rb-sakip-kalsel` (Google Analytics boleh dimatikan).
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** → lokasi `asia-southeast2 (Jakarta)` → mode *production*.
4. **Project settings (ikon roda gigi) → Your apps → Web (</>)** → daftarkan aplikasi → salin objek `firebaseConfig`.
   Nilai ini aman ditaruh di kode situs web; keamanannya dijaga oleh *Security Rules*.
5. Kirim `firebaseConfig` ke Claude.

## Yang akan dikerjakan Claude
- `assets/js/data/firebase-adapter.js` dengan antarmuka yang sama seperti adapter lokal, lalu `DATA_MODE = 'firebase'` di `config.js`.
- Halaman login email/kata sandi; profil akun (`role`, `pdId`) disimpan di koleksi `users`.
- *Security Rules*: publik hanya membaca data yang dibutuhkan Beranda; PD hanya menulis tag miliknya; admin menulis semuanya.
- Skrip pemindahan `seed.json` ke Firestore.
