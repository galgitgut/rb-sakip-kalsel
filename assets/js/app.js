// Kerangka aplikasi internal: login, menu samping, dan perpindahan halaman (#/nama-halaman).
import * as db from './data/store.js';
import { currentUser, login, logout } from './auth.js';
import { esc, icon, toast } from './util.js';
import { APP } from './config.js';

import * as indikator from './pages/indikator.js';
import * as akses from './pages/akses.js';
import * as tagging from './pages/tagging.js';
import * as tematik from './pages/tematik.js';
import * as verifikasi from './pages/verifikasi.js';
import * as ekspor from './pages/ekspor.js';
import * as infografis from './pages/infografis.js';
import * as impor from './pages/impor.js';

const ROUTES = {
  indikator: { mod: indikator, label: 'Master Indikator', icon: 'target', role: 'admin' },
  akses: { mod: akses, label: 'Hak Akses & Pembagian', icon: 'users', role: 'admin' },
  verifikasi: { mod: verifikasi, label: 'Verifikasi Tag', icon: 'check', role: 'admin' },
  ekspor: { mod: ekspor, label: 'Ekspor KemenPANRB', icon: 'download', role: 'admin' },
  infografis: { mod: infografis, label: 'Kelola Infografis', icon: 'image', role: 'admin' },
  impor: { mod: impor, label: 'Impor Sinergi', icon: 'upload', role: 'admin' },
  tagging: { mod: tagging, label: 'Tagging Sub Kegiatan', icon: 'tag', role: 'pd' },
  tematik: { mod: tematik, label: 'RB Tematik', icon: 'layers', role: 'pd' },
};

const app = document.getElementById('app');

function routeName() {
  return (location.hash.replace(/^#\/?/, '').split('?')[0]) || '';
}

function defaultRoute(user) {
  return user.role === 'admin' ? 'verifikasi' : 'tagging';
}

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
            <optgroup label="PD Pengampu">
              ${pds.map((p) => `<option value="pd:${p.id}">${esc(p.nama)}</option>`).join('')}
            </optgroup>
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
      login({ role: 'pd', pdId: pd.id, nama: `PD Pengampu · ${pd.singkatan}` });
    }
    history.replaceState(null, '', '#/' + defaultRoute(currentUser()));
    renderApp();
  });
}

function sidebar(user, active) {
  const link = (key) => {
    const r = ROUTES[key];
    return `<a href="#/${key}" ${key === active ? 'aria-current="page"' : ''}>${icon(r.icon)}${esc(r.label)}</a>`;
  };
  const keys = Object.keys(ROUTES).filter((k) => ROUTES[k].role === user.role);
  return `<nav class="side" aria-label="Menu utama">
    <div class="brand"><small>Pemprov Kalimantan Selatan</small><b>${esc(APP.nama)}</b></div>
    <div class="group"><a href="index.html">${icon('home')}Beranda Publik</a></div>
    <div class="group"><span class="group-label">${user.role === 'admin' ? 'Admin · Biro Organisasi' : 'PD Pengampu'}</span>${keys.map(link).join('')}</div>
    <div class="who"><small>Masuk sebagai</small><b class="small">${esc(user.nama)}</b><button type="button" id="btn-logout">Keluar</button></div>
  </nav>`;
}

async function renderApp() {
  const user = currentUser();
  if (!user) { renderLogin(); return; }
  let name = routeName();
  if (!ROUTES[name] || ROUTES[name].role !== user.role) {
    name = defaultRoute(user);
    history.replaceState(null, '', '#/' + name);
  }
  const route = ROUTES[name];
  app.innerHTML = `<div class="shell">${sidebar(user, name)}<main class="main" id="page"></main></div>`;
  app.querySelector('#btn-logout').addEventListener('click', () => { logout(); history.replaceState(null, '', location.pathname); renderApp(); });
  const el = app.querySelector('#page');
  document.title = `${route.label} · ${APP.nama}`;
  try {
    const ctx = { user };
    ctx.rerender = () => route.mod.render(el, ctx);
    await route.mod.render(el, ctx);
  } catch (e) {
    console.error(e);
    el.innerHTML = `<div class="note warn">Terjadi kesalahan: ${esc(e.message)}</div>`;
  }
  el.focus?.();
}

window.addEventListener('hashchange', renderApp);
db.init().then(renderApp).catch((e) => { app.innerHTML = `<p class="empty">${esc(e.message)}</p>`; toast(e.message); });
