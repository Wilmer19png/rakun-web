/* ==========================================================================
   RAKÜN · conexión con Supabase (se carga solo cuando hace falta)
   ========================================================================== */
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
let client = null;

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Cliente de Supabase (la librería se descarga la primera vez que se pide). */
export async function getClient() {
  if (!isConfigured()) throw new Error('Supabase aún no está configurado (app/config.js).');
  if (!client) {
    const { createClient } = await import(CDN);
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Perfil del usuario con sesión, o null. */
export async function getProfile() {
  const sb = await getClient();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data } = await sb.from('profiles').select('id, email, full_name, role, area, color').eq('id', session.user.id).single();
  return data ? { ...data, email: data.email || session.user.email } : null;
}

export const isStaff = (p) => p && (p.role === 'admin' || p.role === 'equipo');

/** A dónde va cada quien después de entrar. */
export const homeFor = (p) => (isStaff(p) ? 'admin.html' : 'portal.html');

/** Página de destino de los enlaces de invitación y de "olvidé mi contraseña". */
export const accountUrl = () => new URL('cuenta.html', location.href).href;

/** Mensajes de error de Supabase en español. */
export function errorText(err) {
  const m = String(err?.message || err || '');
  if (/invalid login credentials/i.test(m)) return 'El correo o la contraseña no coinciden.';
  if (/email not confirmed/i.test(m)) return 'Aún no has activado tu cuenta. Revisa el enlace que te enviamos.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos y vuelve a intentar.';
  if (/password should be at least|weak/i.test(m)) return 'La contraseña es muy corta: usa al menos 8 caracteres.';
  if (/same.*password|different from the old/i.test(m)) return 'Usa una contraseña distinta a la anterior.';
  if (/failed to fetch|network/i.test(m)) return 'No hay conexión. Revisa tu internet y vuelve a intentar.';
  if (/configurado/i.test(m)) return 'El acceso aún no está activo. Escríbenos y te ayudamos.';
  return m || 'Algo salió mal. Vuelve a intentar.';
}
