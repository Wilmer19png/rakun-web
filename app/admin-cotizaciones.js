/* ==========================================================================
   RAKÜN · gestor · 03 Proyectos → Cotizaciones
   Una cotización tiene bloques (Redes, Página web, Producción audiovisual).
   En cada bloque se suman planes, cambios al plan, la carta del club, la
   librería, tarifas de producción o líneas libres; todo se calcula solo.
   Se envía por enlace (cotizacion.html?c=…), el cliente la acepta y, al
   registrar el anticipo, cada bloque se convierte en un proyecto con sus
   entregables de arranque.
   ========================================================================== */
import { $, $$, esc, initials, waNumber } from './util.js';
import { errorText } from './supa.js';
import { STAGES } from './content.js';
import { totals, blockTotal, lineTotal, cop, partLabel, expired, validUntil, WORLD_LABEL, WORLD_HEX, BILLING } from './quote-calc.js';
import { loadSources, TEMPLATES, KINDS, PROD_TYPES } from './quote-sources.js';

const COLS = [
  ['borrador', 'Borrador', 'var(--mist)'], ['enviada', 'Enviada', 'var(--blue)'],
  ['aceptada', 'Aceptada · espera anticipo', 'var(--yellow)'], ['anticipo', 'Anticipo pagado', 'var(--pink)'],
];
const ARCHIVE = [['pagada', 'Pagada', 'var(--navy)'], ['rechazada', 'Rechazada', 'var(--mist)']];
const STATUS_NAME = Object.fromEntries([...COLS, ...ARCHIVE].map(([k, n]) => [k, n]));
const bigMoney = (n) => `<span class="qx__cur">$</span>${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const SPLITS = [[50, 50], [40, 30, 30], [100]];
const METHODS = ['Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Tarjeta', 'Otro'];

let sources = null;                                       // planes, carta, tarifas… (se cargan una vez)
const ui = { archive: false };

export const quoteUrl = (token) => new URL(`cotizacion.html?c=${token}`, location.href).href;

/* ==========================================================================
   Lista (pestaña Cotizaciones)
   ========================================================================== */
export async function viewQuotes(ctx, tabs) {
  const { sb, main, loading, fail, staff, go } = ctx;
  loading();
  const { data, error } = await sb.from('quotes').select('id, number, title, status, total, blocks, sent_at, viewed_at, accepted_at, created_at, valid_days, owner_id, clients(name)').order('created_at', { ascending: false });
  if (error) {
    main.innerHTML = tabs('cotizaciones');
    fail(/quotes/.test(error.message) ? { message: 'Falta correr supabase/fase7.sql en Supabase.' } : error);
    return;
  }
  const { data: pays } = await sb.from('quote_payments').select('quote_id, amount');
  const paid = {};
  (pays || []).forEach((p) => { paid[p.quote_id] = (paid[p.quote_id] || 0) + Number(p.amount); });

  const card = (q) => {
    const owner = staff.find((s) => s.id === q.owner_id);
    const late = expired(q);
    const worlds = [...new Set((q.blocks || []).map((b) => b.world))];
    const p = paid[q.id] || 0;
    const when = q.status === 'enviada' ? (q.viewed_at ? `<span class="qx__seen">● La vio ${new Date(q.viewed_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>` : '<span class="mono qx__dim">Aún no la abre</span>') : '';
    return `<button class="qx__card${late ? ' is-late' : ''}" type="button" data-quote="${q.id}">
      <span class="mono qx__dim">${esc(q.number)} · ${new Date(q.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
      <b>${esc(q.clients?.name || '—')} · ${esc(q.title)}</b>
      <span class="qx__worlds">${worlds.map((w) => `<span class="mono gx__tag" style="background:${WORLD_HEX[w]}">${WORLD_LABEL[w]}</span>`).join('')}</span>
      <span class="qx__card-foot"><span class="mono">${cop(q.total)}</span>${owner ? `<span class="gx__ava gx__ava--sm" style="background:${esc(owner.color)}" title="${esc(owner.full_name)}">${esc(initials(owner.full_name))}</span>` : ''}</span>
      ${p ? `<span class="qx__bar"><i style="width:${Math.min(100, Math.round(p / (q.total || 1) * 100))}%"></i></span><span class="mono qx__dim">Pagado ${cop(p)} de ${cop(q.total)}</span>` : ''}
      ${when}${late ? '<span class="mono qx__late">Venció · reenvíala o ajusta la validez</span>' : ''}
    </button>`;
  };
  const cols = ui.archive ? ARCHIVE : COLS;
  main.innerHTML = tabs('cotizaciones', `
      <button class="gx__chip${ui.archive ? ' is-on' : ''}" type="button" data-archive>Archivo (pagadas y rechazadas)</button>
      <button class="gx__btn gx__btn--dark" type="button" data-new-quote>+ Nueva cotización</button>`) + `
    <div class="gx__board qx__board" style="--cols:${cols.length}">
      ${cols.map(([k, name, color]) => {
        const items = data.filter((q) => q.status === k);
        return `<section class="gx__col"><h2 class="gx__col-h" style="--c:${color}"><span>${name}</span><span>${items.length}</span></h2>
          ${items.map(card).join('') || '<p class="gx__col-empty">—</p>'}</section>`;
      }).join('')}
    </div>
    ${data.length ? '' : '<p class="gx__empty">Aún no hay cotizaciones. Crea una para cuando ningún plan se ajuste o haya que sumarle cosas.</p>'}`;
  $('[data-archive]', main).addEventListener('click', () => { ui.archive = !ui.archive; go('proyectos', { tab: 'cotizaciones' }); });
  $('[data-new-quote]', main).addEventListener('click', () => go('proyectos', { quote: 'new' }));
  $$('[data-quote]', main).forEach((b) => b.addEventListener('click', () => go('proyectos', { quote: b.dataset.quote })));
}

/* ==========================================================================
   Armar una cotización
   ========================================================================== */
export async function editQuote(ctx, id, preset = {}) {
  const { sb, main, loading, fail, me } = ctx;
  loading();
  const [{ data: clients }, src, found] = await Promise.all([
    sb.from('clients').select('id, name, company, email, phone, user_id').order('name'),
    sources ? Promise.resolve(sources) : loadSources(),
    id && id !== 'new' ? sb.from('quotes').select('*').eq('id', id).single() : Promise.resolve({ data: null }),
  ]);
  sources = src;
  if (found.error) { main.innerHTML = ''; fail(found.error); return; }
  const q = found.data || {
    client_id: preset.client_id || '', lead_id: preset.lead_id || null, title: preset.title || '', status: 'borrador',
    valid_days: 15, blocks: preset.world ? [newBlock(preset.world)] : [], discount: 0, iva: false, split: [50, 50], note: '', owner_id: me.id,
  };
  const st = { q, clients: clients || [], picker: null, tab: 0, find: '', saving: null, msg: '' };
  renderEditor(ctx, st);
}

const newBlock = (world) => ({ world, title: WORLD_LABEL[world], lines: [], meta: world === 'produccion' ? { tipo: 'Videoclip', dias: 1, duracion: '', ciudad: '' } : {} });

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o = o[k]; });
  o[keys[keys.length - 1]] = value;
}

function renderEditor(ctx, st) {
  const { main, staff, go } = ctx;
  const { q } = st;
  const t = totals(q);
  const client = st.clients.find((c) => c.id === q.client_id);
  const locked = ['anticipo', 'pagada'].includes(q.status);
  const scroll = window.scrollY;
  // si se redibuja mientras escriben (p. ej. al guardarse por primera vez), el cursor vuelve a su campo
  const act = document.activeElement;
  const focusPath = act?.dataset?.path;
  const caret = focusPath && typeof act.selectionStart === 'number' ? act.selectionStart : null;

  main.innerHTML = `
    <header class="gx__head">
      <div><p class="mono gx__kicker"><button class="qx__crumb" type="button" data-back>03 · Proyectos · Cotizaciones</button>${q.number ? ` / ${esc(q.number)}` : ''}</p>
        <h1 class="gx__title">${q.id ? esc(q.title || 'Cotización') : 'Nueva cotización'}</h1></div>
      <div class="gx__actions"><span class="mono gx__tag qx__status" style="background:${(COLS.find(([k]) => k === q.status) || ARCHIVE.find(([k]) => k === q.status) || [])[2] || 'var(--mist)'}">${STATUS_NAME[q.status] || q.status}${expired(q) ? ' · vencida' : ''}</span><span class="mono qx__saving" data-saving>${q.id ? '✓ Guardada' : 'Sin guardar · elige el cliente'}</span></div>
    </header>
    ${locked ? '<p class="gx__note qx__lock">Esta cotización ya tiene pagos: los cambios en las líneas no cambian lo que ya se cobró. Si hace falta algo nuevo, mejor crea otra cotización.</p>' : ''}
    <div class="qx__grid">
      <div class="qx__left">
        <div class="qx__data">
          <label class="gx__f"><span>Cliente *</span><select data-path="client_id" data-rerender="1"><option value="">Elige el cliente…</option>${st.clients.map((c) => `<option value="${c.id}"${c.id === q.client_id ? ' selected' : ''}>${esc(c.name)}${c.company ? ` · ${esc(c.company)}` : ''}</option>`).join('')}</select></label>
          <label class="gx__f"><span>Nombre de la cotización *</span><input data-path="title" value="${esc(q.title)}" maxlength="160" placeholder="Redes + página de citas"></label>
          <label class="gx__f"><span>Validez (días)</span><input data-path="valid_days" data-kind="int" inputmode="numeric" value="${esc(q.valid_days)}"></label>
          <label class="gx__f"><span>Te atiende</span><select data-path="owner_id">${staff.map((s) => `<option value="${s.id}"${s.id === q.owner_id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></label>
          ${client ? '' : '<p class="mono qx__dim qx__span">¿Cliente nuevo? Créalo en <button class="qx__link" type="button" data-go-clients>02 Clientes</button> y vuelve.</p>'}
        </div>

        ${q.blocks.map((b, i) => blockHTML(st, b, i)).join('')}

        <div class="qx__addblock">
          <p class="mono">+ Agregar ${q.blocks.length ? 'otro ' : ''}bloque · cada bloque será un proyecto</p>
          <div class="qx__addblock-grid">
            ${[['marca', 'Planes, cambios al plan, carta del club y librería. Cobro mensual.'], ['produccion', 'Preproducción, rodaje, equipos, postproducción y logística.'], ['web', 'Planes de web, páginas extra, funciones, hosting, mantenimiento.']]
              .map(([w, d]) => `<button type="button" class="qx__addb" style="--w:${WORLD_HEX[w]}" data-add-block="${w}"><b>${WORLD_LABEL[w]}</b><span>${d}</span></button>`).join('')}
          </div>
        </div>
      </div>

      <aside class="qx__sum">
        <p class="mono qx__sum-k">Resumen · se calcula solo</p>
        <div data-sum-blocks>${sumBlocksHTML(q)}</div>
        <label class="qx__sum-r qx__sum-in"><span>Descuento ($)</span><input data-path="discount" data-kind="money" inputmode="numeric" value="${q.discount ? esc(q.discount) : ''}" placeholder="0"></label>
        <label class="qx__sum-r qx__check"><span><input type="checkbox" data-path="iva"${q.iva ? ' checked' : ''}> IVA 19 %</span><span class="mono" data-sum="iva">${cop(t.iva)}</span></label>
        <div class="qx__sum-total"><span class="mono">Total</span><b data-sum="total">${bigMoney(t.total)}</b></div>
        <p class="mono qx__sum-k2">Forma de pago</p>
        <div class="qx__splits">
          ${SPLITS.map((s) => `<button type="button" class="qx__split${s.join() === q.split.join() ? ' is-on' : ''}" data-split="${s.join(',')}">${s.join(' / ')}</button>`).join('')}
          <input class="qx__split-in" data-split-custom value="${SPLITS.some((s) => s.join() === q.split.join()) ? '' : q.split.join(' / ')}" placeholder="Otra: 30 / 70" aria-label="Otra forma de pago (porcentajes)">
        </div>
        <div data-sum-parts>${partsHTML(q, t)}</div>
        <label class="gx__f qx__note-f"><span>Nota para el cliente</span><textarea data-path="note" rows="3" maxlength="2000" placeholder="Incluye una revisión de la estrategia al mes 3.">${esc(q.note || '')}</textarea></label>
        <p class="mono gx__saved" data-msg aria-live="polite">${esc(st.msg)}</p>
        <div class="qx__sum-btns">
          ${q.id ? `<a class="gx__btn" href="${esc(quoteUrl(q.token))}" target="_blank" rel="noopener">Ver el recibo ↗</a>` : ''}
          ${q.id && !locked ? `<button class="gx__btn gx__btn--hot" type="button" data-send>${q.status === 'borrador' ? 'Enviar al cliente →' : 'Reenviar el enlace →'}</button>` : ''}
          ${q.id && ['enviada', 'aceptada', 'anticipo'].includes(q.status) ? '<button class="gx__btn gx__btn--dark" type="button" data-pay>Registrar pago</button>' : ''}
          ${q.id && ['enviada', 'aceptada'].includes(q.status) ? '<button class="gx__danger mono" type="button" data-reject>Marcar como rechazada</button>' : ''}
          ${q.id && ['borrador', 'rechazada'].includes(q.status) && ctx.me.role === 'admin' ? '<button class="gx__danger mono" type="button" data-del-quote>Eliminar cotización</button>' : ''}
        </div>
      </aside>
    </div>`;
  window.scrollTo(0, scroll);
  if (focusPath) {
    const el = $(`[data-path="${focusPath}"]`, main);
    if (el) { el.focus({ preventScroll: true }); if (caret !== null && el.setSelectionRange) { try { el.setSelectionRange(caret, caret); } catch { /* select/number */ } } }
  }
  wireEditor(ctx, st);
}

function blockHTML(st, b, i) {
  const { q } = st;
  const tabs = sources.tabs[b.world];
  const open = st.picker === i;
  const items = open && st.tab < tabs.length ? tabs[st.tab][1].filter((it) => !st.find || `${it.name} ${it.group} ${it.detail}`.toLowerCase().includes(st.find.toLowerCase())) : [];
  return `
  <section class="qx__blk" style="--w:${WORLD_HEX[b.world]}">
    <div class="qx__blk-h">
      <span class="mono qx__dim">Bloque ${i + 1}</span>
      <input class="qx__blk-title" data-path="blocks.${i}.title" value="${esc(b.title)}" aria-label="Nombre del bloque">
      <span class="mono gx__tag" style="background:${WORLD_HEX[b.world]}">${BILLING[b.world]}</span>
      <b class="mono qx__blk-total" data-bt="${i}">${cop(blockTotal(b))}</b>
      <button type="button" class="gx__mini" data-move-block="${i}" data-dir="-1" aria-label="Subir bloque">↑</button>
      <button type="button" class="gx__mini" data-move-block="${i}" data-dir="1" aria-label="Bajar bloque">↓</button>
      <button type="button" class="gx__mini" data-del-block="${i}" aria-label="Quitar bloque">✕</button>
    </div>
    ${b.world === 'produccion' ? `
    <div class="qx__meta">
      <label class="gx__f"><span>Tipo</span><select data-path="blocks.${i}.meta.tipo">${PROD_TYPES.map((p) => `<option${p === b.meta?.tipo ? ' selected' : ''}>${p}</option>`).join('')}</select></label>
      <label class="gx__f"><span>Días de rodaje</span><input data-path="blocks.${i}.meta.dias" data-kind="int" inputmode="numeric" value="${esc(b.meta?.dias ?? '')}"></label>
      <label class="gx__f"><span>Duración final</span><input data-path="blocks.${i}.meta.duracion" value="${esc(b.meta?.duracion || '')}" placeholder="3:30 min"></label>
      <label class="gx__f"><span>Ciudad</span><input data-path="blocks.${i}.meta.ciudad" value="${esc(b.meta?.ciudad || '')}"></label>
    </div>` : ''}
    <div class="qx__lines">
      ${b.lines.length ? `<div class="qx__ln qx__ln--h mono"><span>Concepto</span><span>Origen</span><span>Cant.</span><span>Unidad</span><span>Unitario</span><span>Total</span><span></span></div>` : ''}
      ${b.lines.map((l, j) => `
      <div class="qx__ln${l.source === 'plan' ? ' is-plan' : ''}">
        <span class="qx__ln-name"><input data-path="blocks.${i}.lines.${j}.name" value="${esc(l.name)}" aria-label="Concepto"><input class="qx__ln-detail" data-path="blocks.${i}.lines.${j}.detail" value="${esc(l.detail || '')}" placeholder="Detalle (se ve en el recibo)" aria-label="Detalle"></span>
        <span><span class="mono qx__src">${esc(srcName(l.source))}</span></span>
        <input data-path="blocks.${i}.lines.${j}.qty" data-kind="num" inputmode="decimal" value="${esc(l.qty)}" aria-label="Cantidad">
        <input data-path="blocks.${i}.lines.${j}.unit" value="${esc(l.unit || '')}" aria-label="Unidad">
        <input data-path="blocks.${i}.lines.${j}.price" data-kind="money" inputmode="numeric" value="${esc(l.price)}" aria-label="Valor unitario">
        <b class="mono" data-lt="${i}.${j}">${cop(lineTotal(l))}</b>
        <button type="button" class="gx__mini" data-del-line="${i}.${j}" aria-label="Quitar línea">✕</button>
      </div>`).join('')}
      <button type="button" class="gx__add mono" data-picker="${i}">${open ? '− Cerrar' : '+ Agregar'}</button>
      ${b.world === 'marca' && blockMonthly(b) ? `<span class="mono qx__dim qx__monthly">Desde el mes 2: ${cop(blockMonthly(b))} / mes (solo el plan)</span>` : ''}
    </div>
    ${open ? `
    <div class="qx__picker">
      <p class="mono qx__picker-k">Agregar a ${esc(b.title)}</p>
      <div class="qx__ptabs">${tabs.map(([name], k) => `<button type="button" class="gx__chip${st.tab === k ? ' is-on' : ''}" data-ptab="${k}">${name}</button>`).join('')}<button type="button" class="gx__chip${st.tab === tabs.length ? ' is-on' : ''}" data-ptab="${tabs.length}">Línea libre</button></div>
      ${st.tab < tabs.length ? `
      <input class="qx__find" type="search" data-find value="${esc(st.find)}" placeholder="Buscar…" aria-label="Buscar">
      <div class="qx__items">
        ${items.map((it) => `<button type="button" class="qx__item" data-pick="${tabs[st.tab][1].indexOf(it)}"><span><b>${esc(it.name)}</b><small>${esc(it.group)}${it.detail ? ` · ${esc(it.detail)}` : ''}</small></span><span class="mono">${it.price ? cop(it.price) : 'a cotizar'} <i>+</i></span></button>`).join('') || '<p class="mono qx__dim">Nada con ese nombre.</p>'}
      </div>
      ${b.world === 'produccion' && st.tab === 0 ? '<p class="mono qx__dim">Las tarifas base se editan en 09 Planes y precios → Producción.</p>' : ''}` : `
      <p class="gx__p">Agrega una línea en blanco y escribe lo que quieras: concepto, cantidad, unidad y valor.</p>
      <button type="button" class="gx__btn" data-free>+ Línea libre</button>`}
    </div>` : ''}
  </section>`;
}

const srcName = (s) => ({ plan: 'Plan', cambio: 'Cambio al plan', carta: 'Carta del club', libreria: 'Librería', libre: 'Línea libre' }[s] || s || 'Línea libre');
const blockMonthly = (b) => b.lines.filter((l) => l.source === 'plan').reduce((s, l) => s + (Number(l.price) || 0), 0);

const sumBlocksHTML = (q) => q.blocks.map((b, i) => `<div class="qx__sum-r"><span><i class="qx__dot" style="background:${WORLD_HEX[b.world]}"></i>${esc(b.title)}${b.world === 'marca' ? ' · 1.er mes' : ''}</span><span class="mono" data-sb="${i}">${cop(blockTotal(b))}</span></div>`).join('') || '<p class="mono qx__dim">Agrega un bloque para empezar.</p>';

function partsHTML(q, t) {
  return `${t.discount ? `<div class="qx__sum-r"><span>Subtotal con descuento</span><span class="mono">${cop(t.base)}</span></div>` : ''}
    ${t.parts.map((p, i) => `<div class="qx__sum-r"><span>${partLabel(i, t.parts.length)} · ${p.pct} %</span><span class="mono">${cop(p.amount)}</span></div>`).join('')}
    ${t.monthly ? `<p class="qx__sum-note">Redes sigue en ${cop(t.monthly)}${q.iva ? ' + IVA' : ''} cada mes desde el mes 2.</p>` : ''}`;
}

/* ---------- eventos del editor ---------- */
function wireEditor(ctx, st) {
  const { main, go } = ctx;
  const { q } = st;
  const rerender = () => renderEditor(ctx, st);
  const changed = (structural) => { scheduleSave(ctx, st); if (structural) rerender(); else refreshNumbers(st); };

  $('[data-back]', main).addEventListener('click', () => go('proyectos', { tab: 'cotizaciones' }));
  $('[data-go-clients]', main)?.addEventListener('click', () => go('clientes'));

  $$('[data-path]', main).forEach((el) => el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
    let v = el.type === 'checkbox' ? el.checked : el.value;
    const k = el.dataset.kind;
    if (k === 'int') v = Math.max(0, parseInt(v, 10) || 0);
    else if (k === 'money') v = Number(String(v).replace(/\D/g, '')) || 0;
    else if (k === 'num') v = Math.max(0, Number(String(v).replace(',', '.')) || 0);
    setPath(q, el.dataset.path, v);
    changed(Boolean(el.dataset.rerender));
  }));
  $$('[data-add-block]', main).forEach((b) => b.addEventListener('click', () => {
    q.blocks.push(newBlock(b.dataset.addBlock));
    st.picker = q.blocks.length - 1; st.tab = 0; st.find = '';
    changed(true);
  }));
  $$('[data-del-block]', main).forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.delBlock);
    if (q.blocks[i].lines.length && !confirm(`¿Quitar el bloque «${q.blocks[i].title}» con sus líneas?`)) return;
    q.blocks.splice(i, 1); st.picker = null;
    changed(true);
  }));
  $$('[data-move-block]', main).forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.moveBlock); const j = i + Number(b.dataset.dir);
    if (j < 0 || j >= q.blocks.length) return;
    [q.blocks[i], q.blocks[j]] = [q.blocks[j], q.blocks[i]]; st.picker = null;
    changed(true);
  }));
  $$('[data-del-line]', main).forEach((b) => b.addEventListener('click', () => {
    const [i, j] = b.dataset.delLine.split('.').map(Number);
    q.blocks[i].lines.splice(j, 1);
    changed(true);
  }));
  $$('[data-picker]', main).forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.picker);
    st.picker = st.picker === i ? null : i; st.tab = 0; st.find = '';
    rerender();
  }));
  $$('[data-ptab]', main).forEach((b) => b.addEventListener('click', () => { st.tab = Number(b.dataset.ptab); st.find = ''; rerender(); }));
  const find = $('[data-find]', main);
  find?.addEventListener('input', () => {
    st.find = find.value; rerender();
    const f = $('[data-find]', main); f.focus(); f.setSelectionRange(f.value.length, f.value.length);
  });
  $$('[data-pick]', main).forEach((b) => b.addEventListener('click', () => {
    const blk = q.blocks[st.picker];
    const it = sources.tabs[blk.world][st.tab][1][Number(b.dataset.pick)];
    blk.lines.push({ name: it.name, detail: it.detail || '', source: it.source, qty: 1, unit: it.unit || '', price: it.price || 0 });
    changed(true);
  }));
  $('[data-free]', main)?.addEventListener('click', () => {
    q.blocks[st.picker].lines.push({ name: '', detail: '', source: 'libre', qty: 1, unit: '', price: 0 });
    changed(true);
    const ins = $$('.qx__ln-name input:first-child', main);
    ins[ins.length - 1]?.focus();
  });
  $$('[data-split]', main).forEach((b) => b.addEventListener('click', () => { q.split = b.dataset.split.split(',').map(Number); changed(true); }));
  const custom = $('[data-split-custom]', main);
  custom.addEventListener('change', () => {
    const parts = custom.value.split(/[^\d]+/).map(Number).filter((x) => x > 0);
    if (!parts.length || parts.reduce((a, b) => a + b, 0) !== 100) { st.msg = 'Las cuotas deben sumar 100 %.'; $('[data-msg]', main).textContent = st.msg; return; }
    st.msg = ''; q.split = parts; changed(true);
  });
  $('[data-send]', main)?.addEventListener('click', () => sendQuote(ctx, st));
  $('[data-pay]', main)?.addEventListener('click', () => payQuote(ctx, st));
  $('[data-reject]', main)?.addEventListener('click', async () => {
    if (!confirm('¿Marcar la cotización como rechazada? Se va al archivo.')) return;
    await patchQuote(ctx, st, { status: 'rechazada' });
    rerender();
  });
  $('[data-del-quote]', main)?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar ${q.number}? No se puede deshacer.`)) return;
    const { error } = await ctx.sb.from('quotes').delete().eq('id', q.id);
    if (error) { $('[data-msg]', main).textContent = errorText(error); return; }
    go('proyectos', { tab: 'cotizaciones' });
  });
}

/* los números cambian sin redibujar (para no perder el cursor) */
function refreshNumbers(st) {
  const { q } = st;
  const t = totals(q);
  q.blocks.forEach((b, i) => {
    b.lines.forEach((l, j) => { const el = $(`[data-lt="${i}.${j}"]`); if (el) el.textContent = cop(lineTotal(l)); });
    const bt = $(`[data-bt="${i}"]`); if (bt) bt.textContent = cop(blockTotal(b));
    const sb = $(`[data-sb="${i}"]`); if (sb) sb.textContent = cop(blockTotal(b));
  });
  $('[data-sum="iva"]').textContent = cop(t.iva);
  $('[data-sum="total"]').innerHTML = bigMoney(t.total);
  $('[data-sum-parts]').innerHTML = partsHTML(q, t);
}

/* ---------- guardar (solo, al dejar de escribir) ---------- */
let saveTimer = null;
function scheduleSave(ctx, st) {
  clearTimeout(saveTimer);
  const label = $('[data-saving]');
  if (!st.q.client_id || !st.q.title.trim()) { if (label) label.textContent = st.q.client_id ? 'Ponle un nombre para guardarla' : 'Elige el cliente para guardarla'; return; }
  if (label) label.textContent = '● Cambios sin guardar';
  saveTimer = setTimeout(() => saveQuote(ctx, st), 700);
}

async function saveQuote(ctx, st) {
  const { sb } = ctx;
  const { q } = st;
  const label = $('[data-saving]');
  if (label) label.textContent = 'Guardando…';
  const fields = {
    client_id: q.client_id, lead_id: q.lead_id || null, title: q.title.trim(), valid_days: q.valid_days || 15, blocks: q.blocks,
    discount: Number(q.discount) || 0, iva: Boolean(q.iva), split: q.split, note: q.note || null, owner_id: q.owner_id || null,
    total: totals(q).total, updated_at: new Date().toISOString(),
  };
  const first = !q.id;
  const res = first ? await sb.from('quotes').insert(fields).select().single() : await sb.from('quotes').update(fields).eq('id', q.id).select().single();
  if (res.error) {
    if (label) label.textContent = /quotes/.test(res.error.message) ? 'Falta correr supabase/fase7.sql' : errorText(res.error);
    return false;
  }
  Object.assign(q, { id: res.data.id, number: res.data.number, token: res.data.token, status: res.data.status });
  if (first) { history.replaceState(null, '', '#proyectos'); renderEditor(ctx, st); }
  else if (label) label.textContent = '✓ Guardada';
  return true;
}

async function patchQuote(ctx, st, fields) {
  const { error } = await ctx.sb.from('quotes').update(fields).eq('id', st.q.id);
  if (error) { st.msg = errorText(error); return false; }
  Object.assign(st.q, fields);
  return true;
}

/* ==========================================================================
   Enviar: enlace para WhatsApp o correo
   ========================================================================== */
async function sendQuote(ctx, st) {
  const { openModal } = ctx;
  const { q } = st;
  clearTimeout(saveTimer);
  if (!(await saveQuote(ctx, st))) return;
  if (!q.blocks.some((b) => b.lines.length)) { st.msg = 'Agrega al menos una línea antes de enviarla.'; renderEditor(ctx, st); return; }
  if (q.status === 'borrador' || expired(q)) await patchQuote(ctx, st, { status: 'enviada', sent_at: new Date().toISOString() });
  const client = st.clients.find((c) => c.id === q.client_id);
  const url = quoteUrl(q.token);
  const first = String(client?.name || '').split(' ')[0];
  const text = `Hola ${first}, te comparto la cotización de RAKÜN «${q.title}» (${q.number}). Aquí puedes verla, descargarla en PDF y aceptarla: ${url}`;
  const wa = waNumber(client?.phone);
  openModal(`
    <p class="mono gx__kicker">${esc(q.number)} · enviada</p>
    <h2 class="gx__modal-title">Mándale <em>el enlace.</em></h2>
    <p class="gx__p">${esc(client?.name || 'El cliente')} la abre sin cuenta. Vas a ver cuándo la abrió y cuando la acepte pasa a «Aceptada». Es válida hasta el <b>${validUntil(q).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</b>.</p>
    <div class="gx__copy"><input readonly value="${esc(url)}" aria-label="Enlace de la cotización"><button class="gx__btn" type="button" data-copy>Copiar</button></div>
    <div class="gx__btns">
      ${wa ? `<a class="gx__btn gx__btn--wa" href="https://wa.me/${wa}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Enviar por WhatsApp ↗</a>` : ''}
      ${client?.email ? `<a class="gx__btn" href="mailto:${esc(client.email)}?subject=${encodeURIComponent(`Cotización RAKÜN · ${q.title}`)}&body=${encodeURIComponent(text)}">Enviar por correo ↗</a>` : ''}
      <a class="gx__btn" href="${esc(url)}" target="_blank" rel="noopener">Ver como el cliente ↗</a>
    </div>`);
  const box = $('[data-modal-box]');
  $('[data-copy]', box).addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(url); e.target.textContent = '✓ Copiado'; } catch { $('input', box).select(); }
  });
  renderEditor(ctx, st);
}

/* ==========================================================================
   Registrar un pago · con el primero se crean los proyectos
   ========================================================================== */
async function payQuote(ctx, st) {
  const { sb, openModal, closeModal, staff, me } = ctx;
  const { q } = st;
  const t = totals(q);
  const [{ data: pays }, { count: made }] = await Promise.all([
    sb.from('quote_payments').select('amount').eq('quote_id', q.id),
    sb.from('projects').select('id', { count: 'exact', head: true }).eq('quote_id', q.id),
  ]);
  const paid = (pays || []).reduce((s, p) => s + Number(p.amount), 0);
  // lo que falta de la cuota que sigue
  let acc = 0; let next = t.total - paid; let nextLabel = 'Lo que falta';
  for (let i = 0; i < t.parts.length; i++) {
    acc += t.parts[i].amount;
    if (acc > paid) { next = acc - paid; nextLabel = partLabel(i, t.parts.length).split(' · ')[0]; break; }
  }
  const client = st.clients.find((c) => c.id === q.client_id);
  const create = !made && q.blocks.some((b) => b.lines.length);
  const today = new Date().toISOString().slice(0, 10);
  const staffOpts = (sel) => staff.map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('');

  openModal(`
    <p class="mono gx__kicker">${esc(q.number)} · ${esc(client?.name || '')}</p>
    <h2 class="gx__modal-title">Registrar <em>un pago.</em></h2>
    <form class="gx__form qx__pay" data-form novalidate>
      <div class="qx__pay-left">
        <label class="gx__f"><span>${esc(nextLabel)} · monto recibido</span><input name="amount" inputmode="numeric" value="${Math.max(0, Math.round(next))}" required></label>
        <div class="gx__row2">
          <label class="gx__f"><span>Medio</span><select name="method">${METHODS.map((m) => `<option>${m}</option>`).join('')}</select></label>
          <label class="gx__f"><span>Fecha</span><input name="paid_on" type="date" value="${today}"></label>
        </div>
        <label class="gx__f"><span>Comprobante (archivo)</span><input name="proof" type="file" accept="image/*,application/pdf"></label>
        <label class="gx__f"><span>…o un enlace</span><input name="proof_url" placeholder="https://"></label>
        <p class="mono qx__dim">Pagado hasta hoy: ${cop(paid)} de ${cop(t.total)}</p>
      </div>
      ${create ? `
      <div class="qx__pay-right">
        <p class="mono qx__pink">Al guardar se crean estos proyectos</p>
        <p class="gx__p">Uno por bloque, con sus entregables de arranque. Puedes cambiar el responsable, el inicio y quién hace cada cosa.</p>
        ${q.blocks.map((b, i) => b.lines.length ? `
        <fieldset class="qx__newp" style="--w:${WORLD_HEX[b.world]}" data-newp="${i}">
          <label class="gx__f"><span>Proyecto</span><input name="p${i}_name" value="${esc(`${b.title} · ${client?.company || client?.name || ''}`)}" maxlength="160"></label>
          <div class="gx__row2">
            <label class="gx__f"><span>Responsable</span><select name="p${i}_owner">${staffOpts(q.owner_id || me.id)}</select></label>
            <label class="gx__f"><span>Inicio</span><input name="p${i}_start" type="date" value="${today}"></label>
          </div>
          <p class="mono qx__dim">Entregables de arranque · plantilla ${WORLD_LABEL[b.world]}</p>
          ${TEMPLATES[b.world].map(([title, kind, days], k) => `
          <div class="qx__tpl">
            <label class="gx__check"><input type="checkbox" name="p${i}_t${k}" checked><span>${esc(title)} <small class="mono">${KINDS[kind]} · día ${days}</small></span></label>
            <select name="p${i}_a${k}" aria-label="Quién lo hace"><option value="">Responsable del proyecto</option>${staffOpts('')}</select>
          </div>`).join('')}
        </fieldset>` : '').join('')}
        ${client && !client.user_id ? `<label class="gx__check"><input type="checkbox" name="invite" checked><span>Darle acceso al portal a ${esc(client.name)} (${esc(client.email)})</span></label>` : ''}
      </div>` : ''}
      <p class="mono gx__saved qx__span" data-msg aria-live="polite"></p>
      <button class="gx__btn gx__btn--hot qx__span" type="submit">${create ? `Guardar y crear ${q.blocks.filter((b) => b.lines.length).length === 1 ? 'el proyecto' : `${q.blocks.filter((b) => b.lines.length).length} proyectos`} →` : 'Guardar el pago →'}</button>
    </form>`);
  const box = $('[data-modal-box]');
  box.classList.add('qx__modal-wide');
  const f = $('[data-form]', box);
  const msg = $('[data-msg]', f);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const amount = Number(String(fd.get('amount')).replace(/\D/g, ''));
    if (!amount) { msg.textContent = 'Escribe el monto recibido.'; return; }
    const btn = $('button[type="submit"]', f);
    btn.disabled = true;
    msg.textContent = 'Guardando…';
    // comprobante
    let proofPath = null;
    const file = fd.get('proof');
    if (file && file.size) {
      if (file.size > 50 * 1024 * 1024) { msg.textContent = 'El comprobante pesa más de 50 MB.'; btn.disabled = false; return; }
      proofPath = `pagos/${q.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-80)}`;
      const up = await sb.storage.from('entregas').upload(proofPath, file, { upsert: false });
      if (up.error) { msg.textContent = errorText(up.error); btn.disabled = false; return; }
    }
    const pay = await sb.from('quote_payments').insert({
      quote_id: q.id, amount, method: fd.get('method'), paid_on: fd.get('paid_on') || today,
      proof_path: proofPath, proof_url: String(fd.get('proof_url') || '').trim() || null, created_by: me.id,
    });
    if (pay.error) { msg.textContent = errorText(pay.error); btn.disabled = false; return; }
    const status = paid + amount >= t.total ? 'pagada' : 'anticipo';
    await patchQuote(ctx, st, { status, ...(q.accepted_at ? {} : { accepted_at: new Date().toISOString() }) });

    if (create) {
      msg.textContent = 'Creando los proyectos…';
      for (const [i, b] of q.blocks.entries()) {
        if (!b.lines.length) continue;
        const owner = fd.get(`p${i}_owner`) || null;
        const start = fd.get(`p${i}_start`) || today;
        const plan = b.lines.find((l) => l.source === 'plan')?.name || b.lines[0].name;
        const { data: p, error } = await sb.from('projects').insert({
          client_id: q.client_id, world: b.world, name: String(fd.get(`p${i}_name`) || b.title).trim().slice(0, 160) || b.title,
          plan: plan.slice(0, 160), stage: STAGES[b.world][0], status: 'activo', start_date: start, owner_id: owner, quote_id: q.id,
        }).select('id').single();
        if (error) { msg.textContent = errorText(error); btn.disabled = false; return; }
        const rows = TEMPLATES[b.world].map(([title, kind, days], k) => {
          if (!fd.get(`p${i}_t${k}`)) return null;
          const due = new Date(`${start}T18:00:00`); due.setDate(due.getDate() + days);
          const who = fd.get(`p${i}_a${k}`) || owner;
          return { project_id: p.id, title, kind, assignee_id: who, reviewer_id: who && who !== owner ? owner : null, due_at: due.toISOString(), sort: k };
        }).filter(Boolean);
        if (rows.length) {
          const d = await sb.from('deliverables').insert(rows);
          if (d.error) { msg.textContent = errorText(d.error); btn.disabled = false; return; }
        }
      }
    }
    closeModal();
    if (create && fd.get('invite') && client && ctx.openInvite) ctx.openInvite(client);
    renderEditor(ctx, st);
  });
}
