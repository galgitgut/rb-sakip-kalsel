// Admin · Pengguna: buat akun (satuan/massal), reset password, aktif/nonaktif, buka kunci.
// Password baru ditampilkan SEKALI setelah dibuat/di-reset, lalu hanya hash-nya yang disimpan.
import * as db from '../data/store.js';
import { esc, fmtDate, openDialog, toast } from '../util.js';
import { pageHead } from './shared.js';
import { createUser, setPassword, randomPassword, suggestUsername, MIN_PW, currentUser } from '../auth.js';
import { writeXlsx, downloadBlob } from '../xlsx-lite.js';

let kredensial = [];   // [{nama, username, password}] — hanya di memori halaman ini
let q = '';

const pdNama = (id) => db.get('pd', id)?.nama || '';
const terkunci = (u) => u.kunciSampai && Date.now() < u.kunciSampai;

function tambahDialog(ctx) {
  const pds = db.all('pd');
  openDialog(`<form method="dialog" class="dlg">
    <h2>Tambah pengguna</h2>
    <label class="field">Peran<select name="role"><option value="pd">PD pengampu</option><option value="admin">Admin (Biro Organisasi)</option></select></label>
    <label class="field" data-pdfield>Perangkat daerah<select name="pdId">${pds.map((p) => `<option value="${p.id}">${esc(p.nama)}</option>`).join('')}</select></label>
    <label class="field">Nama pada akun<input name="nama" required value="${esc(pds[0]?.nama || '')}"></label>
    <label class="field">Username<input name="username" required autocapitalize="none" spellcheck="false" value="${esc(suggestUsername(pds[0]?.id))}"><span class="hint">3–30 karakter: huruf kecil, angka, titik, strip, garis bawah.</span></label>
    <label class="field">Password<input name="password" placeholder="Kosongkan agar dibuat acak"><span class="hint">Minimal ${MIN_PW} karakter. Password ditampilkan sekali setelah disimpan.</span></label>
    <label class="inline small" style="gap:8px"><input type="checkbox" name="wajib" checked style="width:18px;height:18px">Wajib ganti password saat login pertama</label>
    <div class="inline" style="justify-content:flex-end"><button class="btn secondary" value="batal" formnovalidate>Batal</button><button class="btn" value="simpan">Buat akun</button></div>
  </form>`, async (fd) => {
    const res = await createUser({ username: fd.get('username'), nama: fd.get('nama'), role: fd.get('role'), pdId: fd.get('pdId'), password: fd.get('password'), wajibGanti: fd.get('wajib') === 'on' });
    kredensial = [res];
    toast('Akun dibuat'); ctx.rerender();
  });
  const dlg = document.querySelector('dialog:last-of-type');
  const role = dlg.querySelector('[name=role]'); const pd = dlg.querySelector('[name=pdId]');
  const nama = dlg.querySelector('[name=nama]'); const un = dlg.querySelector('[name=username]');
  const sync = () => {
    const isPd = role.value === 'pd';
    dlg.querySelector('[data-pdfield]').style.display = isPd ? '' : 'none';
    if (isPd) { nama.value = pdNama(pd.value); un.value = suggestUsername(pd.value); } else { nama.value = 'Admin Biro Organisasi'; un.value = suggestUsername('admin'); }
  };
  role.addEventListener('change', sync); pd.addEventListener('change', sync);
}

function resetDialog(ctx, u) {
  openDialog(`<form method="dialog" class="dlg">
    <h2>Reset password</h2>
    <p class="small" style="margin:0"><b>${esc(u.username)}</b> · ${esc(u.nama)}</p>
    <label class="field">Password baru<input name="password" placeholder="Kosongkan agar dibuat acak"><span class="hint">Semua sesi akun ini akan keluar. Pengguna wajib mengganti password saat login berikutnya.</span></label>
    <div class="inline" style="justify-content:flex-end"><button class="btn secondary" value="batal" formnovalidate>Batal</button><button class="btn" value="simpan">Reset</button></div>
  </form>`, async (fd) => {
    const pw = String(fd.get('password') || '').trim() || randomPassword();
    await setPassword(u.id, pw, { wajibGanti: true });
    kredensial = [{ nama: u.nama, username: u.username, password: pw }];
    toast('Password di-reset'); ctx.rerender();
  });
}

async function buatMassal(ctx, pdTanpa) {
  if (!confirm(`Buat ${pdTanpa.length} akun untuk PD pengampu yang belum punya akun? Password dibuat acak.`)) return;
  const out = [];
  for (const p of pdTanpa) out.push(await createUser({ username: suggestUsername(p.id), nama: p.nama, role: 'pd', pdId: p.id, wajibGanti: true }));
  kredensial = out;
  toast(`${out.length} akun dibuat`); ctx.rerender();
}

export function render(el, ctx) {
  const me = currentUser();
  const users = db.all('pengguna');
  const pengampu = [...new Set(db.all('indikator').flatMap((i) => i.pengampu))];
  const punyaAkun = new Set(users.filter((u) => u.role === 'pd' && u.aktif).map((u) => u.pdId));
  const pdTanpa = pengampu.filter((p) => !punyaAkun.has(p)).map((id) => db.get('pd', id)).filter(Boolean);
  const list = users.slice().sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === 'admin' ? -1 : 1));

  el.innerHTML = `
  ${pageHead('Admin', 'Pengguna', 'Admin membuat akun dan menyiapkan password. Hak tiap akun PD mengikuti PD-nya di menu Hak Akses & Pembagian.',
    `<button class="btn outline" id="btn-massal" ${pdTanpa.length ? '' : 'disabled'}>Buat akun untuk PD tanpa akun (${pdTanpa.length})</button><button class="btn" id="btn-tambah">+ Tambah pengguna</button>`)}
  ${kredensial.length ? `<section class="card" style="border:2px solid var(--orange)" aria-labelledby="h-kred">
    <div class="inline between"><h2 id="h-kred">Username & password baru (${kredensial.length})</h2>
      <span class="inline"><button class="btn secondary small" id="kred-salin">Salin semua</button><button class="btn secondary small" id="kred-xlsx">Unduh .xlsx</button><button class="btn secondary small" id="kred-tutup">Tutup</button></span></div>
    <p class="note warn small" style="margin:0">Password hanya ditampilkan <b>sekali ini</b>. Simpan atau bagikan ke pengguna sekarang; setelah ditutup, password tidak bisa dilihat lagi (hanya bisa di-reset).</p>
    <div class="table-wrap"><table class="t"><thead><tr><th>Nama</th><th>Username</th><th>Password</th></tr></thead>
    <tbody>${kredensial.map((k) => `<tr><td>${esc(k.nama)}</td><td class="mono">${esc(k.username)}</td><td class="mono"><b>${esc(k.password)}</b></td></tr>`).join('')}</tbody></table></div>
  </section>` : ''}
  <section class="card pad-s"><div class="filters"><label class="field wide">Cari pengguna<input type="search" id="q" value="${esc(q)}" placeholder="Username, nama, atau PD…"></label></div></section>
  <section class="card flush" aria-label="Daftar pengguna"><div class="table-wrap"><table class="t" style="min-width:980px">
    <thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th>Status</th><th>Login terakhir</th><th>Dibuat</th><th><span class="sr-only">Aksi</span></th></tr></thead>
    <tbody>${list.map((u) => `<tr data-cari="${esc(`${u.username} ${u.nama} ${pdNama(u.pdId)}`.toLowerCase())}">
      <td class="mono">${esc(u.username)}${u.id === me?.id ? ' <span class="badge b-green">Anda</span>' : ''}</td>
      <td>${esc(u.nama)}</td>
      <td>${u.role === 'admin' ? '<span class="badge b-ok">Admin</span>' : `<span class="badge b-none">PD</span> <span class="xs muted">${esc(db.get('pd', u.pdId)?.singkatan || '')}</span>`}</td>
      <td>${u.aktif ? (terkunci(u) ? '<span class="badge b-wait">Terkunci sementara</span>' : '<span class="badge b-green">Aktif</span>') : '<span class="badge b-none">Nonaktif</span>'}${u.wajibGanti ? '<div class="xs muted">wajib ganti password</div>' : ''}</td>
      <td class="small">${u.loginTerakhir ? new Date(u.loginTerakhir).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '<span class="muted">belum pernah</span>'}</td>
      <td class="small">${fmtDate(u.dibuat)}</td>
      <td><span class="inline" style="gap:6px;flex-wrap:nowrap">
        <button class="btn secondary small" data-reset="${u.id}">Reset password</button>
        ${terkunci(u) ? `<button class="btn secondary small" data-unlock="${u.id}">Buka kunci</button>` : ''}
        <button class="btn ${u.aktif ? 'danger' : 'outline'} small" data-active="${u.id}" ${u.id === me?.id ? 'disabled title="Tidak bisa menonaktifkan akun sendiri"' : ''}>${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
      </span></td></tr>`).join('')}</tbody></table></div></section>
  <p class="xs muted" style="margin:0">Keamanan: password disimpan sebagai hash PBKDF2-SHA256 dengan salt; 5 kali salah password mengunci akun 10 menit; reset password mengeluarkan semua sesi akun tersebut. Pada prototipe ini data akun masih tersimpan di browser — pemeriksaan password pindah ke server pada tahap Firebase.</p>`;

  const saring = () => { const qq = q.trim().toLowerCase(); el.querySelectorAll('tr[data-cari]').forEach((tr) => { tr.hidden = !!qq && !tr.dataset.cari.includes(qq); }); };
  el.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; saring(); });
  saring();
  el.querySelector('#btn-tambah').addEventListener('click', () => tambahDialog(ctx));
  el.querySelector('#btn-massal').addEventListener('click', () => buatMassal(ctx, pdTanpa).catch((e) => toast(e.message)));
  el.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => resetDialog(ctx, db.get('pengguna', b.dataset.reset))));
  el.querySelectorAll('[data-unlock]').forEach((b) => b.addEventListener('click', async () => { const u = db.get('pengguna', b.dataset.unlock); await db.save('pengguna', { ...u, kunciSampai: 0, gagal: 0 }); toast('Kunci dibuka'); ctx.rerender(); }));
  el.querySelectorAll('[data-active]').forEach((b) => b.addEventListener('click', async () => {
    const u = db.get('pengguna', b.dataset.active);
    if (u.aktif && u.role === 'admin' && db.where('pengguna', (x) => x.role === 'admin' && x.aktif).length <= 1) { toast('Minimal harus ada satu admin aktif.'); return; }
    if (u.aktif && !confirm(`Nonaktifkan akun ${u.username}? Akun tidak bisa masuk sampai diaktifkan lagi.`)) return;
    await db.save('pengguna', { ...u, aktif: !u.aktif, sesiVersi: (u.sesiVersi || 0) + (u.aktif ? 1 : 0) });
    toast(u.aktif ? 'Akun dinonaktifkan' : 'Akun diaktifkan'); ctx.rerender();
  }));
  el.querySelector('#kred-tutup')?.addEventListener('click', () => { if (confirm('Password tidak bisa ditampilkan lagi setelah ditutup. Lanjutkan?')) { kredensial = []; ctx.rerender(); } });
  el.querySelector('#kred-salin')?.addEventListener('click', async () => {
    const text = kredensial.map((k) => `${k.nama}\tusername: ${k.username}\tpassword: ${k.password}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast('Disalin ke papan klip'); } catch (e) { toast('Tidak bisa menyalin otomatis. Pilih teks di tabel lalu salin manual.'); }
  });
  el.querySelector('#kred-xlsx')?.addEventListener('click', async () => {
    downloadBlob(await writeXlsx([{ name: 'Akun', rows: [['nama', 'username', 'password'], ...kredensial.map((k) => [k.nama, k.username, k.password])], boldRows: 1, cols: [50, 20, 16] }]), 'akun_baru_rb_sakip.xlsx');
  });
}
