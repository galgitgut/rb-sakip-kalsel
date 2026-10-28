// Admin · Master Indikator (RB General & RB Tematik)
import * as db from '../data/store.js';
import { esc, fmtNum } from '../util.js';
import { pageHead, editIndikatorDialog } from './shared.js';
import { pdNama } from '../calc.js';

let tab = 'general';

export function render(el, ctx) {
  const list = db.where('indikator', (i) => i.jenis === tab);
  const gen = db.where('indikator', (i) => i.jenis === 'general');
  const nTarget = gen.filter((i) => i.target === null).length;
  const nBase = gen.filter((i) => i.baseline === null).length;
  const nPeng = gen.filter((i) => !i.pengampu.length).length;
  const nBagi = gen.filter((i) => i.pengampu.length > 1).length;
  let prev = '';

  el.innerHTML = `
  ${pageHead('Admin · Langkah 2', `Master Indikator RB ${db.meta().tahun || ''}`, 'Target, baseline, dan satuan diisi manual oleh admin atau PD pengampu yang diberi hak.',
    '<button class="btn" id="btn-add">+ Tambah indikator</button>')}
  <div class="tabs" role="group" aria-label="Jenis RB">
    <button type="button" data-tab="general" aria-pressed="${tab === 'general'}">RB General · ${gen.length} indikator</button>
    <button type="button" data-tab="tematik" aria-pressed="${tab === 'tematik'}">RB Tematik · ${new Set(db.where('indikator', (i) => i.jenis === 'tematik').map((i) => i.tema)).size} tema</button>
  </div>
  ${tab === 'general' ? `<div class="inline small">
    <span class="badge b-green">Semua · ${gen.length}</span>
    <span class="badge b-wait">Tanpa target · ${nTarget}</span>
    <span class="badge b-wait">Tanpa baseline · ${nBase}</span>
    <span class="badge b-wait">Tanpa pengampu · ${nPeng}</span>
    <span class="badge b-ok">Dibagi · ${nBagi}</span></div>`
    : '<div class="note warn"><b>Konsep sementara.</b> RB Tematik akan dikonfirmasi ulang. Hilirisasi sementara diampu Bappeda dan Dinas Perindustrian.</div>'}
  <div class="card flush"><div class="table-wrap"><table class="t" style="min-width:960px">
    <thead><tr><th>No</th><th>Indikator</th><th>Satuan</th><th>Target</th><th>Baseline</th><th>Pengampu</th><th>Rencana aksi</th><th><span class="sr-only">Aksi</span></th></tr></thead>
    <tbody>
    ${list.map((i, n) => {
      const head = i.kelompok !== prev; prev = i.kelompok;
      const tags = db.where('tag', (t) => t.indikatorId === i.id);
      const ok = tags.filter((t) => t.status === 'disetujui').length;
      const shared = i.pengampu.length > 1;
      const warn = [!i.pengampu.length ? 'Belum ada pengampu' : '', shared ? `Dibagi ${i.pengampu.length} PD` : '', i.id === 'G10' ? 'Cek satuan: target 0,98 vs baseline 4' : ''].filter(Boolean).join(' · ');
      return `${head ? `<tr class="group"><td colspan="8">${esc(i.kelompok)}${i.sasaran ? ` <span class="muted" style="font-weight:400">· Sasaran: ${esc(i.sasaran)}</span>` : ''}</td></tr>` : ''}
      <tr>
        <td class="num muted">${tab === 'general' ? i.no : n + 1}</td>
        <td>${esc(i.nama)}${warn ? `<div class="xs bold" style="color:${shared ? 'var(--blue-text)' : 'var(--orange-text)'}">${warn}</div>` : ''}</td>
        <td>${i.satuan ? esc(i.satuan) : '<span class="muted">—</span>'}</td>
        <td class="num bold">${i.target === null ? '<span class="badge b-wait">Belum diisi</span>' : fmtNum(i.target)}</td>
        <td class="num">${i.baseline === null ? '<span class="xs muted">Belum diisi</span>' : fmtNum(i.baseline)}</td>
        <td>${i.pengampu.length ? i.pengampu.map((p) => `<span class="pill-pd ${shared ? 'shared' : ''}">${esc(pdNama(p))}</span>`).join('') : '<span class="pill-pd none">Belum ditentukan</span>'}</td>
        <td class="num">${ok}<span class="muted"> / ${tags.length}</span></td>
        <td><button class="btn secondary small" data-edit="${i.id}">Ubah</button></td>
      </tr>`;
    }).join('')}
    </tbody></table></div></div>`;

  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; ctx.rerender(); }));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editIndikatorDialog(db.get('indikator', b.dataset.edit), { full: true, onSaved: ctx.rerender })));
  el.querySelector('#btn-add').addEventListener('click', () => {
    const k = list[0]?.kelompok || '';
    editIndikatorDialog({ jenis: tab, kelompok: k, tema: tab === 'tematik' ? k : undefined, nama: '', satuan: '', target: null, baseline: null, pengampu: [], pembagian: [] }, { full: true, onSaved: ctx.rerender });
  });
}
