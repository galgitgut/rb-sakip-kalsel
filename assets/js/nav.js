// Menu atas untuk pengguna yang sudah login — dipakai di Beranda (index.html) dan aplikasi (app.html).
import { esc, openDialog, toast } from './util.js';
import { APP } from './config.js';
import { logout, changeMyPassword, MIN_PW } from './auth.js';

export const NAV = [
  { key: 'rb-general', label: 'RB General', roles: ['admin', 'pd'] },
  { key: 'rb-tematik', label: 'RB Tematik', roles: ['admin', 'pd'] },
  { key: 'realisasi', label: 'Realisasi RB', roles: ['admin', 'pd'] },
  { key: 'admin', label: 'Admin', roles: ['admin'] },
];

const LOGO = '<span class="mark"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg></span>';

// active: 'beranda' atau salah satu key NAV
export function topbarHtml(user, active) {
  const items = NAV.filter((n) => n.roles.includes(user.role));
  return `<header class="topbar"><div class="in">
    <a class="logo" href="index.html">${LOGO}<b>${esc(APP.nama)}</b></a>
    <nav class="topnav" aria-label="Menu utama">
      <a href="index.html" ${active === 'beranda' ? 'aria-current="page"' : ''}>Beranda</a>
      ${items.map((n) => `<a href="app.html#/${n.key}" ${n.key === active ? 'aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}
    </nav>
    <div class="userbox"><span><span class="muted">Masuk sebagai</span><b>${esc(user.role === 'admin' ? user.nama : `${user.username} · ${user.singkatan || user.nama}`)}</b></span>
      <button type="button" class="btn secondary small" data-act="pw">Ganti password</button>
      <button type="button" class="btn secondary small" data-act="logout">Keluar</button></div>
  </div></header>`;
}

export function publicHeaderHtml() {
  return `<header class="pub-head"><div class="wrap">
    <a class="logo" href="index.html">${LOGO}<span style="display:flex;flex-direction:column;line-height:18px"><b style="font-size:16px">${esc(APP.nama)}</b><span class="xs muted">${esc(APP.instansi)}</span></span></a>
    <nav class="pub-nav" aria-label="Bagian halaman"><a href="#ringkasan">Ringkasan</a><a href="#infografis">Infografis</a></nav>
    <a class="btn" href="app.html">Masuk</a>
  </div></header>`;
}

export function passwordDialog({ wajib = false, onDone } = {}) {
  openDialog(`<form method="dialog" class="dlg">
    <h2>${wajib ? 'Buat password baru' : 'Ganti password'}</h2>
    ${wajib ? '<p class="note info small" style="margin:0">Akun Anda memakai password dari admin. Buat password baru sebelum melanjutkan.</p>' : ''}
    <label class="field">Password saat ini<input type="password" name="lama" autocomplete="current-password" required></label>
    <label class="field">Password baru<input type="password" name="baru" autocomplete="new-password" minlength="${MIN_PW}" required><span class="hint">Minimal ${MIN_PW} karakter.</span></label>
    <label class="field">Ulangi password baru<input type="password" name="ulang" autocomplete="new-password" required></label>
    <div class="inline" style="justify-content:flex-end">${wajib ? '' : '<button class="btn secondary" value="batal" formnovalidate>Batal</button>'}<button class="btn" value="simpan">Simpan password</button></div>
  </form>`, async (fd) => {
    if (fd.get('baru') !== fd.get('ulang')) throw new Error('Ulangan password baru tidak sama.');
    await changeMyPassword(fd.get('lama'), fd.get('baru'));
    toast('Password berhasil diganti');
    onDone?.();
  }, { wajib });
}

export function bindTopbar(root, { onLogout, onPassword } = {}) {
  root.querySelector('[data-act="logout"]')?.addEventListener('click', () => { logout(); onLogout?.(); });
  root.querySelector('[data-act="pw"]')?.addEventListener('click', () => passwordDialog({ onDone: onPassword }));
}
