/* ==========================================================================
   RAKÜN · «Nuestro trabajo»: de dónde salen los proyectos
   Lee los proyectos publicados de Supabase (tabla works) con una petición
   directa, sin cargar la librería completa, para que el Inicio siga liviano.
   Si la tabla aún no existe (falta correr supabase/fase6.sql) o no hay
   conexión, usa la copia de respaldo de trabajo/seed.js.
   ========================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../app/config.js';
import { SEED } from './seed.js';

/** Nombre de cada categoría tal como se ve en «Todos los proyectos», en su orden. */
export const CATEGORIES = [
  ['videoclip', 'Videoclips'],
  ['corto', 'Cortos'],
  ['documental', 'Documentales'],
  ['magazine', 'Magazine y podcast'],
  ['comercial', 'Comerciales'],
  ['otro', 'Otros videos'],
  ['identidad', 'Identidades'],
  ['web', 'Páginas web'],
  ['reel', 'Reels'],
];
/** Etiqueta corta de un proyecto: «Videoclip», «Documental»… */
export const CAT_LABEL = {
  videoclip: 'Videoclip', corto: 'Cortometraje', documental: 'Documental', magazine: 'Magazine', podcast: 'Podcast',
  comercial: 'Comercial', otro: 'Video', identidad: 'Identidad', web: 'Página web', reel: 'Reels',
};
/** El grupo de «Todos los proyectos» al que va cada categoría (podcast va con magazine). */
export const groupOf = (w) => {
  if (w.kind === 'identidad') return 'identidad';
  if (w.kind === 'web') return 'web';
  if (w.kind === 'reel') return 'reel';
  if (w.category === 'podcast') return 'magazine';
  return CATEGORIES.some(([k]) => k === w.category) ? w.category : 'otro';
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Solo enlaces http(s); cualquier otra cosa se descarta. */
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '');
export const projectUrl = (w) => `proyecto.html?p=${encodeURIComponent(w.slug)}`;
export const ytThumb = (id, q = 'maxresdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;
export const cover = (w) => safeUrl(w.cover_url) || (w.youtube_id ? ytThumb(w.youtube_id) : '');

const list = (v) => (Array.isArray(v) ? v : []);
const normalize = (w) => ({
  ...w,
  pieces: list(w.pieces), bts: list(w.bts), pages: list(w.pages), reels: list(w.reels), palette: list(w.palette),
});

let cache = null;
/** Todos los proyectos publicados, en el orden del gestor. */
export function loadWorks() {
  if (cache) return cache;
  cache = (async () => {
    try {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('sin conexión');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/works?select=*&status=eq.publicado&order=sort.asc,created_at.desc`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const rows = await res.json();
      return rows.map(normalize);
    } catch {
      return SEED.map(normalize);
    }
  })();
  return cache;
}
