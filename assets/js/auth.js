// Login SIMULASI untuk prototipe tahap 1 (tanpa kata sandi).
// Tahap 2: diganti Firebase Authentication; bentuk objek user dipertahankan:
//   { role: 'admin' | 'pd', pdId: string|null, nama: string }
const KEY = 'rbsakip:user';

export function currentUser() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return window.__rbUser || null;
  }
}

export function login(user) {
  try { sessionStorage.setItem(KEY, JSON.stringify(user)); } catch (e) { window.__rbUser = user; }
}

export function logout() {
  try { sessionStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
  window.__rbUser = null;
}
