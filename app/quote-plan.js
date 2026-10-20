/* ==========================================================================
   RAKÜN · cotización → cambiar partes de un plan de Redes
   El plan viene con sus piezas (planes/piezas.js). Cada pieza se cambia por
   otra del mismo tipo, cambia su cantidad o se quita; lo que no traía el plan
   se agrega con el precio de la carta. El precio de la línea es lo publicado
   más lo que suma o resta cada cambio, y el recibo muestra solo los cambios.
   Lienzo: «Cotización · cambiar partes del plan».
   ========================================================================== */
import { $$, esc } from './util.js';
import { cop } from './quote-calc.js';
import { pieceName, piecePrice, alternatives, isCount, changesOf, pricedWith } from '../planes/piezas.js';

const sign = (n) => (n > 0 ? `+${cop(n)}` : n < 0 ? `−${cop(-n)}` : cop(0));

/** Recalcula los cambios y el precio de la línea del plan. */
export function applyPlan(l, piezas) {
  if (!l.pz) return;
  l.changes = changesOf(piezas, l.pz);
  l.price = pricedWith(l.pz, l.changes);
}

/** El panel con las piezas del plan (abierto o cerrado). */
export function planPartsHTML(l, path, open, piezas, carta) {
  if (!l.pz) return '';
  const ch = l.changes || [];
  const head = `<button type="button" class="qp__toggle mono" data-qp-toggle="${path}" aria-expanded="${open}">${open ? '▾' : '▸'} Cambiar partes del plan${ch.length ? ` · <b>${ch.length} ${ch.length === 1 ? 'cambio' : 'cambios'} · ${sign(ch.reduce((s, c) => s + c.amount, 0))}</b>` : ''}</button>`;
  if (!open) return `<div class="qp">${head}</div>`;
  return `
    <div class="qp is-open">
      ${head}
      <div class="qp__rows">
        ${l.pz.parts.map((x, k) => {
          const alts = alternatives(piezas, x.k);
          const count = isCount(piezas, x.k);
          const name = alts.length > 1 && !x.off
            ? `<select data-qp-key="${path}|${k}" aria-label="Cambiar la pieza">${alts.map((a) => `<option value="${esc(a)}"${a === x.k ? ' selected' : ''}>${esc(pieceName(piezas, a))}</option>`).join('')}</select>`
            : `<span class="qp__name">${esc(pieceName(piezas, x.k))}${x.note ? ` <small>· ${esc(x.note)}</small>` : ''}</span>`;
          const changed = x.off || x.k !== x.o.k || x.q !== x.o.q;
          return `
          <div class="qp__row${x.off ? ' is-off' : ''}${changed ? ' is-changed' : ''}">
            ${name}
            ${count && !x.off ? `<input class="qp__qty" type="number" min="1" max="99" value="${x.q}" data-qp-qty="${path}|${k}" aria-label="Cantidad de ${esc(pieceName(piezas, x.k))}">` : `<span class="qp__q mono">${x.q > 1 ? `× ${x.q}` : ''}</span>`}
            <span class="mono qp__p">${x.off ? '—' : x.p ? cop(x.q * x.p) : 'incluido'}</span>
            ${x.off || changed ? `<button type="button" class="gx__mini" data-qp-undo="${path}|${k}" aria-label="Dejar como venía" title="Dejar como venía">↺</button>` : `<button type="button" class="gx__mini" data-qp-off="${path}|${k}" aria-label="Quitar ${esc(pieceName(piezas, x.k))}">✕</button>`}
          </div>`;
        }).join('')}
        ${(l.pz.adds || []).map((a, k) => `
          <div class="qp__row is-add">
            <span class="qp__name">+ ${esc(a.name)} <small>· precio de la carta</small></span>
            <input class="qp__qty" type="number" min="1" max="99" value="${a.qty}" data-qp-aqty="${path}|${k}" aria-label="Cantidad de ${esc(a.name)}">
            <span class="mono qp__p">${cop(a.qty * a.price)}</span>
            <button type="button" class="gx__mini" data-qp-adel="${path}|${k}" aria-label="Quitar ${esc(a.name)}">✕</button>
          </div>`).join('')}
        <label class="qp__add"><span class="mono">+ Agregar extra</span>
          <select data-qp-add="${path}"><option value="">Elige de la carta del club…</option>
            ${[...new Set(carta.map((c) => c.group))].map((g) => `<optgroup label="${esc(g)}">${carta.map((c, i) => [c, i]).filter(([c]) => c.group === g && c.price).map(([c, i]) => `<option value="${i}">${esc(c.name)} · ${cop(c.price)}</option>`).join('')}</optgroup>`).join('')}
          </select></label>
      </div>
      <div class="qp__sum">
        <span>Plan publicado <b class="mono">${cop(l.pz.base)}</b></span>
        ${ch.map((c) => `<span>${esc(c.t)} <b class="mono${c.amount < 0 ? ' is-neg' : ''}">${sign(c.amount)}</b></span>`).join('')}
        <span class="qp__tot">Este plan queda en <b class="mono">${cop(l.price)} / mes</b></span>
        ${ch.length ? '<span class="mono qx__dim">En el recibo va el nombre del plan y solo estos cambios</span>' : ''}
      </div>
    </div>`;
}

/** Eventos del panel. lineAt(path) devuelve la línea; done() guarda y redibuja. */
export function wirePlanParts(root, st, piezas, carta, lineAt, done) {
  const at = (v) => { const [path, k] = v.split('|'); return [lineAt(path), Number(k), path]; };
  $$('[data-qp-toggle]', root).forEach((b) => b.addEventListener('click', () => { st.qp = st.qp === b.dataset.qpToggle ? null : b.dataset.qpToggle; done(false); }));
  $$('[data-qp-key]', root).forEach((el) => el.addEventListener('change', () => {
    const [l, k] = at(el.dataset.qpKey);
    const x = l.pz.parts[k];
    x.k = el.value;
    // la pieza original conserva su precio dentro del plan; otra pieza va con el precio de las piezas
    x.p = x.k === x.o.k ? x.o.p : piecePrice(piezas, x.k);
    if (!isCount(piezas, x.k)) x.q = x.k === x.o.k ? x.o.q : 1;
    applyPlan(l, piezas); done(true);
  }));
  $$('[data-qp-qty]', root).forEach((el) => el.addEventListener('change', () => {
    const [l, k] = at(el.dataset.qpQty);
    l.pz.parts[k].q = Math.max(1, Math.min(99, parseInt(el.value, 10) || 1));
    applyPlan(l, piezas); done(true);
  }));
  $$('[data-qp-off]', root).forEach((b) => b.addEventListener('click', () => { const [l, k] = at(b.dataset.qpOff); l.pz.parts[k].off = true; applyPlan(l, piezas); done(true); }));
  $$('[data-qp-undo]', root).forEach((b) => b.addEventListener('click', () => {
    const [l, k] = at(b.dataset.qpUndo);
    const x = l.pz.parts[k];
    Object.assign(x, { k: x.o.k, q: x.o.q, p: x.o.p, off: false });
    applyPlan(l, piezas); done(true);
  }));
  $$('[data-qp-add]', root).forEach((el) => el.addEventListener('change', () => {
    if (el.value === '') return;
    const c = carta[Number(el.value)];
    const [path] = el.dataset.qpAdd.split('|');
    const l = lineAt(path);
    (l.pz.adds ||= []).push({ name: c.name, qty: 1, price: c.price });
    applyPlan(l, piezas); done(true);
  }));
  $$('[data-qp-aqty]', root).forEach((el) => el.addEventListener('change', () => {
    const [l, k] = at(el.dataset.qpAqty);
    l.pz.adds[k].qty = Math.max(1, Math.min(99, parseInt(el.value, 10) || 1));
    applyPlan(l, piezas); done(true);
  }));
  $$('[data-qp-adel]', root).forEach((b) => b.addEventListener('click', () => { const [l, k] = at(b.dataset.qpAdel); l.pz.adds.splice(k, 1); applyPlan(l, piezas); done(true); }));
}
