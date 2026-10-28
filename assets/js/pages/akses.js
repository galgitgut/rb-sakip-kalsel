// Admin · Hak akses akun PD & pembagian indikator yang diampu lebih dari satu PD.
import * as db from '../data/store.js';
import { esc, toast, parseNum } from '../util.js';
import { pageHead } from './shared.js';
import { pdNama } from '../calc.js';

let selPd = null;

export function render(el, ctx) {
  const pds = db.all('pd');
  if (!selPd) selPd = pds[0].id;
  const pd = db.get('pd', selPd);
  const aks = db.where('akses', (a) => a.pdId === selPd);
  const rows = aks.map((a) => ({ a, ind: db.get('indikator', a.indikatorId) })).filter((r) => r.ind)
    .sort((x, y) => (x.ind.jenis + x.ind.id).localeCompare(y.ind.jenis + y.ind.id));
  const belum = db.where('indikator', (i) => !aks.some((a) => a.indikatorId === i.id));
  const shared = db.where('indikator', (i) => i.pengampu.length > 1);
  const pola = rows.length === 1 ? '1 PD – 1 indikator' : `1 PD – ${rows.length} indikator${rows.some((r) => r.ind.pengampu.length > 1) ? ', sebagian dibagi dengan PD lain' : ''}`;

  const toggle = (a, field, applicable) => applicable
    ? `<button type="button" class="chip" data-toggle="${esc(a.id)}" data-field="${field}" aria-pressed="${!!a[field]}">${a[field] ? 'Ya' : 'Tidak'}</button>`
    : '<span class="muted" title="Tidak berlaku">—</span>';

  el.innerHTML = `
  ${pageHead('Admin · Langkah 2', 'Hak Akses & Pembagian Indikator', 'Tentukan akun PD mana yang boleh mengisi apa. Hanya PD pengampu yang men-tag sub kegiatan.')}
  <div class="row">
    <section class="card pad-s" style="flex:1 1 260px;gap:6px" aria-label="Akun PD">
      <h2 style="font-size:16px;margin:4px 8px 8px">Akun PD (${pds.length})</h2>
      ${pds.map((p) => {
        const n = db.where('akses', (a) => a.pdId === p.id).length;
        return `<button type="button" class="chip" data-pd="${p.id}" aria-pressed="${p.id === selPd}" style="justify-content:space-between;border-radius:10px;min-height:44px;width:100%">${esc(p.singkatan)}<span class="xs" style="opacity:.8">${n} ind.</span></button>`;
      }).join('')}
    </section>
    <section class="card col-main" aria-labelledby="h-hak">
      <div class="inline between"><div class="stack" style="gap:2px"><h2 id="h-hak">${esc(pd.nama)}</h2><span class="small muted">Pola: ${pola}</span></div></div>
      <div class="table-wrap"><table class="t" style="min-width:640px">
        <thead><tr><th>Indikator</th><th>Isi target & baseline</th><th>Tag sub kegiatan</th><th>Isi Tematik</th><th><span class="sr-only">Hapus</span></th></tr></thead>
        <tbody>${rows.length ? rows.map(({ a, ind }) => {
          const sh = ind.pengampu.length > 1;
          return `<tr><td>${esc(ind.jenis === 'tematik' ? `Tematik · ${ind.tema} — ${ind.nama}` : ind.nama)}${sh ? '<div class="xs bold" style="color:var(--blue-text)">Dibagi — target diisi admin</div>' : ''}</td>
            <td>${toggle(a, 'isiTarget', !sh)}</td><td>${toggle(a, 'tag', true)}</td><td>${toggle(a, 'isiTematik', ind.jenis === 'tematik')}</td>
            <td><button class="btn danger small" data-del="${esc(a.id)}" aria-label="Cabut akses ${esc(ind.nama)}">Cabut</button></td></tr>`;
        }).join('') : '<tr><td colspan="5" class="empty">Belum ada indikator untuk akun ini.</td></tr>'}</tbody></table></div>
      <form id="f-add" class="inline" style="align-items:flex-end">
        <label class="field" style="flex:1 1 320px">Tambahkan indikator ke akun ini
          <select name="ind">${belum.map((i) => `<option value="${i.id}">${esc(i.jenis === 'tematik' ? `Tematik · ${i.tema} — ${i.nama}` : `${i.no}. ${i.nama}`)}</option>`).join('')}</select></label>
        <button class="btn outline" type="submit">Tambahkan</button>
      </form>
      <p class="xs muted" style="margin:0">Menambahkan indikator di sini juga menjadikan PD ini pengampu indikator tersebut.</p>
    </section>
  </div>

  <section class="card" aria-labelledby="h-bagi">
    <div class="stack" style="gap:4px"><h2 id="h-bagi">Indikator yang dibagi</h2>
      <p class="small muted" style="margin:0">Setiap PD men-tag sub kegiatan untuk bagiannya. Ekspor tetap satu file per indikator.</p></div>
    <div class="row" style="gap:16px">
      ${shared.map((ind) => `<form class="card pad-s" data-bagi="${ind.id}" style="flex:1 1 420px">
        <div class="inline between"><b style="font-size:16px">${esc(ind.nama)}</b><span class="badge b-wait">Sementara</span></div>
        <div class="stack" style="gap:8px">
          ${(ind.pembagian.length ? ind.pembagian : [{ bagian: '', bobot: null, pdId: ind.pengampu[0] }]).map((b, k) => `
          <div class="inline" style="gap:8px;flex-wrap:nowrap">
            <input aria-label="Nama bagian" name="bagian" value="${esc(b.bagian)}" placeholder="Nama bagian" style="flex:2 1 0;min-width:0;min-height:40px;padding:0 10px;border:1px solid #C5D3CC;border-radius:8px">
            <input aria-label="Bobot (%)" name="bobot" value="${b.bobot ?? ''}" placeholder="%" inputmode="decimal" style="flex:0 0 60px;min-height:40px;padding:0 8px;border:1px solid #C5D3CC;border-radius:8px">
            <select aria-label="PD" name="pdId" style="flex:1 1 0;min-width:0;min-height:40px;border:1px solid #C5D3CC;border-radius:8px;background:#fff">${ind.pengampu.map((p) => `<option value="${p}" ${p === b.pdId ? 'selected' : ''}>${esc(pdNama(p))}</option>`).join('')}</select>
            <button type="button" class="btn danger small" data-rm="${k}" aria-label="Hapus bagian">×</button>
          </div>`).join('')}
        </div>
        <div class="inline between"><button type="button" class="btn secondary small" data-addrow>+ Tambah bagian</button><button class="btn small" type="submit">Simpan pembagian</button></div>
      </form>`).join('') || '<p class="muted">Tidak ada indikator dengan lebih dari satu pengampu.</p>'}
    </div>
  </section>`;

  el.querySelectorAll('[data-pd]').forEach((b) => b.addEventListener('click', () => { selPd = b.dataset.pd; ctx.rerender(); }));
  el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    const a = db.get('akses', b.dataset.toggle);
    await db.save('akses', { ...a, [b.dataset.field]: !a[b.dataset.field] });
    ctx.rerender();
  }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const a = db.get('akses', b.dataset.del);
    const ind = db.get('indikator', a.indikatorId);
    if (!confirm(`Cabut akses ${pd.singkatan} dari "${ind.nama}"? PD ini juga dikeluarkan dari daftar pengampu.`)) return;
    await db.remove('akses', a.id);
    await db.save('indikator', { ...ind, pengampu: ind.pengampu.filter((p) => p !== selPd) });
    toast('Akses dicabut'); ctx.rerender();
  }));
  el.querySelector('#f-add')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = new FormData(e.target).get('ind');
    if (!id) return;
    const ind = db.get('indikator', id);
    const pengampu = [...new Set([...ind.pengampu, selPd])];
    await db.save('indikator', { ...ind, pengampu });
    await db.save('akses', { id: `${selPd}|${id}`, pdId: selPd, indikatorId: id, isiTarget: pengampu.length === 1, tag: true, isiTematik: ind.jenis === 'tematik' });
    toast('Indikator ditambahkan'); ctx.rerender();
  });
  el.querySelectorAll('[data-bagi]').forEach((form) => {
    const ind = db.get('indikator', form.dataset.bagi);
    const read = () => {
      const fd = new FormData(form);
      const b = fd.getAll('bagian'); const w = fd.getAll('bobot'); const p = fd.getAll('pdId');
      return b.map((x, i) => ({ bagian: x.trim(), bobot: parseNum(w[i]), pdId: p[i] }));
    };
    form.querySelector('[data-addrow]').addEventListener('click', async () => {
      await db.save('indikator', { ...ind, pembagian: [...read(), { bagian: '', bobot: null, pdId: ind.pengampu[0] }] }); ctx.rerender();
    });
    form.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
      const list = read(); list.splice(Number(b.dataset.rm), 1);
      await db.save('indikator', { ...ind, pembagian: list }); ctx.rerender();
    }));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const list = read().filter((x) => x.bagian);
      const tot = list.reduce((s, x) => s + (x.bobot || 0), 0);
      await db.save('indikator', { ...ind, pembagian: list });
      toast(tot && tot !== 100 ? `Disimpan. Catatan: total bobot ${tot}%, bukan 100%.` : 'Pembagian disimpan');
      ctx.rerender();
    });
  });
}
