// Admin · Verifikasi tag sub kegiatan (General & Tematik).
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, fmtDate, badge, toast, today } from '../util.js';
import { pageHead } from './shared.js';
import { pdNama, anggaranTag, indikatorLainUntukSubkeg } from '../calc.js';

let fStatus = 'diajukan';
let fJenis = 'semua';
let sel = null;
const checked = new Set();

export function render(el, ctx) {
  const all = db.all('tag');
  const list = all.filter((t) => (fStatus === 'semua' || t.status === fStatus) && (fJenis === 'semua' || t.jenis === fJenis))
    .sort((a, b) => (b.diajukan || '').localeCompare(a.diajukan || ''));
  if (!list.some((t) => t.id === sel)) sel = list[0]?.id || null;
  for (const id of [...checked]) if (!list.some((t) => t.id === id)) checked.delete(id);
  const t = db.get('tag', sel);
  const sk = t ? db.get('subkegiatan', t.subkegiatanId) : null;
  const ind = t ? db.get('indikator', t.indikatorId) : null;
  const pm = t?.permasalahanId ? db.get('permasalahan', t.permasalahanId) : null;
  const lain = t && sk && t.anggaranMode === 'pagu' ? indikatorLainUntukSubkeg(sk.id, t.indikatorId) : [];
  const count = (s) => all.filter((x) => x.status === s).length;
  const label = (x) => { const i = db.get('indikator', x.indikatorId); return i ? (i.jenis === 'tematik' ? i.tema : i.nama) : '—'; };

  el.innerHTML = `
  ${pageHead('Admin · Langkah 5', 'Verifikasi Tag Sub Kegiatan', 'Hanya tag yang disetujui yang masuk Beranda publik dan file ekspor KemenPANRB.')}
  <div class="inline between">
    <div class="inline" role="group" aria-label="Filter status">
      ${[['diajukan', 'Menunggu'], ['dikembalikan', 'Dikembalikan'], ['disetujui', 'Disetujui'], ['draf', 'Draf PD'], ['semua', 'Semua']].map(([k, l]) =>
        `<button type="button" class="chip" data-st="${k}" aria-pressed="${fStatus === k}">${l} · ${k === 'semua' ? all.length : count(k)}</button>`).join('')}
    </div>
    <div class="seg" role="group" aria-label="Jenis RB" style="min-width:280px">
      ${[['semua', 'Semua'], ['general', 'General'], ['tematik', 'Tematik']].map(([k, l]) => `<button type="button" data-jn="${k}" aria-pressed="${fJenis === k}">${l}</button>`).join('')}
    </div>
  </div>
  ${fStatus === 'diajukan' && list.length ? `<div class="inline"><button class="btn" id="btn-bulk" ${checked.size ? '' : 'disabled'}>Setujui yang dicentang (${checked.size})</button>
    <button class="btn secondary" id="btn-all">Centang semua</button></div>` : ''}
  <div class="row">
    <section class="card flush col-main" aria-label="Daftar pengajuan"><div class="table-wrap"><table class="t" style="min-width:720px">
      <thead><tr><th><span class="sr-only">Pilih</span></th><th>PD · indikator/tema</th><th>Sub kegiatan</th><th>Anggaran</th><th>Status</th><th>Tanggal</th></tr></thead>
      <tbody>${list.length ? list.map((x) => {
        const s = db.get('subkegiatan', x.subkegiatanId);
        return `<tr class="clickable ${x.id === sel ? 'sel' : ''}" data-row="${x.id}" tabindex="0">
          <td><input type="checkbox" data-chk="${x.id}" ${checked.has(x.id) ? 'checked' : ''} ${x.status !== 'diajukan' ? 'disabled' : ''} aria-label="Pilih ${esc(s?.nama || '')}" style="width:20px;height:20px"></td>
          <td><b>${esc(pdNama(x.pdId))}</b><div class="small muted">${x.jenis === 'tematik' ? 'Tematik' : 'General'} · ${esc(label(x))}${x.bagian ? ` · ${esc(x.bagian)}` : ''}</div></td>
          <td class="small">${esc(s?.nama || '—')}</td>
          <td class="num small">${fmtRp(anggaranTag(x, s))}<div class="xs muted">${x.anggaranMode === 'manual' ? 'Isian manual' : 'Pagu penuh'}</div></td>
          <td>${badge(x.status)}</td><td class="small muted">${fmtDate(x.diajukan)}</td></tr>`;
      }).join('') : '<tr><td colspan="6" class="empty">Tidak ada data untuk filter ini.</td></tr>'}</tbody></table></div></section>
    ${t ? `<aside class="card focus col-side" aria-label="Rincian">
      <div class="stack" style="gap:4px"><span class="xs bold" style="color:var(--primary)">${t.jenis === 'tematik' ? 'RB TEMATIK' : 'RB GENERAL'} · ${esc(ind ? (ind.jenis === 'tematik' ? ind.tema : ind.nama) : '—')}</span>
        <h2 style="font-size:17px;line-height:24px">${esc(sk?.nama || '—')}</h2><span class="small muted">${esc(pdNama(t.pdId))} · ${fmtDate(t.diajukan)} · ${badge(t.status)}</span></div>
      <div class="box stack small" style="gap:6px;line-height:21px">
        ${pm ? `<span><b>Permasalahan:</b> ${esc(pm.permasalahan)}</span>` : ''}
        ${t.fokus ? `<span><b>Fokus intervensi:</b> ${esc(t.fokus)}</span>` : ''}
        ${t.bagian ? `<span><b>Bagian:</b> ${esc(t.bagian)}</span>` : ''}
        <span><b>Indikator output:</b> ${esc(sk?.indikatorOutput || '—')} (${esc(sk?.satuan || '')})</span>
        <span><b>Target TW1–TW4:</b> ${sk ? sk.target.map((v) => fmtNum(v)).join(' · ') : '—'}</span>
        <span><b>Anggaran:</b> ${fmtRp(anggaranTag(t, sk))} (${t.anggaranMode === 'manual' ? 'isian manual' : 'pagu penuh'})</span>
        <span style="white-space:pre-line"><b>Narasi:</b> ${esc(t.narasi || '—')}</span>
      </div>
      ${lain.length ? `<div class="note info small">Sub kegiatan ini juga di-tag ke ${lain.map((o) => esc(o.nama)).join(', ')} dengan pagu penuh (anggaran terhitung ganda per indikator).</div>` : ''}
      <form id="f-ver" class="stack" style="gap:12px">
        <label class="field">Catatan verifikasi <span class="hint">Wajib bila dikembalikan. Untuk Tematik ikut terekspor sebagai catatan_monev.</span>
          <textarea name="catatan" rows="3">${esc(t.catatan || '')}</textarea></label>
        <div class="inline">
          <button class="btn" type="submit" value="disetujui" style="flex:1 1 120px">Setujui</button>
          <button class="btn warn" type="submit" value="dikembalikan" style="flex:1 1 120px">Kembalikan ke PD</button>
        </div>
      </form>
    </aside>` : ''}
  </div>`;

  el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { fStatus = b.dataset.st; sel = null; ctx.rerender(); }));
  el.querySelectorAll('[data-jn]').forEach((b) => b.addEventListener('click', () => { fJenis = b.dataset.jn; sel = null; ctx.rerender(); }));
  el.querySelectorAll('[data-row]').forEach((r) => {
    r.addEventListener('click', (e) => { if (e.target.matches('input')) return; sel = r.dataset.row; ctx.rerender(); });
    r.addEventListener('keydown', (e) => { if (e.key === 'Enter') { sel = r.dataset.row; ctx.rerender(); } });
  });
  el.querySelectorAll('[data-chk]').forEach((c) => c.addEventListener('change', () => { c.checked ? checked.add(c.dataset.chk) : checked.delete(c.dataset.chk); ctx.rerender(); }));
  el.querySelector('#btn-all')?.addEventListener('click', () => { list.filter((x) => x.status === 'diajukan').forEach((x) => checked.add(x.id)); ctx.rerender(); });
  el.querySelector('#btn-bulk')?.addEventListener('click', async () => {
    const docs = [...checked].map((id) => ({ ...db.get('tag', id), status: 'disetujui', diverifikasi: today() }));
    await db.saveMany('tag', docs);
    toast(`${docs.length} tag disetujui`); checked.clear(); ctx.rerender();
  });
  el.querySelector('#f-ver')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = e.submitter?.value;
    const catatan = new FormData(e.target).get('catatan').trim();
    if (status === 'dikembalikan' && !catatan) { toast('Tulis catatan sebelum mengembalikan ke PD.'); return; }
    await db.save('tag', { ...t, status, catatan, diverifikasi: today() });
    toast(status === 'disetujui' ? 'Tag disetujui' : 'Dikembalikan ke PD'); ctx.rerender();
  });
}
