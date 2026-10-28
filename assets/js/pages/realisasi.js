// Realisasi RB: rencana aksi (disetujui) beserta realisasi output & anggaran dari Sinergi. Hanya baca.
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, fmtDate, toast } from '../util.js';
import { pageHead } from './shared.js';
import * as C from '../calc.js';
import { APP } from '../config.js';
import { writeXlsx, downloadBlob } from '../xlsx-lite.js';
import { pbar, pct, TW_LABEL } from '../ringkasan.js';

const f = { tw: 'semua', q: '', pd: '', hanyaAda: false, belumLapor: false };
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const cell = (v) => (v === null || v === undefined ? '<span class="t-low" title="Belum dilaporkan">–</span>' : fmtNum(v));

function data(jenis) {
  const q = f.q.trim().toLowerCase();
  return db.where('indikator', (i) => i.jenis === jenis)
    .filter((i) => !f.pd || i.pengampu.includes(f.pd))
    .map((i) => {
      let rows = C.approved((t) => t.indikatorId === i.id).map((t) => ({ t, sk: db.get('subkegiatan', t.subkegiatanId) })).filter((r) => r.sk);
      if (f.belumLapor) {
        const tws = f.tw === 'semua' ? [1, 2, 3, 4].slice(0, APP.triwulanBerjalan) : [Number(f.tw)];
        rows = rows.filter((r) => tws.some((n) => !C.terlapor(r.sk, n)));
      }
      return { i, rows };
    })
    .filter((x) => !q || `${x.i.no} ${x.i.nama} ${x.i.kelompok} ${x.rows.map((r) => r.t.narasi || r.sk.nama).join(' ')}`.toLowerCase().includes(q))
    .filter((x) => !(f.hanyaAda || f.belumLapor) || x.rows.length);
}

function headAll(jenis) {
  return `<tr><th rowspan="2" style="min-width:280px">Rencana aksi</th><th colspan="2">Output</th><th colspan="4">Target</th><th colspan="4">Realisasi output</th><th rowspan="2">Capaian s.d. TW ${TW_LABEL[APP.triwulanBerjalan - 1]}</th><th rowspan="2">Anggaran</th><th rowspan="2">Realisasi anggaran</th><th rowspan="2">Serapan</th>${jenis === 'tematik' ? '<th rowspan="2">Fokus</th>' : ''}</tr>
    <tr><th style="min-width:180px">Indikator</th><th>Sat.</th>${[1, 2, 3, 4].map((n) => `<th>TW ${TW_LABEL[n - 1]}</th>`).join('')}${[1, 2, 3, 4].map((n) => `<th>TW ${TW_LABEL[n - 1]}</th>`).join('')}</tr>`;
}
function headTw(jenis, n) {
  const L = TW_LABEL[n - 1];
  return `<tr><th rowspan="2" style="min-width:280px">Rencana aksi</th><th colspan="2">Output</th><th colspan="4">Triwulan ${L}</th><th rowspan="2">Capaian kumulatif s.d. TW ${L}</th><th colspan="3">Anggaran</th>${jenis === 'tematik' ? '<th rowspan="2">Fokus</th>' : ''}</tr>
    <tr><th style="min-width:180px">Indikator</th><th>Sat.</th><th>Target</th><th>Realisasi</th><th>Capaian</th><th>Laporan</th><th>Pagu/anggaran</th><th>Realisasi TW ${L}</th><th>Serapan s.d. TW ${L}</th></tr>`;
}

function rowAll(t, sk, jenis) {
  const a = C.anggaranTag(t, sk);
  const r = C.realAnggaranTag(t, sk, APP.triwulanBerjalan);
  return `<tr><td>${esc(t.narasi || sk.nama)}<div class="xs muted">${esc(C.pdNama(sk.pdId))} · ${esc(sk.kode)}</div></td>
    <td>${esc(sk.indikatorOutput)}</td><td class="c">${esc(sk.satuan)}</td>
    ${sk.target.map((v) => `<td class="n">${fmtNum(v)}</td>`).join('')}
    ${[0, 1, 2, 3].map((k) => `<td class="n">${k < APP.triwulanBerjalan ? cell(sk.realisasi?.[k]) : '<span class="muted">·</span>'}</td>`).join('')}
    <td>${pbar(C.capaianTag(t, APP.triwulanBerjalan, sk))}</td><td class="n">${fmtRp(a)}</td><td class="n">${fmtRp(r)}</td><td class="n">${pct(a ? (r / a) * 100 : null)}</td>
    ${jenis === 'tematik' ? `<td>${esc(t.fokus || '–')}</td>` : ''}</tr>`;
}
function rowTw(t, sk, jenis, n) {
  const a = C.anggaranTag(t, sk);
  const rk = C.realAnggaranTag(t, sk, n);
  const lap = C.terlapor(sk, n);
  return `<tr><td>${esc(t.narasi || sk.nama)}<div class="xs muted">${esc(C.pdNama(sk.pdId))} · ${esc(sk.kode)}</div></td>
    <td>${esc(sk.indikatorOutput)}</td><td class="c">${esc(sk.satuan)}</td>
    <td class="n">${fmtNum(sk.target[n - 1])}</td><td class="n">${cell(sk.realisasi?.[n - 1])}</td><td>${pbar(C.capaianTagTw(t, n, sk))}</td>
    <td class="c">${lap ? '<span class="badge b-ok">Terlapor</span>' : '<span class="badge b-wait">Belum</span>'}</td>
    <td>${pbar(C.capaianTag(t, n, sk))}</td><td class="n">${fmtRp(a)}</td><td class="n">${fmtRp(C.realAnggaranTag(t, sk, n, n))}</td><td class="n">${pct(a ? (rk / a) * 100 : null)}</td>
    ${jenis === 'tematik' ? `<td>${esc(t.fokus || '–')}</td>` : ''}</tr>`;
}

function table(list, jenis) {
  if (!list.length) return '<p class="empty">Tidak ada data yang cocok dengan filter.</p>';
  const tw = f.tw === 'semua' ? null : Number(f.tw);
  const cols = (tw ? 11 : 15) + (jenis === 'tematik' ? 1 : 0);
  const twRingkas = tw || APP.triwulanBerjalan;
  let prev = '';
  return `<div class="table-scroll"><table class="grid" style="min-width:${tw ? 1300 : 1600}px">
    <thead>${tw ? headTw(jenis, tw) : headAll(jenis)}</thead>
    <tbody>${list.map(({ i, rows }) => {
      const g = i.kelompok !== prev ? `<tr class="tema"><td colspan="${cols}">${esc(i.kelompok)}</td></tr>` : '';
      prev = i.kelompok;
      const m = C.metrics(rows.map((r) => r.t), twRingkas);
      return `${g}<tr class="ind"><td colspan="${cols}">${i.jenis === 'general' ? `${i.no}. ` : ''}${esc(i.nama)}
        <span class="small" style="font-weight:400;margin-left:12px">Target ${APP.tahun}: <b>${i.target === null ? '–' : fmtNum(i.target)}</b> ${esc(i.satuan || '')} · Baseline: <b>${i.baseline === null ? '–' : fmtNum(i.baseline)}</b> · ${i.pengampu.map(C.pdNama).join(', ') || 'belum ditugaskan'}
        ${rows.length ? ` · kelengkapan ${pct(m.kelengkapan, 0)} · capaian ${pct(m.capaian, 0)} · serapan ${pct(m.serapan, 0)}` : ''}</span></td></tr>
        ${rows.length ? rows.map(({ t, sk }) => (tw ? rowTw(t, sk, jenis, tw) : rowAll(t, sk, jenis))).join('') : `<tr class="empty-row"><td colspan="${cols}">Belum ada rencana aksi yang disetujui.</td></tr>`}`;
    }).join('')}</tbody></table></div>`;
}

async function unduh(list, jenis) {
  const head = ['indikator', 'target', 'baseline', 'rencana_aksi', 'pelaksana', 'indikator_output', 'satuan', 'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4',
    'realisasi_tw1', 'realisasi_tw2', 'realisasi_tw3', 'realisasi_tw4', 'capaian_persen', 'anggaran', 'realisasi_anggaran', 'serapan_persen', ...(jenis === 'tematik' ? ['fokus_intervensi'] : [])];
  const rows = [head];
  for (const { i, rows: rs } of list) for (const { t, sk } of rs) {
    const a = C.anggaranTag(t, sk); const r = C.realAnggaranTag(t, sk, APP.triwulanBerjalan);
    const c = C.capaianTag(t, APP.triwulanBerjalan, sk);
    rows.push([i.nama, i.target, i.baseline, t.narasi || sk.nama, C.pdNamaLengkap(sk.pdId), sk.indikatorOutput, sk.satuan, ...sk.target, ...[0, 1, 2, 3].map((k) => sk.realisasi?.[k] ?? null),
      c === null ? null : Math.round(c * 10) / 10, a, Math.round(r), a ? Math.round((r / a) * 1000) / 10 : null, ...(jenis === 'tematik' ? [t.fokus] : [])]);
  }
  downloadBlob(await writeXlsx([{ name: `Realisasi ${jenis === 'general' ? 'General' : 'Tematik'}`, rows, boldRows: 1 }]), `Realisasi_RB_${jenis}_${APP.tahun}.xlsx`);
}

export function render(el, ctx) {
  const jenis = ctx.sub === 'tematik' ? 'tematik' : 'general';
  const inds = db.where('indikator', (i) => i.jenis === jenis);
  const pds = [...new Set(inds.flatMap((i) => i.pengampu))];
  const log = db.all('imporLog').slice(-1)[0];

  el.innerHTML = `
  ${pageHead('Realisasi RB', `Realisasi RB ${jenis === 'general' ? 'General' : 'Tematik'}`, `Rencana aksi yang disetujui beserta realisasi output dan anggaran dari Sinergi (hanya baca). Data Sinergi terakhir: ${fmtDate(log?.tanggal)}.`,
    '<button class="btn outline" id="btn-xlsx">Unduh tabel (.xlsx)</button>')}
  <section class="card pad-s" aria-label="Filter"><div class="filters">
    <label class="field">Triwulan<select id="tw"><option value="semua">Semua triwulan</option>${[1, 2, 3, 4].map((n) => `<option value="${n}" ${String(n) === String(f.tw) ? 'selected' : ''}>Triwulan ${TW_LABEL[n - 1]}</option>`).join('')}</select></label>
    <label class="field wide">Cari<input type="search" id="q" value="${esc(f.q)}" placeholder="Indikator atau rencana aksi…"></label>
    <label class="field">Pengampu<select id="pd"><option value="">Semua PD</option>${pds.map((p) => `<option value="${p}" ${p === f.pd ? 'selected' : ''}>${esc(C.pdNama(p))}</option>`).join('')}</select></label>
    <label class="inline small" style="gap:8px;min-height:44px"><input type="checkbox" id="hanyaAda" ${f.hanyaAda ? 'checked' : ''} style="width:18px;height:18px">Hanya indikator dengan rencana aksi</label>
    <label class="inline small" style="gap:8px;min-height:44px"><input type="checkbox" id="belumLapor" ${f.belumLapor ? 'checked' : ''} style="width:18px;height:18px">Hanya yang belum lapor</label>
  </div></section>
  <div class="inline small muted" id="info" aria-live="polite"></div>
  <div id="tabel"></div>
  <p class="xs muted" style="margin:0">Tanda <span class="t-low">–</span> = realisasi triwulan itu belum dilaporkan di Sinergi. Capaian = realisasi ÷ target (maks. 100%). Warna: hijau ≥ 85%, oranye 50–84%, merah &lt; 50%.</p>`;

  const draw = () => {
    const list = data(jenis);
    const tags = list.flatMap((x) => x.rows.map((r) => r.t));
    const m = C.metrics(tags, f.tw === 'semua' ? APP.triwulanBerjalan : Number(f.tw));
    el.querySelector('#info').innerHTML = `<span>${list.length} indikator · ${tags.length} rencana aksi</span><span>·</span><span>Kelengkapan ${pct(m.kelengkapan)}</span><span>·</span><span>Capaian ${pct(m.capaian)}</span><span>·</span><span>Serapan ${pct(m.serapan)} (${fmtRp(m.realisasi)} dari ${fmtRp(m.anggaran)})</span>`;
    el.querySelector('#tabel').innerHTML = table(list, jenis);
  };
  draw();
  el.querySelector('#tw').addEventListener('change', (e) => { f.tw = e.target.value; draw(); });
  el.querySelector('#q').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  el.querySelector('#pd').addEventListener('change', (e) => { f.pd = e.target.value; draw(); });
  el.querySelector('#hanyaAda').addEventListener('change', (e) => { f.hanyaAda = e.target.checked; draw(); });
  el.querySelector('#belumLapor').addEventListener('change', (e) => { f.belumLapor = e.target.checked; draw(); });
  el.querySelector('#btn-xlsx').addEventListener('click', async () => { try { await unduh(data(jenis), jenis); } catch (e) { toast(e.message); } });
}
