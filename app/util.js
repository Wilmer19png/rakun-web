/* RAKÜN · utilidades compartidas por el gestor, el portal y los formularios */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Escapa texto antes de ponerlo en HTML (todo lo que escribe un visitante pasa por aquí). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Convierte lo que escribió la persona en un enlace seguro (solo http/https). */
export function safeUrl(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch { return ''; }
}

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** "hace 2 h", "ayer", "hace 3 d" */
export function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  if (s < 604800) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Solo dígitos para wa.me. Un celular colombiano de 10 dígitos (3xx…) lleva el 57 delante. */
export const waNumber = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? `57${d}` : d;
};

/* Campos de WhatsApp o teléfono (data-digits): solo aceptan números, también al pegar. */
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.matches?.('[data-digits]')) return;
  const v = el.value.replace(/\D/g, '');
  if (v !== el.value) el.value = v;
});
