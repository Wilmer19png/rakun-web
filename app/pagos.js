/* ==========================================================================
   RAKÜN · cuánto se lleva cada quien (gestor 09 → Tarifas y pagos)
   Se guarda en app_settings id 'pagos' (privado). Versión 2 (lienzo «Tarifas
   y pagos: comisión del manager y pagos por pieza»):
   · Manager, cada mes mientras el cliente siga y pague:
       VENTA      = % venta × precio del plan
       OPERACIÓN  = % operación × (Gestión completa − Solo contenido del mismo nivel)
       GRABACIÓN  = % grabación × lo que suma la grabación al plan (va con la venta)
     Una sola vez: video suelto 8 %, campañas extra 15 % venta + 32 % operación,
     todo lo demás de la carta, web y producción 5 %.
   · Editor: 50 % del precio de cada video; cada ronda extra, 10 %.
   · Quien graba: 60 % de lo que suma la grabación al plan.
   · Diseñadora: por guion, carrusel y parrilla (por cliente al mes).
   La pauta no genera comisión. Todo se redondea a la centena.
   ========================================================================== */
import { REDES, WEB, isRedes } from '../planes/data.js';
import { BASE_RATES } from './quote-sources.js';
import { loadCatalog } from './catalog.js';
import { PIEZAS, mergePiezas, planKey } from '../planes/piezas.js';

// quién cubre cada parte (cada una se le paga a esa persona)
export const ROLES = [
  ['venta', 'Venta · cerrar al cliente'], ['operacion', 'Operación · campañas, publicación, reporte'],
  ['edicion', 'Edición'], ['camara', 'Grabación'], ['diseno', 'Diseño · guiones, carruseles, parrilla'],
];
export const ROLE_NAME = Object.fromEntries(ROLES);
export const LEVELS3 = ['Ritmo', 'Equilibrio', 'Impacto'];

export const PAGOS_BASE = {
  v: 2,
  cover: {},
  manager: {
    gestion: { Ritmo: { venta: 8, operacion: 15, grabacion: 5 }, Equilibrio: { venta: 10, operacion: 25, grabacion: 5 }, Impacto: { venta: 12, operacion: 35, grabacion: 5 } },
    contenido: { Ritmo: { venta: 8, grabacion: 5 }, Equilibrio: { venta: 10, grabacion: 5 }, Impacto: { venta: 12, grabacion: 5 } },
    video: 8,                                      // video suelto (y los que se agregan a un plan)
    extras: { venta: 15, operacion: 32 },          // campañas extra (Campaña extra, Retargeting extra)
    otros: 5,                                      // todo lo demás de la carta, web y producción
  },
  editor: { pct: 50, ronda: 10 },
  camara: { pct: 60 },
  diseno: { guion: 25000, carrusel: 45000, parrilla: 150000 },
};
const EXTRAS = ['Campaña extra', 'Retargeting extra'];
const VIDEOS = { 'Video ágil': 'agil', 'Video Pro': 'pro', 'Video Premium': 'premium', 'Video horizontal Pro': 'horizontal', 'Recorte vertical': 'recorte' };

const clone = (o) => JSON.parse(JSON.stringify(o));
const num = (v) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.]/g, '')) || 0);
export const r100 = (n) => Math.round((Number(n) || 0) / 100) * 100;

/** Lo guardado por el admin (la versión 1, de % por rol, se reemplaza por esta). */
export function mergePagos(saved) {
  const base = clone(PAGOS_BASE);
  if (!saved) return base;
  if (saved.v !== 2) {
    // de la versión anterior solo sirve quién cubría cada rol
    const c = saved.cover || {};
    base.cover = { venta: c.manager || null, operacion: c.manager || null, edicion: c.edicion || null, camara: c.camara || null, diseno: c.diseno || c.estrategia || null };
    return base;
  }
  return { ...base, ...saved, manager: { ...base.manager, ...(saved.manager || {}) }, editor: { ...base.editor, ...(saved.editor || {}) }, camara: { ...base.camara, ...(saved.camara || {}) }, diseno: { ...base.diseno, ...(saved.diseno || {}) } };
}

/** Las reglas para cobrar: los % y pagos, las piezas y los precios publicados. */
export async function loadPayRules(sb) {
  const [{ data: pg }, { data: pz }, m] = await Promise.all([
    sb.from('app_settings').select('content').eq('id', 'pagos').maybeSingle(),
    sb.from('app_settings').select('content').eq('id', 'piezas').maybeSingle(),
    loadCatalog('marca'),
  ]);
  return { pagos: mergePagos(pg?.content), piezas: mergePiezas(pz?.content), redes: isRedes(m) ? { ...REDES, ...m } : REDES };
}

const level = (name) => LEVELS3.find((l) => String(name).toLowerCase().includes(l.toLowerCase()));
const planOf = (redes, catKey, name) => redes.cats.find((c) => c.key === catKey)?.plans.find((p) => p.name === name);

/**
 * El manager en un plan de Redes, al mes.
 * price = lo que paga el cliente por el plan (si se personalizó, el plan con sus cambios sin los extras).
 */
export function planManager(pagos, redes, catKey, planName, withRec, price = null) {
  const lv = level(planName);
  const pl = planOf(redes, catKey, planName);
  if (!lv || !pl) return null;
  const pc = pagos.manager[catKey === 'gestion' ? 'gestion' : 'contenido']?.[lv] || {};
  const ed = num(pl.ed); const rec = num(pl.rec);
  const base = (price ?? (withRec ? rec : ed)) - (withRec ? rec - ed : 0);   // la venta va sobre el plan sin la grabación
  const content = planOf(redes, 'contenido', planName);
  const opBase = catKey === 'gestion' && content ? Math.max(0, ed - num(content.ed)) : 0;
  const recExtra = withRec ? Math.max(0, rec - ed) : 0;
  const venta = r100(base * num(pc.venta) / 100);
  const operacion = r100(opBase * num(pc.operacion) / 100);
  const grabacion = r100(recExtra * num(pc.grabacion) / 100);
  return { level: lv, base, opBase, recExtra, pct: pc, venta, operacion, grabacion, total: venta + operacion + grabacion };
}

/** El manager en una venta suelta (carta del club, web, producción): una sola vez. */
export function oneTimeManager(pagos, name, amount) {
  const m = pagos.manager;
  if (EXTRAS.includes(name)) return { venta: r100(amount * num(m.extras.venta) / 100), operacion: r100(amount * num(m.extras.operacion) / 100), pv: num(m.extras.venta), po: num(m.extras.operacion) };
  const pv = VIDEOS[name] ? num(m.video) : num(m.otros);
  return { venta: r100(amount * pv / 100), operacion: 0, pv, po: 0 };
}

/** El equipo en un plan: editor, quien graba y diseñadora, según sus piezas (o las de la línea personalizada). */
export function planTeam(pagos, piezas, parts, adds = []) {
  const count = {};
  let recExtra = 0;
  for (const x of parts.filter((p) => !p.off)) {
    if (String(x.k).startsWith('pack:')) {
      const pk = piezas.packs.find((p) => `pack:${p.key}` === x.k);
      Object.entries(pk?.has || {}).forEach(([k, q]) => { count[k] = (count[k] || 0) + q * (x.q || 1); });
    } else if (x.k === 'grabacion') recExtra += x.q * x.p;
    else count[x.k] = (count[x.k] || 0) + x.q;
  }
  for (const a of adds) { const k = VIDEOS[a.name]; if (k) count[k] = (count[k] || 0) + num(a.qty); }
  const list = (k) => num(piezas.items[k]?.price);
  const vids = ['agil', 'pro', 'premium', 'horizontal', 'recorte'].filter((k) => count[k]);
  const editor = r100(vids.reduce((s, k) => s + count[k] * list(k) * num(pagos.editor.pct) / 100, 0));
  // una ronda extra se paga con el video de más nivel del plan
  const top = [...vids].reverse().find((k) => ['premium', 'pro', 'agil'].includes(k)) || vids[0];
  const ronda = top ? r100(list(top) * num(pagos.editor.ronda) / 100) : 0;
  const camara = r100(recExtra * num(pagos.camara.pct) / 100);
  const d = pagos.diseno;
  const guiones = (count.guion || 0) * num(d.guion);
  const carruseles = (count.carrusel || 0) * num(d.carrusel);
  const parrilla = count.parrilla ? num(d.parrilla) : 0;
  return { count, vids, editor, ronda, camara, guiones, carruseles, parrilla, diseno: guiones + carruseles + parrilla };
}

/** Las piezas de un plan publicado (para el Tarifario, sin personalizar). */
export function partsForPlan(piezas, redes, catKey, planName, withRec) {
  const pl = planOf(redes, catKey, planName);
  const rows = piezas.plans[planKey(catKey, planName)] || [];
  const parts = rows.map(([k, q, p]) => ({ k, q: num(q), p: num(p) }));
  if (withRec && pl) parts.push({ k: 'grabacion', q: 1, p: Math.max(0, num(pl.rec) - num(pl.ed)) });
  return parts;
}

/** Una línea de plan de una cotización → catKey, nombre del plan y si va con grabación. */
export function planOfLine(redes, line) {
  const [catName, planName, mode] = String(line.name).split(' · ');
  const cat = redes.cats.find((c) => c.name === catName);
  return cat && planName ? { catKey: cat.key, planName, withRec: /grabaci/i.test(mode || '') } : null;
}

export const isMonthly = (key) => String(key).startsWith('plan:');

/** Todo lo que se vende, ordenado por grupos, con su precio. */
export async function loadProducts() {
  const [m, w, p] = await Promise.all(['marca', 'web', 'produccion'].map(loadCatalog));
  const redes = isRedes(m) ? { ...REDES, ...m } : REDES;
  const web = w?.plans ? w : WEB;
  const prod = Array.isArray(p?.rates) ? p : BASE_RATES;
  const groups = [];
  redes.cats.forEach((c) => groups.push({
    title: `Redes · ${c.name}`, color: c.color, kind: 'plan', catKey: c.key,
    items: c.plans.filter((pl) => !pl.hidden).map((pl) => ({
      key: `plan:${c.key}:${pl.name.replace(/[^\p{L}]/gu, '')}`, name: pl.name, hot: pl.hot, catKey: c.key,
      detail: (pl.rows || []).slice(0, 2).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · '),
      ed: Number(pl.ed) || 0, rec: Number(pl.rec) || 0, ads: pl.ads,
    })),
  }));
  redes.carta.forEach((g) => groups.push({
    title: `Carta del club · ${g.name}`, kind: 'carta', key: `carta:${g.name}`,
    items: g.items.filter((it) => !it[4]).map(([name, unit, price, desc]) => ({ key: `carta:${g.name}`, name, unit, price: Number(price) || 0, detail: desc })),
  }));
  groups.push({
    title: 'Web y apps', color: 'var(--pink)', kind: 'web', key: 'web',
    items: web.plans.filter((pl) => !pl.hidden).map((pl) => ({ key: 'web', name: pl.name, unit: 'por proyecto', price: Number(String(pl.price).replace(/\D/g, '')) || 0, detail: pl.for })),
  });
  groups.push({
    title: 'Producción audiovisual · tarifas base', color: 'var(--blue)', kind: 'produccion', key: 'produccion',
    items: prod.rates.map(([name, stage, unit, price]) => ({ key: 'produccion', name, unit: `${stage} · por ${unit}`, price: Number(price) || 0, detail: '' })),
  });
  return groups;
}

export { PIEZAS };
