// Login dengan username + password yang disiapkan admin (pola KaRamBa RB).
//
// PROTOTIPE: akun disimpan di koleksi 'pengguna' (browser). Password tidak pernah disimpan,
// hanya hash PBKDF2-SHA256 + salt. Karena data prototipe ada di browser, ini BELUM aman
// untuk data sungguhan — pada tahap 2 pemeriksaan password pindah ke server (Firebase).
//
// Bentuk user yang dipakai halaman: { id, username, nama, role: 'admin'|'pd', pdId, singkatan, wajibGanti }
import * as db from './data/store.js';

const SESI_KEY = 'rbsakip:sesi';
const SESI_MS = 8 * 60 * 60 * 1000;      // 8 jam, diperpanjang setiap aktivitas
const MAX_GAGAL = 5;                     // 5 kali salah…
const KUNCI_MS = 10 * 60 * 1000;         // …akun terkunci 10 menit
const ITER = 100000;
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const MIN_PW = 6;

// ---------- hash ----------
export async function hashPassword(pw, salt, iter = ITER) {
  if (!window.crypto?.subtle) throw new Error('Browser tidak mendukung enkripsi. Buka lewat https atau localhost.');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: iter, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function newSalt() {
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function randomPassword(n = 10) {
  const ab = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return [...crypto.getRandomValues(new Uint8Array(n))].map((b) => ab[b % ab.length]).join('');
}

// ---------- sesi ----------
function readSesi() {
  try { return JSON.parse(localStorage.getItem(SESI_KEY) || 'null'); } catch (e) { return window.__rbSesi || null; }
}
function writeSesi(s) {
  try { if (s) localStorage.setItem(SESI_KEY, JSON.stringify(s)); else localStorage.removeItem(SESI_KEY); } catch (e) { window.__rbSesi = s; }
}

function toUser(u) {
  const pd = u.pdId ? db.get('pd', u.pdId) : null;
  return { id: u.id, username: u.username, nama: u.nama, role: u.role, pdId: u.pdId || null, singkatan: pd?.singkatan || '', wajibGanti: !!u.wajibGanti };
}

// Butuh db.init() lebih dulu.
export function currentUser() {
  const s = readSesi();
  if (!s || !s.uid || Date.now() > s.exp) { if (s) writeSesi(null); return null; }
  const u = db.get('pengguna', s.uid);
  if (!u || !u.aktif || (u.sesiVersi || 0) !== (s.v || 0)) { writeSesi(null); return null; }
  writeSesi({ ...s, exp: Date.now() + SESI_MS });
  return toUser(u);
}

export function logout() { writeSesi(null); }

export async function login(username, password) {
  const uname = String(username || '').trim().toLowerCase();
  if (!uname || !password) return { ok: false, msg: 'Isi username dan password.' };
  const u = db.where('pengguna', (x) => x.username === uname)[0];
  if (u && u.kunciSampai && Date.now() < u.kunciSampai) {
    const menit = Math.ceil((u.kunciSampai - Date.now()) / 60000);
    return { ok: false, msg: `Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.` };
  }
  const cocok = !!u && u.aktif && (await hashPassword(String(password), u.salt, u.iter || ITER)) === u.hash;
  if (!cocok) {
    if (u) {
      const gagal = (u.gagal || 0) + 1;
      await db.save('pengguna', { ...u, gagal: gagal >= MAX_GAGAL ? 0 : gagal, kunciSampai: gagal >= MAX_GAGAL ? Date.now() + KUNCI_MS : u.kunciSampai || 0 });
    }
    return { ok: false, msg: 'Username atau password salah, atau akun nonaktif.' };
  }
  await db.save('pengguna', { ...u, gagal: 0, kunciSampai: 0, loginTerakhir: new Date().toISOString() });
  writeSesi({ uid: u.id, v: u.sesiVersi || 0, exp: Date.now() + SESI_MS });
  return { ok: true, user: toUser(u) };
}

// ---------- kelola password ----------
// Menaikkan sesiVersi membuat semua sesi lama akun itu tidak berlaku (perangkat lain harus login ulang).
export async function setPassword(userId, pw, { wajibGanti = false, keepSession = false } = {}) {
  if (String(pw).length < MIN_PW) throw new Error(`Password minimal ${MIN_PW} karakter.`);
  const u = db.get('pengguna', userId);
  const salt = newSalt();
  const versi = (u.sesiVersi || 0) + 1;
  await db.save('pengguna', { ...u, salt, hash: await hashPassword(pw, salt), iter: ITER, wajibGanti, gagal: 0, kunciSampai: 0, sesiVersi: versi });
  if (keepSession) { const s = readSesi(); if (s && s.uid === userId) writeSesi({ ...s, v: versi }); }
}

export async function changeMyPassword(lama, baru) {
  const me = currentUser();
  if (!me) throw new Error('Sesi habis. Silakan masuk lagi.');
  const u = db.get('pengguna', me.id);
  if ((await hashPassword(String(lama), u.salt, u.iter || ITER)) !== u.hash) throw new Error('Password lama salah.');
  if (String(baru) === String(lama)) throw new Error('Password baru harus berbeda dari password lama.');
  await setPassword(u.id, baru, { wajibGanti: false, keepSession: true });
}

export async function createUser({ username, nama, role, pdId, password, wajibGanti = true }) {
  const uname = String(username || '').trim().toLowerCase();
  if (!USERNAME_RE.test(uname)) throw new Error('Username 3–30 karakter: huruf kecil, angka, titik, strip atau garis bawah (diawali huruf/angka).');
  if (db.where('pengguna', (x) => x.username === uname).length) throw new Error(`Username "${uname}" sudah dipakai.`);
  if (!String(nama || '').trim()) throw new Error('Nama wajib diisi.');
  if (role === 'pd' && !db.get('pd', pdId)) throw new Error('Pilih perangkat daerah untuk akun PD.');
  const pw = String(password || '').trim() || randomPassword();
  if (pw.length < MIN_PW) throw new Error(`Password minimal ${MIN_PW} karakter.`);
  const salt = newSalt();
  await db.save('pengguna', {
    id: db.newId('pengguna'), username: uname, nama: String(nama).trim(), role: role === 'admin' ? 'admin' : 'pd', pdId: role === 'admin' ? null : pdId,
    salt, hash: await hashPassword(pw, salt), iter: ITER, aktif: true, dibuat: new Date().toISOString().slice(0, 10),
    loginTerakhir: null, gagal: 0, kunciSampai: 0, wajibGanti, sesiVersi: 0,
  });
  return { username: uname, nama: String(nama).trim(), password: pw };
}

export function suggestUsername(base) {
  let b = String(base || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20).replace(/-+$/, '');
  if (b.length < 3) b = `${b}akun`.slice(0, 20);
  const taken = new Set(db.all('pengguna').map((u) => u.username));
  let c = b; let n = 2;
  while (taken.has(c)) c = `${b}${n++}`;
  return c;
}
