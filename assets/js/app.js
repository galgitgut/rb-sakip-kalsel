// Kerangka aplikasi internal: login, menu atas, sub-tab, dan perpindahan halaman (#/bagian/sub).
import * as db from './data/store.js';
import { currentUser, login } from './auth.js';
import { esc, toast } from './util.js';
import { topbarHtml, bindTopbar, passwordDialog } from './nav.js';
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
import * as pengguna from './pages/pengguna.js';

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
      { key: 'pengguna', label: 'Pengguna', mod: pengguna, roles: ['admin'] },
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

function renderLogin(msg = '') {
  app.innerHTML = `<main class="wrap" style="max-width:520px;padding-top:48px;padding-bottom:48px">
    <div class="card" style="gap:18px">
      <div class="stack" style="gap:4px"><span class="small muted">${esc(APP.instansi)}</span><h1 style="font-size:26px">Masuk ke ${esc(APP.nama)}</h1>
        <p class="muted" style="margin:0">Gunakan username dan password yang diberikan admin Biro Organisasi.</p></div>
      <form id="f-login" class="stack" style="gap:14px" novalidate>
        <label class="field">Username<input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label class="field">Password
          <span class="inline" style="flex-wrap:nowrap;gap:8px"><input name="password" type="password" autocomplete="current-password" required style="flex:1 1 auto;min-width:0">
          <button type="button" class="btn secondary small" id="btn-lihat" aria-pressed="false">Lihat</button></span></label>
        <p id="login-msg" class="note warn small" role="alert" style="margin:0;${msg ? '' : 'display:none'}">${esc(msg)}</p>
        <button class="btn" type="submit" id="btn-masuk">Masuk</button>
      </form>
      <details class="small"><summary style="cursor:pointer;color:var(--primary);font-weight:600">Akun uji coba prototipe</summary>
        <div class="box" style="margin-top:8px;line-height:22px">Admin: <b>admin</b> / <b>admin2026</b><br>PD: kode PD sebagai username, password <b>demo2026</b><br>
        contoh <b>diskominfo</b>, <b>bappeda</b>, <b>bkd</b>, <b>inspektorat</b>, <b>biro-org</b></div></details>
      <a href="index.html" class="small">← Kembali ke Beranda publik</a>
    </div></main>`;
  const f = app.querySelector('#f-login');
  const pw = f.querySelector('input[name=password]');
  app.querySelector('#btn-lihat').addEventListener('click', (e) => {
    const show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
    e.target.setAttribute('aria-pressed', String(show)); e.target.textContent = show ? 'Sembunyikan' : 'Lihat';
  });
  f.querySelector('input[name=username]').focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const btn = app.querySelector('#btn-masuk');
    btn.disabled = true; btn.textContent = 'Memeriksa…';
    try {
      const res = await login(fd.get('username'), fd.get('password'));
      if (!res.ok) { renderLogin(res.msg); app.querySelector('input[name=username]').value = fd.get('username'); app.querySelector('input[name=password]').focus(); return; }
      const next = parseHash().sec ? location.hash : '#/' + defaultPath(res.user);
      history.replaceState(null, '', next);
      renderApp();
    } catch (err) { renderLogin(err.message); }
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

  app.innerHTML = `
  ${topbarHtml(user, sec)}
  <div class="page-wide">
    ${tabs.length > 1 ? `<nav class="subtabs" aria-label="${esc(section.label)}">${tabs.map((t) => {
      const n = t.count ? t.count() : 0;
      return `<a href="#/${sec}/${t.key}" ${t === tab ? 'aria-current="page"' : ''}>${esc(t.label)}${n ? `<span class="count">${n}</span>` : ''}</a>`;
    }).join('')}</nav>` : ''}
    <main id="page" class="stack" style="gap:20px"></main>
  </div>`;
  bindTopbar(app, { onLogout: () => { history.replaceState(null, '', location.pathname); renderApp(); } });
  if (user.wajibGanti) passwordDialog({ wajib: true, onDone: renderApp });
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
