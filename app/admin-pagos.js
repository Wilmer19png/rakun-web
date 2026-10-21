/* ==========================================================================
   RAKÜN · gestor · 09 Planes y precios → Tarifas y pagos 🔒 (solo admin)
   Tres pestañas (lienzo «Tarifas y pagos: comisión del manager y pagos por pieza»):
   · Comisión del manager: venta, operación y grabación por plan; video suelto,
     campañas extra y lo demás.
   · Pagos por pieza: editor, quien graba y diseñadora.
   · Quién cubre cada rol.
   Solo los % y los pagos (celdas amarillas) se editan; el resto se calcula con
   los precios de Redes y las piezas de cada plan.
   ========================================================================== */
import { esc } from './util.js';
import { ROLES, LEVELS3, planManager, planTeam, partsForPlan, oneTimeManager, r100 } from './pagos.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const n = (v) => Number(v) || 0;
const pct = (path, v, label) => `<label class="tp__pc"><input data-path="${esc(path)}" data-kind="pct" inputmode="decimal" value="${esc(v ?? '')}" aria-label="${esc(label)}" data-rerender-change><span>%</span></label>`;
const money = (path, v, label) => `<input class="tp__mo" data-path="${esc(path)}" data-kind="price" inputmode="numeric" value="${esc(v ?? '')}" aria-label="${esc(label)}" data-rerender-change>`;
const TABS = [['manager', 'Comisión del manager'], ['piezas', 'Pagos por pieza'], ['cover', 'Quién cubre cada rol']];

export function pagosEditHTML({ d, redes, piezas, staff, tab = 'manager' }) {
  const plan = (cat, lv) => redes.cats.find((c) => c.key === cat)?.plans.find((p) => p.name === lv);
  const tabs = `<div class="gx__subtabs gx__subtabs--tabs" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="gx__chip${tab === k ? ' is-on' : ''}" data-ptab="${k}">${t}</button>`).join('')}</div>`;
  const intro = '<p class="gx__p">Solo tú ves esta pestaña. Las celdas amarillas se editan; lo demás se calcula con los precios de Redes y las piezas de cada plan. El manager cobra <b>cada mes</b> mientras el cliente esté activo y haya pagado. La pauta no genera comisión. Todo se redondea a la centena.</p>';
  if (tab === 'cover') {
    return `${tabs}${intro}
      <div class="tp__cover">
        ${ROLES.map(([role, name]) => `<label class="gx__f"><span>${esc(name)}</span><select data-cover="${role}"><option value="">Nadie aún</option>${staff.map((s) => `<option value="${s.id}"${d.cover?.[role] === s.id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></label>`).join('')}
      </div>
      <p class="mono qx__dim">Hoy el mismo manager hace venta y operación: pon a la misma persona en las dos. Si cambia, cada persona cobra su parte. Cada quien ve en el Tarifario cuánto gana por producto.</p>`;
  }
  if (tab === 'piezas') {
    const list = (k) => n(piezas.items[k]?.price);
    const vids = [['agil', 'Ágil'], ['pro', 'Pro'], ['premium', 'Premium'], ['horizontal', 'Horizontal (dentro de Impacto)'], ['recorte', 'Recorte vertical (dentro de Impacto)']];
    return `${tabs}${intro}
      <section class="tp__sec"><h3 class="tp__h"><span>Editor · por video entregado y aprobado</span><span class="tp__inline">pago ${pct('editor.pct', d.editor.pct, 'Pago al editor, % del precio')} · ronda extra ${pct('editor.ronda', d.editor.ronda, 'Ronda extra, % del precio')}</span></h3>
        <div class="tp__t tp__t--4"><span class="tp__th">Video</span><span class="tp__th">Precio</span><span class="tp__th">Pago al editor</span><span class="tp__th">Ronda extra</span>
        ${vids.map(([k, name]) => `<span>${esc(name)}</span><span class="mono">${cop(list(k))}</span><span class="mono tp__ok">${cop(r100(list(k) * n(d.editor.pct) / 100))}</span><span class="mono">${cop(r100(list(k) * n(d.editor.ronda) / 100))}</span>`).join('')}</div>
      </section>
      <section class="tp__sec"><h3 class="tp__h"><span>Grabación · por sesión, para quien graba</span><span class="tp__inline">${pct('camara.pct', d.camara.pct, 'Quien graba, % de la grabación del plan')} de lo que suma la grabación al plan</span></h3>
        <div class="tp__t tp__t--3"><span class="tp__th">Plan</span><span class="tp__th">Solo contenido</span><span class="tp__th">Gestión completa</span>
        ${LEVELS3.map((lv) => `<span>${lv}</span>${['contenido', 'gestion'].map((c) => { const p = plan(c, lv); return `<span class="mono tp__ok">${p ? cop(r100((n(p.rec) - n(p.ed)) * n(d.camara.pct) / 100)) : '—'}</span>`; }).join('')}`).join('')}</div>
      </section>
      <section class="tp__sec"><h3 class="tp__h"><span>Diseñadora · por pieza</span></h3>
        <div class="tp__t tp__t--2"><span>Guion</span>${money('diseno.guion', d.diseno.guion, 'Pago por guion')}<span>Carrusel</span>${money('diseno.carrusel', d.diseno.carrusel, 'Pago por carrusel')}<span>Parrilla · por cliente al mes</span>${money('diseno.parrilla', d.diseno.parrilla, 'Pago por parrilla')}</div>
        <div class="tp__t tp__t--5"><span class="tp__th">Plan de gestión · al mes</span><span class="tp__th">Guiones</span><span class="tp__th">Carruseles</span><span class="tp__th">Parrilla</span><span class="tp__th">Total</span>
        ${LEVELS3.map((lv) => { const t = planTeam(d, piezas, partsForPlan(piezas, redes, 'gestion', lv, false)); return `<span>${lv}</span><span class="mono">${cop(t.guiones)}<small>${t.count.guion || 0} guiones</small></span><span class="mono">${cop(t.carruseles)}<small>${t.count.carrusel || 0} carruseles</small></span><span class="mono">${cop(t.parrilla)}</span><span class="mono tp__ok">${cop(t.diseno)}</span>`; }).join('')}</div>
        <p class="mono qx__dim tp__note">Las cantidades salen de 09 → Piezas de cada plan. Si un cliente personaliza su plan, el pago sigue lo que de verdad se entrega.</p>
      </section>`;
  }
  // comisión del manager
  const row = (cat, lv) => {
    const p = plan(cat, lv);
    if (!p) return '';
    const a = planManager(d, redes, cat, lv, false);
    const b = planManager(d, redes, cat, lv, true);
    const base = `manager.${cat}.${lv}`;
    return `<span>${lv}</span><span class="mono">${cop(p.ed)}</span>${pct(`${base}.venta`, d.manager[cat][lv]?.venta, `% venta ${lv}`)}<span class="mono">${cop(a.venta)}</span>
      ${cat === 'gestion' ? `<span class="mono">${cop(a.opBase)}</span>${pct(`${base}.operacion`, d.manager[cat][lv]?.operacion, `% operación ${lv}`)}<span class="mono">${cop(a.operacion)}</span>` : ''}
      <span class="mono">${cop(b.recExtra)}</span>${pct(`${base}.grabacion`, d.manager[cat][lv]?.grabacion, `% grabación ${lv}`)}<span class="mono">${cop(b.grabacion)}</span>
      <span class="mono tp__ok">${cop(a.total)}</span><span class="mono tp__ok">${cop(b.total)}</span>`;
  };
  const head = (op) => `<span class="tp__th">Plan</span><span class="tp__th">Precio del plan</span><span class="tp__th">% venta</span><span class="tp__th">Venta</span>${op ? '<span class="tp__th">Base de operación (gestión − contenido)</span><span class="tp__th">% operación</span><span class="tp__th">Operación</span>' : ''}<span class="tp__th">Extra de grabación</span><span class="tp__th">% grabación</span><span class="tp__th">Grabación</span><span class="tp__th">Total sin grabación</span><span class="tp__th">Total con grabación</span>`;
  const ex = (name, price) => { const m = oneTimeManager(d, name, price); return `<span>${esc(name)}</span><span class="mono">${cop(price)}</span><span class="mono">${cop(m.venta)}</span><span class="mono">${cop(m.operacion)}</span><span class="mono tp__ok">${cop(m.venta + m.operacion)}</span><span class="mono">${cop(price - m.venta - m.operacion)}</span>`; };
  return `${tabs}${intro}
    <section class="tp__sec"><h3 class="tp__h"><span>Gestión completa · por mes</span><span>venta + operación + grabación</span></h3>
      <div class="tp__scroll"><div class="tp__t tp__t--12">${head(true)}${LEVELS3.map((lv) => row('gestion', lv)).join('')}</div></div>
      <p class="mono qx__dim tp__note">La base de operación es el precio de Gestión completa menos el de Solo contenido del mismo nivel. La grabación va con la venta.</p>
    </section>
    <section class="tp__sec"><h3 class="tp__h"><span>Solo contenido · por mes</span><span>sin campañas = sin operación</span></h3>
      <div class="tp__scroll"><div class="tp__t tp__t--9">${head(false)}${LEVELS3.map((lv) => row('contenido', lv)).join('')}</div></div>
    </section>
    <div class="tp__two">
      <section class="tp__sec"><h3 class="tp__h"><span>Una sola vez · ventas sueltas</span></h3>
        <div class="tp__t tp__t--2">
          <span>Video suelto (ágil, Pro, Premium) · también los que se agregan a un plan</span>${pct('manager.video', d.manager.video, '% video suelto')}
          <span>Todo lo demás de la carta del club, web y producción</span>${pct('manager.otros', d.manager.otros, '% lo demás')}
        </div>
      </section>
      <section class="tp__sec"><h3 class="tp__h"><span>Campañas extra · por encima del plan</span><span class="tp__inline">venta ${pct('manager.extras.venta', d.manager.extras.venta, '% venta campañas extra')} · operación ${pct('manager.extras.operacion', d.manager.extras.operacion, '% operación campañas extra')}</span></h3>
        <div class="tp__t tp__t--6"><span class="tp__th">Concepto</span><span class="tp__th">Precio</span><span class="tp__th">Venta</span><span class="tp__th">Operación</span><span class="tp__th">Total manager</span><span class="tp__th">Queda agencia</span>
        ${ex('Campaña extra', 300000)}${ex('Retargeting extra', 200000)}</div>
      </section>
    </div>`;
}
