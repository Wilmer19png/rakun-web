/* ==========================================================================
   RAKÜN · catálogo de planes publicado desde el gestor
   Lectura liviana (sin la librería de Supabase): una sola petición a la tabla
   plan_catalog. Si falla o no hay nada publicado, la página usa sus datos base.
   ========================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/** Devuelve el contenido publicado para 'marca' | 'web' | 'produccion', o null. */
export async function loadCatalog(id) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/plan_catalog?id=eq.${encodeURIComponent(id)}&select=content`, {
      headers: { apikey: SUPABASE_ANON_KEY, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.content || null;
  } catch {
    return null;
  }
}
