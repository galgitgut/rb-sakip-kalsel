// Komponen ringkasan RB (dipakai Beranda publik). Semua angka dari calc.js.
import * as db from './data/store.js';
import * as C from './calc.js';
import { esc, fmtNum, fmtRp } from './util.js';

export const TW_LABEL = ['I', 'II', 'III', 'IV'];
export const pct = (v, d = 1) => (v === null || v === undefined ? '–' : `${fmtNum(v, d)}%`);

export function pbar(v) {
  const t = C.tone(v);
  return `<span class="pbar t-${t}"><span class="bar" aria-hidden="true"><span class="f-${t}" style="width:${Math.max(0, Math.min(100, v || 0))}%"></span></span>${pct(v)}</span>`;
}

export function groups() {
  const ind = db.all('indikator');
  const gen = ind.filter((i) => i.jenis === 'general');
  const tem = ind.filter((i) => i.jenis === 'tematik');
  const tagsOf = (ids) => C.approved((t) => ids.has(t.indikatorId));
  return {
    ind, gen, tem,
    tagsAll: C.approved(),
    tagsGen: tagsOf(new Set(gen.map((i) => i.id))),
    tagsTem: tagsOf(new Set(tem.map((i) => i.id))),
    kelompokGen: [...new Set(gen.map((i) => i.kelompok))],
    temaList: [...new Set(tem.map((i) => i.tema))],
    tagsOf,
  };
}

function metricRow(label, m) {
  return `<tr><td>${esc(label)}</td><td class="n">${m.n}</td><td>${pbar(m.kelengkapan)}</td><td>${pbar(m.capaian)}</td>
    <td class="n">${fmtRp(m.anggaran)}</td><td class="n">${fmtRp(m.realisasi)}</td><td class="n">${pct(m.serapan)}</td></tr>`;
}
const METRIC_HEAD = '<tr><th style="text-align:left">%LABEL%</th><th>Rencana aksi</th><th>Kelengkapan</th><th>Capaian</th><th>Anggaran</th><th>Realisasi</th><th>Serapan</th></tr>';

export function ringkasanTab(tw) {
  const G = groups();
  const all = C.metrics(G.tagsAll, tw);
  const terisi = G.ind.filter((i) => C.approved((t) => t.indikatorId === i.id).length).length;
  const pTerisi = G.ind.length ? (terisi / G.ind.length) * 100 : 0;
  const twm = [1, 2, 3, 4].map((i) => C.metricsTw(G.tagsAll, i));
  const pds = [...new Set(G.tagsAll.map((t) => t.pdId))].map((pid) => ({ pid, m: C.metrics(G.tagsAll.filter((t) => t.pdId === pid), tw) }))
    .sort((a, b) => (a.m.kelengkapan ?? 0) - (b.m.kelengkapan ?? 0) || (a.m.capaian ?? 0) - (b.m.capaian ?? 0));
  const mg = C.metrics(G.tagsGen, tw);
  const mt = C.metrics(G.tagsTem, tw);
  const indGenTerisi = G.gen.filter((i) => C.approved((t) => t.indikatorId === i.id).length).length;
  const indTemTerisi = G.tem.filter((i) => C.approved((t) => t.indikatorId === i.id).length).length;

  const card = (title, sub, m) => `<section class="card span-6" aria-label="${esc(title)}">
    <div class="stack" style="gap:2px"><h2>${esc(title)}</h2><span class="small muted">${sub}</span></div>
    <div class="kv">
      <div><span>Rencana aksi (indikator output)</span><b>${m.n}</b></div>
      <div><span>Kelengkapan pelaporan</span>${pbar(m.kelengkapan)}</div>
      <div><span>Capaian target</span>${pbar(m.capaian)}</div>
      <div><span>Anggaran</span><b>${fmtRp(m.anggaran)}</b></div>
      <div><span>Realisasi anggaran</span><b>${fmtRp(m.realisasi)}</b></div>
      <div><span>Serapan</span><b>${pct(m.serapan)}</b></div>
    </div></section>`;

  const trend = [1, 2, 3, 4].map((i) => ({ i, g: C.metricsTw(G.tagsGen, i), t: C.metricsTw(G.tagsTem, i) }));

  return `<div class="dash-grid">
    <div class="hello span-5"><span class="small" style="color:#B8D4CA">Pemerintah Provinsi Kalimantan Selatan</span><h2>Ringkasan Rencana Aksi RB Kalsel</h2><span class="pill">Data realisasi sampai Triwulan ${TW_LABEL[tw - 1]}</span></div>
    <div class="card span-3" style="flex-direction:row;align-items:center;gap:18px">
      <div class="ring" role="img" aria-label="Rencana aksi terisi ${pct(pTerisi, 0)}" style="background:conic-gradient(var(--primary) 0 ${pTerisi}%, var(--primary-tint) ${pTerisi}% 100%)"><span>${pct(pTerisi, 0)}</span></div>
      <div class="stack" style="gap:2px"><b style="font-size:17px">Indikator punya rencana aksi</b><span class="small muted">${terisi} dari ${G.ind.length} indikator</span></div>
    </div>
    <div class="card span-4 soft-green"><span class="muted">Serapan anggaran</span><span class="big">${pct(all.serapan)}</span><span class="small muted">${fmtRp(all.realisasi)} dari ${fmtRp(all.anggaran)}</span></div>

    <section class="card span-7" aria-labelledby="h-lapor">
      <div class="inline between"><h2 id="h-lapor">Output yang sudah dilaporkan per triwulan</h2><span class="small muted">${G.tagsAll.length} rencana aksi</span></div>
      <div class="twbars" role="img" aria-label="${twm.map((m, k) => `Triwulan ${TW_LABEL[k]} ${pct(m.kelengkapan)}`).join(', ')}">
        ${twm.map((m, k) => `<div><b class="num">${pct(m.kelengkapan)}</b><i style="height:${Math.max(4, (m.kelengkapan || 0) * 1.5)}px;background:${k < tw ? 'var(--primary)' : 'var(--primary-tint)'}"></i><span class="muted">TW ${TW_LABEL[k]}</span></div>`).join('')}
      </div>
    </section>
    <section class="card span-5 soft-yellow" aria-labelledby="h-perhatian">
      <h2 id="h-perhatian">Perlu perhatian</h2>
      <span class="small muted" style="margin-top:-8px">Kelengkapan pelaporan terendah s.d. TW ${TW_LABEL[tw - 1]}</span>
      ${pds.slice(0, 4).map((p) => `<div class="inline between" style="flex-wrap:nowrap;gap:16px"><span class="small" style="min-width:0">${esc(C.pdNamaLengkap(p.pid))}</span>${pbar(p.m.kelengkapan)}</div>`).join('')}
      <button type="button" class="btn secondary small no-print" data-goto="perhatian" style="align-self:flex-start">Lihat selengkapnya</button>
    </section>

    ${card('RB General', `${indGenTerisi} dari ${G.gen.length} indikator punya rencana aksi`, mg)}
    ${card('RB Tematik', `${indTemTerisi} dari ${G.tem.length} indikator roadmap punya rencana aksi`, mt)}

    <section class="card span-12" aria-labelledby="h-tren">
      <div class="stack" style="gap:2px"><h2 id="h-tren">Tren per triwulan</h2><span class="small muted">Setiap triwulan dihitung sendiri-sendiri, tidak terpengaruh pilihan di atas.</span></div>
      <div class="table-wrap"><table class="grid" style="min-width:900px">
        <thead><tr><th rowspan="2" style="text-align:left">Triwulan</th><th colspan="3">RB General</th><th colspan="3">RB Tematik</th></tr>
        <tr><th>Output terlapor</th><th>Capaian</th><th>Realisasi anggaran</th><th>Output terlapor</th><th>Capaian</th><th>Realisasi anggaran</th></tr></thead>
        <tbody>${trend.map((r) => `<tr><td>Triwulan ${TW_LABEL[r.i - 1]}</td>
          <td class="n">${r.g.terlapor} / ${r.g.n} (${pct(r.g.kelengkapan, 0)})</td><td>${pbar(r.g.capaian)}</td><td class="n">${fmtRp(r.g.realisasi)}</td>
          <td class="n">${r.t.terlapor} / ${r.t.n} (${pct(r.t.kelengkapan, 0)})</td><td>${pbar(r.t.capaian)}</td><td class="n">${fmtRp(r.t.realisasi)}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>

    <section class="card span-12" aria-labelledby="h-komp">
      <h2 id="h-komp">Per sub komponen (RB General)</h2>
      <div class="table-wrap"><table class="grid" style="min-width:900px"><thead>${METRIC_HEAD.replace('%LABEL%', 'Sub komponen')}</thead>
      <tbody>${G.kelompokGen.map((k) => metricRow(k, C.metrics(G.tagsOf(new Set(G.gen.filter((i) => i.kelompok === k).map((i) => i.id))), tw))).join('')}</tbody></table></div>
    </section>
    <section class="card span-12" aria-labelledby="h-tema">
      <h2 id="h-tema">Per tema (RB Tematik)</h2>
      <div class="table-wrap"><table class="grid" style="min-width:900px"><thead>${METRIC_HEAD.replace('%LABEL%', 'Tema')}</thead>
      <tbody>${G.temaList.map((k) => metricRow(k, C.metrics(G.tagsOf(new Set(G.tem.filter((i) => i.tema === k).map((i) => i.id))), tw))).join('')}</tbody></table></div>
    </section>
  </div>`;
}

export function koordinatorTab(tw) {
  const G = groups();
  const pids = [...new Set(G.ind.flatMap((i) => i.pengampu))];
  const rows = pids.map((pid) => {
    const tags = G.tagsAll.filter((t) => t.pdId === pid);
    const nInd = G.ind.filter((i) => i.pengampu.includes(pid)).length;
    return { pid, nInd, m: C.metrics(tags, tw) };
  }).sort((a, b) => b.nInd - a.nInd);
  return `<section class="card" aria-labelledby="h-koord"><div class="stack" style="gap:2px"><h2 id="h-koord">Per koordinator (PD pengampu)</h2><span class="small muted">s.d. Triwulan ${TW_LABEL[tw - 1]}</span></div>
    <div class="table-wrap"><table class="grid" style="min-width:1000px"><thead><tr><th style="text-align:left">Perangkat daerah</th><th>Indikator</th><th>Rencana aksi</th><th>Kelengkapan</th><th>Capaian</th><th>Anggaran</th><th>Realisasi</th><th>Serapan</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${esc(C.pdNamaLengkap(r.pid))}</td><td class="n">${r.nInd}</td><td class="n">${r.m.n}</td><td>${pbar(r.m.kelengkapan)}</td><td>${pbar(r.m.capaian)}</td><td class="n">${fmtRp(r.m.anggaran)}</td><td class="n">${fmtRp(r.m.realisasi)}</td><td class="n">${pct(r.m.serapan)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

export function indikatorTab(tw) {
  const G = groups();
  let prev = '';
  return `<section class="card" aria-labelledby="h-perind"><div class="stack" style="gap:2px"><h2 id="h-perind">Per indikator</h2><span class="small muted">s.d. Triwulan ${TW_LABEL[tw - 1]} · target dan baseline dari Master Indikator</span></div>
    <div class="table-wrap"><table class="grid" style="min-width:1100px"><thead><tr><th style="text-align:left">Indikator</th><th>Target</th><th>Baseline</th><th>Rencana aksi</th><th>Kelengkapan</th><th>Capaian</th><th>Anggaran</th><th>Serapan</th></tr></thead>
    <tbody>${G.ind.map((i) => {
      const head = i.kelompok !== prev ? `<tr class="ind"><td colspan="8">${i.jenis === 'tematik' ? 'RB Tematik · ' : 'RB General · '}${esc(i.kelompok)}</td></tr>` : '';
      prev = i.kelompok;
      const m = C.metrics(C.approved((t) => t.indikatorId === i.id), tw);
      return `${head}<tr><td>${i.jenis === 'general' ? `${i.no}. ` : ''}${esc(i.nama)}<div class="xs muted">${i.pengampu.map(C.pdNama).join(', ') || 'Belum ada pengampu'}</div></td>
        <td class="n">${i.target === null ? '–' : fmtNum(i.target)}</td><td class="n">${i.baseline === null ? '–' : fmtNum(i.baseline)}</td><td class="n">${m.n}</td>
        <td>${m.n ? pbar(m.kelengkapan) : '<span class="muted xs">belum ada</span>'}</td><td>${m.n ? pbar(m.capaian) : ''}</td><td class="n">${m.n ? fmtRp(m.anggaran) : ''}</td><td class="n">${m.n ? pct(m.serapan) : ''}</td></tr>`;
    }).join('')}</tbody></table></div></section>`;
}

export function perhatianTab(tw) {
  const G = groups();
  const tanpaRA = G.ind.filter((i) => !C.approved((t) => t.indikatorId === i.id).length);
  const tanpaTarget = G.gen.filter((i) => i.target === null);
  const belumLapor = [];
  for (const t of G.tagsAll) {
    const sk = db.get('subkegiatan', t.subkegiatanId);
    if (!sk) continue;
    const miss = [1, 2, 3, 4].slice(0, tw).filter((i) => !C.terlapor(sk, i));
    if (miss.length) belumLapor.push({ t, sk, miss });
  }
  const rendah = G.tagsAll.map((t) => ({ t, c: C.capaianTag(t, tw) })).filter((x) => x.c !== null && x.c < 50).sort((a, b) => a.c - b.c);
  const ind = (id) => db.get('indikator', id);
  return `<div class="dash-grid">
    <section class="card span-6"><h2>Indikator belum punya rencana aksi (${tanpaRA.length})</h2>
      <ul class="small" style="margin:0;padding-left:18px;line-height:24px">${tanpaRA.map((i) => `<li>${esc(i.nama)} <span class="muted">· ${i.pengampu.map(C.pdNama).join(', ') || 'tanpa pengampu'}</span></li>`).join('') || '<li>Tidak ada</li>'}</ul></section>
    <section class="card span-6"><h2>Indikator General belum ada target (${tanpaTarget.length})</h2>
      <ul class="small" style="margin:0;padding-left:18px;line-height:24px">${tanpaTarget.map((i) => `<li>${i.no}. ${esc(i.nama)}</li>`).join('') || '<li>Tidak ada</li>'}</ul></section>
    <section class="card span-12"><h2>Realisasi output belum dilaporkan s.d. TW ${TW_LABEL[tw - 1]} (${belumLapor.length} rencana aksi)</h2>
      <div class="table-wrap"><table class="grid" style="min-width:820px"><thead><tr><th style="text-align:left">Rencana aksi</th><th style="text-align:left">Indikator</th><th>PD</th><th>Triwulan belum terlapor</th></tr></thead>
      <tbody>${belumLapor.map((x) => `<tr><td>${esc(x.t.narasi || x.sk.nama)}</td><td>${esc(ind(x.t.indikatorId)?.nama || '')}</td><td class="c">${esc(C.pdNama(x.t.pdId))}</td><td class="c">${x.miss.map((i) => `TW ${TW_LABEL[i - 1]}`).join(', ')}</td></tr>`).join('') || '<tr><td colspan="4" class="c">Semua sudah dilaporkan</td></tr>'}</tbody></table></div></section>
    <section class="card span-12"><h2>Capaian di bawah 50% (${rendah.length})</h2>
      <div class="table-wrap"><table class="grid" style="min-width:820px"><thead><tr><th style="text-align:left">Rencana aksi</th><th style="text-align:left">Indikator</th><th>PD</th><th>Capaian</th></tr></thead>
      <tbody>${rendah.map((x) => `<tr><td>${esc(x.t.narasi || db.get('subkegiatan', x.t.subkegiatanId)?.nama || '')}</td><td>${esc(ind(x.t.indikatorId)?.nama || '')}</td><td class="c">${esc(C.pdNama(x.t.pdId))}</td><td>${pbar(x.c)}</td></tr>`).join('') || '<tr><td colspan="4" class="c">Tidak ada</td></tr>'}</tbody></table></div></section>
  </div>`;
}
