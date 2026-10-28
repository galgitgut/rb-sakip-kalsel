// Admin · Impor data sub kegiatan dari Sinergi (prototipe: unggah Excel; format kolom DUMMY).
import * as db from '../data/store.js';
import { esc, fmtDate, parseNum, toast, today } from '../util.js';
import { pageHead } from './shared.js';
import * as XL from '../excel.js';

let hasil = null; // hasil validasi berkas terakhir

function validasi(rows) {
  const byKode = new Map(db.all('subkegiatan').map((s) => [s.kode, s]));
  const pdIds = new Set(db.all('pd').map((p) => p.id));
  const upd = []; const baru = []; const masalah = [];
  rows.forEach((r, i) => {
    const baris = i + 2;
    const kode = r.kode_sub_kegiatan ? String(r.kode_sub_kegiatan).trim() : '';
    if (!kode) { masalah.push({ baris, pd: r.nama_pd || r.kode_pd || '—', pesan: 'Kode sub kegiatan kosong — baris dilewati' }); return; }
    const nums = ['target_tw1', 'target_tw2', 'target_tw3', 'target_tw4', 'pagu', 'realisasi_tw1', 'realisasi_tw2', 'realisasi_tw3', 'realisasi_tw4', 'realisasi_anggaran'];
    const bad = nums.filter((k) => r[k] !== null && r[k] !== '' && parseNum(r[k]) === null);
    if (bad.length) { masalah.push({ baris, pd: r.nama_pd || r.kode_pd, pesan: `Bukan angka: ${bad.join(', ')} — baris dilewati` }); return; }
    const doc = {
      kode, nama: r.nama_sub_kegiatan, indikatorOutput: r.indikator_output, satuan: r.satuan,
      target: [1, 2, 3, 4].map((n) => parseNum(r[`target_tw${n}`]) || 0), pagu: parseNum(r.pagu) || 0,
      realisasi: [1, 2, 3, 4].map((n) => parseNum(r[`realisasi_tw${n}`])), realisasiAnggaran: parseNum(r.realisasi_anggaran),
    };
    const lama = byKode.get(kode);
    if (lama) upd.push({ ...lama, ...doc });
    else if (!pdIds.has(r.kode_pd)) masalah.push({ baris, pd: r.nama_pd || r.kode_pd, pesan: `kode_pd "${r.kode_pd}" tidak dikenal — baris dilewati` });
    else baru.push({ id: `${r.kode_pd}-${kode}`, pdId: r.kode_pd, ...doc });
  });
  const kodeFile = new Set(rows.map((r) => String(r.kode_sub_kegiatan || '').trim()));
  const hilang = db.where('tag', (t) => t.status !== 'draf').map((t) => db.get('subkegiatan', t.subkegiatanId)).filter((s) => s && !kodeFile.has(s.kode));
  [...new Map(hilang.map((s) => [s.id, s])).values()].forEach((s) => masalah.push({ baris: '—', pd: s.pdId, pesan: `Sub kegiatan ber-tag "${s.nama}" tidak ada di berkas — data lama dipertahankan, tag tidak dihapus` }));
  return { total: rows.length, upd, baru, masalah };
}

export function render(el, ctx) {
  const log = db.all('imporLog');
  el.innerHTML = `
  ${pageHead('Admin · Langkah 1', 'Impor Data Sinergi', 'Prototipe: unggah Excel sub kegiatan. Versi live: ditarik otomatis lewat API Sinergi.')}
  <div class="note warn small"><b>Format kolom masih dummy</b> karena format ekspor/API Sinergi belum diriset. Unduh template untuk melihat kolomnya — template berisi data saat ini sehingga bisa langsung diubah lalu diunggah kembali.</div>
  <div class="row">
    <div class="col-main stack" style="gap:24px">
      <form class="card" id="f-imp" aria-labelledby="h-imp">
        <h2 id="h-imp">Unggah file</h2>
        <label class="field">Isi data<select name="periode"><option>Realisasi s.d. Triwulan III</option><option>Realisasi s.d. Triwulan IV</option><option>Rencana (target TW & pagu)</option></select></label>
        <label class="dropzone">${'<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F5C4D" stroke-width="1.8" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v5h16v-5"/></svg>'}
          <b>Pilih file .xlsx</b><span class="small muted">Sheet pertama dibaca; baris 1 = nama kolom</span>
          <input type="file" name="file" accept=".xlsx,.xls" required></label>
        <button class="btn" type="submit">Periksa file</button>
      </form>
      ${hasil ? `<section class="card" aria-labelledby="h-val">
        <div class="inline between"><h2 id="h-val">Pratinjau & validasi</h2><span class="small muted">${esc(hasil.nama)}</span></div>
        <div class="tiles">
          <div class="tile"><span class="k">Baris dibaca</span><span class="v">${hasil.total}</span></div>
          <div class="tile" style="background:var(--blue-tint)"><span class="k">Diperbarui</span><span class="v" style="color:var(--blue-text)">${hasil.upd.length}</span></div>
          <div class="tile" style="background:var(--primary-tint)"><span class="k">Sub kegiatan baru</span><span class="v" style="color:var(--primary-dark)">${hasil.baru.length}</span></div>
          <div class="tile" style="background:var(--orange-tint)"><span class="k">Perlu dicek</span><span class="v" style="color:var(--orange-text)">${hasil.masalah.length}</span></div>
        </div>
        ${hasil.masalah.length ? `<div class="table-wrap" style="border:1px solid var(--line);border-radius:10px"><table class="t"><thead><tr><th>Baris</th><th>PD</th><th>Keterangan</th></tr></thead>
          <tbody>${hasil.masalah.slice(0, 50).map((m) => `<tr><td class="num">${m.baris}</td><td>${esc(m.pd)}</td><td>${esc(m.pesan)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="note ok small">Data dicocokkan lewat <b>kode sub kegiatan</b>. Tag, narasi, dan anggaran manual yang sudah diisi PD tidak tertimpa.</div>
        <div class="inline"><button class="btn" id="btn-apply">Terapkan ${hasil.upd.length + hasil.baru.length} baris</button><button class="btn secondary" id="btn-cancel">Batal</button></div>
      </section>` : ''}
    </div>
    <aside class="col-side stack" style="gap:24px">
      <section class="card"><h2>Template kolom (dummy)</h2>
        <div class="inline" style="gap:6px">${XL.IMPOR_KOLOM.map((c) => `<code class="xs" style="padding:4px 8px;border-radius:6px;background:var(--ground)">${c}</code>`).join('')}</div>
        <button class="btn outline" id="btn-tpl">Unduh template berisi data saat ini</button></section>
      <section class="card"><h2>Riwayat impor</h2>
        ${log.slice().reverse().map((l) => `<div class="stack" style="gap:2px;padding:8px 0;border-top:1px solid var(--line-soft)"><b class="small">${esc(l.periode)}</b><span class="xs muted">${fmtDate(l.tanggal)} · ${l.baris} baris · ${esc(l.oleh)}</span></div>`).join('')}</section>
      <section class="card"><h2>Data prototipe</h2>
        <p class="small muted" style="margin:0">Kembalikan seluruh data di browser ini ke data awal (semua perubahan uji coba hilang).</p>
        <button class="btn danger" id="btn-reset">Reset data prototipe</button></section>
    </aside>
  </div>`;

  el.querySelector('#btn-tpl').addEventListener('click', async () => { try { await XL.downloadTemplateImpor(); } catch (e) { toast(e.message); } });
  el.querySelector('#f-imp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const rows = await XL.readImporFile(fd.get('file'));
      hasil = { ...validasi(rows), nama: fd.get('file').name, periode: fd.get('periode') };
      ctx.rerender();
    } catch (err) { toast(err.message); }
  });
  el.querySelector('#btn-cancel')?.addEventListener('click', () => { hasil = null; ctx.rerender(); });
  el.querySelector('#btn-apply')?.addEventListener('click', async () => {
    await db.saveMany('subkegiatan', [...hasil.upd, ...hasil.baru]);
    await db.save('imporLog', { tanggal: today(), periode: hasil.periode, baris: hasil.upd.length + hasil.baru.length, oleh: 'Admin' });
    toast('Data Sinergi diperbarui'); hasil = null; ctx.rerender();
  });
  el.querySelector('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset semua data prototipe di browser ini ke data awal?')) return;
    await db.reset(); hasil = null; toast('Data dikembalikan ke awal'); ctx.rerender();
  });
}
