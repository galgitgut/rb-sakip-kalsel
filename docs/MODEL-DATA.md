# Model data & aturan bisnis (untuk pengembang)

Semua akses data aplikasi lewat `assets/js/data/store.js`. Koleksi di bawah bisa langsung menjadi tabel relasional (MySQL/PostgreSQL) atau koleksi Firestore.

## Koleksi

### `pd` — Perangkat Daerah
| kolom | tipe | keterangan |
|---|---|---|
| id | string | kode PD (mis. `diskominfo`) |
| singkatan | string | |
| nama | string | nama resmi — dipakai di kolom koordinator/pelaksana template KemenPANRB |

### `indikator` — Indikator RB General & indikator roadmap RB Tematik
| kolom | tipe | keterangan |
|---|---|---|
| id | string | `G01`…`G27` (General), `T01`… (Tematik) |
| jenis | `general` \| `tematik` | |
| no | int | nomor urut General / nomor tema |
| komponen | string | General: "RB General" |
| kelompok | string | General: sub komponen; Tematik: nama tema |
| tema, sasaran | string | khusus Tematik |
| nama | string | nama indikator |
| satuan | string | diisi manual |
| target, baseline | number \| null | **diisi manual** (admin / PD dengan hak `isiTarget`) |
| pengampu | string[] | id PD; lebih dari satu = indikator **dibagi** |
| pembagian | {bagian, bobot, pdId}[] | bagian indikator per PD (Nilai SAKIP, Capaian IKU Makro) |
| portalId | {sasaran_roadmap_id, indikator_roadmap_id} | ID dari portal KemenPANRB (Tematik), wajib dipertahankan |

### `akses` — hak akun PD per indikator
`{ id: "<pdId>|<indikatorId>", pdId, indikatorId, isiTarget: bool, tag: bool, isiTematik: bool }`
- Hanya PD pengampu yang punya akses. Admin mengatur di halaman Hak Akses.
- Indikator yang dibagi: target/baseline hanya diisi admin.

### `subkegiatan` — data dari Sinergi (prototipe: dummy / impor Excel)
| kolom | tipe | keterangan |
|---|---|---|
| id | string | |
| kode | string | **kunci pencocokan saat impor/API** |
| pdId | string | PD pemilik (→ kolom `pelaksana`) |
| nama, indikatorOutput, satuan | string | |
| target | number[4] | target TW1–TW4 |
| pagu | number | pagu sub kegiatan |
| realisasi | (number\|null)[4] | realisasi output TW1–TW4; `null` = belum dilaporkan |
| realisasiAnggaran | (number\|null)[4] | realisasi anggaran per triwulan (bukan kumulatif) |

### `tag` — rencana aksi (sub kegiatan yang di-tag ke indikator)
| kolom | tipe | keterangan |
|---|---|---|
| id | string | |
| jenis | `general` \| `tematik` | |
| indikatorId, pdId, subkegiatanId | string | |
| bagian | string | nama bagian bila indikator dibagi |
| narasi | string | narasi rencana aksi (kosong = nama sub kegiatan) |
| anggaranMode | `pagu` \| `manual` | |
| anggaranManual | number \| null | |
| status | `draf` \| `diajukan` \| `disetujui` \| `dikembalikan` | |
| catatan | string | catatan verifikasi → `catatan_monev` (Tematik) |
| permasalahanId, fokus | string | khusus Tematik |
| diajukan, diverifikasi | tanggal ISO | |
| portalId | {rencana_aksi_id, rencana_aksi_output_id} | ID portal KemenPANRB |

### `permasalahan` — RB Tematik
`{ id, indikatorId, pdId, permasalahan, sasaran, indikator, target, satuan, realisasi, catatan, portalId: {permasalahan_id, indikator_permasalahan_id} }`

### `pengguna` — akun login
| kolom | tipe | keterangan |
|---|---|---|
| id, username | string | username unik, huruf kecil (`^[a-z0-9][a-z0-9._-]{2,29}$`) |
| nama | string | nama pada akun |
| role | `admin` \| `pd` | admin = Biro Organisasi |
| pdId | string \| null | PD yang diwakili akun (hak akses mengikuti koleksi `akses`) |
| salt, hash, iter | string, string, int | PBKDF2-SHA256, 256 bit; password tidak pernah disimpan |
| aktif, wajibGanti | bool | |
| gagal, kunciSampai | int, epoch ms | 5 kali gagal → terkunci 10 menit |
| sesiVersi | int | dinaikkan saat reset/ganti password/nonaktif → sesi lama tidak berlaku |
| dibuat, loginTerakhir | tanggal ISO | |

### Lainnya
- `infografis`: `{ id, judul, kategori, tanggal, alt, gambar, tampil }` — urutan array = urutan tampil.
- `imporLog`: `{ id, tanggal, periode, baris, oleh }`
- `eksporStatus`: `{ id: indikatorId | "tema:<nama>", diunduh, diunggah }`
- Master dari template KemenPANRB: `masterTema`, `masterFokus`, `templateMeta`, `templatePetunjuk`, `templateTematikKolom`.

## Aturan perhitungan (`assets/js/calc.js`)

- Hanya tag **disetujui** yang dihitung di Beranda, Realisasi, dan ekspor.
- **Terlapor** = realisasi output triwulan itu tidak kosong.
- **Kelengkapan pelaporan** s.d. TW n = sel terlapor ÷ (jumlah rencana aksi × n).
- **Capaian** rencana aksi s.d. TW n = Σ realisasi ÷ Σ target TW1..n (maks 100%); capaian kelompok = rata-rata.
- **Anggaran** rencana aksi = pagu sub kegiatan (`pagu`) atau isian manual (`manual`).
- **Realisasi anggaran** rencana aksi = realisasi anggaran sub kegiatan × (anggaran ÷ pagu); **serapan** = realisasi ÷ anggaran.
- Dalam satu kelompok, sub kegiatan yang di-tag ke beberapa indikator dihitung sekali.
- "Tren per triwulan" menghitung tiap triwulan sendiri (tidak kumulatif).

## Pemetaan ke template KemenPANRB

**RB General – Rencana Aksi** (satu file per indikator; portal menerima unggahan per indikator):
`rencana_aksi`←narasi/nama sub kegiatan · `satuan_output`, `indikator_output`, `target_tw1..4`, `target_total`←Sinergi · `anggaran_total`←pagu/manual · `pelaksana`←PD pemilik sub kegiatan · `koordinator`←PD pengampu indikator.

**RB Tematik** (41 kolom, sheet tambahan PETUNJUK, MASTER TEMA, MASTER FOKUS INTERVENSI, _META ikut disertakan): kolom `*_id` dibawa apa adanya supaya unggahan memperbarui baris yang sama.

## Hal yang belum diputuskan

- Format/API Sinergi (impor saat ini memakai format dummy).
- Dasar pembagian Capaian IKU Makro; detail pembagian Nilai SAKIP.
- Konsep RB Tematik & Isu Strategis (dibahas ulang saat aplikasi >70%).
- Bobot penilaian RB per PD.
