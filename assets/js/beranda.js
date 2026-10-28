// Beranda publik: satu-satunya halaman yang bisa diakses tanpa login.
// Hanya menampilkan data yang sudah DISETUJUI admin.
import * as db from './data/store.js';
import * as C from './calc.js';
import { APP } from './config.js';
import { esc, fmtPct, fmtNum, fmtMiliar, fmtDate, TEMA_ICON } from './util.js';

const root = document.getElementById('beranda');

function ring(label, v, sub) {
  const p = v === null ? 0 : Math.max(0, Math.min(100, v));
  return `<div class="card" style="flex:1 1 280px;flex-direction:row;align-items:center;gap:20px">
    <div class="ring" role="img" aria-label="${esc(label)} ${fmtPct(v)}" style="background:conic-gradient(var(--primary) 0 ${p}%, var(--primary-tint) ${p}% 100%)"><span>${fmtPct(v)}</span></div>
    <div class="stack" style="gap:4px;min-width:0"><b style="font-size:17px">${esc(label)}</b><span class="muted small">${esc(sub)}</span></div>
  </div>`;
}

function render() {
  const ind = db.all('indikator');
  const gen = ind.filter((i) => i.jenis === 'general');
  const tem = ind.filter((i) => i.jenis === 'tematik');
  const temaList = [...new Set(tem.map((i) => i.tema))];
  const pdAktif = [...new Set(ind.flatMap((i) => i.pengampu))];
  const R = C.ringkasan();
  const tw = R.perTriwulan;
  const max = Math.max(...tw.map((t) => t.rencana), 1);
  const H = 190;
  const TW = APP.triwulanBerjalan;

  const kelompokGen = [...new Set(gen.map((i) => i.kelompok))];
  const fokus = C.hitungFokus();
  const fokusList = Object.entries(fokus).sort((a, b) => b[1] - a[1]);
  const totalFokus = fokusList.reduce((a, b) => a + b[1], 0);
  const gallery = db.where('infografis', (g) => g.tampil);

  const pdRows = pdAktif.map((pid) => {
    const g = gen.filter((i) => i.pengampu.includes(pid)).length;
    const t = new Set(tem.filter((i) => i.pengampu.includes(pid)).map((i) => i.tema)).size;
    return { pid, n: g + t, what: [g ? `${g} indikator General` : '', t ? `${t} tema Tematik` : ''].filter(Boolean).join(' · ') };
  }).sort((a, b) => b.n - a.n);

  root.innerHTML = `
  <section id="ringkasan" class="hero"><div class="wrap">
    <div class="stack" style="gap:12px">
      <span class="eyebrow">REFORMASI BIROKRASI ${APP.tahun} · DATA S.D. TRIWULAN ${['I', 'II', 'III', 'IV'][TW - 1]}</span>
      <h1>Birokrasi yang bekerja untuk hasil nyata</h1>
      <p>Setiap indikator Reformasi Birokrasi Kalimantan Selatan dijalankan melalui kegiatan perangkat daerah yang tercatat di sistem kinerja daerah (Sinergi). Halaman ini menampilkan kemajuannya secara terbuka.</p>
    </div>
    <div class="hero-stats">
      <div><b>${gen.length}</b><span>indikator RB General</span></div>
      <div><b>${temaList.length}</b><span>tema RB Tematik</span></div>
      <div><b>${pdAktif.length}</b><span>perangkat daerah pengampu</span></div>
      <div><b>${R.rencanaAksi}</b><span>rencana aksi berjalan</span></div>
    </div>
  </div></section>

  <main class="wrap pub-main">
    <section class="stack" style="gap:20px" aria-labelledby="h-cara">
      <div class="sec-head"><span class="eyebrow">INFOGRAFIS · CARA KERJA</span><h2 id="h-cara">Dari indikator sampai realisasi</h2></div>
      <div class="grid-auto" style="--min:220px">
        ${[
          ['1', 'Indikator RB', 'Ditetapkan bersama KemenPANRB dan diampu perangkat daerah.', `${gen.length} + ${tem.length}`, 'var(--primary)', '#fff'],
          ['2', 'Perangkat daerah pengampu', 'Bertanggung jawab memilih kegiatan yang mendukung indikator.', `${pdAktif.length} PD`, 'var(--primary-mid)', '#fff'],
          ['3', 'Sub kegiatan = rencana aksi', 'Diambil dari kegiatan yang sudah dianggarkan, tanpa membuat kegiatan baru.', `${R.rencanaAksi}`, '#8FB8A8', 'var(--primary-dark)'],
          ['4', 'Realisasi dari Sinergi', 'Target dan realisasi tiap triwulan tercatat di sistem kinerja daerah.', 'TW I–IV', 'var(--primary-tint)', 'var(--primary-dark)'],
        ].map(([n, t, d, big, bg, fg]) => `<div class="card" style="gap:10px">
          <span class="step-n" style="background:${bg};color:${fg}">${n}</span>
          <b style="font-size:18px">${t}</b><span class="small" style="color:#3F4A45;line-height:22px">${d}</span>
          <span style="font-size:28px;font-weight:800;color:var(--primary)">${big}</span></div>`).join('')}
      </div>
    </section>

    <section class="stack" style="gap:20px" aria-labelledby="h-cap">
      <div class="sec-head"><span class="eyebrow">INFOGRAFIS · CAPAIAN</span><h2 id="h-cap">Kemajuan s.d. Triwulan ${['I', 'II', 'III', 'IV'][TW - 1]} ${APP.tahun}</h2></div>
      <div class="tiles">
        ${ring('Capaian output', R.capaianOutput, 'Rata-rata realisasi dibanding target triwulan seluruh rencana aksi')}
        ${ring('Realisasi anggaran', R.realisasiAnggaranPct, `Rp${fmtMiliar(R.realisasiAnggaran)} miliar dari Rp${fmtMiliar(R.totalAnggaran)} miliar`)}
        ${ring('Rencana aksi sesuai jadwal', R.sesuaiJadwalPct, `${R.sesuaiJadwal} dari ${R.rencanaAksi} rencana aksi memenuhi target`)}
      </div>
      <div class="card">
        <div class="inline between"><h3 style="font-size:18px">Anggaran rencana aksi per triwulan (kumulatif, Rp miliar)</h3>
          <div class="legend"><span><i style="background:var(--primary-soft)"></i>Rencana</span><span><i style="background:var(--primary)"></i>Realisasi</span></div></div>
        <div class="colchart" role="img" aria-label="${tw.map((t) => `Triwulan ${t.tw}: rencana ${fmtMiliar(t.rencana)}, realisasi ${t.tw <= TW ? fmtMiliar(t.realisasi) : 'belum ada'}`).join('; ')}">
          ${tw.map((t) => `<div class="grp">
            <div class="c"><span class="muted">${fmtMiliar(t.rencana)}</span><i style="height:${Math.round((t.rencana / max) * H)}px;background:var(--primary-soft)"></i></div>
            <div class="c"><b>${t.tw <= TW ? fmtMiliar(t.realisasi) : '—'}</b><i style="height:${t.tw <= TW ? Math.round((t.realisasi / max) * H) : 0}px;background:var(--primary)"></i></div>
          </div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;text-align:center" class="small bold">${tw.map((t) => `<span>Triwulan ${['I', 'II', 'III', 'IV'][t.tw - 1]}</span>`).join('')}</div>
      </div>
    </section>

    <section id="general" class="stack" style="gap:20px" aria-labelledby="h-gen">
      <div class="sec-head"><span class="eyebrow">RB GENERAL</span><h2 id="h-gen">${gen.length} indikator dalam ${kelompokGen.length} kelompok</h2></div>
      <div class="grid-auto">
        ${kelompokGen.map((k) => {
          const list = gen.filter((i) => i.kelompok === k);
          const v = C.capaianKelompok(k);
          return `<div class="card">
            <div class="inline" style="align-items:baseline;gap:10px"><span style="font-size:44px;line-height:48px;font-weight:800;color:var(--primary)">${list.length}</span><span class="muted small">indikator</span></div>
            <b style="font-size:17px">${esc(k)}</b>
            <details><summary class="small" style="cursor:pointer;color:var(--primary);font-weight:600">Lihat indikator</summary>
              <ul class="small" style="margin:8px 0 0;padding-left:18px;line-height:22px">${list.map((i) => `<li>${esc(i.nama)}</li>`).join('')}</ul></details>
            <div class="stack" style="gap:6px"><div class="inline between small"><span class="muted">Capaian output</span><b>${fmtPct(v)}</b></div>
              <div class="bar"><span style="width:${v || 0}%;background:var(--primary)"></span></div></div>
          </div>`;
        }).join('')}
      </div>
    </section>

    <section id="tematik" class="stack" style="gap:20px" aria-labelledby="h-tem">
      <div class="sec-head"><span class="eyebrow">RB TEMATIK</span><h2 id="h-tem">${temaList.length} tema untuk dampak langsung ke masyarakat</h2></div>
      <div class="grid-auto" style="--min:330px">
        ${temaList.map((tema, n) => {
          const list = tem.filter((i) => i.tema === tema);
          const ids = new Set(list.map((i) => i.id));
          const ra = C.approved((t) => ids.has(t.indikatorId)).length;
          const v = C.capaianKelompok(tema);
          const pds = [...new Set(list.flatMap((i) => i.pengampu))].map(C.pdNama).join(' · ');
          return `<article class="card">
            <div class="inline" style="gap:14px;align-items:flex-start;flex-wrap:nowrap">
              <span class="ico"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${TEMA_ICON[tema] || ''}"/></svg></span>
              <div class="stack" style="gap:2px;min-width:0"><span class="xs bold" style="color:var(--primary)">TEMA ${n + 1}</span><h3 style="font-size:17px;line-height:24px">${esc(tema)}</h3></div>
            </div>
            ${list.map((i) => `<div class="box inline between small"><span>${esc(i.nama)}</span><span style="white-space:nowrap"><span class="xs muted">target </span><b>${fmtNum(i.target)} ${esc(i.satuan === 'Persentase' ? '%' : i.satuan || '')}</b></span></div>`).join('')}
            <div class="inline between small muted"><span><b style="color:var(--ink)">${ra}</b> rencana aksi</span><span>${esc(pds)}</span></div>
            <div class="stack" style="gap:6px"><div class="inline between small"><span class="muted">Capaian output</span><b>${fmtPct(v)}</b></div>
              <div class="bar"><span style="width:${v || 0}%;background:var(--primary)"></span></div></div>
          </article>`;
        }).join('')}
      </div>
      ${totalFokus ? `<div class="card" style="flex-direction:row;flex-wrap:wrap;gap:24px;align-items:center">
        <div class="stack" style="flex:1 1 260px;gap:8px"><span class="xs bold" style="letter-spacing:.06em;color:var(--primary)">INFOGRAFIS · FOKUS INTERVENSI</span>
          <h3 style="font-size:22px;line-height:30px;font-weight:800">Ke mana rencana aksi tematik diarahkan?</h3>
          <p class="small" style="margin:0;color:#3F4A45;line-height:22px">${totalFokus} rencana aksi RB Tematik dikelompokkan menurut fokus intervensinya. ${esc(fokusList[0][0])} menjadi fokus terbanyak.</p></div>
        <div class="stack" style="flex:2 1 420px;gap:10px">
          ${fokusList.map(([f, n]) => `<div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,2fr) 32px;gap:12px;align-items:center" class="small">
            <span>${esc(f)}</span><span class="dots" aria-hidden="true">${'<i></i>'.repeat(n)}</span><b class="num" style="text-align:right">${n}</b></div>`).join('')}
          <span class="xs muted">1 kotak = 1 rencana aksi</span>
        </div></div>` : ''}
    </section>

    <section class="stack" style="gap:20px" aria-labelledby="h-pd">
      <div class="sec-head"><span class="eyebrow">INFOGRAFIS · SIAPA MENGAMPU</span><h2 id="h-pd">${pdAktif.length} perangkat daerah, satu agenda</h2></div>
      <div class="grid-auto" style="--min:230px">
        ${pdRows.map((p) => {
          const big = p.n >= 5;
          return `<div class="card pad-s" style="flex-direction:row;align-items:center;gap:14px">
            <span style="flex:0 0 48px;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;background:${big ? 'var(--primary)' : 'var(--primary-tint)'};color:${big ? '#fff' : 'var(--primary-dark)'}">${p.n}</span>
            <span class="stack" style="gap:2px;min-width:0"><b class="small" style="line-height:20px">${esc(C.pdNamaLengkap(p.pid))}</b><span class="xs muted">${p.what}</span></span></div>`;
        }).join('')}
      </div>
    </section>

    <section id="infografis" class="stack" style="gap:20px" aria-labelledby="h-gal">
      <div class="sec-head"><span class="eyebrow">GALERI INFOGRAFIS</span><h2 id="h-gal">Publikasi Biro Organisasi</h2></div>
      ${gallery.length ? `<div class="grid-auto" style="--min:260px">${gallery.map((g) => `<article class="card flush">
        ${g.gambar ? `<a href="${g.gambar}" target="_blank" rel="noopener"><img class="gallery-img" src="${g.gambar}" alt="${esc(g.alt)}"></a>` : `<div class="placeholder-img" role="img" aria-label="${esc(g.alt)}">[Gambar infografis belum diunggah]</div>`}
        <div class="stack" style="padding:16px;gap:6px"><span class="xs bold" style="color:var(--primary)">${esc(g.kategori)} · ${fmtDate(g.tanggal)}</span><b style="font-size:16px;line-height:22px">${esc(g.judul)}</b></div>
      </article>`).join('')}</div>` : '<p class="empty">Belum ada infografis.</p>'}
    </section>
  </main>
  <footer class="pub-foot"><div class="wrap">
    <span><b style="color:#fff">${esc(APP.pengelola)}</b><br>Data kinerja bersumber dari Sinergi (Sistem Informasi Kinerja Terintegrasi).</span>
    <span>Pembaruan data terakhir: ${fmtDate(db.all('imporLog').slice(-1)[0]?.tanggal)}<br>Hanya data yang telah diverifikasi yang ditampilkan.</span>
  </div></footer>`;
}

db.init().then(render).catch((e) => { root.innerHTML = `<p class="empty">${esc(e.message)}</p>`; });
