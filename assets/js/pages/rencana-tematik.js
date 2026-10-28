// Tabel Rencana Aksi RB Tematik: tema → indikator roadmap → permasalahan → rencana aksi.
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, badge, toast } from '../util.js';
import { pageHead } from './shared.js';
import { anggaranTag, pdNama, pdNamaLengkap } from '../calc.js';
import { writeXlsx, downloadBlob } from '../xlsx-lite.js';

const f = { q: '', tema: '', pd: '', fokus: '', status: 'aktif' };
const STATUS_OPT = [['aktif', 'Disetujui + menunggu verifikasi'], ['disetujui', 'Disetujui saja'], ['diajukan', 'Menunggu verifikasi'], ['dikembalikan', 'Dikembalikan'], ['semua', 'Semua status (termasuk draf)']];
const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);
const statusOk = (t) => (f.status === 'semua' ? true : f.status === 'aktif' ? ['disetujui', 'diajukan'].includes(t.status) : t.status === f.status);

function data() {
  const q = f.q.trim().toLowerCase();
  const inds = db.where('indikator', (i) => i.jenis === 'tematik').filter((i) => (!f.tema || i.tema === f.tema) && (!f.pd || i.pengampu.includes(f.pd)));
  return inds.map((i) => {
    const pms = db.where('permasalahan', (p) => p.indikatorId === i.id && (!f.pd || p.pdId === f.pd)).map((p) => {
      const rows = db.where('tag', (t) => t.permasalahanId === p.id && statusOk(t) && (!f.fokus || t.fokus === f.fokus))
        .map((t) => ({ t, sk: db.get('subkegiatan', t.subkegiatanId) })).filter((r) => r.sk);
      return { p, rows };
    }).filter((x) => !q || `${i.tema} ${i.nama} ${x.p.permasalahan} ${x.p.indikator} ${x.rows.map((r) => r.t.narasi).join(' ')}`.toLowerCase().includes(q))
      .filter((x) => !f.fokus || x.rows.length);
    return { i, pms };
  }).filter((x) => x.pms.length || (!q && !f.fokus));
}

function table(list) {
  if (!list.length) return '<p class="empty">Tidak ada data yang cocok dengan filter.</p>';
  let prev = '';
  return `<div class="table-scroll"><table class="grid" style="min-width:1350px">
    <thead><tr><th rowspan="2" style="min-width:300px">Rencana aksi</th><th colspan="2">Output</th><th colspan="5">Target</th><th rowspan="2">Anggaran</th><th rowspan="2">Fokus intervensi</th><th rowspan="2">Koordinator</th><th rowspan="2">Status</th></tr>
    <tr><th style="min-width:200px">Indikator</th><th>Sat.</th><th>TW I</th><th>TW II</th><th>TW III</th><th>TW IV</th><th>Total</th></tr></thead>
    <tbody>${list.map(({ i, pms }) => {
      const grp = i.tema !== prev ? `<tr class="tema"><td colspan="12">${esc(i.tema)} <span style="font-weight:400">· Sasaran: ${esc(i.sasaran || '')}</span></td></tr>` : '';
      prev = i.tema;
      return `${grp}<tr class="ind"><td colspan="12">Indikator roadmap: ${esc(i.nama)}
        <span class="small" style="font-weight:400;margin-left:12px">Target: <b>${fmtNum(i.target)}</b> ${esc(i.satuan || '')} · Baseline: <b>${i.baseline === null ? '–' : fmtNum(i.baseline)}</b> · Pengampu: ${i.pengampu.map(pdNama).join(', ')}</span></td></tr>
      ${pms.length ? pms.map(({ p, rows }) => `<tr class="pm"><td colspan="12"><b>Permasalahan:</b> ${esc(p.permasalahan)}
          <div class="small" style="margin-top:4px"><b>Indikator permasalahan:</b> ${esc(p.indikator || '–')} · target <b>${p.target === null ? '–' : fmtNum(p.target)}</b> ${esc(p.satuan || '')}</div></td></tr>
        ${rows.length ? rows.map(({ t, sk }) => `<tr><td style="white-space:pre-line">${esc(t.narasi || sk.nama)}<div class="xs muted" style="white-space:normal">${esc(sk.kode)} · ${esc(sk.nama)}</div></td>
          <td>${esc(sk.indikatorOutput)}</td><td class="c">${esc(sk.satuan)}</td>${sk.target.map((v) => `<td class="n">${fmtNum(v)}</td>`).join('')}<td class="n"><b>${fmtNum(sum(sk.target))}</b></td>
          <td class="n">${fmtRp(anggaranTag(t, sk))}</td><td>${esc(t.fokus || '–')}</td><td>${esc(pdNama(t.pdId))}</td><td class="c">${badge(t.status)}</td></tr>`).join('')
          : '<tr class="empty-row"><td colspan="12">Belum ada rencana aksi untuk permasalahan ini.</td></tr>'}`).join('')
        : '<tr class="empty-row"><td colspan="12">Belum ada permasalahan & rencana aksi.</td></tr>'}`;
    }).join('')}</tbody></table></div>`;
}

async function unduh(list) {
  const head = ['tema', 'indikator_roadmap', 'target', 'satuan', 'permasalahan', 'indikator_permasalahan', 'target_permasalahan', 'rencana_aksi', 'indikator_output', 'satuan_output', 'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'target_total', 'anggaran', 'fokus_intervensi', 'koordinator', 'status'];
  const rows = [head];
  for (const { i, pms } of list) for (const { p, rows: rs } of pms) for (const { t, sk } of rs) {
    rows.push([i.tema, i.nama, i.target, i.satuan, p.permasalahan, p.indikator, p.target, t.narasi || sk.nama, sk.indikatorOutput, sk.satuan, ...sk.target, sum(sk.target), anggaranTag(t, sk), t.fokus, pdNamaLengkap(t.pdId), t.status]);
  }
  downloadBlob(await writeXlsx([{ name: 'Rencana Aksi Tematik', rows, boldRows: 1, cols: [30, 30, 8, 12, 50, 40, 9, 50, 40, 12, 7, 7, 7, 7, 8, 16, 28, 40, 12] }]), `Tabel_Rencana_Aksi_Tematik_${db.meta().tahun}.xlsx`);
}

export function render(el, ctx) {
  const tem = db.where('indikator', (i) => i.jenis === 'tematik');
  const temas = [...new Set(tem.map((i) => i.tema))];
  const pds = [...new Set(tem.flatMap((i) => i.pengampu))];
  const fokus = db.extra('masterFokus') || [];
  if (ctx.user.role === 'pd' && f._init !== ctx.user.pdId) { f.pd = pds.includes(ctx.user.pdId) ? ctx.user.pdId : ''; f._init = ctx.user.pdId; }

  el.innerHTML = `
  ${pageHead('RB Tematik', 'Tabel Rencana Aksi Tematik', 'Seluruh tema, indikator roadmap, permasalahan, dan rencana aksinya. <b>Konsep Tematik masih sementara.</b>',
    '<button class="btn outline" id="btn-xlsx">Unduh tabel (.xlsx)</button>')}
  <section class="card pad-s" aria-label="Filter"><div class="filters">
    <label class="field wide">Cari<input type="search" id="q" value="${esc(f.q)}" placeholder="Tema, indikator, permasalahan, rencana aksi…"></label>
    <label class="field">Tema<select id="tema"><option value="">Semua tema</option>${temas.map((k) => `<option ${k === f.tema ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
    <label class="field">Pengampu<select id="pd"><option value="">Semua PD</option>${pds.map((p) => `<option value="${p}" ${p === f.pd ? 'selected' : ''}>${esc(pdNama(p))}</option>`).join('')}</select></label>
    <label class="field">Fokus intervensi<select id="fokus"><option value="">Semua</option>${fokus.map((k) => `<option ${k === f.fokus ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
    <label class="field">Status<select id="status">${STATUS_OPT.map(([k, l]) => `<option value="${k}" ${k === f.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button type="button" class="btn secondary" id="btn-reset">Reset filter</button>
  </div></section>
  <p class="small muted" id="info" style="margin:0" aria-live="polite"></p>
  <div id="tabel"></div>`;

  const draw = () => {
    const list = data();
    const rs = list.flatMap((x) => x.pms.flatMap((p) => p.rows));
    el.querySelector('#info').textContent = `Menampilkan ${list.length} indikator roadmap · ${list.reduce((a, x) => a + x.pms.length, 0)} permasalahan · ${rs.length} rencana aksi · total anggaran ${fmtRp(sum(rs.map((r) => anggaranTag(r.t, r.sk))))}`;
    el.querySelector('#tabel').innerHTML = table(list);
  };
  draw();
  el.querySelector('#q').addEventListener('input', (e) => { f.q = e.target.value; draw(); });
  for (const k of ['tema', 'pd', 'fokus', 'status']) el.querySelector(`#${k}`).addEventListener('change', (e) => { f[k] = e.target.value; draw(); });
  el.querySelector('#btn-reset').addEventListener('click', () => { Object.assign(f, { q: '', tema: '', pd: '', fokus: '', status: 'aktif' }); ctx.rerender(); });
  el.querySelector('#btn-xlsx').addEventListener('click', async () => { try { await unduh(data()); } catch (e) { toast(e.message); } });
}
