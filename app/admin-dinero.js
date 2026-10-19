/* ==========================================================================
   RAKÜN · gestor · proyecto → Dinero del proyecto (solo quien ve plata)
   Lo que cobra el cliente, lo que gana cada quien por tarea, la comisión del
   manager y lo que queda para RAKÜN. En Redes se registra el pago de cada mes
   (y con él, la comisión mensual del manager).
   ========================================================================== */
import { $, $$, esc, initials } from './util.js';
import { errorText } from './supa.js';
import { totals, blockTotal } from './quote-calc.js';
import { ROLES, pctFor } from './pagos.js';
import { loadRules, keyForLine, recordCommissions } from './comisiones.js';
import { KINDS } from './quote-sources.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const big = (n) => `${n < 0 ? "−" : ""}<span class="cur">$</span>${Math.abs(Math.round(Number(n) || 0)).toLocaleString("es-CO")}`;
const ava = (p) => (p ? `<span class="gx__ava gx__ava--sm" style="background:${esc(p.color || 'var(--mist)')}">${esc(initials(p.full_name || p.email))}</span>` : '');
const missing = (e) => (/pay_amount|commissions|column|relation/.test(e?.message || '') ? 'Falta correr supabase/fase10.sql en Supabase.' : errorText(e));
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export async function moneyPanel(ctx, p, box) {
  const { sb, staff, openModal, closeModal } = ctx;
  const [{ data: tasks, error }, quoteRes, rules] = await Promise.all([
    sb.from('deliverables').select('*').eq('project_id', p.id).order('due_at', { ascending: true, nullsFirst: false }),
    p.quote_id ? sb.from('quotes').select('*').eq('id', p.quote_id).single() : Promise.resolve({ data: null }),
    loadRules(sb),
  ]);
  if (error) { box.innerHTML = `<p class="gx__error">${esc(missing(error))}</p>`; return; }
  const q = quoteRes.data;
  const [{ data: pays }, { data: coms }] = await Promise.all([
    q ? sb.from('quote_payments').select('*').eq('quote_id', q.id).order('paid_on') : Promise.resolve({ data: [] }),
    q ? sb.from('commissions').select('*').eq('quote_id', q.id).order('created_at') : Promise.resolve({ data: [] }),
  ]);
  const monthly = p.world === 'marca';
  const block = q?.blocks?.find((b) => b.world === p.world);
  // lo que cobra el cliente: en Redes, el plan de cada mes; si no, lo del bloque del proyecto
  const charge = monthly ? (block?.lines || []).filter((l) => l.source === 'plan').reduce((s, l) => s + Number(l.price || 0), 0) || (q ? totals(q).monthly : 0)
    : block ? blockTotal(block) : 0;
  const ms = monthStart();
  const inPeriod = (t) => !monthly || !t.due_at || t.due_at >= ms;
  const teamPay = (tasks || []).filter(inPeriod).reduce((s, t) => s + Number(t.pay_amount || 0), 0);
  const comNow = (coms || []).filter((c) => (monthly ? c.kind === 'mensual' && c.period === ms : true)).reduce((s, c) => s + Number(c.amount), 0);
  const margin = charge - teamPay - comNow;
  const paidSum = (pays || []).reduce((s, x) => s + Number(x.amount), 0);
  // presupuesto sugerido por rol (según los % de Tarifas y pagos)
  const planLine = block?.lines?.find((l) => l.source === 'plan');
  const key = planLine ? keyForLine(block, planLine, rules.redes) : p.world === 'web' ? 'web' : p.world === 'produccion' ? 'produccion' : null;
  const pct = key ? pctFor(rules.pagos, key) : {};
  const person = (id) => staff.find((s) => s.id === id);

  box.innerHTML = `
    <div class="mx__kpis dn__kpis">
      <div class="mx__kpi"><span class="mono">${monthly ? 'Cobra el cliente · cada mes' : 'Cobra el cliente'}</span><b>${big(charge)}</b><small>${q ? `pagado ${cop(paidSum)} · cotización ${esc(q.number)}` : 'proyecto sin cotización'}</small></div>
      <div class="mx__kpi"><span class="mono">Pagos al equipo${monthly ? ' · este mes' : ''}</span><b>${big(teamPay)}</b><small>${charge ? `${Math.round(teamPay / charge * 100)} % · ` : ''}${new Set((tasks || []).filter((t) => t.pay_amount).map((t) => t.assignee_id)).size} personas</small></div>
      <div class="mx__kpi"><span class="mono">Comisión manager${monthly ? ' · este mes' : ''}</span><b>${big(comNow)}</b><small>${pct.manager ? `${pct.manager} % ${monthly ? 'mensual' : 'una vez'}` : 'sin comisión'}</small></div>
      <div class="mx__kpi mx__kpi--dark"><span class="mono">Queda RAKÜN</span><b>${big(margin)}</b><small>${charge ? `${Math.round(margin / charge * 100)} %` : '—'}</small></div>
    </div>

    ${key && charge ? `<p class="mono qx__dim dn__budget">Presupuesto sugerido por rol (09 → Tarifas y pagos): ${ROLES.filter(([r]) => r !== 'manager' && pct[r]).map(([r, n]) => `${esc(n)} ${pct[r]} % = <b>${cop(charge * pct[r] / 100)}</b>`).join(' · ') || '—'}</p>` : ''}

    <section class="mx__card dn__tasks">
      <h2 class="mono">Lo que gana cada quien por tarea${monthly ? ' · este mes' : ''}</h2>
      <div class="dn__row dn__row--h mono"><span>Entregable</span><span>Lo hace</span><span>Cómo se paga</span><span>Valor</span><span>Estado</span><span>Pago</span></div>
      ${(tasks || []).map((t) => `
      <div class="dn__row${inPeriod(t) ? '' : ' is-old'}" data-t="${t.id}">
        <span>${esc(t.title)} <small class="mono qx__dim">${esc(KINDS[t.kind] || '')}</small></span>
        <span>${ava(person(t.assignee_id))} ${esc((person(t.assignee_id)?.full_name || 'Sin asignar').split(' ')[0])}</span>
        <input data-pf="pay_note" value="${esc(t.pay_note || '')}" placeholder="Fijo, por unidad…" aria-label="Cómo se paga">
        <input data-pf="pay_amount" inputmode="numeric" value="${t.pay_amount ?? ''}" placeholder="$" aria-label="Valor">
        <span class="mono dn__st">${t.status === 'aprobado' ? 'Aprobado' : t.status === 'en_revision' ? 'En revisión' : t.status === 'en_curso' ? 'En curso' : 'Por hacer'}</span>
        <span>${t.paid_at ? `<span class="mono dn__ok">Pagado ${new Date(`${t.paid_at}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>` : t.pay_amount ? '<span class="mono qx__dim">Por pagar</span>' : '—'}</span>
      </div>`).join('') || '<p class="gx__empty">Aún no hay entregables.</p>'}
      <p class="mono gx__saved" data-dmsg aria-live="polite"></p>
    </section>

    ${q ? `
    <section class="mx__card dn__pays">
      <div class="dn__pays-h"><h2 class="mono">Pagos del cliente y comisiones</h2>${monthly ? '<button class="gx__btn gx__btn--hot" type="button" data-month-pay>Registrar pago del mes →</button>' : ''}</div>
      ${(pays || []).map((x) => `<p class="mx__ref"><span>${new Date(`${x.paid_on}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} · ${esc(x.method)}${x.note ? ` · ${esc(x.note)}` : ''}</span><b class="mono">${cop(x.amount)}</b></p>`).join('') || '<p class="gx__empty">Sin pagos registrados.</p>'}
      ${(coms || []).length ? `<p class="mono qx__dim" style="margin-top:12px">Comisiones de ${esc((person(coms[0].manager_id)?.full_name || 'el manager').split(' ')[0])}</p>
      ${coms.map((c) => `<p class="mx__ref"><span>${c.kind === 'mensual' ? `Mensual · ${new Date(`${c.period}T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}` : 'Única'} · ${esc(c.concept)} · ${c.pct} %</span><b class="mono">${cop(c.amount)} ${c.status === 'pagada' ? '✓' : ''}</b></p>`).join('')}` : ''}
    </section>` : ''}`;

  const msg = $('[data-dmsg]', box);
  $$('[data-pf]', box).forEach((el) => el.addEventListener('change', async () => {
    const id = el.closest('[data-t]').dataset.t;
    let v = el.value.trim() || null;
    if (el.dataset.pf === 'pay_amount' && v) v = Number(v.replace(/\D/g, '')) || null;
    msg.textContent = 'Guardando…';
    const { error: e } = await sb.from('deliverables').update({ [el.dataset.pf]: v }).eq('id', id);
    msg.textContent = e ? missing(e) : '✓ Guardado';
    if (!e && el.dataset.pf === 'pay_amount') moneyPanel(ctx, p, box);
  }));

  // el pago de un mes de Redes (desde el mes 2): anota el pago y la comisión mensual
  $('[data-month-pay]', box)?.addEventListener('click', () => {
    const n = (pays || []).filter((x) => /^Mes \d+/.test(x.note || '')).length + 2;
    const today = new Date().toISOString().slice(0, 10);
    openModal(`
      <p class="mono gx__kicker">${esc(p.name)}</p>
      <h2 class="gx__modal-title">Pago del <em>mes ${n}.</em></h2>
      <form class="gx__form" data-form novalidate>
        <label class="gx__f"><span>Monto recibido</span><input name="amount" inputmode="numeric" value="${Math.round(charge * (q.iva ? 1.19 : 1))}"></label>
        <div class="gx__row2">
          <label class="gx__f"><span>Medio</span><select name="method">${['Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Tarjeta', 'Otro'].map((m) => `<option>${m}</option>`).join('')}</select></label>
          <label class="gx__f"><span>Fecha</span><input name="paid_on" type="date" value="${today}"></label>
        </div>
        <p class="gx__p">Con este pago se anota la comisión mensual del manager (si la cotización es suya).</p>
        <p class="mono gx__saved" data-msg aria-live="polite"></p>
        <button class="gx__btn gx__btn--hot" type="submit">Guardar el pago →</button>
      </form>`);
    const f = $('[data-modal-box] [data-form]');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const amount = Number(String(fd.get('amount')).replace(/\D/g, ''));
      if (!amount) { $('[data-msg]', f).textContent = 'Escribe el monto.'; return; }
      $('[data-msg]', f).textContent = 'Guardando…';
      const { data: pay, error: e1 } = await sb.from('quote_payments').insert({ quote_id: q.id, amount, method: fd.get('method'), paid_on: fd.get('paid_on') || today, note: `Mes ${n}`, created_by: ctx.me.id }).select('id, amount, paid_on').single();
      if (e1) { $('[data-msg]', f).textContent = errorText(e1); return; }
      await recordCommissions(sb, { quote: q, payment: pay, monthly: true, projectId: p.id, rules }).catch(() => {});
      closeModal();
      moneyPanel(ctx, p, box);
    });
  });
}
