/* ==========================================================================
   RAKÜN · gestor · las piezas de cada plan de Redes
   · 12 Tarifario → «Piezas de cada plan»: para consultar de qué está hecho
     cada plan y comprobar que la suma da el precio publicado.
   · 09 Planes y precios → «Piezas 🔒» (solo admin): editar el precio de cada
     pieza, los paquetes de video y las piezas de cada plan.
   Se guarda en app_settings id 'piezas'; si no hay nada, planes/piezas.js.
   ========================================================================== */
import { esc } from './util.js';
import { loadCatalog } from './catalog.js';
import { REDES, isRedes } from '../planes/data.js';
import { mergePiezas, planKey, pieceName, partsSum } from '../planes/piezas.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const n = (v) => (typeof v === 'number' ? v : Number(String(v || '').replace(/\D/g, '')) || 0);

export async function loadPiezas(sb) {
  const [{ data }, m] = await Promise.all([
    sb.from('app_settings').select('content, updated_at').eq('id', 'piezas').maybeSingle(),
    loadCatalog('marca'),
  ]);
  return { piezas: mergePiezas(data?.content), redes: isRedes(m) ? { ...REDES, ...m } : REDES, saved: data?.updated_at || null };
}

// cada plan publicado con sus piezas y si la suma da lo publicado
function planChecks(piezas, redes) {
  return redes.cats.flatMap((c) => c.plans.filter((p) => !p.hidden).map((p) => {
    const rows = piezas.plans[planKey(c.key, p.name)];
    const parts = (rows || []).map(([k, q, pr]) => ({ k, q: n(q), p: n(pr) }));
    const sum = partsSum(parts);
    return { cat: c, plan: p, key: planKey(c.key, p.name), rows, parts, sum, ed: n(p.ed), rec: n(p.rec), ok: rows && sum === n(p.ed) };
  }));
}

const checkTag = (x) => (!x.rows ? '<span class="pz__no">Sin piezas definidas</span>'
  : x.ok ? '<span class="pz__ok">✓ Cuadra con el precio publicado</span>'
    : `<span class="pz__no">No cuadra · ${x.sum > x.ed ? 'sobran' : 'faltan'} ${cop(Math.abs(x.sum - x.ed))}</span>`);

/* ---------- 12 Tarifario: para consultar ---------- */
export function piezasViewHTML({ piezas, redes }) {
  const checks = planChecks(piezas, redes);
  return `
    <p class="gx__p pz__intro">De qué está hecho cada plan, con el precio de cada pieza dentro del plan. En la cotización se pueden cambiar o quitar piezas; lo que se agrega aparte va con el precio de la carta del club (suelto). Los precios se cambian en 09 · Planes y precios → Piezas (solo admin).</p>
    <div class="pz">
      ${checks.map((x) => `
      <section class="pz__plan" style="--c:${esc(x.cat.color || 'var(--pink)')}">
        <header class="pz__h"><h3><small class="mono">${esc(x.cat.name)}</small>${esc(x.plan.name)}</h3>${checkTag(x)}</header>
        ${x.parts.map((p) => `<p class="pz__ln"><span>${p.q > 1 ? `${p.q} × ` : ''}${esc(pieceName(piezas, p.k))}${p.q > 1 && p.p ? ` <small>· ${cop(p.p)} c/u</small>` : ''}</span><b class="mono">${p.p ? cop(p.q * p.p) : 'incluido'}</b></p>`).join('')}
        <p class="pz__tot"><span>Suma · publicado ${cop(x.ed)}</span><b class="mono">${cop(x.sum)}</b></p>
        <p class="mono qx__dim pz__rec">Con grabación: +${cop(x.rec - x.ed)} = ${cop(x.rec)}${x.plan.recText ? ` · ${esc(x.plan.recText)}` : ''}</p>
      </section>`).join('')}
    </div>
    <h2 class="mono pz__t">Precio de cada pieza dentro de los planes</h2>
    <div class="pz__items">
      ${Object.values(piezas.items).map((it) => `<p class="pz__ln"><span>${esc(it.name)} <small>· por ${esc(it.unit)}</small></span><b class="mono">${cop(it.price)}</b></p>`).join('')}
    </div>
    <h2 class="mono pz__t">Paquetes de videos</h2>
    <div class="pz__items">
      ${piezas.packs.map((pk) => { const loose = Object.entries(pk.has).reduce((s, [k, q]) => s + q * n(piezas.items[k]?.price), 0); return `<p class="pz__ln"><span>${esc(pk.name)} <small>· sueltos ${cop(loose)}</small></span><b class="mono">${cop(pk.price)}</b></p>`; }).join('')}
    </div>`;
}

/* ---------- 09 Planes y precios → Piezas (admin) ---------- */
const priceIn = (path, v, label) => `<input class="pz__in" data-path="${esc(path)}" data-kind="price" inputmode="numeric" value="${esc(v)}" aria-label="${esc(label)}" data-rerender-change>`;
export function piezasEditHTML(d, redes) {
  const checks = planChecks(d, redes);
  const keys = [...Object.keys(d.items), ...d.packs.map((p) => `pack:${p.key}`)];
  return `
    <p class="gx__p pz__intro">El precio de cada pieza <b>dentro de los planes</b> (lo suelto va en la carta del club, más caro). Cada plan tiene sus propias piezas para que la suma dé exacto lo publicado en Redes; si no cuadra, sale en rosado. Esto no se ve en la página: lo usan la cotización y el Tarifario.</p>
    <div class="pz pz--edit">
      ${checks.map((x) => `
      <section class="pz__plan" style="--c:${esc(x.cat.color || 'var(--pink)')}">
        <header class="pz__h"><h3><small class="mono">${esc(x.cat.name)}</small>${esc(x.plan.name)}</h3>${checkTag(x)}</header>
        ${x.rows ? x.rows.map((r, j) => `
        <div class="pz__er">
          <select data-path="plans.${esc(x.key)}.${j}.0" data-rerender="1" aria-label="Pieza">${keys.map((k) => `<option value="${esc(k)}"${k === r[0] ? ' selected' : ''}>${esc(pieceName(d, k))}</option>`).join('')}</select>
          <input class="pz__q" data-path="plans.${esc(x.key)}.${j}.1" data-kind="int" inputmode="numeric" value="${esc(r[1])}" aria-label="Cantidad" data-rerender-change>
          ${priceIn(`plans.${x.key}.${j}.2`, r[2], 'Precio por unidad dentro del plan')}
          <button type="button" class="gx__mini" data-del="plans.${esc(x.key)}" data-i="${j}" aria-label="Quitar pieza">✕</button>
        </div>`).join('') : ''}
        ${x.rows ? `<button type="button" class="gx__add mono" data-pz-add="${esc(x.key)}">+ Agregar pieza</button>` : `<button type="button" class="gx__add mono" data-pz-new="${esc(x.key)}">+ Definir las piezas de este plan</button>`}
        <p class="pz__tot"><span>Suma · publicado ${cop(x.ed)}</span><b class="mono">${cop(x.sum)}</b></p>
      </section>`).join('')}
    </div>
    <h2 class="mono pz__t">Precio de cada pieza (para cambiar una por otra)</h2>
    <div class="pz__items pz__items--edit">
      ${Object.entries(d.items).map(([k, it]) => `<label class="pz__ln"><span>${esc(it.name)} <small>· por ${esc(it.unit)}</small></span>${priceIn(`items.${k}.price`, it.price, it.name)}</label>`).join('')}
    </div>
    <h2 class="mono pz__t">Paquetes de videos</h2>
    <div class="pz__items pz__items--edit">
      ${d.packs.map((pk, i) => `<label class="pz__ln"><span>${esc(pk.name)}</span>${priceIn(`packs.${i}.price`, pk.price, pk.name)}</label>`).join('')}
    </div>`;
}
