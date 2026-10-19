/* ==========================================================================
   RAKÜN · comisiones del manager (fase 10)
   Se anotan solas al registrar un pago de una cotización que vendió el manager
   (la cotización está a su nombre y él cubre el rol «Manager» en Tarifas y pagos):
   · planes de Redes → comisión MENSUAL, una por cada mes que el cliente paga
   · todo lo demás → comisión ÚNICA, proporcional a lo que el cliente va pagando
   Los % salen de 09 → Tarifas y pagos (app/pagos.js).
   ========================================================================== */
import { REDES, isRedes } from '../planes/data.js';
import { loadCatalog } from './catalog.js';
import { pctFor } from './pagos.js';
import { totals } from './quote-calc.js';

const letters = (s) => String(s).replace(/[^\p{L}]/gu, '');
const monthOf = (d) => `${String(d).slice(0, 7)}-01`;

export async function loadRules(sb) {
  const [{ data }, m] = await Promise.all([sb.from('app_settings').select('content').eq('id', 'pagos').maybeSingle(), loadCatalog('marca')]);
  return { pagos: data?.content || { rows: {}, cover: {} }, redes: isRedes(m) ? { ...REDES, ...m } : REDES };
}

/** La clave de % (la de Tarifas y pagos) de una línea de la cotización. */
export function keyForLine(block, line, redes) {
  if (block.world === 'marca' && line.source === 'plan') {
    const [catName, planName] = String(line.name).split(' · ');
    const cat = redes.cats.find((c) => c.name === catName);
    if (cat) return `plan:${cat.key}:${letters(planName)}`;
  }
  const item = String(line.name).replace(/ adicional$/, '');
  const g = redes.carta.find((x) => x.items.some((it) => it[0] === item));
  if (g) return `carta:${g.name}`;
  if (block.world === 'web') return 'web';
  if (block.world === 'produccion') return 'produccion';
  return 'carta:Videos y piezas';
}
const planLines = (q) => (q.blocks || []).flatMap((b) => (b.lines || []).filter((l) => b.world === 'marca' && l.source === 'plan').map((l) => ({ b, l })));

/**
 * Filas de comisión para un pago. first = es el primer pago de la cotización.
 * monthly = es el cobro de un mes de Redes (desde el mes 2): solo cuentan los planes.
 */
export function commissionRows({ quote, payment, rules, first = false, monthly = false, projectId = null }) {
  const manager = rules.pagos.cover?.manager;
  if (!manager || quote.owner_id !== manager) return [];
  const rows = [];
  const base = { manager_id: manager, quote_id: quote.id, payment_id: payment.id || null, project_id: projectId };
  // planes de Redes: una comisión por el mes pagado (el primer mes, con el primer pago de la cotización)
  if (first || monthly) {
    planLines(quote).forEach(({ b, l }) => {
      const key = keyForLine(b, l, rules.redes);
      const pct = Number(pctFor(rules.pagos, key).manager) || 0;
      const price = Number(l.price) || 0;
      if (pct && price) rows.push({ ...base, kind: 'mensual', period: monthOf(payment.paid_on), concept: l.name, base: price, pct, amount: Math.round(price * pct / 100) });
    });
  }
  if (monthly) return rows;
  // ventas sueltas: proporcional a lo que se pagó
  const t = totals(quote);
  const share = t.total ? Math.min(1, Number(payment.amount) / t.total) : 0;
  let b0 = 0; let a0 = 0; const names = [];
  (quote.blocks || []).forEach((b) => (b.lines || []).forEach((l) => {
    if (b.world === 'marca' && l.source === 'plan') return;
    const key = keyForLine(b, l, rules.redes);
    const pct = Number(pctFor(rules.pagos, key).manager) || 0;
    const lineBase = (Number(l.qty) || 0) * (Number(l.price) || 0) * share;
    if (!pct || !lineBase) return;
    b0 += lineBase; a0 += lineBase * pct / 100; names.push(l.name);
  }));
  if (a0) rows.push({ ...base, kind: 'unica', period: null, concept: names.slice(0, 3).join(', ') + (names.length > 3 ? ` y ${names.length - 3} más` : ''), base: Math.round(b0), pct: Math.round(a0 / b0 * 1000) / 10, amount: Math.round(a0) });
  return rows;
}

/** Anota las comisiones de un pago (si no hay manager o no aplica, no hace nada). */
export async function recordCommissions(sb, args) {
  const rules = args.rules || await loadRules(sb);
  const rows = commissionRows({ ...args, rules });
  if (!rows.length) return { count: 0 };
  const { error } = await sb.from('commissions').insert(rows);
  return { count: error ? 0 : rows.length, error };
}
