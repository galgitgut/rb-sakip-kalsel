// Admin · Ekspor ke template KemenPANRB (per indikator, per tema, semua General, semua Tematik).
import * as db from '../data/store.js';
import { esc, fmtNum, fmtDate, toast, today } from '../util.js';
import { pageHead } from './shared.js';
import * as XL from '../excel.js';

let mode = 0;
let selGen = null;
let selTema = null;

const MODES = [
  { tag: 'RB GENERAL', title: 'Per indikator', desc: 'Satu file untuk satu indikator, siap diunggah di halaman indikator tersebut di portal RB.' },
  { tag: 'RB TEMATIK', title: 'Per tema', desc: 'Satu file untuk satu tema, format template RB Tematik lengkap 41 kolom termasuk kolom ID.' },
  { tag: 'RB GENERAL', title: 'Semua indikator', desc: 'Satu ZIP berisi file per indikator ditambah satu workbook rekap.' },
  { tag: 'RB TEMATIK', title: 'Semua tema', desc: 'Satu file template RB Tematik berisi seluruh tema.' },
];

async function tandai(id, field) {
  const cur = db.get('eksporStatus', id) || { id };
  await db.save('eksporStatus', { ...cur, [field]: field === 'diunggah' ? !cur.diunggah : today() });
}

export function render(el, ctx) {
  const tahun = db.meta().tahun;
  const gen = db.where('indikator', (i) => i.jenis === 'general');
  const temas = [...new Set(db.where('indikator', (i) => i.jenis === 'tematik').map((i) => i.tema))];
  if (!selGen) selGen = gen[0]?.id;
  if (!selTema) selTema = temas[0];

  let cols; let rows; let file; let picker = '';
  if (mode === 0 || mode === 2) {
    cols = ['rencana_aksi', 'satuan_output', 'indikator_output', 'target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'target_total', 'anggaran_total', 'pelaksana', 'koordinator'];
    rows = XL.generalRows(mode === 0 ? selGen : gen[0].id);
    const ind = db.get('indikator', selGen);
    file = mode === 0 ? `RB_General_${tahun}_${XL.slug(ind.nama)}.xlsx` : `RB_General_${tahun}_semua_indikator.zip`;
    if (mode === 0) picker = `<label class="field" style="flex-direction:row;align-items:center;gap:8px">Indikator<select id="pick">${gen.map((i) => `<option value="${i.id}" ${i.id === selGen ? 'selected' : ''}>${i.no}. ${esc(i.nama)}</option>`).join('')}</select></label>`;
  } else {
    cols = XL.tematikKolom();
    rows = XL.tematikRows(mode === 1 ? selTema : null);
    file = mode === 1 ? `RB_Tematik_${tahun}_${XL.slug(selTema)}.xlsx` : `RB_Tematik_${tahun}_semua_tema.xlsx`;
    if (mode === 1) picker = `<label class="field" style="flex-direction:row;align-items:center;gap:8px">Tema<select id="pick">${temas.map((t) => `<option ${t === selTema ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  }
  const preview = rows.slice(0, 5);
  const stRows = [
    ...gen.map((i) => ({ id: i.id, nama: `${i.no}. ${i.nama}`, n: XL.generalRows(i.id).length })),
    ...temas.map((t) => ({ id: `tema:${t}`, nama: `Tema · ${t}`, n: XL.tematikRows(t).length })),
  ];

  el.innerHTML = `
  ${pageHead('Admin · Langkah 6', 'Ekspor ke Template KemenPANRB', 'File mengikuti kolom template resmi dan hanya berisi rencana aksi yang sudah disetujui. Unggah manual di portal RB pada halaman indikator atau tema yang sama.')}
  <div class="grid-auto" style="--min:220px" role="radiogroup" aria-label="Cara ekspor">
    ${MODES.map((m, i) => `<button type="button" role="radio" aria-checked="${i === mode}" data-mode="${i}" class="card pad-s" style="text-align:left;cursor:pointer;gap:6px;border:2px solid ${i === mode ? 'var(--primary)' : 'var(--line)'};background:${i === mode ? 'var(--primary-tint)' : '#fff'}">
      <span class="xs bold" style="color:var(--primary)">${m.tag}</span><b style="font-size:16px">${m.title}</b><span class="small muted">${m.desc}</span></button>`).join('')}
  </div>
  <section class="card" aria-labelledby="h-prev">
    <div class="inline between" style="align-items:flex-end"><div class="stack" style="gap:2px"><h2 id="h-prev">Pratinjau isi file</h2><span class="small muted num">${esc(file)} · ${rows.length} baris${mode === 2 ? ' (contoh: indikator pertama)' : ''}</span></div>
      <div class="inline">${picker}<button class="btn" id="btn-dl">Unduh ${mode === 2 ? '.zip' : '.xlsx'}</button></div></div>
    <div class="table-wrap" style="border:1px solid var(--line);border-radius:10px"><table class="t" style="min-width:1000px;font-size:13px">
      <thead><tr>${cols.slice(0, mode % 2 ? 26 : 11).map((c) => `<th class="mono" style="text-transform:none;letter-spacing:0">${esc(c)}</th>`).join('')}${mode % 2 ? '<th>…</th>' : ''}</tr></thead>
      <tbody>${preview.length ? preview.map((r) => `<tr>${cols.slice(0, mode % 2 ? 26 : 11).map((c) => `<td style="max-width:260px">${esc(typeof r[c] === 'number' ? fmtNum(r[c]) : (r[c] ?? '').toString().slice(0, 140))}</td>`).join('')}${mode % 2 ? '<td>…</td>' : ''}</tr>`).join('')
        : `<tr><td colspan="12" class="empty">Belum ada rencana aksi yang disetujui untuk pilihan ini.</td></tr>`}</tbody></table></div>
    <p class="xs muted" style="margin:0">${mode % 2 ? `Template Tematik berisi ${cols.length} kolom; pratinjau menampilkan sebagian. Sheet PETUNJUK, MASTER TEMA, MASTER FOKUS INTERVENSI, dan _META ikut disertakan. Kolom *_id dibawa apa adanya agar unggahan memperbarui baris yang sama.` : 'Kolom persis template "RB General – Rencana Aksi". Template General tidak punya kolom indikator, karena itu ekspor semua indikator dipecah per file.'}${rows.length > 5 ? ` Ditampilkan 5 dari ${rows.length} baris.` : ''}</p>
  </section>
  <section class="card" aria-labelledby="h-st">
    <h2 id="h-st">Status ekspor & unggah per indikator</h2>
    <div class="table-wrap"><table class="t" style="min-width:640px"><thead><tr><th>Indikator / tema</th><th>Rencana aksi disetujui</th><th>Terakhir diunduh</th><th>Sudah diunggah ke portal</th></tr></thead>
    <tbody>${stRows.map((s) => {
      const st = db.get('eksporStatus', s.id) || {};
      return `<tr><td>${esc(s.nama)}</td><td class="num">${s.n ? s.n : '<span class="badge b-wait">0</span>'}</td><td class="small">${st.diunduh ? fmtDate(st.diunduh) : '—'}</td>
        <td><label class="inline small" style="gap:8px"><input type="checkbox" data-up="${esc(s.id)}" ${st.diunggah ? 'checked' : ''} style="width:18px;height:18px">${st.diunggah ? 'Sudah' : 'Belum'}</label></td></tr>`;
    }).join('')}</tbody></table></div>
  </section>`;

  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = Number(b.dataset.mode); ctx.rerender(); }));
  el.querySelector('#pick')?.addEventListener('change', (e) => { if (mode === 0) selGen = e.target.value; else selTema = e.target.value; ctx.rerender(); });
  el.querySelectorAll('[data-up]').forEach((c) => c.addEventListener('change', async () => { await tandai(c.dataset.up, 'diunggah'); ctx.rerender(); }));
  el.querySelector('#btn-dl').addEventListener('click', async () => {
    try {
      if (mode === 0) { await XL.downloadWorkbook(XL.generalWorkbook(selGen), file); await tandai(selGen, 'diunduh'); }
      if (mode === 1) { await XL.downloadWorkbook(XL.tematikWorkbook(selTema), file); await tandai(`tema:${selTema}`, 'diunduh'); }
      if (mode === 2) { await XL.downloadSemuaGeneral(tahun); for (const i of gen) await tandai(i.id, 'diunduh'); }
      if (mode === 3) { await XL.downloadWorkbook(XL.tematikWorkbook(null), file); for (const t of temas) await tandai(`tema:${t}`, 'diunduh'); }
      toast('File diunduh'); ctx.rerender();
    } catch (e) { toast(e.message); }
  });
}
