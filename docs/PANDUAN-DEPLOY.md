# Panduan menayangkan prototipe (GitHub Pages)

Hasil akhir: alamat seperti `https://galgitgut.github.io/rb-sakip-kalsel/` yang bisa dibuka siapa saja.

## A. Buat repositori (sekali saja)

1. Buka https://github.com dan masuk dengan akun Anda.
2. Klik tombol **+** di kanan atas → **New repository**.
3. Isi:
   - **Repository name:** `rb-sakip-kalsel`
   - **Public** (GitHub Pages gratis hanya untuk repositori publik).
   - **Jangan** centang *Add a README*, *.gitignore*, atau *license*. Repositori harus kosong.
4. Klik **Create repository**.

> Repositori publik berarti kode dan data awal (daftar indikator, template RB Tematik) bisa dilihat orang. Isinya bukan data rahasia, tetapi pastikan ini sesuai kebijakan kantor. Kalau tidak boleh publik, gunakan Firebase Hosting (lihat bagian D).

## B. Masukkan kode ke repositori

**Cara 1 — lewat Claude (paling mudah):** setelah repositori dibuat, beri tahu Claude nama repositorinya. Claude akan mengirim seluruh kode ke sana.

**Cara 2 — unggah manual lewat browser:**
1. Ekstrak `rb-sakip-kalsel.zip` di komputer Anda.
2. Di halaman repositori yang masih kosong, klik **uploading an existing file**.
3. Seret **isi** folder hasil ekstrak (bukan foldernya) ke halaman itu, termasuk folder `assets`, `docs`, `tools`, dan file `.nojekyll`.
   - File `.nojekyll` tersembunyi di Windows/Mac. Kalau tidak terlihat, buat file baru di GitHub (**Add file → Create new file**) dengan nama `.nojekyll` dan isi kosong.
4. Tulis keterangan, misalnya `Prototipe tahap 1`, lalu klik **Commit changes**.

## C. Aktifkan GitHub Pages

1. Di repositori, buka **Settings** → menu kiri **Pages**.
2. Pada **Build and deployment** → **Source**, pilih **Deploy from a branch**.
3. **Branch:** `main`, folder **/ (root)** → **Save**.
4. Tunggu 1–3 menit, lalu muat ulang halaman Settings → Pages. Alamat situs akan muncul di atas: *"Your site is live at …"*.
5. Buka alamat itu, maka Beranda publik akan tampil. Tombol **Masuk (Admin / PD)** membuka aplikasi.

Setiap kali kode di cabang `main` berubah, situs ikut diperbarui otomatis dalam 1–3 menit.

## D. (Alternatif) Firebase Hosting

Dipakai bila repositori harus privat, atau saat masuk tahap 2.

1. Pasang Node.js LTS dari https://nodejs.org.
2. Buka Terminal / Command Prompt di folder proyek, lalu jalankan:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
   - Pilih proyek Firebase Anda.
   - *What do you want to use as your public directory?* → ketik `.` (titik).
   - *Configure as a single-page app?* → **No**.
   - *Set up automatic builds with GitHub?* → **No** (bisa diatur nanti).
   - Jika ditanya menimpa `index.html` → **No**.
3. Tayangkan: `firebase deploy --only hosting`. Alamatnya `https://<id-proyek>.web.app`.

## E. Cara mencoba prototipe

1. Buka Beranda → **Masuk**.
2. Masuk dengan username `diskominfo`, password `demo2026` → **RB General → Tagging Sub Kegiatan** → centang beberapa sub kegiatan → **Ajukan verifikasi** di panel kanan.
3. **Keluar** → masuk dengan `admin` / `admin2026` → **Admin → Verifikasi Tag** → centang semua → setujui.
4. Lihat hasilnya di **RB General → Tabel Rencana Aksi**, **Realisasi RB**, dan **Beranda**.
5. **Admin → Ekspor KemenPANRB** → unduh file per indikator lalu buka di Excel.
6. Untuk mencoba RB Tematik, masuk sebagai `bappeda` / `demo2026` → **RB Tematik → Isian RB Tematik**.
7. Coba **Admin → Pengguna** → *Tambah pengguna* atau *Reset password*, lalu login dengan akun itu.

## Hal penting di tahap 1

- **Data tersimpan di browser masing-masing.** Perubahan yang Anda buat hanya terlihat di browser Anda sendiri, sedangkan orang lain melihat data awal. Data bersama baru tersedia setelah tahap 2 (Firebase).
- **Akun dan password tersimpan di browser.** Mekanisme login sudah seperti versi akhir, tetapi belum aman untuk data sungguhan karena pemeriksaannya masih di browser. Jangan memasukkan data rahasia.
- **Akun uji coba:** `admin` / `admin2026`; PD: kode PD / `demo2026`.
- Untuk mengembalikan data uji coba ke awal: **Admin → Impor Sinergi → Reset data prototipe**.
