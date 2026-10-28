// Pembuatan file Excel sesuai template KemenPANRB, dan pembacaan Excel impor.
// Memakai xlsx-lite.js (di atas JSZip) — tanpa pustaka Excel pihak ketiga.
import * as db from './data/store.js';
import { anggaranTag, pdNamaLengkap } from './calc.js';
import { writeXlsx, writeXlsxBuffer, downloadBlob, readXlsx, rowsToObjects } from './xlsx-lite.js';

const GENERAL_KOLOM = ['rencana_aksi', 'satuan_output', 'indikator_output', 'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'target_total', 'anggaran_total', 'pelaksana', 'koordinator'];
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);


// ---------- RB General ----------
export function generalRows(indId) {
  const ind = db.get('indikator', indId);
  const koordinator = ind.pengampu.map(pdNamaLengkap).join('; ');
  return db.where('tag', (t) => t.indikatorId === indId && t.status === 'disetujui').map((t) => {
    const sk = db.get('subkegiatan', t.subkegiatanId) || { target: [0, 0, 0, 0] };
    return {
      rencana_aksi: t.narasi || sk.nama,
      satuan_output: sk.satuan,
      indikator_output: sk.indikatorOutput,
      target_tw1: sk.target[0], target_tw2: sk.target[1], target_tw3: sk.target[2], target_tw4: sk.target[3],
      target_total: sum(sk.target),
      anggaran_total: anggaranTag(t, sk),
      pelaksana: pdNamaLengkap(sk.pdId || t.pdId),
      koordinator,
    };
  });
}

export function generalSheet(rows) {
  return {
    name: 'RB General - Rencana Aksi',
    rows: [
      GENERAL_KOLOM,
      ['Rencana Aksi', 'Satuan Output', 'Indikator Output', 'Target', null, null, null, null, 'Anggaran', 'Pelaksana', 'Koordinator'],
      [null, null, null, 'TW 1', 'TW 2', 'TW 3', 'TW 4', 'Total', null, null, null],
      ...rows.map((r) => GENERAL_KOLOM.map((k) => r[k] ?? null)),
    ],
    merges: ['D2:H2', 'J2:J3', 'B2:B3', 'A2:A3', 'C2:C3', 'K2:K3', 'I2:I3'],
    cols: [50, 14, 40, 7, 7, 7, 7, 8, 16, 40, 40],
    boldRows: 3,
  };
}

export function generalWorkbook(indId) {
  return [generalSheet(generalRows(indId))];
}

// ---------- RB Tematik ----------
export function tematikRows(tema) {
  const inds = db.where('indikator', (i) => i.jenis === 'tematik' && (!tema || i.tema === tema));
  const ids = new Set(inds.map((i) => i.id));
  const tags = db.where('tag', (t) => t.jenis === 'tematik' && t.status === 'disetujui' && ids.has(t.indikatorId));
  const order = db.extra('masterTema') || [];
  return tags.map((t) => {
    const ind = db.get('indikator', t.indikatorId);
    const pm = db.get('permasalahan', t.permasalahanId) || { portalId: {} };
    const sk = db.get('subkegiatan', t.subkegiatanId) || { target: [0, 0, 0, 0], realisasi: [] };
    const angg = anggaranTag(t, sk);
    const realAngg = sk.pagu ? (sk.realisasiAnggaran || 0) * (angg / sk.pagu) : null;
    const real = sk.realisasi || [];
    return {
      _order: order.indexOf(ind.tema),
      tema: ind.tema, sasaran: ind.sasaran, indikator_roadmap: ind.nama, target: ind.target, satuan_target: ind.satuan,
      realisasi: ind.realisasi ?? null, capaian: null, catatan: null,
      permasalahan: pm.permasalahan, sasaran_permasalahan: pm.sasaran, indikator_permasalahan: pm.indikator,
      target_indikator_permasalahan: pm.target, satuan_target_indikator_permasalahan: pm.satuan,
      realisasi_indikator_permasalahan: pm.realisasi, capaian_indikator_permasalahan: null, catatan_indikator_permasalahan: pm.catatan || null,
      rencana_aksi: t.narasi || sk.nama, indikator_output: sk.indikatorOutput, satuan_output: sk.satuan,
      target_tw1: sk.target[0], target_tw2: sk.target[1], target_tw3: sk.target[2], target_tw4: sk.target[3], target_total: sum(sk.target),
      anggaran: angg, fokus_intervensi: t.fokus, koordinator: pdNamaLengkap(t.pdId), pelaksana: pdNamaLengkap(sk.pdId || t.pdId),
      realisasi_tw1: real[0] ?? null, realisasi_tw2: real[1] ?? null, realisasi_tw3: real[2] ?? null, realisasi_tw4: real[3] ?? null,
      realisasi_total: real.some((v) => v !== null && v !== undefined) ? sum(real) : null,
      realisasi_anggaran: realAngg === null ? null : Math.round(realAngg), catatan_monev: t.catatan || null,
      sasaran_roadmap_id: ind.portalId?.sasaran_roadmap_id ?? null, indikator_roadmap_id: ind.portalId?.indikator_roadmap_id ?? null,
      permasalahan_id: pm.portalId?.permasalahan_id ?? null, indikator_permasalahan_id: pm.portalId?.indikator_permasalahan_id ?? null,
      rencana_aksi_id: t.portalId?.rencana_aksi_id ?? null, rencana_aksi_output_id: t.portalId?.rencana_aksi_output_id ?? null,
    };
  }).sort((a, b) => a._order - b._order);
}

export function tematikKolom() {
  return db.extra('templateTematikKolom') || [];
}

export function tematikWorkbook(tema) {
  const kol = tematikKolom();
  const rows = tematikRows(tema);
  const meta = db.extra('templateMeta') || {};
  return [
    { name: 'DATA RB TEMATIK', rows: [kol, ...rows.map((r) => kol.map((k) => r[k] ?? null))], cols: kol.map((k) => (/permasalahan$|rencana_aksi$|sasaran/.test(k) ? 40 : 14)), boldRows: 1 },
    { name: 'PETUNJUK', rows: (db.extra('templatePetunjuk') || []).map((x) => [x]), cols: [90] },
    { name: 'MASTER TEMA', rows: [['nama'], ...(db.extra('masterTema') || []).map((x) => [x])], cols: [60] },
    { name: 'MASTER FOKUS INTERVENSI', rows: [['nama'], ...(db.extra('masterFokus') || []).map((x) => [x])], cols: [40] },
    { name: '_META', rows: Object.entries(meta), cols: [16, 50] },
  ];
}

// ---------- unduh ----------
export function slug(s) {
  return String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
}

export async function downloadWorkbook(sheets, filename) {
  downloadBlob(await writeXlsx(sheets), filename);
}

export async function downloadSemuaGeneral(tahun) {
  if (!window.JSZip) throw new Error('Pustaka ZIP belum termuat. Muat ulang halaman.');
  const zip = new window.JSZip();
  const inds = db.where('indikator', (i) => i.jenis === 'general');
  const rekap = [['no_indikator', 'indikator', ...GENERAL_KOLOM]];
  for (const ind of inds) {
    const rows = generalRows(ind.id);
    zip.file(`${String(ind.no).padStart(2, '0')}_${slug(ind.nama)}.xlsx`, await writeXlsxBuffer([generalSheet(rows)]));
    rows.forEach((r) => rekap.push([ind.no, ind.nama, ...GENERAL_KOLOM.map((k) => r[k] ?? null)]));
  }
  zip.file(`00_REKAP_RB_General_${tahun}.xlsx`, await writeXlsxBuffer([{ name: 'Rekap', rows: rekap, boldRows: 1, cols: [8, 40, 50, 14, 40, 7, 7, 7, 7, 8, 16, 40, 40] }]));
  downloadBlob(await zip.generateAsync({ type: 'blob' }), `RB_General_${tahun}_semua_indikator.zip`);
}

// ---------- impor ----------
export const IMPOR_KOLOM = ['tahun', 'kode_pd', 'nama_pd', 'kode_sub_kegiatan', 'nama_sub_kegiatan', 'indikator_output', 'satuan',
  'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'pagu', 'realisasi_tw1', 'realisasi_tw2', 'realisasi_tw3', 'realisasi_tw4', 'realisasi_anggaran'];

export async function downloadTemplateImpor() {
  const rows = db.all('subkegiatan').map((s) => [
    db.meta().tahun, s.pdId, pdNamaLengkap(s.pdId), s.kode, s.nama, s.indikatorOutput, s.satuan,
    s.target[0], s.target[1], s.target[2], s.target[3], s.pagu,
    s.realisasi?.[0] ?? null, s.realisasi?.[1] ?? null, s.realisasi?.[2] ?? null, s.realisasi?.[3] ?? null, s.realisasiAnggaran ?? null,
  ]);
  await downloadWorkbook([{ name: 'SUB KEGIATAN', rows: [IMPOR_KOLOM, ...rows], boldRows: 1, cols: [6, 14, 40, 22, 50, 40, 12, 9, 9, 9, 9, 16, 9, 9, 9, 9, 16] }], 'template_impor_sinergi_DUMMY.xlsx');
}

export async function readImporFile(file) {
  return rowsToObjects(await readXlsx(await file.arrayBuffer()));
}
