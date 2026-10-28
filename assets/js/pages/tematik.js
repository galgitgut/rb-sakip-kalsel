// PD Pengampu · RB Tematik: permasalahan → indikator permasalahan → rencana aksi (sub kegiatan + fokus intervensi).
// KONSEP SEMENTARA — akan dikonfirmasi ulang.
import * as db from '../data/store.js';
import { esc, fmtNum, fmtRp, badge, parseNum, toast, today, openDialog, TEMA_ICON } from '../util.js';
import { pageHead } from './shared.js';
import { anggaranTag } from '../calc.js';

let selInd = null;
let selPm = null;
const UTAMA = ['Perencanaan dan Penganggaran', 'Proses Bisnis dan SOP', 'Sumber Daya Manusia', 'Pengawasan', 'Teknologi dan Informasi', 'Inovasi'];

function fokusList() {
  return db.extra('masterFokus') || [...UTAMA, 'Lain-lain'];
}

function raDialog(ctx, pm, tag) {
  const pdId = ctx.user.pdId;
  const sks = db.where('subkegiatan', (s) => s.pdId === pdId);
  const F = fokusList();
  const mode0 = tag?.anggaranMode || 'pagu';
  const dlg = openDialog(`<form method="dialog" class="dlg">
    <h2>${tag ? 'Ubah' : 'Tambah'} rencana aksi</h2>
    <label class="field">Sub kegiatan (Sinergi)<select name="sk" required>${sks.map((s) => `<option value="${s.id}" ${tag?.subkegiatanId === s.id ? 'selected' : ''}>${esc(s.kode)} · ${esc(s.nama)}</option>`).join('')}</select></label>
    <label class="field">Narasi rencana aksi<textarea name="narasi" rows="3" required>${esc(tag?.narasi || '')}</textarea></label>
    <label class="field">Fokus intervensi<select name="fokus">${F.map((f) => `<option ${tag?.fokus === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select><span class="hint">Fokus utama: 6 intervensi. "Lain-lain" tetap tersedia sesuai master KemenPANRB.</span></label>
    <fieldset class="field" style="border:0;padding:0;margin:0"><legend>Anggaran</legend>
      <label class="inline small" style="gap:8px;font-weight:400;color:var(--ink)"><input type="radio" name="mode" value="pagu" ${mode0 === 'pagu' ? 'checked' : ''}> Pagu penuh sub kegiatan (Sinergi)</label>
      <label class="inline small" style="gap:8px;font-weight:400;color:var(--ink)"><input type="radio" name="mode" value="manual" ${mode0 === 'manual' ? 'checked' : ''}> Isian manual</label>
      <input name="manual" inputmode="numeric" placeholder="Nilai manual (Rp)" value="${tag?.anggaranManual ?? ''}">
    </fieldset>
    <div class="inline" style="justify-content:flex-end"><button class="btn secondary" value="batal" formnovalidate>Batal</button><button class="btn secondary" value="draf">Simpan draf</button><button class="btn" value="diajukan">Ajukan verifikasi</button></div>
  </form>`, async (fd, form, action) => {
    const status = action === 'draf' ? 'draf' : 'diajukan';
    const mode = fd.get('mode');
    const manual = mode === 'manual' ? parseNum(fd.get('manual')) : null;
    if (mode === 'manual' && manual === null) throw new Error('Isi nilai anggaran manual.');
    await db.save('tag', {
      ...(tag || { jenis: 'tematik', indikatorId: pm.indikatorId, pdId, permasalahanId: pm.id, bagian: '' }),
      subkegiatanId: fd.get('sk'), narasi: fd.get('narasi').trim(), fokus: fd.get('fokus'),
      anggaranMode: mode, anggaranManual: manual, status, catatan: '', diajukan: today(),
    });
    toast(status === 'draf' ? 'Draf disimpan' : 'Diajukan untuk verifikasi');
    ctx.rerender();
  });
  return dlg;
}

export function render(el, ctx) {
  const pdId = ctx.user.pdId;
  const inds = db.where('akses', (a) => a.pdId === pdId && a.isiTematik).map((a) => db.get('indikator', a.indikatorId)).filter((i) => i && i.jenis === 'tematik');
  if (!inds.length) {
    el.innerHTML = `${pageHead('PD Pengampu · Langkah 4', 'RB Tematik', '')}<div class="note info">Akun ini tidak mengampu tema RB Tematik. Rencana aksi RB General diisi di menu <a href="#/rb-general/tagging">RB General → Tagging Sub Kegiatan</a>.</div>`;
    return;
  }
  if (!inds.some((i) => i.id === selInd)) { selInd = inds[0].id; selPm = null; }
  const ind = db.get('indikator', selInd);
  const pms = db.where('permasalahan', (p) => p.indikatorId === selInd && p.pdId === pdId);
  if (!pms.some((p) => p.id === selPm)) selPm = pms[0]?.id || null;
  const pm = db.get('permasalahan', selPm);
  const ras = pm ? db.where('tag', (t) => t.permasalahanId === pm.id) : [];
  const used = new Set(db.where('tag', (t) => t.indikatorId === selInd && t.pdId === pdId).map((t) => t.fokus));

  el.innerHTML = `
  ${pageHead('PD Pengampu · Langkah 4', 'RB Tematik', '', `<label class="field" style="flex-direction:row;align-items:center;gap:8px">Indikator roadmap
    <select id="sel-ind">${inds.map((i) => `<option value="${i.id}" ${i.id === selInd ? 'selected' : ''}>${esc(i.tema)} — ${esc(i.nama)}</option>`).join('')}</select></label>`)}
  <div class="note warn"><b>Konsep sementara.</b> Alur RB Tematik akan dikonfirmasi ulang saat aplikasi mencapai &gt;70%. Isian awal diambil dari template RB Tematik 2026; sub kegiatan Sinergi masih dummy.</div>
  <section class="inline" style="gap:12px;align-items:stretch">
    <div class="card" style="flex:3 1 360px;background:var(--primary);border-color:var(--primary);color:#fff;gap:4px;padding:18px 20px;flex-direction:row;align-items:center">
      <span class="ico" style="background:#145044;color:#fff"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TEMA_ICON[ind.tema] || ''}"/></svg></span>
      <div class="stack" style="gap:2px"><span class="xs bold" style="color:#CFE3DA">SASARAN: ${esc((ind.sasaran || '').toUpperCase())}</span><b style="font-size:20px;line-height:28px">${esc(ind.tema)}</b><span class="small" style="color:#CFE3DA">Indikator roadmap: ${esc(ind.nama)}</span></div>
    </div>
    <div class="tile" style="flex:1 1 140px"><span class="k">Target</span><span class="v" style="font-size:22px">${fmtNum(ind.target)} <span class="small muted">${esc(ind.satuan)}</span></span></div>
    <div class="card pad-s" style="flex:2 1 260px;gap:8px"><span class="xs bold muted">Cakupan 6 fokus intervensi utama</span>
      <div class="inline" style="gap:6px">${UTAMA.map((f) => `<span class="badge ${used.has(f) ? 'b-green' : 'b-wait'}">${used.has(f) ? '✓' : '○'} ${esc(f)}</span>`).join('')}</div></div>
  </section>
  <div class="row">
    <section class="card pad-s" style="flex:1 1 280px;gap:8px" aria-label="Daftar permasalahan">
      <h2 style="font-size:16px;margin:4px 8px">Permasalahan (${pms.length})</h2>
      ${pms.map((p) => {
        const n = db.where('tag', (t) => t.permasalahanId === p.id).length;
        return `<button type="button" class="chip" data-pm="${p.id}" aria-pressed="${p.id === selPm}" style="flex-direction:column;align-items:flex-start;border-radius:10px;padding:10px 12px;text-align:left;font-weight:500;line-height:20px;min-height:auto">${esc(p.permasalahan.length > 110 ? p.permasalahan.slice(0, 108) + '…' : p.permasalahan)}<span class="xs" style="opacity:.8;font-weight:700">${n} rencana aksi</span></button>`;
      }).join('')}
      <button type="button" class="btn secondary" id="btn-pm-add">+ Tambah permasalahan</button>
    </section>
    <section class="card col-main" aria-label="Rincian permasalahan">
      ${pm ? `<form id="f-pm" class="stack" style="gap:14px">
        <div class="inline between"><span class="xs bold" style="color:var(--primary);letter-spacing:.04em">1 · PERMASALAHAN</span>
          <button type="button" class="btn secondary small" disabled title="Menunggu pembahasan konsep Isu Strategis">Ambil dari Isu Strategis PD</button></div>
        <label class="field"><span class="sr-only">Permasalahan</span><textarea name="permasalahan" rows="4" required>${esc(pm.permasalahan)}</textarea></label>
        <span class="xs bold" style="color:var(--primary);letter-spacing:.04em">2 · SASARAN & INDIKATOR PERMASALAHAN</span>
        <label class="field">Sasaran permasalahan<textarea name="sasaran" rows="2">${esc(pm.sasaran || '')}</textarea></label>
        <label class="field">Indikator permasalahan<input name="indikator" value="${esc(pm.indikator || '')}"></label>
        <div class="inline" style="gap:12px;align-items:flex-start">
          <label class="field" style="flex:1 1 120px">Target<input name="target" inputmode="decimal" value="${esc(fmtNum(pm.target, 4))}"></label>
          <label class="field" style="flex:1 1 140px">Satuan<input name="satuan" value="${esc(pm.satuan || '')}"></label>
          <label class="field" style="flex:1 1 140px">Realisasi (akhir tahun)<input name="realisasi" inputmode="decimal" value="${esc(fmtNum(pm.realisasi, 4))}"></label>
        </div>
        <div class="inline"><button class="btn secondary" type="submit">Simpan permasalahan</button><button class="btn danger" type="button" id="btn-pm-del">Hapus</button></div>
      </form>
      <div class="stack" style="gap:10px;border-top:1px solid var(--line-soft);padding-top:16px">
        <div class="inline between"><span class="xs bold" style="color:var(--primary);letter-spacing:.04em">3 · RENCANA AKSI = SUB KEGIATAN BER-TAG</span><button type="button" class="btn small" id="btn-ra-add">+ Tambah rencana aksi</button></div>
        ${ras.length ? ras.map((t) => {
          const sk = db.get('subkegiatan', t.subkegiatanId);
          return `<div class="card pad-s" style="gap:8px">
            <div class="inline between"><span class="badge b-green">${esc(t.fokus || '—')}</span>${badge(t.status)}</div>
            <span style="white-space:pre-line;line-height:22px">${esc(t.narasi || sk?.nama || '')}</span>
            ${sk ? `<span class="small muted">${esc(sk.kode)} · ${esc(sk.nama)}</span>
            <div class="inline small" style="gap:16px"><span>${esc(sk.indikatorOutput)} (${esc(sk.satuan)})</span><span class="num">TW: ${sk.target.map((x) => fmtNum(x)).join(' · ')}</span><span class="num bold">${fmtRp(anggaranTag(t, sk))}${t.anggaranMode === 'manual' ? ' (manual)' : ''}</span></div>` : '<span class="note warn small">Sub kegiatan tidak ditemukan di data Sinergi.</span>'}
            ${t.status === 'dikembalikan' && t.catatan ? `<div class="note warn small"><b>Catatan admin:</b> ${esc(t.catatan)}</div>` : ''}
            <div class="inline"><button type="button" class="btn secondary small" data-ra="${t.id}">Ubah</button><button type="button" class="btn danger small" data-radel="${t.id}">Hapus</button></div>
          </div>`;
        }).join('') : '<p class="empty">Belum ada rencana aksi untuk permasalahan ini.</p>'}
      </div>` : '<p class="empty">Belum ada permasalahan. Tambahkan permasalahan terlebih dulu.</p>'}
    </section>
  </div>`;

  el.querySelector('#sel-ind').addEventListener('change', (e) => { selInd = e.target.value; selPm = null; ctx.rerender(); });
  el.querySelectorAll('[data-pm]').forEach((b) => b.addEventListener('click', () => { selPm = b.dataset.pm; ctx.rerender(); }));
  el.querySelector('#btn-pm-add').addEventListener('click', async () => {
    const doc = await db.save('permasalahan', { indikatorId: selInd, pdId, permasalahan: 'Permasalahan baru — tulis uraiannya di sini', sasaran: '', indikator: '', target: null, satuan: '', realisasi: null, catatan: '', portalId: {} });
    selPm = doc.id; ctx.rerender();
  });
  el.querySelector('#f-pm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.save('permasalahan', { ...pm, permasalahan: fd.get('permasalahan').trim(), sasaran: fd.get('sasaran').trim(), indikator: fd.get('indikator').trim(), target: parseNum(fd.get('target')), satuan: fd.get('satuan').trim(), realisasi: parseNum(fd.get('realisasi')) });
    toast('Permasalahan disimpan'); ctx.rerender();
  });
  el.querySelector('#btn-pm-del')?.addEventListener('click', async () => {
    if (ras.length) { toast('Hapus dulu rencana aksi di bawah permasalahan ini.'); return; }
    if (!confirm('Hapus permasalahan ini?')) return;
    await db.remove('permasalahan', pm.id); selPm = null; ctx.rerender();
  });
  el.querySelector('#btn-ra-add')?.addEventListener('click', () => raDialog(ctx, pm, null));
  el.querySelectorAll('[data-ra]').forEach((b) => b.addEventListener('click', () => raDialog(ctx, pm, db.get('tag', b.dataset.ra))));
  el.querySelectorAll('[data-radel]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Hapus rencana aksi ini?')) return;
    await db.remove('tag', b.dataset.radel); ctx.rerender();
  }));
}
