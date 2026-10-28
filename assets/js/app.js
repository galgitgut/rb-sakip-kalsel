// Kerangka aplikasi internal: login, menu atas, sub-tab, dan perpindahan halaman (#/bagian/sub).
import * as db from './data/store.js';
import { currentUser, login, logout } from './auth.js';
import { esc, toast } from './util.js';
import { APP } from './config.js';

import * as rencanaGeneral from './pages/rencana-general.js';
import * as rencanaTematik from './pages/rencana-tematik.js';
import * as realisasi from './pages/realisasi.js';
import * as tagging from './pages/tagging.js';
import * as tematik from './pages/tematik.js';
import * as indikator from './pages/indikator.js';
import * as akses from './pages/akses.js';
import * as verifikasi from './pages/verifikasi.js';
import * as ekspor from './pages/ekspor.js';
import * as infografis from './pages/infografis.js';
import * as impor from './pages/impor.js';

const ALL = ['admin', 'pd'];
const SECTIONS = {
  'rb-general': {
    label: 'RB General', roles: ALL, tabs: [
      { key: 'tabel', label: 'Tabel Rencana Aksi', mod: rencanaGeneral, roles: ALL },
      { key: 'tagging', label: 'Tagging Sub Kegiatan', mod: tagging, roles: ['pd'] },
    ],
  },
  'rb-tematik': {
    label: 'RB Tematik', roles: ALL, tabs: [
      { key: 'tabel', label: 'Tabel Rencana Aksi', mod: rencanaTematik, roles: ALL },
      { key: 'isian', label: 'Isian RB Tematik', mod: tematik, roles: ['pd'] },
    ],
  },
  realisasi: {
    label: 'Realisasi RB', roles: ALL, tabs: [
      { key: 'general', label: 'RB General', mod: realisasi, roles: ALL },
      { key: 'tematik', label: 'RB Tematik', mod: realisasi, roles: ALL },
    ],
  },
  admin: {
    label: 'Admin', roles: ['admin'], tabs: [
      { key: 'verifikasi', label: 'Verifikasi Tag', mod: verifikasi, roles: ['admin'], count: () => db.where('tag', (t) => t.status === 'diajukan').length },
      { key: 'indikator', label: 'Master Indikator', mod: indikator, roles: ['admin'] },
      { key: 'akses', label: 'Hak Akses & Pembagian', mod: akses, roles: ['admin'] },
      { key: 'ekspor', label: 'Ekspor KemenPANRB', mod: ekspor, roles: ['admin'] },
      { key: 'infografis', label: 'Infografis Beranda', mod: infografis, roles: ['admin'] },
      { key: 'impor', label: 'Impor Sinergi & Data', mod: impor, roles: ['admin'] },
    ],
  },
};

const app = document.getElementById('app');

function parseHash() {
  const [sec = '', sub = ''] = location.hash.replace(/^#\/?/, '').split('?')[0].split('/');
  return { sec, sub };
}
const defaultPath = (user) => (user.role === 'admin' ? 'admin/verifikasi' : 'rb-general/tagging');

function renderLogin() {
  const pds = db.all('pd');
  app.innerHTML = `<main class="wrap" style="max-width:560px;padding-top:48px;padding-bottom:48px">
    <div class="card" style="gap:18px">
      <div class="stack" style="gap:4px"><span class="small muted">${esc(APP.instansi)}</span><h1 style="font-size:26px">Masuk ke ${esc(APP.nama)}</h1>
        <p class="muted" style="margin:0">Prototipe: pilih akun untuk mencoba. Di versi live, setiap akun masuk dengan email dan kata sandi.</p></div>
      <form id="f-login" class="stack" style="gap:14px">
        <label class="field">Akun
          <select name="akun" required>
            <option value="admin">Admin · Biro Organisasi (verifikator)</option>
            <optgroup label="PD Pengampu">${pds.map((p) => `<option value="pd:${p.id}">${esc(p.nama)}</option>`).join('')}</optgroup>
          </select>
        </label>
        <button class="btn" type="submit">Masuk</button>
      </form>
      <a href="index.html" class="small">← Kembali ke Beranda publik</a>
    </div></main>`;
  app.querySelector('#f-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get('akun');
    if (v === 'admin') login({ role: 'admin', pdId: null, nama: 'Admin · Biro Organisasi' });
    else {
      const pd = db.get('pd', v.slice(3));
      login({ role: 'pd', pdId: pd.id, nama: pd.nama, singkatan: pd.singkatan });
    }
    history.replaceState(null, '', '#/' + defaultPath(currentUser()));
    renderApp();
  });
}

async function renderApp() {
  const user = currentUser();
  if (!user) { renderLogin(); return; }
  let { sec, sub } = parseHash();
  let section = SECTIONS[sec];
  if (!section || !section.roles.includes(user.role)) {
    [sec, sub] = defaultPath(user).split('/');
    section = SECTIONS[sec];
  }
  const tabs = section.tabs.filter((t) => t.roles.includes(user.role));
  const tab = tabs.find((t) => t.key === sub) || tabs[0];
  history.replaceState(null, '', `#/${sec}/${tab.key}`);

  const navItems = Object.entries(SECTIONS).filter(([, s]) => s.roles.includes(user.role));
  app.innerHTML = `
  <header class="topbar"><div class="in">
    <a class="logo" href="index.html"><span class="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span><b>${esc(APP.nama)}</b></a>
    <nav class="topnav" aria-label="Menu utama">
      <a href="index.html">Beranda</a>
      ${navItems.map(([k, s]) => `<a href="#/${k}" ${k === sec ? 'aria-current="page"' : ''}>${esc(s.label)}</a>`).join('')}
    </nav>
    <div class="userbox"><span><span class="muted">Masuk sebagai</span><b>${esc(user.role === 'admin' ? user.nama : `PD · ${user.singkatan || user.nama}`)}</b></span>
      <button type="button" class="btn secondary small" id="btn-logout">Keluar</button></div>
  </div></header>
  <div class="page-wide">
    ${tabs.length > 1 ? `<nav class="subtabs" aria-label="${esc(section.label)}">${tabs.map((t) => {
      const n = t.count ? t.count() : 0;
      return `<a href="#/${sec}/${t.key}" ${t === tab ? 'aria-current="page"' : ''}>${esc(t.label)}${n ? `<span class="count">${n}</span>` : ''}</a>`;
    }).join('')}</nav>` : ''}
    <main id="page" class="stack" style="gap:20px"></main>
  </div>`;
  app.querySelector('#btn-logout').addEventListener('click', () => { logout(); history.replaceState(null, '', location.pathname); renderApp(); });
  document.title = `${tab.label} · ${section.label} · ${APP.nama}`;
  const el = app.querySelector('#page');
  const ctx = { user, sec, sub: tab.key };
  // Bagian yang menampilkan hitungan di sub-tab digambar ulang seluruhnya agar angkanya ikut berubah.
  ctx.rerender = section.tabs.some((t) => t.count) ? () => renderApp() : () => tab.mod.render(el, ctx);
  try {
    await tab.mod.render(el, ctx);
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="note warn">Terjadi kesalahan: ${esc(e.message)}</div>`;
  }
}

window.addEventListener('hashchange', renderApp);
db.init().then(renderApp).catch((e) => { app.innerHTML = `<p class="empty">${esc(e.message)}</p>`; toast(e.message); });
