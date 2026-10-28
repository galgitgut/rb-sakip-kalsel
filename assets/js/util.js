// Fungsi bantu tampilan.
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtNum(v, digits = 2) {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '';
  return Number(v).toLocaleString('id-ID', { maximumFractionDigits: digits });
}
export const fmtPct = (v, d = 1) => (v === null || v === undefined ? '—' : `${fmtNum(v, d)}%`);
export const fmtRp = (v) => (v === null || v === undefined || v === '' ? '—' : `Rp${Math.round(Number(v)).toLocaleString('id-ID')}`);
export function fmtMiliar(v) {
  return (Number(v) / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}
export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const today = () => new Date().toISOString().slice(0, 10);

// Angka dari input pengguna: "2,5" → 2.5 ; "1.450.000" → 1450000
export function parseNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// Dialog sederhana; html berisi <form method="dialog">.
export function openDialog(html, onSubmit, opts = {}) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = html;
  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');
  form.addEventListener('submit', async (e) => {
    const action = e.submitter?.value;
    if (action === 'batal') return;
    e.preventDefault();
    try {
      const ok = await onSubmit(new FormData(form), form, action);
      if (ok !== false) dlg.close();
    } catch (err) {
      toast(err.message);
    }
  });
  dlg.addEventListener('close', () => dlg.remove());
  if (opts.wajib) dlg.addEventListener('cancel', (e) => e.preventDefault()); // tidak bisa ditutup dengan Esc
  dlg.showModal();
  return dlg;
}

export const STATUS = {
  draf: ['Draf', 'b-draft'],
  diajukan: ['Menunggu verifikasi', 'b-wait'],
  disetujui: ['Disetujui', 'b-ok'],
  dikembalikan: ['Dikembalikan', 'b-back'],
  none: ['Belum di-tag', 'b-none'],
};
export const badge = (status) => {
  const [l, c] = STATUS[status] || STATUS.none;
  return `<span class="badge ${c}">${l}</span>`;
};

const P = {
  home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v5h16v-5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
};
export const icon = (name, size = 18, stroke = 'currentColor') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

export const TEMA_ICON = {
  'Pengentasan Kemiskinan': 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
  'Peningkatan Investasi': 'M3 17l6-6 4 4 8-8M15 7h6v6',
  'Mendorong Hilirisasi': 'M3 21V10l6 4V10l6 4V6h6v15z',
  'Mendorong Peningkatan Kualitas dan Akses Layanan Kesehatan': 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z',
  'Mendukung Ketahanan Pangan Nasional': 'M12 21V9M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7z',
  'Mendorong Peningkatan Akses, Kualitas, dan Mutu Pendidikan': 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
};
