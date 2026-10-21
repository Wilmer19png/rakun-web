/* ==========================================================================
   RAKÜN · comisiones (fase 10, reglas nuevas en app/pagos.js)
   Se anotan solas al registrar un pago de una cotización:
   · planes de Redes → MENSUAL, una por cada mes que el cliente paga:
       venta + grabación → a quien cubre «Venta» (si la cotización es suya)
       operación         → a quien cubre «Operación»
   · lo que se agrega a un plan y las ventas sueltas → ÚNICA, proporcional a
     lo que el cliente va pagando (video 8 %, campañas extra 15 % + 32 %, lo
     demás 5 %).
   Los % salen de 09 → Tarifas y pagos.
   ========================================================================== */
import { loadPayRules, planManager, oneTimeManager, planOfLine } from './pagos.js';
import { totals } from './quote-calc.js';

const monthOf = (d) => `${String(d).slice(0, 7)}-01`;

export const loadRules = loadPayRules;

const planLines = (q) => (q.blocks || []).flatMap((b) => (b.lines || []).filter((l) => b.world === 'marca' && l.source === 'plan').map((l) => ({ b, l })));
const addsOf = (l) => (l.pz?.adds || []).map((a) => ({ name: a.name, amount: (Number(a.qty) || 0) * (Number(a.price) || 0) }));

/** Lo que el manager gana al mes por un plan de la cotización (con lo que se le cambió, sin los extras). */
export function planCommission(rules, l) {
  const p = planOfLine(rules.redes, l);
  if (!p) return null;
  const price = (Number(l.price) || 0) - addsOf(l).reduce((s, a) => s + a.amount, 0);
  return planManager(rules.pagos, rules.redes, p.catKey, p.planName, p.withRec, price);
}

/**
 * Filas de comisión para un pago. first = es el primer pago de la cotización.
 * monthly = es el cobro de un mes de Redes (desde el mes 2): solo cuentan los planes.
 */
export function commissionRows({ quote, payment, rules, first = false, monthly = false, projectId = null }) {
  const { venta: seller, operacion: operator } = rules.pagos.cover || {};
  const sold = Boolean(seller && quote.owner_id === seller);
  const rows = [];
  const row = (who, extra) => ({ manager_id: who, quote_id: quote.id, payment_id: payment.id || null, project_id: projectId, ...extra });

  // planes de Redes: una comisión por el mes pagado (el primer mes, con el primer pago de la cotización)
  if (first || monthly) {
    planLines(quote).forEach(({ l }) => {
      const c = planCommission(rules, l);
      if (!c) return;
      const period = monthOf(payment.paid_on);
      if (sold && c.venta + c.grabacion) rows.push(row(seller, { kind: 'mensual', period, concept: `${l.name} · venta${c.grabacion ? ' + grabación' : ''}`, base: c.base, pct: Number(c.pct.venta) || 0, amount: c.venta + c.grabacion }));
      if (operator && c.operacion) rows.push(row(operator, { kind: 'mensual', period, concept: `${l.name} · operación`, base: c.opBase, pct: Number(c.pct.operacion) || 0, amount: c.operacion }));
    });
  }
  if (monthly) return rows;

  // ventas sueltas y lo agregado a un plan: proporcional a lo que se pagó
  const t = totals(quote);
  const share = t.total ? Math.min(1, Number(payment.amount) / t.total) : 0;
  const acc = { venta: { base: 0, amount: 0, names: [] }, operacion: { base: 0, amount: 0, names: [] } };
  const add = (name, amount) => {
    if (!amount) return;
    const m = oneTimeManager(rules.pagos, name, amount * share);
    if (m.venta) { acc.venta.base += amount * share; acc.venta.amount += m.venta; acc.venta.names.push(name); }
    if (m.operacion) { acc.operacion.base += amount * share; acc.operacion.amount += m.operacion; acc.operacion.names.push(name); }
  };
  (quote.blocks || []).forEach((b) => (b.lines || []).forEach((l) => {
    if (b.world === 'marca' && l.source === 'plan') { addsOf(l).forEach((a) => add(a.name, a.amount)); return; }
    add(String(l.name).replace(/ adicional$/, ''), (Number(l.qty) || 0) * (Number(l.price) || 0));
  }));
  const concept = (names) => names.slice(0, 3).join(', ') + (names.length > 3 ? ` y ${names.length - 3} más` : '');
  if (sold && acc.venta.amount) rows.push(row(seller, { kind: 'unica', period: null, concept: `${concept(acc.venta.names)} · venta`, base: Math.round(acc.venta.base), pct: Math.round(acc.venta.amount / acc.venta.base * 1000) / 10, amount: Math.round(acc.venta.amount) }));
  if (operator && acc.operacion.amount) rows.push(row(operator, { kind: 'unica', period: null, concept: `${concept(acc.operacion.names)} · operación`, base: Math.round(acc.operacion.base), pct: Math.round(acc.operacion.amount / acc.operacion.base * 1000) / 10, amount: Math.round(acc.operacion.amount) }));
  return rows;
}

/** Anota las comisiones de un pago (si no hay a quién o no aplica, no hace nada). */
export async function recordCommissions(sb, args) {
  const rules = args.rules || await loadRules(sb);
  const rows = commissionRows({ ...args, rules });
  if (!rows.length) return { count: 0 };
  const { error } = await sb.from('commissions').insert(rows);
  return { count: error ? 0 : rows.length, error };
}
