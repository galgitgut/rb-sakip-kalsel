// Konfigurasi aplikasi.
// DATA_MODE:
//   'local'    → data disimpan di browser (localStorage). Untuk prototipe tahap 1.
//   'firebase' → data disimpan di Firestore. Isi FIREBASE_CONFIG lalu ganti mode (tahap 2).
export const DATA_MODE = 'local';

export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const APP = {
  nama: 'RB–SAKIP Terpadu',
  instansi: 'Pemerintah Provinsi Kalimantan Selatan',
  pengelola: 'Biro Organisasi Sekretariat Daerah Provinsi Kalimantan Selatan',
  tahun: 2026,
  // Triwulan berjalan untuk perhitungan capaian (1–4).
  triwulanBerjalan: 3,
};
