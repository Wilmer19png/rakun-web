// =============================================================================
// RAKÜN · función "aviso-lead": cuando entra una solicitud nueva (tabla leads),
// manda un WhatsApp al número de RAKÜN con el nombre, el plan, de qué anuncio
// vino y el enlace al gestor. La llama un Database Webhook de Supabase.
//
// Se envía con CallMeBot (gratis, para avisos a tu propio número).
// Secretos (Supabase → Edge Functions → Secrets):
//   CALLMEBOT_APIKEY  la clave que te manda CallMeBot por WhatsApp al activarlo
//   CALLMEBOT_PHONE   el número que recibe el aviso, con indicativo (573504461460)
//   WEBHOOK_SECRET    una clave inventada; el webhook la manda en el encabezado
//                     x-webhook-secret para que nadie más pueda llamar la función
//   SITE_URL          (opcional) la dirección de la página, p. ej. https://rakun.co
// =============================================================================

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const WORLD: Record<string, string> = { marca: 'Redes', produccion: 'Producción', web: 'Web y apps' };
const digits = (s: string) => String(s || '').replace(/\D/g, '');
const waLink = (phone: string) => {
  const d = digits(phone);
  return d ? `https://wa.me/${d.length === 10 ? `57${d}` : d}` : '';
};
// los nombres de anuncios pueden llegar codificados (RAK%C3%9CN+%7C…)
const plain = (v: unknown) => {
  let t = String(v ?? '');
  try { if (/%[0-9a-f]{2}|\+/i.test(t)) t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch { /* igual */ }
  return t.trim();
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'No autorizado.' }, 401);

  const apikey = Deno.env.get('CALLMEBOT_APIKEY');
  const phone = digits(Deno.env.get('CALLMEBOT_PHONE') || '573504461460');
  if (!apikey) return json({ error: 'Falta el secreto CALLMEBOT_APIKEY.' }, 500);

  const body = await req.json().catch(() => ({}));
  if (body.type !== 'INSERT' || body.table !== 'leads' || !body.record) return json({ ok: true, skipped: true });
  const l = body.record;

  const site = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');
  const ad = [plain(l.utm_content), plain(l.utm_campaign)].filter(Boolean).join(' · ');
  const lines = [
    '🔔 *Nuevo lead en RAKÜN*',
    `*${l.name}* · ${WORLD[l.world] || l.world || ''}`,
    l.plan ? `Plan: ${l.plan}${l.price_label ? ` (${l.price_label})` : ''}` : '',
    l.city ? `Ciudad: ${l.city}` : '',
    l.contact_via || l.contact_time ? `Prefiere: ${[l.contact_via, l.contact_time].filter(Boolean).join(' · ')}` : '',
    ad ? `Vino del anuncio: ${ad}` : l.utm_source ? `Vino de: ${l.utm_source}` : 'Llegó sin anuncio (orgánico)',
    l.phone ? `Escribirle: ${waLink(l.phone)}` : '',
    site ? `Gestor: ${site}/admin.html#solicitudes` : '',
    'Responde en menos de 15 min ⏱️',
  ].filter(Boolean);

  const url = `https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone, text: lines.join('\n'), apikey })}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    // CallMeBot responde 200 con un HTML; si la clave está mal lo dice en el texto
    if (!res.ok || /APIKey is invalid|not allowed|Error/i.test(text)) return json({ ok: false, error: text.slice(0, 300) }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 502);
  }
});
