// Perhitungan capaian & anggaran. Dipakai Beranda publik dan halaman internal.
// Aturan (bisa diubah di satu tempat ini):
// - Hanya tag berstatus 'disetujui' yang dihitung.
// - Capaian output per rencana aksi = realisasi kumulatif ÷ target kumulatif s.d. triwulan berjalan (maks 100%).
// - Anggaran rencana aksi = pagu sub kegiatan (mode 'pagu') atau isian manual (mode 'manual').
// - Total anggaran Beranda menghitung tiap sub kegiatan SEKALI (menghindari hitung ganda).
import * as db from './data/store.js';
import { APP } from './config.js';

const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

export function anggaranTag(tag, sk = db.get('subkegiatan', tag.subkegiatanId)) {
  if (tag.anggaranMode === 'manual' && tag.anggaranManual !== null && tag.anggaranManual !== undefined) return Number(tag.anggaranManual) || 0;
  return sk ? Number(sk.pagu) || 0 : 0;
}

export function capaianTag(tag, tw = APP.triwulanBerjalan) {
  const sk = db.get('subkegiatan', tag.subkegiatanId);
  if (!sk) return null;
  const t = sum(sk.target.slice(0, tw));
  const r = sum((sk.realisasi || []).slice(0, tw));
  if (!t) return null;
  return Math.min(100, (r / t) * 100);
}

export const approved = (filter = () => true) => db.where('tag', (t) => t.status === 'disetujui' && filter(t));

export function avg(list) {
  const v = list.filter((x) => x !== null && x !== undefined);
  return v.length ? sum(v) / v.length : null;
}

export function capaianIndikator(indId) {
  return avg(approved((t) => t.indikatorId === indId).map((t) => capaianTag(t)));
}

export function capaianKelompok(kelompok) {
  const ids = new Set(db.where('indikator', (i) => i.kelompok === kelompok).map((i) => i.id));
  return avg(approved((t) => ids.has(t.indikatorId)).map((t) => capaianTag(t)));
}

// Anggaran unik per sub kegiatan: ambil nilai terbesar bila di-tag lebih dari sekali.
function anggaranUnik(tags) {
  const per = new Map();
  for (const t of tags) {
    const sk = db.get('subkegiatan', t.subkegiatanId);
    if (!sk) continue;
    const a = anggaranTag(t, sk);
    const prev = per.get(sk.id);
    if (!prev || a > prev.a) per.set(sk.id, { a, sk });
  }
  return [...per.values()];
}

export function anggaranPerTriwulan(tags = approved()) {
  const rows = anggaranUnik(tags);
  const out = [0, 1, 2, 3].map((i) => ({ tw: i + 1, rencana: 0, realisasi: 0 }));
  for (const { a, sk } of rows) {
    const tt = sum(sk.target) || 0;
    const ratioReal = sk.pagu ? (Number(sk.realisasiAnggaran) || 0) / sk.pagu : 0;
    for (let i = 0; i < 4; i++) {
      const share = tt ? sum(sk.target.slice(0, i + 1)) / tt : (i + 1) / 4;
      out[i].rencana += a * share;
      if (i < APP.triwulanBerjalan) {
        const shareNow = tt ? sum(sk.target.slice(0, APP.triwulanBerjalan)) / tt : APP.triwulanBerjalan / 4;
        out[i].realisasi += shareNow ? a * ratioReal * (share / shareNow) : 0;
      }
    }
  }
  return out;
}

export function ringkasan() {
  const tags = approved();
  const cap = tags.map((t) => capaianTag(t));
  const tw = anggaranPerTriwulan(tags);
  const totalAnggaran = tw[3].rencana;
  const realisasi = tw[APP.triwulanBerjalan - 1].realisasi;
  const sesuai = cap.filter((c) => c !== null && c >= 100).length;
  return {
    rencanaAksi: tags.length,
    capaianOutput: avg(cap),
    sesuaiJadwal: sesuai,
    sesuaiJadwalPct: tags.length ? (sesuai / tags.length) * 100 : null,
    totalAnggaran,
    realisasiAnggaran: realisasi,
    realisasiAnggaranPct: totalAnggaran ? (realisasi / totalAnggaran) * 100 : null,
    perTriwulan: tw,
  };
}

export function hitungFokus() {
  const counts = {};
  for (const t of approved((t) => t.jenis === 'tematik')) counts[t.fokus || 'Lain-lain'] = (counts[t.fokus || 'Lain-lain'] || 0) + 1;
  return counts;
}

// Sub kegiatan yang di-tag ke lebih dari satu indikator (aktif, bukan draf/dikembalikan).
export function indikatorLainUntukSubkeg(subkegId, exceptIndId) {
  return db.where('tag', (t) => t.subkegiatanId === subkegId && t.indikatorId !== exceptIndId && t.status !== 'dikembalikan')
    .map((t) => db.get('indikator', t.indikatorId)).filter(Boolean);
}

export const pdNama = (id) => db.get('pd', id)?.singkatan || id;
export const pdNamaLengkap = (id) => db.get('pd', id)?.nama || id;
