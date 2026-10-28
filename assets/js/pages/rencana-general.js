// Tabel Rencana Aksi RB General: semua indikator + target, baseline, dan rencana aksi hasil tagging.
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, badge, toast } from '../util.js';
import { pageHead } from './shared.js';
import { anggaranTag, pdNama, pdNamaLengkap } from '../calc.js';
import { writeXlsx, downloadBlob } from '../xlsx-lite.js';

const f = { q: '', kelompok: '', pd: '', ra: '', status: 'aktif' };
const STATUS_OPT = [['aktif', 'Disetujui + menunggu verifikasi'], ['disetujui', 'Disetujui saja'], ['diajukan', 'Menunggu verifikasi'], ['dikembalikan', 'Dikembalikan'], ['semua', 'Semua status (termasuk draf)']];
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

function statusOk(t) {
  if (f.status === 'semua') return true;
  if (f.status === 'aktif') return t.status === 'disetujui' || t.status === 'diajukan';
  return t.status === f.status;
}

export function data() {
  const q = f.q.trim().toLowerCase();
  const inds = db.where('indikator', (i) => i.jenis === 'general')
    .filter((i) => !f.kelompok || i.kelompok === f.kelompok)
    .filter((i) => !f.pd || i.pengampu.includes(f.pd))
    .filter((i) => !q || `${i.no} ${i.nama} ${i.kelompok}`.toLowerCase().includes(q));
  return inds.map((i) => {
    const tags = db.where('tag', (t) => t.indikatorId === i.id && statusOk(t)).filter((t) => !f.pd || t.pdId === f.pd || i.pengampu.includes(f.pd));
    const rows = tags.map((t) => ({ t, sk: db.get('subkegiatan', t.subkegiatanId) })).filter((r) => r.sk);
    return { i, rows };
  }).filter((x) => (f.ra === 'ada' ? x.rows.length : f.ra === 'belum' ? !x.rows.length : true));
}

function table(list) {
  if (!list.length) return '<p class="empty">Tidak ada indikator yang cocok dengan filter.</p>';
  let prev = '';
  return `<div class="table-scroll"><table class="grid" style="min-width:1250px">
    <thead><tr><th rowspan="2" style="min-width:320px">Rencana aksi (sub kegiatan)</th><th colspan="2">Output</th><th colspan="5">Target</th><th rowspan="2">Jumlah anggaran</th><th rowspan="2">Pelaksana</th><th rowspan="2">Status</th></tr>
    <tr><th style="min-width:220px">Indikator</th><th>Sat.</th><th>TW I</th><th>TW II</th><th>TW III</th><th>TW IV</th><th>Total</th></tr></thead>
    <tbody>${list.map(({ i, rows }) => {
      const grp = i.kelompok !== prev ? `<tr class="tema"><td colspan="11">${esc(i.kelompok)}</td></tr>` : '';
      prev = i.kelompok;
      const total = sum(rows.map((r) => anggaranTag(r.t, r.sk)));
      return `${grp}<tr class="ind"><td colspan="11">${i.no}. ${esc(i.nama)}
          <span class="small" style="font-weight:400;margin-left:12px">Target ${db.meta().tahun}: <b>${i.target === null ? '–' : fmtNum(i.target)}</b>${i.satuan ? ` ${esc(i.satuan)}` : ''} · Baseline: <b>${i.baseline === null ? '–' : fmtNum(i.baseline)}</b> · Koordinator: ${i.pengampu.map(pdNama).join(', ') || '<span class="t-low">belum ditugaskan</span>'}</span></td></tr>
        ${rows.length ? rows.map(({ t, sk }) => `<tr>
          <td>${esc(t.narasi || sk.nama)}${t.narasi ? `<div class="xs muted">${esc(sk.kode)} · ${esc(sk.nama)}</div>` : `<div class="xs muted">${esc(sk.kode)}</div>`}${t.bagian ? `<div class="xs" style="color:var(--blue-text)">Bagian: ${esc(t.bagian)}</div>` : ''}</td>
          <td>${esc(sk.indikatorOutput)}</td><td class="c">${esc(sk.satuan)}</td>
          ${sk.target.map((v) => `<td class="n">${fmtNum(v)}</td>`).join('')}<td class="n"><b>${fmtNum(sum(sk.target))}</b></td>
          <td class="n">${fmtRp(anggaranTag(t, sk))}${t.anggaranMode === 'manual' ? '<div class="xs muted">manual</div>' : ''}</td>
          <td>${esc(pdNama(sk.pdId))}</td><td class="c">${badge(t.status)}</td></tr>`).join('')
          + `<tr class="sum"><td colspan="8" class="n">Total anggaran indikator</td><td class="n">${fmtRp(total)}</td><td colspan="2"></td></tr>`
        : '<tr class="empty-row"><td colspan="11">Belum ada rencana aksi.</td></tr>'}`;
    }).join('')}</tbody></table></div>`;
}

async function unduh(list) {
  const head = ['no_indikator', 'indikator', 'target', 'baseline', 'koordinator', 'rencana_aksi', 'indikator_output', 'satuan_output', 'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'target_total', 'anggaran', 'pelaksana', 'status'];
  const rows = [head];
  for (const { i, rows: rs } of list) {
    const base = [i.no, i.nama, i.target, i.baseline, i.pengampu.map(pdNamaLengkap).join('; ')];
    if (!rs.length) rows.push([...base, null, null, null, null, null, null, null, null, null, null, null]);
    for (const { t, sk } of rs) rows.push([...base, t.narasi || sk.nama, sk.indikatorOutput, sk.satuan, ...sk.target, sum(sk.target), anggaranTag(t, sk), pdNamaLengkap(sk.pdId), t.status]);
  }
  downloadBlob(await writeXlsx([{ name: 'Rencana Aksi General', rows, boldRows: 1, cols: [6, 40, 9, 9, 40, 50, 40, 12, 7, 7, 7, 7, 8, 16, 40, 12] }]), `Tabel_Rencana_Aksi_General_${db.meta().tahun}.xlsx`);
}

export function render(el, ctx) {
  const gen = db.where('indikator', (i) => i.jenis === 'general');
  const kelompok = [...new Set(gen.map((i) => i.kelompok))];
  const pds = [...new Set(gen.flatMap((i) => i.pengampu))];
  if (ctx.user.role === 'pd' && f._init !== ctx.user.pdId) { f.pd = pds.includes(ctx.user.pdId) ? ctx.user.pdId : ''; f._init = ctx.user.pdId; }

  el.innerHTML = `
  ${pageHead('RB General', 'Tabel Rencana Aksi General', 'Semua indikator beserta target, baseline, dan rencana aksi hasil tagging sub kegiatan. Gunakan filter untuk mempersempit.',
    '<button class="btn outline" id="btn-xlsx">Unduh tabel (.xlsx)</button>')}
  <section class="card pad-s" aria-label="Filter"><div class="filters">
    <label class="field wide">Cari indikator<input type="search" id="q" value="${esc(f.q)}" placeholder="Nomor, nama, atau sub komponen…"></label>
    <label class="field">Sub komponen<select id="kelompok"><option value="">Semua</option>${kelompok.map((k) => `<option ${k === f.kelompok ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
    <label class="field">Koordinator<select id="pd"><option value="">Semua PD</option>${pds.map((p) => `<option value="${p}" ${p === f.pd ? 'selected' : ''}>${esc(pdNama(p))}</option>`).join('')}</select></label>
    <label class="field">Rencana aksi<select id="ra"><option value="">Semua indikator</option><option value="ada" ${f.ra === 'ada' ? 'selected' : ''}>Sudah ada</option><option value="belum" ${f.ra === 'belum' ? 'selected' : ''}>Belum ada</option></select></label>
    <label class="field">Status<select id="status">${STATUS_OPT.map(([k, l]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button type="button" class="btn secondary" id="btn-reset">Reset filter</button>
  </div></section>
  <p class="small muted" id="info" style="margin:0" aria-live="polite"></p>
  <div id="tabel"></div>`;

  const draw = () => {
    const list = data();
    const nRa = list.reduce((a, x) => a + x.rows.length, 0);
    const tot = list.reduce((a, x) => a + sum(x.rows.map((r) => anggaranTag(r.t, r.sk))), 0);
    el.querySelector('#info').textContent = `Menampilkan ${list.length} dari ${gen.length} indikator · ${nRa} rencana aksi · total anggaran ${fmtRp(tot)}`;
    el.querySelector('#tabel').innerHTML = table(list);
  };
  draw();
  el.querySelector('#q').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  for (const k of ['kelompok', 'pd', 'ra', 'status']) el.querySelector(`#${k}`).addEventListener('change', (e) => { f[k] = e.target.value; draw(); });
  el.querySelector('#btn-reset').addEventListener('click', () => { Object.assign(f, { q: '', kelompok: '', pd: '', ra: '', status: 'aktif' }); ctx.rerender(); });
  el.querySelector('#btn-xlsx').addEventListener('click', async () => { try { await unduh(data()); } catch (e) { toast(e.message); } });
}
