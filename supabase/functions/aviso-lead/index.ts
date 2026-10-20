// =============================================================================
// RAKÜN · función "aviso-lead": cuando entra una solicitud nueva (tabla leads),
// manda un WhatsApp al número de RAKÜN con el nombre, el plan, de qué anuncio
// vino y cómo escribirle. La llama un Database Webhook de Supabase.
//
// Dos formas de enviar (usa la primera que tenga sus secretos):
//  A · WhatsApp oficial de Meta (Cloud API) con una plantilla aprobada
//      WA_TOKEN        token del usuario del sistema con permiso whatsapp_business_messaging
//      WA_PHONE_ID     el «Identificador del número de teléfono» que envía (el de prueba de Meta sirve)
//      WA_TO           el número que recibe, con indicativo (573504461460)
//      WA_TEMPLATE     (opcional) nombre de la plantilla; por defecto "aviso_lead"
//      WA_LANG         (opcional) idioma de la plantilla; por defecto "es"
//      La plantilla tiene 4 variables: {{1}} nombre · {{2}} plan · {{3}} de dónde vino · {{4}} WhatsApp del lead
//      Para probar antes de que la aprueben: WA_TEMPLATE = hello_world y WA_LANG = en_US (sin variables).
//  B · CallMeBot (gratis, cuando tenga cupos)
//      CALLMEBOT_APIKEY y CALLMEBOT_PHONE
// Siempre:
//   WEBHOOK_SECRET    una clave inventada; el webhook la manda en el encabezado x-webhook-secret
//   SITE_URL          (opcional) la dirección de la página, para el enlace al gestor (solo CallMeBot)
// =============================================================================

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const WORLD: Record<string, string> = { marca: 'Redes', produccion: 'Producción', web: 'Web y apps' };
const digits = (s: string) => String(s || '').replace(/\D/g, '');
const intl = (phone: string) => { const d = digits(phone); return d.length === 10 ? `57${d}` : d; };
// los nombres de anuncios pueden llegar codificados (RAK%C3%9CN+%7C…)
const plain = (v: unknown) => {
  let t = String(v ?? '');
  try { if (/%[0-9a-f]{2}|\+/i.test(t)) t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch { /* igual */ }
  return t.trim();
};
// las variables de una plantilla no aceptan saltos de línea ni más de 4 espacios seguidos
const v = (s: string) => (String(s || '—').replace(/\s+/g, ' ').trim() || '—').slice(0, 300);

async function viaMeta(l: Record<string, string>) {
  const token = Deno.env.get('WA_TOKEN')!;
  const phoneId = Deno.env.get('WA_PHONE_ID')!;
  const to = digits(Deno.env.get('WA_TO') || '573504461460');
  const name = Deno.env.get('WA_TEMPLATE') || 'aviso_lead';
  const lang = Deno.env.get('WA_LANG') || 'es';
  const from = [plain(l.utm_content), plain(l.utm_campaign)].filter(Boolean).join(' · ') || (l.utm_source ? `${l.utm_source}` : 'orgánico (sin anuncio)');
  const template: Record<string, unknown> = { name, language: { code: lang } };
  if (name !== 'hello_world') {
    template.components = [{
      type: 'body',
      parameters: [
        v(`${l.name} · ${WORLD[l.world] || l.world || ''}`),
        v(`${l.plan || 'sin plan'}${l.price_label ? ` (${l.price_label})` : ''}`),
        v(from),
        v(l.phone ? `wa.me/${intl(l.phone)}` : 'sin teléfono'),
      ].map((text) => ({ type: 'text', text })),
    }];
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta respondió ${res.status}`);
  return 'meta';
}

async function viaCallMeBot(l: Record<string, string>) {
  const apikey = Deno.env.get('CALLMEBOT_APIKEY')!;
  const phone = digits(Deno.env.get('CALLMEBOT_PHONE') || '573504461460');
  const site = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');
  const ad = [plain(l.utm_content), plain(l.utm_campaign)].filter(Boolean).join(' · ');
  const text = [
    '🔔 *Nuevo lead en RAKÜN*',
    `*${l.name}* · ${WORLD[l.world] || l.world || ''}`,
    l.plan ? `Plan: ${l.plan}${l.price_label ? ` (${l.price_label})` : ''}` : '',
    l.city ? `Ciudad: ${l.city}` : '',
    l.contact_via || l.contact_time ? `Prefiere: ${[l.contact_via, l.contact_time].filter(Boolean).join(' · ')}` : '',
    ad ? `Vino del anuncio: ${ad}` : l.utm_source ? `Vino de: ${l.utm_source}` : 'Llegó sin anuncio (orgánico)',
    l.phone ? `Escribirle: https://wa.me/${intl(l.phone)}` : '',
    site ? `Gestor: ${site}/admin.html#solicitudes` : '',
    'Responde en menos de 15 min ⏱️',
  ].filter(Boolean).join('\n');
  const res = await fetch(`https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone, text, apikey })}`);
  const body = await res.text();
  if (!res.ok || /APIKey is invalid|not allowed|Error/i.test(body)) throw new Error(body.slice(0, 300));
  return 'callmebot';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'No autorizado.' }, 401);

  const body = await req.json().catch(() => ({}));
  if (body.type !== 'INSERT' || body.table !== 'leads' || !body.record) return json({ ok: true, skipped: true });

  const meta = Deno.env.get('WA_TOKEN') && Deno.env.get('WA_PHONE_ID');
  const cmb = Deno.env.get('CALLMEBOT_APIKEY');
  if (!meta && !cmb) return json({ error: 'Faltan los secretos de WhatsApp (WA_TOKEN y WA_PHONE_ID, o CALLMEBOT_APIKEY).' }, 500);
  try {
    const via = meta ? await viaMeta(body.record) : await viaCallMeBot(body.record);
    return json({ ok: true, via });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 502);
  }
});
