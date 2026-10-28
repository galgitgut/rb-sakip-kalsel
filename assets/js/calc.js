// Rumus capaian, kelengkapan pelaporan, dan anggaran. Satu tempat untuk semua halaman.
//
// Aturan (ubah di sini bila kebijakan berubah):
// - Hanya rencana aksi (tag) berstatus 'disetujui' yang dihitung di Beranda & Realisasi.
// - "Terlapor" = realisasi output triwulan itu sudah ada di Sinergi (tidak kosong).
// - Kelengkapan pelaporan s.d. TW n = jumlah sel terlapor ÷ (jumlah rencana aksi × n).
// - Capaian rencana aksi s.d. TW n = Σ realisasi ÷ Σ target TW1..n (maks 100%); diabaikan bila Σ target = 0.
// - Capaian kelompok = rata-rata capaian rencana aksinya.
// - Anggaran rencana aksi = pagu sub kegiatan (mode 'pagu') atau isian manual (mode 'manual').
// - Realisasi anggaran rencana aksi = realisasi anggaran sub kegiatan × (anggaran ÷ pagu).
// - Dalam satu kelompok, sub kegiatan yang di-tag ke beberapa indikator dihitung SEKALI.
import * as db from './data/store.js';

const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const has = (v) => v !== null && v !== undefined && v !== '';

export function avg(list) {
  const v = list.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? sum(v) / v.length : null;
}

export const approved = (filter = () => true) => db.where('tag', (t) => t.status === 'disetujui' && filter(t));

export function anggaranTag(tag, sk = db.get('subkegiatan', tag.subkegiatanId)) {
  if (tag.anggaranMode === 'manual' && has(tag.anggaranManual)) return Number(tag.anggaranManual) || 0;
  return sk ? Number(sk.pagu) || 0 : 0;
}

function skala(tag, sk) {
  if (!sk || !sk.pagu) return 0;
  return anggaranTag(tag, sk) / sk.pagu;
}

// Realisasi anggaran rencana aksi: twAwal..twAkhir (1..4, inklusif)
export function realAnggaranTag(tag, sk = db.get('subkegiatan', tag.subkegiatanId), twAkhir = 4, twAwal = 1) {
  if (!sk) return 0;
  const ra = Array.isArray(sk.realisasiAnggaran) ? sk.realisasiAnggaran : [];
  return sum(ra.slice(twAwal - 1, twAkhir)) * skala(tag, sk);
}

export function capaianTag(tag, tw = 4, sk = db.get('subkegiatan', tag.subkegiatanId)) {
  if (!sk) return null;
  const t = sum(sk.target.slice(0, tw));
  if (!t) return null;
  const r = sum((sk.realisasi || []).slice(0, tw));
  return Math.min(100, (r / t) * 100);
}

export function capaianTagTw(tag, i, sk = db.get('subkegiatan', tag.subkegiatanId)) {
  if (!sk) return null;
  const t = Number(sk.target[i - 1]) || 0;
  const r = sk.realisasi?.[i - 1];
  if (!t || !has(r)) return null;
  return Math.min(100, (Number(r) / t) * 100);
}

export const terlapor = (sk, i) => has(sk?.realisasi?.[i - 1]);

// Ringkasan sekelompok rencana aksi s.d. triwulan tw.
export function metrics(tags, tw) {
  const n = tags.length;
  let rep = 0;
  const caps = [];
  const perSk = new Map();
  for (const t of tags) {
    const sk = db.get('subkegiatan', t.subkegiatanId);
    if (!sk) continue;
    for (let i = 1; i <= tw; i++) if (terlapor(sk, i)) rep++;
    caps.push(capaianTag(t, tw, sk));
    const a = anggaranTag(t, sk);
    const r = realAnggaranTag(t, sk, tw);
    const prev = perSk.get(sk.id);
    if (!prev || a > prev.a) perSk.set(sk.id, { a, r });
  }
  const anggaran = sum([...perSk.values()].map((x) => x.a));
  const realisasi = sum([...perSk.values()].map((x) => x.r));
  const diharapkan = n * tw;
  return {
    n, terlapor: rep, diharapkan,
    kelengkapan: diharapkan ? (rep / diharapkan) * 100 : null,
    capaian: avg(caps),
    anggaran, realisasi,
    serapan: anggaran ? (realisasi / anggaran) * 100 : null,
  };
}

// Satu triwulan saja (tidak kumulatif).
export function metricsTw(tags, i) {
  let rep = 0;
  const caps = [];
  const perSk = new Map();
  for (const t of tags) {
    const sk = db.get('subkegiatan', t.subkegiatanId);
    if (!sk) continue;
    if (terlapor(sk, i)) rep++;
    caps.push(capaianTagTw(t, i, sk));
    const r = realAnggaranTag(t, sk, i, i);
    const prev = perSk.get(sk.id);
    if (!prev || r > prev) perSk.set(sk.id, r);
  }
  return { n: tags.length, terlapor: rep, kelengkapan: tags.length ? (rep / tags.length) * 100 : null, capaian: avg(caps), realisasi: sum([...perSk.values()]) };
}

export function hitungFokus(tags = approved((t) => t.jenis === 'tematik')) {
  const counts = {};
  for (const t of tags) counts[t.fokus || 'Lain-lain'] = (counts[t.fokus || 'Lain-lain'] || 0) + 1;
  return counts;
}

// Indikator lain yang juga memakai sub kegiatan ini (tag aktif).
export function indikatorLainUntukSubkeg(subkegId, exceptIndId) {
  return db.where('tag', (t) => t.subkegiatanId === subkegId && t.indikatorId !== exceptIndId && t.status !== 'dikembalikan')
    .map((t) => db.get('indikator', t.indikatorId)).filter(Boolean);
}

export const pdNama = (id) => db.get('pd', id)?.singkatan || id;
export const pdNamaLengkap = (id) => db.get('pd', id)?.nama || id;

// Warna status untuk persentase (selalu disertai angka, warna hanya penegas).
export function tone(v) {
  if (v === null || v === undefined) return 'none';
  if (v >= 85) return 'good';
  if (v >= 50) return 'mid';
  return 'low';
}
