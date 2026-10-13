/* ==========================================================================
   RAKÜN · cotizaciones: las cuentas (las usan el gestor y el recibo del cliente)
   Una cotización tiene bloques; cada bloque, líneas { name, detail, source, qty, unit, price }.
   ========================================================================== */

export const IVA = 0.19;
export const WORLD_LABEL = { marca: 'Redes', web: 'Página web', produccion: 'Producción audiovisual' };
export const WORLD_HEX = { marca: '#FFF02B', web: '#FF2C68', produccion: '#2BCDFF' };
export const BILLING = { marca: 'Mensual', web: 'Un solo pago', produccion: 'Por proyecto' };

export const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const lineTotal = (l) => Math.round(num(l.qty) * num(l.price));
export const blockTotal = (b) => (b.lines || []).reduce((s, l) => s + lineTotal(l), 0);

/** Lo que se sigue cobrando cada mes en Redes desde el mes 2 (las líneas del plan). */
export const monthly = (q) => (q.blocks || []).filter((b) => b.world === 'marca')
  .reduce((s, b) => s + (b.lines || []).filter((l) => l.source === 'plan').reduce((t, l) => t + num(l.price), 0), 0);

/** Totales de la cotización y sus cuotas. */
export function totals(q) {
  const sum = (q.blocks || []).reduce((s, b) => s + blockTotal(b), 0);
  const discount = Math.min(num(q.discount), sum);
  const base = sum - discount;
  const iva = q.iva ? Math.round(base * IVA) : 0;
  const total = base + iva;
  const split = (q.split?.length ? q.split : [50, 50]).map(num);
  let left = total;
  const parts = split.map((pct, i) => {
    const amount = i === split.length - 1 ? left : Math.round(total * pct / 100);
    left -= amount;
    return { pct, amount };
  });
  return { sum, discount, base, iva, total, parts, monthly: monthly(q) };
}

/** Nombre de cada cuota según su lugar: anticipo, saldo o cuota 2, 3… */
export const partLabel = (i, n) => (i === 0 ? 'Anticipo · al aceptar' : i === n - 1 ? 'Saldo · al entregar' : `Cuota ${i + 1} · a mitad del proyecto`);

/** ¿Ya venció? (solo cuenta mientras está enviada) */
export function expired(q) {
  if (q.status !== 'enviada') return false;
  const from = new Date(q.sent_at || q.created_at);
  return from.getTime() + q.valid_days * 86400000 < Date.now();
}
export const validUntil = (q) => new Date(new Date(q.sent_at || q.created_at).getTime() + q.valid_days * 86400000);
