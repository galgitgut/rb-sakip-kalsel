// Lapisan data. SEMUA akses data aplikasi lewat file ini.
// Saat pindah ke Firebase atau ke API pengembang, cukup ganti adapter di bawah,
// halaman-halaman lain tidak perlu diubah.
//
// Koleksi: pd, indikator, akses, subkegiatan, tag, permasalahan, infografis, imporLog, eksporStatus
// Bentuk tiap koleksi dijelaskan di docs/MODEL-DATA.md
import { DATA_MODE } from '../config.js';

const KEY = 'rbsakip:v1';
const COLLECTIONS = ['pd', 'indikator', 'akses', 'subkegiatan', 'tag', 'permasalahan', 'infografis', 'imporLog', 'eksporStatus'];
let cache = null;

// ---------- adapter lokal (localStorage) ----------
const localAdapter = {
  async load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* mode privat */ }
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* data rusak → muat ulang seed */ }
    }
    return await loadSeed();
  },
  async persist(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      throw new Error('Penyimpanan browser penuh atau tidak diizinkan. Kecilkan gambar infografis atau reset data.');
    }
  },
  async clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
  },
};

async function loadSeed() {
  const url = new URL('../../data/seed.json', import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Gagal memuat data awal (seed.json).');
  return res.json();
}

function adapter() {
  if (DATA_MODE === 'firebase') {
    // Tahap 2: lihat docs/PANDUAN-FIREBASE.md dan assets/js/data/firebase-adapter.js
    throw new Error('Mode Firebase belum diaktifkan pada prototipe ini.');
  }
  return localAdapter;
}

// ---------- API publik ----------
export async function init() {
  if (cache) return cache;
  cache = await adapter().load();
  for (const c of COLLECTIONS) if (!Array.isArray(cache[c])) cache[c] = [];
  return cache;
}

export const meta = () => cache.meta || {};
export const extra = (key) => cache[key];
export const all = (col) => cache[col];
export const get = (col, id) => cache[col].find((d) => d.id === id) || null;
export const where = (col, fn) => cache[col].filter(fn);

export async function save(col, doc) {
  if (!doc.id) doc.id = newId(col);
  const list = cache[col];
  const i = list.findIndex((d) => d.id === doc.id);
  if (i >= 0) list[i] = { ...list[i], ...doc }; else list.push(doc);
  await adapter().persist(cache);
  return doc;
}

export async function saveMany(col, docs) {
  for (const doc of docs) {
    if (!doc.id) doc.id = newId(col);
    const list = cache[col];
    const i = list.findIndex((d) => d.id === doc.id);
    if (i >= 0) list[i] = { ...list[i], ...doc }; else list.push(doc);
  }
  await adapter().persist(cache);
}

export async function remove(col, id) {
  cache[col] = cache[col].filter((d) => d.id !== id);
  await adapter().persist(cache);
}

export async function replaceAll(col, docs) {
  cache[col] = docs;
  await adapter().persist(cache);
}

export async function reset() {
  await adapter().clear();
  cache = null;
  return init();
}

export function exportAll() {
  return JSON.parse(JSON.stringify(cache));
}

export function newId(col) {
  return `${col.slice(0, 3)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
