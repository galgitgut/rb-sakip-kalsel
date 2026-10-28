// Admin · Kelola infografis yang tampil di Galeri Beranda publik.
import * as db from '../data/store.js';
import { esc, fmtDate, toast, today } from '../util.js';
import { pageHead } from './shared.js';

// Kecilkan gambar agar muat di penyimpanan browser (prototipe). Tahap 2: Firebase Storage.
function resizeImage(file, max = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Berkas bukan gambar yang bisa dibaca.'));
    img.src = url;
  });
}

export function render(el, ctx) {
  const list = db.all('infografis');
  el.innerHTML = `
  ${pageHead('Admin · Beranda publik', 'Kelola Infografis', 'Infografis yang diunggah di sini tampil di Galeri Infografis pada Beranda publik.', '<a class="btn outline" href="index.html#infografis">Lihat di Beranda →</a>')}
  <div class="row">
    <form class="card col-side" id="f-up" aria-labelledby="h-up">
      <h2 id="h-up">Unggah infografis baru</h2>
      <label class="dropzone">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F5C4D" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>
        <b>Pilih gambar</b><span class="small muted">PNG atau JPG. Pada prototipe gambar dikecilkan otomatis.</span>
        <input type="file" name="file" accept="image/png,image/jpeg" required>
      </label>
      <label class="field">Judul<input name="judul" required placeholder="mis. Capaian RB Triwulan III 2026"></label>
      <div class="inline" style="gap:12px;align-items:flex-start">
        <label class="field" style="flex:1 1 140px">Kategori<select name="kategori"><option>Rilis capaian</option><option>Penjelasan</option><option>RB General</option><option>RB Tematik</option></select></label>
        <label class="field" style="flex:1 1 140px">Tanggal terbit<input type="date" name="tanggal" value="${today()}" required></label>
      </div>
      <label class="field">Teks alternatif (wajib)<textarea name="alt" rows="3" required placeholder="Jelaskan isi infografis untuk pembaca layar"></textarea></label>
      <div class="inline"><button class="btn" type="submit" value="tampil" style="flex:1 1 140px">Terbitkan</button><button class="btn secondary" type="submit" value="draf" style="flex:1 1 120px">Simpan tersembunyi</button></div>
    </form>
    <section class="card col-main" aria-labelledby="h-list">
      <div class="inline between"><h2 id="h-list">Infografis terunggah (${list.length})</h2><span class="small muted">Urutan atas = tampil paling depan</span></div>
      ${list.length ? list.map((g, i) => `<div class="inline" style="gap:14px;padding:12px;border:1px solid var(--line);border-radius:12px;opacity:${g.tampil ? 1 : 0.7}">
        ${g.gambar ? `<img src="${g.gambar}" alt="" style="width:64px;height:80px;object-fit:cover;border-radius:8px">` : '<div aria-hidden="true" style="width:64px;height:80px;border-radius:8px;background:repeating-linear-gradient(135deg,#EEF1EF 0 8px,#E6EAE7 8px 16px)"></div>'}
        <div class="stack" style="flex:1 1 220px;gap:2px;min-width:0"><b>${esc(g.judul)}</b><span class="small muted">${esc(g.kategori)} · ${fmtDate(g.tanggal)}${g.gambar ? '' : ' · contoh tanpa gambar'}</span></div>
        <div class="inline" style="gap:6px">
          <button type="button" class="btn secondary small" data-up="${i}" aria-label="Naikkan ${esc(g.judul)}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="btn secondary small" data-down="${i}" aria-label="Turunkan ${esc(g.judul)}" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="chip" data-vis="${g.id}" aria-pressed="${!!g.tampil}">${g.tampil ? 'Tampil' : 'Disembunyikan'}</button>
          <button type="button" class="btn danger small" data-del="${g.id}">Hapus</button>
        </div></div>`).join('') : '<p class="empty">Belum ada infografis.</p>'}
    </section>
  </div>`;

  const move = async (i, d) => { const l = [...list]; const [x] = l.splice(i, 1); l.splice(i + d, 0, x); await db.replaceAll('infografis', l); ctx.rerender(); };
  el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.up), -1)));
  el.querySelectorAll('[data-down]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.down), 1)));
  el.querySelectorAll('[data-vis]').forEach((b) => b.addEventListener('click', async () => { const g = db.get('infografis', b.dataset.vis); await db.save('infografis', { ...g, tampil: !g.tampil }); ctx.rerender(); }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Hapus infografis ini?')) { await db.remove('infografis', b.dataset.del); ctx.rerender(); } }));
  el.querySelector('#f-up').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const gambar = await resizeImage(fd.get('file'));
      const doc = { judul: fd.get('judul').trim(), kategori: fd.get('kategori'), tanggal: fd.get('tanggal'), alt: fd.get('alt').trim(), gambar, tampil: e.submitter?.value !== 'draf' };
      await db.replaceAll('infografis', [{ id: db.newId('infografis'), ...doc }, ...list]);
      toast('Infografis disimpan'); ctx.rerender();
    } catch (err) { toast(err.message); }
  });
}
