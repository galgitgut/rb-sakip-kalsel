# RB–SAKIP Terpadu · Prototipe

Prototipe aplikasi Reformasi Birokrasi (RB) Pemerintah Provinsi Kalimantan Selatan yang terintegrasi dengan data kinerja SAKIP (Sinergi).

**Konsep inti:** rencana aksi RB General dan RB Tematik tidak diketik ulang. Rencana aksi disusun dengan **men-tag sub kegiatan** PD pengampu yang sudah ada di Sinergi. Target triwulan, anggaran, dan realisasinya ikut tertarik dari Sinergi. Hasilnya bisa diekspor langsung ke **template KemenPANRB**.

> Prototipe tahap 1: login masih simulasi, data tersimpan di browser masing-masing pengguna, data Sinergi masih dummy.

## Halaman

| Halaman | Akses | Fungsi |
|---|---|---|
| `index.html` — Beranda publik | Semua orang | Filter "data realisasi sampai triwulan", tab Ringkasan / Per Koordinator / Per Indikator / Perlu Perhatian, unduh PDF, tren per triwulan, per sub komponen & per tema, infografis & galeri |
| `app.html#/rb-general/tabel` | Admin & PD | Tabel Rencana Aksi General: semua indikator + target, baseline, rencana aksi (filter, unduh .xlsx) |
| `app.html#/rb-general/tagging` | PD pengampu | Tag sub kegiatan (bisa pilih banyak sekaligus); anggaran pagu penuh atau manual |
| `app.html#/rb-tematik/tabel` | Admin & PD | Tabel Rencana Aksi Tematik: tema → indikator roadmap → permasalahan → rencana aksi |
| `app.html#/rb-tematik/isian` | PD pengampu | Isian permasalahan, indikator permasalahan, rencana aksi + fokus intervensi |
| `app.html#/realisasi/general` · `/tematik` | Admin & PD | Rencana aksi + realisasi output & anggaran per triwulan (hanya baca, unduh .xlsx) |
| `app.html#/admin/…` | Admin | Satu halaman dengan tab: Verifikasi, Master Indikator, Hak Akses & Pembagian, Ekspor KemenPANRB, Infografis Beranda, Impor Sinergi & Data |

## Sumber data awal

- **Asli:** 27 indikator RB General & pengampunya; 6 tema & 7 indikator roadmap RB Tematik; 39 permasalahan dan 40 rencana aksi Tematik (dari template RB Tematik 2026, termasuk ID portal).
- **Dummy:** sub kegiatan RB General, realisasi, tag RB General, dan format impor Sinergi.
- Hilirisasi sementara hanya Bappeda dan Dinas Perindustrian (baris Disbunnak & BKD tidak dimuat).

Data awal dibuat dengan `tools/build_seed.py` → `assets/data/seed.json`.

## Struktur

```
index.html, app.html        halaman
assets/css/style.css        tampilan
assets/js/config.js         pengaturan (mode data, tahun, triwulan berjalan)
assets/js/data/store.js     SATU-SATUNYA pintu akses data (ganti adapter di sini)
assets/js/auth.js           login (simulasi)
assets/js/calc.js           rumus capaian, kelengkapan pelaporan, serapan
assets/js/ringkasan.js      isi Beranda (ringkasan, per koordinator, per indikator, perlu perhatian)
assets/js/excel.js          ekspor template KemenPANRB & impor
assets/js/xlsx-lite.js      penulis/pembaca .xlsx ringan (di atas JSZip)
assets/js/pages/*.js        halaman aplikasi
assets/data/seed.json       data awal
assets/vendor/jszip.min.js  JSZip 3.10.1 (MIT)
docs/                       panduan & model data
```

Tanpa proses build: cukup file statis. Bisa dihosting di GitHub Pages, Firebase Hosting, atau server mana pun.

## Menjalankan di komputer sendiri

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

(Harus lewat server lokal, bukan dobel-klik file, karena memakai modul JavaScript.)

## Dokumen

- [docs/PANDUAN-DEPLOY.md](docs/PANDUAN-DEPLOY.md) — langkah menayangkan prototipe di GitHub Pages
- [docs/MODEL-DATA.md](docs/MODEL-DATA.md) — model data & aturan perhitungan, untuk pengembang 2027
- [docs/PANDUAN-FIREBASE.md](docs/PANDUAN-FIREBASE.md) — rencana tahap 2 (login & database bersama)
