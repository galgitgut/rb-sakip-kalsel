// PD Pengampu · Tagging sub kegiatan ke indikator RB General.
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, badge, parseNum, toast, today } from '../util.js';
import { pageHead, editIndikatorDialog } from './shared.js';
import { indikatorLainUntukSubkeg } from '../calc.js';

let selInd = null;
let selSk = null;
let modeDraft = null; // pilihan mode anggaran yang belum disimpan
const picked = new Set(); // sub kegiatan yang dicentang untuk diajukan sekaligus

export function render(el, ctx) {
  const pdId = ctx.user.pdId;
  const aks = db.where('akses', (a) => a.pdId === pdId && a.tag);
  const inds = aks.map((a) => db.get('indikator', a.indikatorId)).filter((i) => i && i.jenis === 'general');
  const adaTematik = aks.some((a) => db.get('indikator', a.indikatorId)?.jenis === 'tematik');

  if (!inds.length) {
    el.innerHTML = `${pageHead('PD Pengampu · Langkah 3', 'Tagging Sub Kegiatan', '')}
      <div class="note info">Akun ini belum diberi hak men-tag indikator RB General.${adaTematik ? ' Silakan isi rencana aksi di menu <a href="#/rb-tematik/isian">RB Tematik</a>.' : ' Hubungi admin Biro Organisasi.'}</div>`;
    return;
  }
  if (!inds.some((i) => i.id === selInd)) { selInd = inds[0].id; selSk = null; picked.clear(); }
  const ind = db.get('indikator', selInd);
  const akses = aks.find((a) => a.indikatorId === selInd);
  const sks = db.where('subkegiatan', (s) => s.pdId === pdId);
  if (!sks.some((s) => s.id === selSk)) selSk = sks[0]?.id || null;
  const tagOf = (skId) => db.where('tag', (t) => t.indikatorId === selInd && t.subkegiatanId === skId && t.pdId === pdId)[0] || null;
  const sk = db.get('subkegiatan', selSk);
  const tag = sk ? tagOf(sk.id) : null;
  const mode = modeDraft || tag?.anggaranMode || 'pagu';
  const lain = sk ? indikatorLainUntukSubkeg(sk.id, selInd) : [];
  const bisaPilih = (s) => { const t = tagOf(s.id); return !t || t.status === 'draf' || t.status === 'dikembalikan'; };
  const pilihan = sks.filter(bisaPilih);
  for (const id of [...picked]) if (!pilihan.some((s) => s.id === id)) picked.delete(id);
  const bagianSaya = ind.pembagian.filter((b) => b.pdId === pdId);

  el.innerHTML = `
  ${pageHead('PD Pengampu · Langkah 3', 'Tagging Sub Kegiatan', 'Pilih indikator yang Anda ampu, lalu tandai sub kegiatan yang menjadi rencana aksinya. Data sub kegiatan berasal dari Sinergi.')}
  <div class="inline" role="group" aria-label="Indikator yang diampu">
    ${inds.map((i) => {
      const n = db.where('tag', (t) => t.indikatorId === i.id && t.pdId === pdId).length;
      return `<button type="button" class="chip" data-ind="${i.id}" aria-pressed="${i.id === selInd}">${esc(i.nama.length > 46 ? i.nama.slice(0, 44) + '…' : i.nama)} · ${n}</button>`;
    }).join('')}
  </div>
  ${adaTematik ? '<div class="note info small">Akun ini juga mengampu RB Tematik. Rencana aksi Tematik diisi di menu <a href="#/rb-tematik/isian">RB Tematik → Isian</a>.</div>' : ''}
  <section class="inline" style="gap:12px;align-items:stretch" aria-label="Indikator terpilih">
    <div class="card" style="flex:3 1 360px;background:var(--primary);border-color:var(--primary);color:#fff;gap:4px;padding:16px 20px">
      <span class="xs bold" style="color:#CFE3DA">RB GENERAL · ${esc(ind.kelompok.toUpperCase())}</span>
      <b style="font-size:20px;line-height:28px">${esc(ind.nama)}</b>
      ${ind.pengampu.length > 1 ? `<span class="small" style="color:#CFE3DA">Indikator dibagi. Bagian Anda: ${bagianSaya.map((b) => esc(b.bagian)).join(', ') || '—'}</span>` : ''}
    </div>
    <div class="tile" style="flex:1 1 130px"><span class="k">Target ${db.meta().tahun}</span><span class="v" style="font-size:22px;color:${ind.target === null ? 'var(--orange-text)' : 'inherit'}">${ind.target === null ? 'Belum diisi' : fmtNum(ind.target)} <span class="small muted">${esc(ind.satuan)}</span></span></div>
    <div class="tile" style="flex:1 1 130px"><span class="k">Baseline</span><span class="v" style="font-size:22px">${ind.baseline === null ? '—' : fmtNum(ind.baseline)}</span></div>
    ${akses.isiTarget ? '<button type="button" class="btn outline" id="btn-target" style="flex:0 1 180px;min-height:auto">Isi / ubah target, baseline, satuan</button>' : ''}
  </section>
  <div class="row">
    <section class="card flush col-main" aria-label="Sub kegiatan dari Sinergi"><div class="table-wrap"><table class="t" style="min-width:720px">
      <thead><tr><th style="width:44px"><input type="checkbox" id="chk-all" aria-label="Pilih semua sub kegiatan yang belum di-tag" ${pilihan.length && pilihan.every((x) => picked.has(x.id)) ? 'checked' : ''} ${pilihan.length ? '' : 'disabled'} style="width:20px;height:20px"></th><th>Sub kegiatan & indikator output (Sinergi)</th><th>Target TW1–TW4</th><th>Pagu</th><th>Status</th></tr></thead>
      <tbody>${sks.map((s) => {
        const t = tagOf(s.id);
        const other = indikatorLainUntukSubkeg(s.id, selInd);
        return `<tr class="clickable ${s.id === selSk ? 'sel' : ''}" data-sk="${s.id}" tabindex="0">
          <td>${bisaPilih(s) ? `<input type="checkbox" data-pick="${s.id}" ${picked.has(s.id) ? 'checked' : ''} aria-label="Pilih ${esc(s.nama)}" style="width:20px;height:20px">` : ''}</td>
          <td><div class="xs muted num">${esc(s.kode)}</div><b>${esc(s.nama)}</b><div class="small" style="color:#3F4A45">${esc(s.indikatorOutput)} (${esc(s.satuan)})</div>
            ${other.length ? `<div class="xs bold" style="color:var(--blue-text)">Juga di-tag ke: ${other.map((o) => esc(o.nama)).join(', ')}</div>` : ''}</td>
          <td class="num small">${s.target.map((x) => fmtNum(x)).join(' · ')}</td>
          <td class="num small">${fmtRp(s.pagu)}</td>
          <td>${badge(t ? t.status : 'none')}</td></tr>`;
      }).join('')}</tbody></table></div>
      ${picked.size ? `<div class="bulkbar" role="region" aria-label="Aksi untuk sub kegiatan terpilih">
        <span><b>${picked.size} sub kegiatan dipilih</b> · anggaran memakai pagu penuh (ubah per baris lewat panel kanan bila perlu)</span>
        <span class="inline"><button type="button" class="btn secondary small" id="bulk-draf">Simpan draf</button><button type="button" class="btn small" id="bulk-ajukan" style="background:#fff;color:var(--primary-dark)">Tag & ajukan verifikasi (${picked.size})</button><button type="button" class="btn small" id="bulk-batal" style="background:transparent;border-color:#5E8A7C">Batal pilih</button></span>
      </div>` : ''}
    </section>
    ${sk ? `<aside class="card focus col-side" aria-label="Panel tag">
      <div class="stack" style="gap:4px"><span class="xs bold" style="color:var(--primary)">TAG KE: ${esc(ind.nama.toUpperCase())}</span>
        <h2 style="font-size:17px;line-height:24px">${esc(sk.nama)}</h2><span class="small muted">${esc(sk.indikatorOutput)} (${esc(sk.satuan)})</span></div>
      ${tag?.status === 'dikembalikan' ? `<div class="note warn small"><b>Dikembalikan admin:</b> ${esc(tag.catatan || '—')}</div>` : ''}
      ${tag?.status === 'disetujui' ? '<div class="note ok small">Tag ini sudah disetujui. Perubahan akan diajukan ulang untuk verifikasi.</div>' : ''}
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px">${sk.target.map((v, i) => `<span class="box" style="text-align:center;padding:8px 4px"><span class="xs muted">TW ${i + 1}</span><br><b>${fmtNum(v)}</b></span>`).join('')}</div>
      <span class="xs muted">Target per triwulan dikunci dari Sinergi.</span>
      <form id="f-tag" class="stack" style="gap:12px">
        ${bagianSaya.length ? `<label class="field">Bagian indikator (pembagian)<select name="bagian">${bagianSaya.map((b) => `<option ${tag?.bagian === b.bagian ? 'selected' : ''}>${esc(b.bagian)}</option>`).join('')}</select></label>` : ''}
        <label class="field">Narasi rencana aksi (opsional)<textarea name="narasi" rows="3" placeholder="Kosongkan untuk memakai nama sub kegiatan sebagai rencana aksi">${esc(tag?.narasi || '')}</textarea></label>
        <div class="stack" style="gap:8px"><span class="field" style="gap:0">Anggaran rencana aksi</span>
          <div class="seg" role="group" aria-label="Sumber anggaran">
            <button type="button" data-mode="pagu" aria-pressed="${mode === 'pagu'}">Pagu penuh (Sinergi)</button>
            <button type="button" data-mode="manual" aria-pressed="${mode === 'manual'}">Isian manual</button>
          </div>
          ${mode === 'pagu' ? `<div class="box bold num">${fmtRp(sk.pagu)}</div>`
            : `<label class="field">Nilai anggaran yang relevan (Rp)<input name="manual" inputmode="numeric" value="${tag?.anggaranManual ?? ''}" placeholder="mis. 500.000.000"><span class="hint">Maksimal ${fmtRp(sk.pagu)} (pagu sub kegiatan)</span></label>`}
          ${lain.length && mode === 'pagu' ? `<div class="note info small">Sub kegiatan ini juga di-tag ke ${lain.map((o) => esc(o.nama)).join(', ')}. Dengan pagu penuh, anggarannya terhitung lebih dari sekali di laporan per indikator — pertimbangkan isian manual.</div>` : ''}
        </div>
        <div class="inline">
          <button class="btn" type="submit" value="diajukan" style="flex:1 1 140px">Ajukan verifikasi</button>
          <button class="btn secondary" type="submit" value="draf" style="flex:1 1 100px">Simpan draf</button>
          ${tag ? '<button class="btn danger" type="button" id="btn-lepas" style="flex:1 1 100px">Lepas tag</button>' : ''}
        </div>
      </form>
    </aside>` : '<aside class="card col-side"><p class="empty">Belum ada sub kegiatan PD ini di data Sinergi.</p></aside>'}
  </div>`;

  el.querySelectorAll('[data-ind]').forEach((b) => b.addEventListener('click', () => { selInd = b.dataset.ind; modeDraft = null; ctx.rerender(); }));
  el.querySelectorAll('[data-sk]').forEach((r) => {
    const go = () => { selSk = r.dataset.sk; modeDraft = null; ctx.rerender(); };
    r.addEventListener('click', (e) => { if (e.target.closest('input')) return; go(); });
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  el.querySelectorAll('[data-pick]').forEach((c) => c.addEventListener('change', () => { c.checked ? picked.add(c.dataset.pick) : picked.delete(c.dataset.pick); ctx.rerender(); }));
  el.querySelector('#chk-all')?.addEventListener('change', (e) => { pilihan.forEach((x) => (e.target.checked ? picked.add(x.id) : picked.delete(x.id))); ctx.rerender(); });
  el.querySelector('#bulk-batal')?.addEventListener('click', () => { picked.clear(); ctx.rerender(); });
  const bulk = async (status) => {
    const docs = [...picked].map((skId) => {
      const lama = tagOf(skId);
      return { ...(lama || { jenis: 'general', indikatorId: selInd, pdId, subkegiatanId: skId, permasalahanId: null, fokus: null, narasi: '', anggaranMode: 'pagu', anggaranManual: null }),
        bagian: lama?.bagian || bagianSaya[0]?.bagian || '', status, catatan: status === 'diajukan' ? '' : (lama?.catatan || ''), diajukan: today() };
    });
    await db.saveMany('tag', docs);
    toast(status === 'diajukan' ? `${docs.length} sub kegiatan diajukan untuk verifikasi` : `${docs.length} draf disimpan`);
    picked.clear(); ctx.rerender();
  };
  el.querySelector('#bulk-ajukan')?.addEventListener('click', () => bulk('diajukan'));
  el.querySelector('#bulk-draf')?.addEventListener('click', () => bulk('draf'));
  el.querySelector('#btn-target')?.addEventListener('click', () => editIndikatorDialog(ind, { onSaved: ctx.rerender }));
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { modeDraft = b.dataset.mode; ctx.rerender(); }));
  el.querySelector('#btn-lepas')?.addEventListener('click', async () => {
    if (!confirm('Lepas tag sub kegiatan ini dari indikator?')) return;
    await db.remove('tag', tag.id); modeDraft = null; toast('Tag dilepas'); ctx.rerender();
  });
  el.querySelector('#f-tag')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const status = e.submitter?.value || 'diajukan';
    let manual = null;
    if (mode === 'manual') {
      manual = parseNum(fd.get('manual'));
      if (manual === null || manual < 0) { toast('Isi nilai anggaran manual.'); return; }
      if (manual > sk.pagu) { toast('Anggaran manual melebihi pagu sub kegiatan.'); return; }
    }
    await db.save('tag', {
      ...(tag || { jenis: 'general', indikatorId: selInd, pdId, subkegiatanId: sk.id, permasalahanId: null, fokus: null }),
      bagian: fd.get('bagian') || '', narasi: (fd.get('narasi') || '').trim(), anggaranMode: mode, anggaranManual: manual,
      status, catatan: status === 'diajukan' ? '' : (tag?.catatan || ''), diajukan: today(),
    });
    modeDraft = null;
    toast(status === 'diajukan' ? 'Diajukan untuk verifikasi' : 'Draf disimpan');
    ctx.rerender();
  });
}
