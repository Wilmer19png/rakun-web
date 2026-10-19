/* ==========================================================================
   RAKÜN · contador propio de la página (gestor 11 · Métricas)
   Anota en Supabase (tabla page_events, fase 9): cada visita a una página,
   qué eligen en «¿Qué buscas?» y cada solicitud. Sin cookies ni datos
   personales: solo un id al azar por pestaña. Si algo falla, no pasa nada.
   ========================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const page = location.pathname.split('/').pop() || 'index.html';
let session = '';
try {
  session = sessionStorage.getItem('rakun:sid') || '';
  if (!session) { session = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('rakun:sid', session); }
} catch { /* modo privado */ }
// de qué anuncio viene (utm_… que se ponen en los anuncios de Meta): se recuerda toda la visita
export const utm = (() => {
  const q = new URLSearchParams(location.search);
  const now = { utm_source: q.get('utm_source'), utm_campaign: q.get('utm_campaign'), utm_content: q.get('utm_content') };
  if (!now.utm_source && q.get('fbclid')) now.utm_source = 'meta';          // clic desde Facebook/Instagram sin parámetros
  try {
    if (now.utm_source || now.utm_campaign) sessionStorage.setItem('rakun:utm', JSON.stringify(now));
    else Object.assign(now, JSON.parse(sessionStorage.getItem('rakun:utm') || '{}'));
  } catch { /* modo privado */ }
  const clean = {};
  Object.entries(now).forEach(([k, v]) => { if (v) clean[k] = String(v).slice(0, k === 'utm_source' ? 80 : 160); });
  return clean;
})();
window.rkUtm = utm;

const ref = (() => { try { const h = new URL(document.referrer).host; return h && h !== location.host ? h : ''; } catch { return ''; } })();

/** Anota un evento: 'view' (visita), 'pick' (mundo elegido) o 'lead' (solicitud). */
export function rkEvent(type, label = '', path = page) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || /^(localhost|127\.)/.test(location.hostname)) return;   // las pruebas locales no cuentan
  try {
    fetch(`${SUPABASE_URL}/rest/v1/page_events`, {
      method: 'POST',
      keepalive: true,                                         // alcanza a salir aunque cambie de página
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ type, path: String(path).slice(0, 160), label: String(label || '').slice(0, 160) || null, ref: ref || null, session: session || null, ...utm }),
    }).then((r) => {
      // antes de correr la fase 11 no existen las columnas utm_…: se anota sin ellas
      if (!r.ok && Object.keys(utm).length) {
        fetch(`${SUPABASE_URL}/rest/v1/page_events`, { method: 'POST', keepalive: true, headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ type, path: String(path).slice(0, 160), label: String(label || '').slice(0, 160) || null, ref: ref || null, session: session || null }) }).catch(() => {});
      }
    }).catch(() => {});
  } catch { /* sin conexión */ }
}
window.rkEvent = rkEvent;

// en el proyecto, la página lleva el slug para saber qué proyecto vieron
const slug = new URLSearchParams(location.search).get('p');
rkEvent('view', '', slug ? `${page}?p=${slug}` : page);
