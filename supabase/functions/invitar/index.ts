// =============================================================================
// RAKÜN · función "invitar": crea el acceso de un cliente (o de alguien del equipo)
// y devuelve un enlace para que cree su contraseña. Corre en Supabase (Edge Functions),
// donde vive la clave secreta; la página nunca la ve.
//
// Recibe (POST, con la sesión de quien invita):
//   { email, full_name, role: 'cliente' | 'equipo', client_id?, mode: 'link' | 'email', redirect_to }
// Devuelve: { ok: true, link?: string, user_id }
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const STAFF = ['admin', 'equipo'];

// Supabase entrega las claves con nombres distintos según el proyecto:
// las clásicas (ANON / SERVICE_ROLE) o las nuevas (PUBLISHABLE / SECRET, en formato JSON).
function envKey(classic: string, modern: string): string {
  const direct = Deno.env.get(classic);
  if (direct) return direct;
  const raw = Deno.env.get(modern) ?? '';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    const values = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {});
    const first = values.find((v) => typeof v === 'string');
    if (first) return first as string;
  } catch { /* no era JSON: es la clave tal cual */ }
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = envKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
    const service = envKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
    if (!url || !anon || !service) return json({ error: 'La función no encuentra las claves del proyecto.' }, 500);

    // 1 · ¿quién está invitando?
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();

    const body = await req.json();
    const role = body.role === 'equipo' ? 'equipo' : 'cliente';
    const fullName = String(body.full_name ?? '').trim().slice(0, 120);
    const email = String(body.email ?? '').trim().toLowerCase();
    const mode = body.mode === 'email' ? 'email' : 'link';
    const redirectTo = String(body.redirect_to ?? '');

    // 2 · permisos: el equipo invita clientes; solo el admin invita al equipo
    if (!me || !STAFF.includes(me.role)) return json({ error: 'No tienes permiso para crear accesos.' }, 403);
    if (role === 'equipo' && me.role !== 'admin') return json({ error: 'Solo el administrador puede invitar al equipo.' }, 403);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'El correo no es válido.' }, 400);

    // 3 · si el correo ya tiene cuenta, no se le cambia el rol por la puerta de atrás
    const { data: existing } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();
    if (existing && existing.role !== role) {
      return json({ error: `Ese correo ya tiene una cuenta de ${existing.role}. Usa otro correo.` }, 409);
    }

    // 4 · crear la invitación (o un enlace para restablecer, si ya existía)
    let userId: string;
    let link: string | null = null;
    if (mode === 'email' && !existing) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo });
      if (error) return json({ error: `No se pudo enviar el correo: ${error.message}` }, 400);
      userId = data.user.id;
    } else {
      const type = existing ? 'recovery' : 'invite';
      const { data, error } = await admin.auth.admin.generateLink({
        type,
        email,
        options: type === 'invite' ? { data: { full_name: fullName }, redirectTo } : { redirectTo },
      } as Parameters<typeof admin.auth.admin.generateLink>[0]);
      if (error) return json({ error: error.message }, 400);
      userId = data.user.id;
      link = data.properties.action_link;
    }

    // 5 · rol en el servidor (app_metadata) y en el perfil; ficha del cliente enlazada
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
    const patch: Record<string, string> = { role, email };
    if (fullName) patch.full_name = fullName;
    await admin.from('profiles').update(patch).eq('id', userId);
    if (body.client_id) await admin.from('clients').update({ user_id: userId }).eq('id', body.client_id);

    return json({ ok: true, link, user_id: userId, existed: Boolean(existing) });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
