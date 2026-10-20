/* ==========================================================================
   RAKÜN · las piezas de cada plan de Redes
   · items: el precio de cada pieza DENTRO de los planes (lo suelto, más caro,
     va en la carta del club).
   · packs: paquetes de videos con su descuento.
   · plans: de qué está hecho cada plan: [pieza, cantidad, precio dentro de ese
     plan]. Cada plan tiene sus propios precios para que la suma dé exacto lo
     publicado; la grabación es la diferencia entre «con grabación» y «solo edición».
   Lo que guarda el admin en 09 → Piezas (app_settings id 'piezas') reemplaza esto.
   En la cotización: cambiar o quitar una pieza usa los precios del plan; lo que
   se agrega aparte va con el precio de la carta.
   ========================================================================== */

export const PIEZAS = {
  v: 1,
  items: {
    gestion: { name: 'Gestión mensual de pauta', unit: 'mes', price: 371000 },
    alcance: { name: 'Campaña de alcance', unit: 'campaña', price: 150000, slot: 'campana' },
    ventas: { name: 'Campaña de ventas', unit: 'campaña', price: 450000, slot: 'campana' },
    retargeting: { name: 'Campaña de retargeting', unit: 'campaña', price: 400000, slot: 'campana' },
    guion: { name: 'Guion', unit: 'guion', price: 39000, count: true },
    carrusel: { name: 'Carrusel', unit: 'carrusel', price: 90000, count: true },
    parrilla: { name: 'Parrilla (estrategia y calendario)', unit: 'mes', price: 454000 },
    reporte_basico: { name: 'Reporte básico', unit: 'mes', price: 120000, slot: 'reporte' },
    reporte_completo: { name: 'Reporte completo', unit: 'mes', price: 200000, slot: 'reporte' },
    reporte_reunion: { name: 'Reporte con reunión', unit: 'mes', price: 300000, slot: 'reporte' },
    reunion: { name: 'Reunión de resultados', unit: 'reunión', price: 199000, count: true },
    whatsapp: { name: 'Sistema de captación por WhatsApp', unit: 'mes', price: 300000 },
    agil: { name: 'Video ágil', unit: 'video', price: 35000, count: true },
    pro: { name: 'Video Pro', unit: 'video', price: 90000, count: true },
    premium: { name: 'Video Premium', unit: 'video', price: 180000, count: true },
    horizontal: { name: 'Video horizontal', unit: 'video', price: 180000, count: true },
    recorte: { name: 'Recorte vertical', unit: 'video', price: 35000, count: true },
  },
  packs: [
    { key: 'p16', name: 'Paquete 16 ágiles', has: { agil: 16 }, price: 509000 },
    { key: 'p12a4p', name: 'Paquete 12 ágiles + 4 Pro', has: { agil: 12, pro: 4 }, price: 709000 },
    { key: 'p12p2pr', name: 'Paquete 12 Pro + 2 Premium', has: { pro: 12, premium: 2 }, price: 1290000 },
    { key: 'pimpacto', name: 'Paquete Impacto · 8 Pro + 4 Premium + 2 horizontales + 6 recortes', has: { pro: 8, premium: 4, horizontal: 2, recorte: 6 }, price: 1990000 },
  ],
  plans: {
    'gestion|Ritmo': [['gestion', 1, 371000], ['alcance', 1, 150000], ['guion', 16, 39000], ['carrusel', 4, 90000], ['parrilla', 1, 476000], ['pack:p16', 1, 509000], ['reporte_basico', 1, 0]],
    'gestion|Equilibrio': [['gestion', 1, 371000], ['ventas', 1, 450000], ['guion', 14, 39000], ['carrusel', 4, 90000], ['parrilla', 1, 454000], ['pack:p12p2pr', 1, 1290000], ['reporte_basico', 1, 120000], ['reunion', 1, 199000]],
    'gestion|Impacto': [['gestion', 1, 460000], ['ventas', 2, 450000], ['retargeting', 1, 400000], ['guion', 14, 39000], ['carrusel', 6, 90000], ['parrilla', 1, 454000], ['pack:pimpacto', 1, 1990000], ['reporte_reunion', 1, 300000], ['whatsapp', 1, 300000]],
    'contenido|Ritmo': [['pack:p16', 1, 509000]],
    'contenido|Equilibrio': [['pack:p12p2pr', 1, 1290000]],
    'contenido|Impacto': [['pack:pimpacto', 1, 1990000]],
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));
/** Lo guardado por el admin encima de lo de este archivo. */
export const mergePiezas = (saved) => (saved?.items && saved?.plans ? { ...clone(PIEZAS), ...clone(saved) } : clone(PIEZAS));

export const planKey = (catKey, planName) => `${catKey}|${planName}`;
const n = (v) => Number(v) || 0;

/** El nombre de una pieza (o de un paquete). */
export function pieceName(pz, k) {
  if (String(k).startsWith('pack:')) return pz.packs.find((p) => `pack:${p.key}` === k)?.name || 'Paquete de videos';
  if (k === 'grabacion') return 'Grabación';
  return pz.items[k]?.name || k;
}
/** Precio por unidad de una pieza dentro de los planes (para cambiar una por otra). */
export function piecePrice(pz, k) {
  if (String(k).startsWith('pack:')) return n(pz.packs.find((p) => `pack:${p.key}` === k)?.price);
  return n(pz.items[k]?.price);
}
/** Las piezas por las que se puede cambiar esta (mismo tipo). */
export function alternatives(pz, k) {
  if (String(k).startsWith('pack:')) return pz.packs.map((p) => `pack:${p.key}`);
  const slot = pz.items[k]?.slot;
  return slot ? Object.keys(pz.items).filter((x) => pz.items[x].slot === slot) : [];
}
export const isCount = (pz, k) => Boolean(pz.items[k]?.count || pz.items[k]?.slot === 'campana');

/** Las piezas de un plan (con la grabación si va «con grabación»). */
export function partsOf(pz, catKey, plan, mode) {
  const rows = pz.plans[planKey(catKey, plan.name)];
  if (!rows) return null;
  const parts = rows.map(([k, q, p]) => ({ k, q: n(q), p: n(p) }));
  if (mode === 'grabacion') parts.push({ k: 'grabacion', q: 1, p: Math.max(0, n(plan.rec) - n(plan.ed)), note: plan.recText || '' });
  return parts;
}
export const partsSum = (parts) => parts.reduce((s, x) => s + x.q * x.p, 0);

/**
 * Lo que cambió frente al plan, con lo que suma o resta cada cambio.
 * pzl = { base, parts: [{ k, q, p, o: { k, q, p }, off }], adds: [{ name, qty, price }] }
 */
export function changesOf(pz, pzl) {
  const out = [];
  for (const x of pzl.parts) {
    const o = x.o || x;
    const before = o.q * o.p;
    if (x.off) { out.push({ t: `Sin ${pieceName(pz, o.k).toLowerCase()}`, amount: -before }); continue; }
    const after = x.q * x.p;
    if (x.k !== o.k) out.push({ t: `Cambio: ${o.q > 1 ? `${o.q} × ` : ''}${pieceName(pz, o.k).toLowerCase()} → ${x.q > 1 ? `${x.q} × ` : ''}${pieceName(pz, x.k).toLowerCase()}`, amount: after - before });
    else if (x.q !== o.q) out.push({ t: `${pieceName(pz, x.k)}: ${o.q} → ${x.q}`, amount: after - before });
  }
  for (const a of pzl.adds || []) out.push({ t: `+ ${n(a.qty) > 1 ? `${n(a.qty)} × ` : ''}${a.name}`, amount: n(a.qty) * n(a.price), add: true });
  return out.filter((c) => c.amount !== 0 || c.add);
}
/** El precio del plan con sus cambios: lo publicado + lo que suma o resta cada cambio. */
export const pricedWith = (pzl, changes) => Math.max(0, n(pzl.base) + changes.reduce((s, c) => s + c.amount, 0));
