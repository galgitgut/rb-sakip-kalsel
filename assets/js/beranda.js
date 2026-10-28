// Beranda publik: satu-satunya halaman tanpa login. Hanya data yang sudah DISETUJUI admin.
import * as db from './data/store.js';
import * as C from './calc.js';
import { APP } from './config.js';
import { esc, fmtDate } from './util.js';
import { TW_LABEL, ringkasanTab, koordinatorTab, indikatorTab, perhatianTab } from './ringkasan.js';

const root = document.getElementById('beranda');
const TABS = [['ringkasan', 'Ringkasan'], ['koordinator', 'Per Koordinator'], ['indikator', 'Per Indikator'], ['perhatian', 'Perlu Perhatian']];
const state = { tw: APP.triwulanBerjalan, tab: 'ringkasan' };

function infografis() {
  const fokus = Object.entries(C.hitungFokus()).sort((a, b) => b[1] - a[1]);
  const total = fokus.reduce((a, b) => a + b[1], 0);
  const gallery = db.where('infografis', (g) => g.tampil);
  return `<section id="infografis" class="stack" style="gap:20px" aria-labelledby="h-info">
    <div class="sec-head"><span class="eyebrow">INFOGRAFIS</span><h2 id="h-info">Ke mana rencana aksi diarahkan</h2></div>
    ${total ? `<div class="card" style="flex-direction:row;flex-wrap:wrap;gap:24px;align-items:center">
      <div class="stack" style="flex:1 1 260px;gap:8px"><span class="xs bold" style="letter-spacing:.06em;color:var(--primary)">RB TEMATIK · FOKUS INTERVENSI</span>
        <h3 style="font-size:22px;line-height:30px;font-weight:800">${total} rencana aksi tematik</h3>
        <p class="small" style="margin:0;color:#3F4A45;line-height:22px">Dikelompokkan menurut fokus intervensi. ${esc(fokus[0][0])} menjadi fokus terbanyak.</p></div>
      <div class="stack" style="flex:2 1 420px;gap:10px">
        ${fokus.map(([f, n]) => `<div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,2fr) 32px;gap:12px;align-items:center" class="small">
          <span>${esc(f)}</span><span class="dots" aria-hidden="true">${'<i></i>'.repeat(n)}</span><b class="num" style="text-align:right">${n}</b></div>`).join('')}
        <span class="xs muted">1 kotak = 1 rencana aksi</span></div></div>` : ''}
    <div class="sec-head" style="margin-top:12px"><span class="eyebrow">GALERI INFOGRAFIS</span><h2>Publikasi Biro Organisasi</h2></div>
    ${gallery.length ? `<div class="grid-auto" style="--min:260px">${gallery.map((g) => `<article class="card flush">
      ${g.gambar ? `<a href="${g.gambar}" target="_blank" rel="noopener"><img class="gallery-img" src="${g.gambar}" alt="${esc(g.alt)}"></a>` : `<div class="placeholder-img" role="img" aria-label="${esc(g.alt)}">[Gambar infografis belum diunggah]</div>`}
      <div class="stack" style="padding:16px;gap:6px"><span class="xs bold" style="color:var(--primary)">${esc(g.kategori)} · ${fmtDate(g.tanggal)}</span><b style="font-size:16px;line-height:22px">${esc(g.judul)}</b></div>
    </article>`).join('')}</div>` : '<p class="empty">Belum ada infografis.</p>'}
  </section>`;
}

function render() {
  const body = { ringkasan: ringkasanTab, koordinator: koordinatorTab, indikator: indikatorTab, perhatian: perhatianTab }[state.tab](state.tw);
  root.innerHTML = `
  <main class="wrap pub-main" style="padding-top:28px;gap:24px">
    <section class="card" style="gap:4px"><h1 style="font-size:28px">Beranda Reformasi Birokrasi ${APP.tahun}</h1>
      <p class="muted" style="margin:0">Ringkasan rencana aksi dan realisasi RB General dan RB Tematik Pemerintah Provinsi Kalimantan Selatan.</p></section>
    <section id="ringkasan" class="card no-print" style="flex-direction:row;flex-wrap:wrap;align-items:flex-end;gap:16px">
      <label class="field" style="flex:0 1 220px">Data realisasi sampai
        <select id="sel-tw">${[1, 2, 3, 4].map((i) => `<option value="${i}" ${i === state.tw ? 'selected' : ''}>Triwulan ${TW_LABEL[i - 1]}</option>`).join('')}</select></label>
      <div class="inline" role="group" aria-label="Tampilan" style="flex:1 1 420px">
        ${TABS.map(([k, l]) => `<button type="button" class="chip" data-tab="${k}" aria-pressed="${state.tab === k}">${l}</button>`).join('')}
      </div>
      <button type="button" class="btn" id="btn-pdf">Unduh PDF ringkasan</button>
    </section>
    <div id="tab-body">${body}</div>
    ${state.tab === 'ringkasan' ? infografis() : ''}
  </main>
  <footer class="pub-foot"><div class="wrap">
    <span><b style="color:#fff">${esc(APP.pengelola)}</b><br>Data kinerja bersumber dari Sinergi (Sistem Informasi Kinerja Terintegrasi).</span>
    <span>Pembaruan data terakhir: ${fmtDate(db.all('imporLog').slice(-1)[0]?.tanggal)}<br>Hanya data yang telah diverifikasi yang ditampilkan.</span>
  </div></footer>`;

  root.querySelector('#sel-tw').addEventListener('change', (e) => { state.tw = Number(e.target.value); render(); });
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; render(); }));
  root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.goto; render(); root.querySelector('#ringkasan').scrollIntoView({ behavior: 'smooth' }); }));
  root.querySelector('#btn-pdf').addEventListener('click', () => window.print());
}

db.init().then(render).catch((e) => { root.innerHTML = `<p class="empty">${esc(e.message)}</p>`; });
