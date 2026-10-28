// Komponen yang dipakai beberapa halaman.
import * as db from '../data/store.js';
import { esc, fmtNum, parseNum, openDialog, toast } from '../util.js';

export function pageHead(eyebrow, title, desc, actions = '') {
  return `<div class="page-head"><div class="t"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${actions ? `<div class="inline">${actions}</div>` : ''}</div>`;
}

// Dialog ubah indikator. full=true untuk admin (bisa ubah nama & pengampu).
export function editIndikatorDialog(ind, { full = false, onSaved } = {}) {
  const pds = db.all('pd');
  const isNew = !ind.id;
  const kelompokList = [...new Set(db.where('indikator', (i) => i.jenis === (ind.jenis || 'general')).map((i) => i.kelompok))];
  openDialog(`<form method="dialog" class="dlg">
    <h2>${isNew ? 'Tambah indikator' : 'Ubah indikator'}</h2>
    ${full ? `<label class="field">Nama indikator<input name="nama" required value="${esc(ind.nama)}"></label>
      <label class="field">${ind.jenis === 'tematik' ? 'Tema' : 'Kelompok (sub komponen)'}
        <select name="kelompok">${kelompokList.map((k) => `<option ${k === ind.kelompok ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>`
      : `<div class="box"><b>${esc(ind.nama)}</b></div>`}
    <div class="inline" style="gap:12px;align-items:flex-start">
      <label class="field" style="flex:1 1 120px">Satuan<input name="satuan" value="${esc(ind.satuan)}" placeholder="mis. Indeks, %"></label>
      <label class="field" style="flex:1 1 120px">Target ${db.meta().tahun || ''}<input name="target" inputmode="decimal" value="${esc(fmtNum(ind.target, 4))}"></label>
      <label class="field" style="flex:1 1 120px">Baseline<input name="baseline" inputmode="decimal" value="${esc(fmtNum(ind.baseline, 4))}"></label>
    </div>
    ${full ? `<fieldset class="field" style="border:1px solid var(--line);border-radius:10px;padding:12px"><legend style="padding:0 6px">PD pengampu</legend>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;font-weight:400;color:var(--ink)">
      ${pds.map((p) => `<label class="inline small" style="gap:8px"><input type="checkbox" name="pengampu" value="${p.id}" ${ind.pengampu?.includes(p.id) ? 'checked' : ''} style="width:18px;height:18px">${esc(p.singkatan)}</label>`).join('')}
      </div></fieldset>` : ''}
    <p class="xs muted" style="margin:0">Gunakan koma untuk desimal, mis. 2,5.</p>
    <div class="inline" style="justify-content:flex-end"><button class="btn secondary" value="batal" formnovalidate>Batal</button><button class="btn" value="simpan">Simpan</button></div>
  </form>`, async (fd) => {
    const doc = { ...ind, satuan: fd.get('satuan').trim(), target: parseNum(fd.get('target')), baseline: parseNum(fd.get('baseline')) };
    if (isNew) doc.id = `${doc.jenis === 'tematik' ? 'T' : 'G'}${Date.now().toString(36)}`;
    if (full) {
      doc.nama = fd.get('nama').trim();
      doc.kelompok = fd.get('kelompok');
      if (doc.jenis === 'tematik') doc.tema = doc.kelompok;
      doc.pengampu = fd.getAll('pengampu');
      // hak akses otomatis untuk pengampu yang belum punya akses
      for (const pid of doc.pengampu) {
        if (!db.where('akses', (a) => a.pdId === pid && a.indikatorId === doc.id).length) {
          await db.save('akses', { id: `${pid}|${doc.id}`, pdId: pid, indikatorId: doc.id, isiTarget: doc.pengampu.length === 1, tag: true, isiTematik: doc.jenis === 'tematik' });
        }
      }
    }
    await db.save('indikator', doc);
    toast('Indikator disimpan');
    onSaved?.();
  });
}
