// =============================================================================
// RAKÜN · función "meta-sync": trae de Meta (Marketing API) el gasto, alcance,
// clics y resultados de cada anuncio, día por día, de las cuentas conectadas
// en 11 · Métricas, y los guarda en meta_insights. Corre en Supabase, donde vive
// el token; la página nunca lo ve.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   META_TOKEN   token de usuario del sistema de RAKÜN (permiso ads_read). Sirve para
//                la cuenta de RAKÜN y para las de clientes que agregaron a RAKÜN como socio.
//   CRON_SECRET  (opcional) clave para llamarla cada noche sin sesión.
// Se llama:
//   · desde el gestor («Actualizar ahora»), con la sesión de un admin
//   · cada noche, con el encabezado  x-cron-secret: <CRON_SECRET>
// Recibe (POST): { days?: número de días hacia atrás (por defecto 30), account_id? }
// =============================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH = 'https://graph.facebook.com/v21.0';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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
  } catch { /* no era JSON */ }
  return raw;
}

// cuántos resultados de un tipo trae la lista "actions" de Meta
const LEAD_TYPES = ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'];
const MSG_TYPES = ['onsite_conversion.messaging_conversation_started_7d'];
const count = (actions: { action_type: string; value: string }[] | undefined, types: string[]) => {
  const found = (actions ?? []).filter((a) => types.includes(a.action_type)).map((a) => Number(a.value) || 0);
  return found.length ? Math.max(...found) : 0;                 // Meta repite el mismo lead con varios nombres
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// cuando Meta niega el permiso (#200 / #190), mira qué ve el token y lo explica en español
async function diagnose(token: string, act: string): Promise<string> {
  const get = (path: string) => fetch(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`).then((r) => r.json()).catch(() => ({}));
  const me = await get('me?fields=id,name');
  if (me.error) return `Meta no reconoce el token (${me.error.message}). Genera uno nuevo y pégalo en el secreto META_TOKEN de Supabase.`;
  const perms = await get('me/permissions');
  const granted = (perms.data ?? []).filter((p: { status: string }) => p.status === 'granted').map((p: { permission: string }) => p.permission);
  const accs = await get('me/adaccounts?fields=account_id,name&limit=200');
  const list = (accs.data ?? []) as { id: string; name: string }[];
  const who = `El token es de «${me.name}»`;
  if (granted.length && !granted.includes('ads_read') && !granted.includes('ads_management')) {
    return `${who} y le falta el permiso ads_read. Genera el token otra vez marcando ads_read y actualiza META_TOKEN en Supabase.`;
  }
  if (!list.some((a) => a.id === act)) {
    const seen = list.length ? `Solo ve: ${list.slice(0, 6).map((a) => `${a.name} (${a.id})`).join(', ')}.` : 'No ve ninguna cuenta publicitaria.';
    return `${who} pero no tiene asignada la cuenta ${act}. ${seen} En Business Manager → Usuarios del sistema → ${me.name} → Asignar activos → Cuentas publicitarias → elige la cuenta y activa «Ver rendimiento». Si el ID no coincide, corrígelo en el gestor.`;
  }
  return `${who}, ve la cuenta ${act} y tiene permiso, pero Meta aún la niega. Genera un token nuevo (con ads_read) y actualiza META_TOKEN; a veces el viejo no toma los activos asignados después.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = envKey('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
    const service = envKey('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
    const metaToken = Deno.env.get('META_TOKEN') ?? '';
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    // ¿quién llama? un admin con sesión, o la tarea nocturna con su clave
    const cron = Deno.env.get('CRON_SECRET');
    const isCron = Boolean(cron) && req.headers.get('x-cron-secret') === cron;
    if (!isCron) {
      const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
      const { data: { user } } = await caller.auth.getUser();
      if (!user) return json({ error: 'Tu sesión venció. Vuelve a iniciar sesión.' }, 401);
      const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single();
      if (me?.role !== 'admin') return json({ error: 'Solo el administrador puede actualizar los datos de Meta.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const days = Math.min(90, Math.max(1, Number(body.days) || 30));
    const until = new Date();
    const since = new Date(Date.now() - (days - 1) * 86400000);

    let q = admin.from('meta_accounts').select('id, ad_account_id, name');
    if (body.account_id) q = q.eq('id', body.account_id);
    const { data: accounts, error } = await q;
    if (error) return json({ error: `No se pudieron leer las cuentas: ${error.message}` }, 500);

    const { data: tokens } = await admin.from('meta_tokens').select('account_id, token');
    const report: { name: string; rows?: number; error?: string }[] = [];

    for (const acc of accounts ?? []) {
      const token = tokens?.find((t) => t.account_id === acc.id)?.token || metaToken;
      if (!token) {
        const msg = 'Falta el token de Meta (secreto META_TOKEN en Supabase).';
        await admin.from('meta_accounts').update({ last_error: msg }).eq('id', acc.id);
        report.push({ name: acc.name, error: msg });
        continue;
      }
      try {
        const rows: Record<string, unknown>[] = [];
        let next: string | null = `${GRAPH}/${acc.ad_account_id}/insights?` + new URLSearchParams({
          level: 'ad', time_increment: '1', limit: '500',
          time_range: JSON.stringify({ since: ymd(since), until: ymd(until) }),
          fields: 'ad_id,ad_name,adset_name,campaign_id,campaign_name,spend,impressions,reach,clicks,actions,date_start',
          access_token: token,
        });
        while (next) {
          const res = await fetch(next);
          const data = await res.json();
          if (data.error) {
            const denied = [200, 190, 10].includes(Number(data.error.code)) || /permission/i.test(data.error.message);
            throw new Error(denied ? await diagnose(token, acc.ad_account_id) : data.error.message);
          }
          for (const r of data.data ?? []) {
            rows.push({
              account_id: acc.id, day: r.date_start, ad_id: r.ad_id, ad_name: r.ad_name, adset_name: r.adset_name,
              campaign_id: r.campaign_id, campaign_name: r.campaign_name,
              spend: Number(r.spend) || 0, impressions: Number(r.impressions) || 0, reach: Number(r.reach) || 0, clicks: Number(r.clicks) || 0,
              leads: count(r.actions, LEAD_TYPES), messages: count(r.actions, MSG_TYPES),
            });
          }
          next = data.paging?.next ?? null;
        }
        for (let i = 0; i < rows.length; i += 500) {
          const { error: e } = await admin.from('meta_insights').upsert(rows.slice(i, i + 500));
          if (e) throw new Error(e.message);
        }
        await admin.from('meta_accounts').update({ last_sync: new Date().toISOString(), last_error: null }).eq('id', acc.id);
        report.push({ name: acc.name, rows: rows.length });
      } catch (e) {
        const msg = String((e as Error).message || e).slice(0, 600);
        await admin.from('meta_accounts').update({ last_error: msg }).eq('id', acc.id);
        report.push({ name: acc.name, error: msg });
      }
    }
    return json({ ok: true, days, accounts: report });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
