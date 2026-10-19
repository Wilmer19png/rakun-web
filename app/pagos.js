/* ==========================================================================
   RAKÜN · cuánto se lleva cada rol por producto (gestor 09 → Tarifas y pagos)
   Se guarda en app_settings id 'pagos' (privado, fase 9):
     { rows: { <clave del producto>: { manager, edicion, camara, estrategia, diseno, pauta } },
       cover: { <rol>: <id de la persona> } }
   Regla del manager: en los planes de Redes cobra CADA MES mientras el cliente
   siga; en todo lo demás (carta del club, web, producción) cobra UNA SOLA VEZ.
   ========================================================================== */
import { REDES, WEB, isRedes } from '../planes/data.js';
import { BASE_RATES } from './quote-sources.js';
import { loadCatalog } from './catalog.js';

export const ROLES = [
  ['manager', 'Manager'], ['edicion', 'Edición'], ['camara', 'Cámara'],
  ['estrategia', 'Estrategia y guiones'], ['diseno', 'Diseño y web'], ['pauta', 'Pauta'],
];
export const ROLE_NAME = Object.fromEntries(ROLES);

// % de ejemplo hasta que el admin ponga los reales
const TIER = { ritmo: 8, equilibrio: 10, impacto: 12 };
const GROUP_DEFAULT = {
  'Videos y piezas': { manager: 5, edicion: 40 },
  Pauta: { manager: 5, pauta: 30 },
  'Estrategia y gestión': { manager: 5, estrategia: 35 },
  'Grabación y fotos': { manager: 5, camara: 35 },
  'Para tu perfil': { manager: 5, diseno: 35 },
};
const tierOf = (name) => TIER[String(name).toLowerCase().replace(/[^a-z]/g, '')] ?? 10;

/** Los % por defecto de un producto (antes de que el admin los cambie). */
export function defaultPct(key) {
  const [kind, a, b] = key.split(':');
  if (kind === 'plan') {
    const m = tierOf(b);
    return a === 'gestion' ? { manager: m, edicion: 18, camara: 8, estrategia: 10, pauta: 6 } : { manager: m, edicion: 25, camara: 10 };
  }
  if (kind === 'carta') return { ...(GROUP_DEFAULT[a] || { manager: 5 }) };
  if (kind === 'web') return { manager: 5, diseno: 40 };
  return { manager: 5 };                                       // producción: el resto se arma en cada cotización
}
export const pctFor = (pagos, key) => ({ ...defaultPct(key), ...(pagos?.rows?.[key] || {}) });
export const isMonthly = (key) => key.startsWith('plan:');
export const leftFor = (pct) => 100 - ROLES.reduce((s, [r]) => s + (Number(pct[r]) || 0), 0);

/** Todo lo que se vende, ordenado por grupos, con su precio y la clave para los %. */
export async function loadProducts() {
  const [m, w, p] = await Promise.all(['marca', 'web', 'produccion'].map(loadCatalog));
  const redes = isRedes(m) ? { ...REDES, ...m } : REDES;
  const web = w?.plans ? w : WEB;
  const prod = Array.isArray(p?.rates) ? p : BASE_RATES;
  const groups = [];
  redes.cats.forEach((c) => groups.push({
    title: `Redes · ${c.name}`, color: c.color, kind: 'plan',
    items: c.plans.filter((pl) => !pl.hidden).map((pl) => ({
      key: `plan:${c.key}:${pl.name.replace(/[^\p{L}]/gu, '')}`, name: pl.name, hot: pl.hot,
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

/** Las filas de la tabla de %: una por plan, una por grupo de la carta, web y producción. */
export function pctRows(groups) {
  const rows = [];
  groups.forEach((g) => {
    if (g.kind === 'plan') g.items.forEach((it) => rows.push({ key: it.key, label: `${g.title.replace('Redes · ', '')} · ${it.name}`, section: 'Planes de Redes · el manager cobra cada mes' }));
    else if (g.kind === 'carta') rows.push({ key: g.key, label: g.title.replace('Carta del club · ', ''), section: 'Carta del club · el manager cobra una sola vez' });
    else rows.push({ key: g.key, label: g.kind === 'web' ? 'Web y apps' : 'Producción audiovisual', section: 'Por proyecto · el manager cobra una sola vez' });
  });
  return rows;
}
