/* ==========================================================================
   RAKÜN · gestor · 09 Planes y precios
   Edita una copia de los planes (borrador) y, al publicar, la guarda en
   plan_catalog: marca.html, libreria.html y web.html la leen al cargar.
   Si nunca se ha publicado (o lo publicado es del formato viejo de Marca
   personal), se parte de los precios base de planes/data.js.
   Redes tiene tres pestañas: Planes · Carta del club · Librería de formatos.
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';
import { REDES as BASE_MARCA, WEB as BASE_WEB, LEVELS, PIECES, priceInCarta, isRedes } from '../planes/data.js';
import { BASE_RATES, BASE_RECIBO } from './quote-sources.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
// lo que se puede prender y apagar en el Inicio (index.html lo lee de plan_catalog id 'sitio')
const BASE_SITIO = { testimonios: true };
const BASE = { marca: BASE_MARCA, web: BASE_WEB, produccion: BASE_RATES, recibo: BASE_RECIBO, sitio: BASE_SITIO };
const st = { world: 'marca', tab: 'planes', cat: 0, carta: 0, lib: 0, draft: {}, saved: {}, info: {} };
const REC_OPTIONS = ['1 sesión de hasta 3 h', '1 jornada de hasta 6 h', '1 jornada de hasta 6 h con asistente'];
const COLORS = [['var(--yellow)', 'Amarillo'], ['var(--blue)', 'Azul'], ['var(--pink)', 'Rosado']];

const cop = (n) => (typeof n === 'number' ? `$${n.toLocaleString('es-CO')}` : String(n ?? ''));
/** "1.290.000" o "$ 1290000" → 1290000; cualquier otra cosa ("+30%") queda como texto */
const toPrice = (v) => (/^[\s$]*[\d.\s]+$/.test(v) && /\d/.test(v) ? Number(v.replace(/\D/g, '')) : v.trim());

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o = o[k]; });
  o[keys[keys.length - 1]] = value;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
const isDirty = (w) => JSON.stringify(st.draft[w]) !== st.saved[w];

// plantillas de lo que se agrega con cada botón "+ Agregar…"
const TPL = {
  row: () => ['', ''],
  item: () => ['Nuevo servicio', 'Por video', 0, ''],
  group: () => ({ name: 'Nueva categoría', items: [] }),
  format: () => ['Nuevo formato', '', 'agil'],
  profile: () => 'Nuevo perfil',
  rate: () => ['Nueva tarifa', 'Rodaje', 'día', 0],
  lib: () => ({ key: `grupo-${Date.now().toString(36)}`, title: 'Nuevo grupo', color: 'var(--yellow)', profiles: [], formats: [] }),
};

export async function viewPlans(ctx) {
  const { sb, loading, fail, main } = ctx;
  loading();
  for (const w of ['marca', 'web', 'produccion', 'recibo', 'sitio']) {
    if (st.draft[w]) continue;
    const { data, error } = await sb.from('plan_catalog').select('content, updated_at').eq('id', w).maybeSingle();
    if (error) { main.innerHTML = ''; fail(error); return; }
    // Redes: lo publicado con la estructura vieja (perfiles creador/médico/mentor) ya no sirve
    const old = (w === 'marca' && data && !isRedes(data.content)) || (w === 'produccion' && data && !Array.isArray(data.content?.rates));
    st.draft[w] = clone(data && !old ? data.content : BASE[w]);
    if (w === 'marca') st.draft[w] = { ...clone(BASE_MARCA), ...st.draft[w] };
    if (w === 'recibo') st.draft[w] = { ...clone(BASE_RECIBO), ...st.draft[w] };
    st.saved[w] = old ? '' : JSON.stringify(st.draft[w]);
    st.info[w] = old ? (w === 'marca' ? 'Lo publicado es del formato anterior (Marca personal): estos son los planes nuevos de Redes, publícalos para que se vean' : 'Aún no se han publicado las tarifas de producción')
      : data ? `Publicado por última vez el ${new Date(data.updated_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}`
        : w === 'sitio' ? 'Aún no se ha publicado: «Lo que dicen» se ve en el Inicio' : 'Aún no se ha publicado: estos son los precios base';
  }
  render(ctx);
}

function render(ctx) {
  const { main, head } = ctx;
  const w = st.world;
  const scroll = window.scrollY;
  main.innerHTML = head('09', 'Lo que ve el cliente en la página', 'Planes y precios', `
    ${[['marca', 'Redes', 'var(--yellow)'], ['web', 'Web y apps', 'var(--pink)'], ['produccion', 'Producción', 'var(--blue)'], ['recibo', 'Recibo', 'var(--navy)'], ['sitio', 'Inicio', 'var(--mist)']]
      .map(([k, n, c]) => `<button class="gx__chip gx__chip--world${st.world === k ? ' is-on' : ''}" style="--c:${c}" type="button" data-world="${k}">${n}</button>`).join('')}`) +
    (w === 'marca' ? marcaHTML() : w === 'web' ? webHTML() : w === 'produccion' ? prodHTML() : w === 'sitio' ? sitioHTML() : reciboHTML()) + (`
      <div class="gx__pubbar" data-pubbar>
        <span class="mono" data-pubstate></span>
        <span class="gx__btns">
          <button class="gx__btn" type="button" data-reset>Volver a los precios base</button>
          <button class="gx__btn" type="button" data-discard>Descartar cambios</button>
          <button class="gx__btn gx__btn--dark" type="button" data-publish>Publicar en la página →</button>
        </span>
      </div>`);
  window.scrollTo(0, scroll);
  const rerender = () => render(ctx);

  $$('[data-world]', main).forEach((b) => b.addEventListener('click', () => { st.world = b.dataset.world; rerender(); }));
  $$('[data-tab]', main).forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; rerender(); }));
  $$('[data-cat]', main).forEach((b) => b.addEventListener('click', () => { st.cat = Number(b.dataset.cat); rerender(); }));
  $$('[data-open]', main).forEach((b) => b.addEventListener('click', () => {
    const [k, i] = [b.dataset.open, Number(b.dataset.i)];
    st[k] = st[k] === i ? -1 : i;
    rerender();
  }));
  const d = st.draft[w];

  // cada campo escribe directo en el borrador
  $$('[data-path]', main).forEach((el) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.dataset.kind === 'price') v = toPrice(el.value);
    else if (el.dataset.kind === 'int') v = Math.max(0, parseInt(el.value, 10) || 0);
    else if (el.dataset.kind === 'lines') v = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else v = el.value;
    setPath(d, el.dataset.path, v);
    const fmt = el.closest('.gx__f')?.querySelector('[data-fmt]');
    if (fmt) fmt.textContent = typeof v === 'number' ? cop(v) : '';
    if (el.dataset.rerender) rerender(); else syncBar();
  }));
  // ★ Recomendado: uno solo por categoría
  $$('[data-hot]', main).forEach((el) => el.addEventListener('change', () => {
    const plans = d.cats[st.cat].plans;
    plans.forEach((p, i) => { p.hot = el.checked && i === Number(el.dataset.hot); });
    rerender();
  }));
  // tipos de edición de cada plan (Ágil / Pro / Premium)
  $$('[data-level]', main).forEach((el) => el.addEventListener('change', () => {
    const p = getPath(d, el.dataset.level);
    const on = new Set(p.levels || []);
    if (el.checked) on.add(el.value); else on.delete(el.value);
    p.levels = Object.keys(LEVELS).filter((k) => on.has(k));
    syncBar();
  }));
  // agregar / quitar / mover filas
  $$('[data-add]', main).forEach((b) => b.addEventListener('click', () => {
    const list = getPath(d, b.dataset.add);
    list.push(TPL[b.dataset.tpl || 'row']());
    if (b.dataset.tpl === 'group') st.carta = list.length - 1;
    if (b.dataset.tpl === 'lib') st.lib = list.length - 1;
    rerender();
  }));
  $$('[data-del]', main).forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.ask && !confirm(b.dataset.ask)) return;
    getPath(d, b.dataset.del).splice(Number(b.dataset.i), 1);
    rerender();
  }));
  $$('[data-move]', main).forEach((b) => b.addEventListener('click', () => {
    const list = getPath(d, b.dataset.move);
    const i = Number(b.dataset.i);
    const j = i + Number(b.dataset.dir);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const k = b.dataset.track;                          // si se mueve lo que está abierto, sigue abierto
    if (k && st[k] === i) st[k] = j; else if (k && st[k] === j) st[k] = i;
    rerender();
  }));
  $('[data-discard]', main).addEventListener('click', () => {
    if (!confirm('¿Descartar los cambios que no has publicado?')) return;
    st.draft[w] = st.saved[w] ? JSON.parse(st.saved[w]) : clone(BASE[w]);
    rerender();
  });
  $('[data-reset]', main).addEventListener('click', () => {
    if (!confirm('¿Cargar de nuevo los precios base? (no se publica hasta que toques "Publicar")')) return;
    st.draft[w] = clone(BASE[w]);
    rerender();
  });
  $('[data-publish]', main).addEventListener('click', () => publish(ctx));
  syncBar();
}

function syncBar() {
  const bar = $('[data-pubbar]');
  if (!bar) return;
  const dirty = isDirty(st.world);
  bar.classList.toggle('is-dirty', dirty);
  $('[data-pubstate]', bar).textContent = dirty ? '● Hay cambios sin publicar · la página todavía muestra la versión anterior' : `✓ ${st.info[st.world]}`;
  $('[data-publish]', bar).disabled = !dirty;
  $('[data-discard]', bar).disabled = !dirty;
}

async function publish(ctx) {
  const { sb, me } = ctx;
  const w = st.world;
  const btn = $('[data-publish]');
  btn.disabled = true;
  $('[data-pubstate]').textContent = 'Publicando…';
  const { error } = await sb.from('plan_catalog').upsert({ id: w, content: st.draft[w], updated_by: me.id, updated_at: new Date().toISOString() });
  if (error) { $('[data-pubstate]').textContent = /plan_catalog_id_check/.test(error.message || '') ? 'Falta correr supabase/fase8.sql en Supabase para guardar esto.' : errorText(error); btn.disabled = false; return; }
  st.saved[w] = JSON.stringify(st.draft[w]);
  st.info[w] = `Publicado ahora · ya se ve en la página`;
  syncBar();
}

/* ---------- campos ---------- */
const field = (label, path, value, kind = 'text', extra = '') => `
  <label class="gx__f"><span>${label}${kind === 'price' ? ` <em class="gx__fmt" data-fmt>${typeof value === 'number' ? cop(value) : ''}</em>` : ''}</span>
    <input data-path="${path}"${kind !== 'text' ? ` data-kind="${kind}"` : ''} value="${esc(value ?? '')}"${kind === 'int' ? ' inputmode="numeric"' : ''}${kind === 'price' ? ' inputmode="numeric"' : ''} ${extra}>
  </label>`;
const check = (label, path, on) => `<label class="gx__check"><input type="checkbox" data-path="${path}"${on ? ' checked' : ''}><span>${label}</span></label>`;
const moveBtns = (path, i, track = '') => `
  <button type="button" class="gx__mini" data-move="${path}" data-i="${i}" data-dir="-1"${track ? ` data-track="${track}"` : ''} aria-label="Subir">↑</button>
  <button type="button" class="gx__mini" data-move="${path}" data-i="${i}" data-dir="1"${track ? ` data-track="${track}"` : ''} aria-label="Bajar">↓</button>`;
const colorSelect = (path, value) => `
  <label class="gx__f"><span>Color</span><select data-path="${path}" data-rerender="1">
    ${COLORS.map(([v, n]) => `<option value="${v}"${v === value ? ' selected' : ''}>${n}</option>`).join('')}
  </select></label>`;

function rowsHTML(base, rows) {
  return `<div class="gx__rows">
    ${rows.map(([k, v], j) => `
      <div class="gx__kv">
        <input data-path="${base}.rows.${j}.0" value="${esc(k)}" aria-label="Concepto">
        <input data-path="${base}.rows.${j}.1" value="${esc(v)}" aria-label="Qué incluye">
        <button type="button" class="gx__mini" data-del="${base}.rows" data-i="${j}" aria-label="Quitar fila">✕</button>
      </div>`).join('')}
    <button type="button" class="gx__add mono" data-add="${base}.rows">+ Agregar fila</button>
  </div>`;
}

/* ---------- Redes ---------- */
function marcaHTML() {
  const tabs = [['planes', 'Planes'], ['carta', 'Carta del club'], ['libreria', 'Librería de formatos']];
  return `
    <div class="gx__subtabs gx__subtabs--tabs" role="tablist" aria-label="Qué editar de Redes">
      ${tabs.map(([k, n]) => `<button type="button" role="tab" aria-selected="${st.tab === k}" class="gx__chip${st.tab === k ? ' is-on' : ''}" data-tab="${k}">${n}</button>`).join('')}
    </div>
    ${st.tab === 'planes' ? plansHTML() : st.tab === 'carta' ? cartaHTML() : libHTML()}`;
}

function plansHTML() {
  const d = st.draft.marca;
  if (!d.cats[st.cat]) st.cat = 0;
  const cat = d.cats[st.cat];
  const c = `cats.${st.cat}`;
  return `
    <div class="gx__subtabs">
      ${d.cats.map((x, i) => `<button type="button" class="gx__chip gx__chip--world${st.cat === i ? ' is-on' : ''}" style="--c:${x.color}" data-cat="${i}">${esc(x.name)}</button>`).join('')}
    </div>
    <div class="gx__row2 gx__cat-head">
      ${field('Nombre de la categoría', `${c}.name`, cat.name)}
      ${field('Frase de la categoría', `${c}.desc`, cat.desc)}
    </div>
    <datalist id="rec-options">${REC_OPTIONS.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
    <div class="gx__plan-grid">
      ${cat.plans.map((p, i) => {
        const b = `${c}.plans.${i}`;
        return `
        <article class="gx__plan-card${p.hidden ? ' is-hidden' : ''}${p.hot ? ' is-hot' : ''}" style="border-top-color:${p.hot ? 'var(--pink)' : cat.color}">
          <p class="mono gx__plan-n">Plan ${String(i + 1).padStart(2, '0')}</p>
          ${field('Nombre', `${b}.name`, p.name)}
          ${field('Recomendado para', `${b}.ideal`, p.ideal)}
          <div class="gx__row2">
            ${field('Solo edición · mensual', `${b}.ed`, p.ed, 'price')}
            ${field('Con grabación · mensual', `${b}.rec`, p.rec, 'price')}
          </div>
          ${field('Grabación incluida', `${b}.recText`, p.recText, 'text', 'list="rec-options"')}
          ${st.cat > 0 || p.ads ? field('Pauta sugerida (aparte, desde)', `${b}.ads`, p.ads ?? '', 'price') : ''}
          <div class="gx__f"><span>Tipos de edición</span>
            <div class="gx__lvls">${Object.entries(LEVELS).map(([k, l]) => `
              <label class="gx__lvl" style="--l:${l.color}"><input type="checkbox" value="${k}" data-level="${b}"${(p.levels || []).includes(k) ? ' checked' : ''}><span>${esc(l.name)}</span></label>`).join('')}
            </div>
          </div>
          <p class="gx__f"><span>Qué incluye (filas de la tarjeta)</span></p>
          ${rowsHTML(b, p.rows || [])}
          <div class="gx__plan-flags">
            <label class="gx__check"><input type="checkbox" data-hot="${i}"${p.hot ? ' checked' : ''}><span>★ Recomendado</span></label>
            ${check('Ocultar en la página', `${b}.hidden`, p.hidden)}
          </div>
        </article>`;
      }).join('')}
    </div>
    <div class="gx__plan-foot">
      ${field('Descuento pago trimestral (%)', 'quarterlyPct', d.quarterlyPct, 'int')}
      ${field('Duración de los videos verticales', 'duration', d.duration)}
      ${field('Nota de pauta (se ve en la página)', 'note', d.note)}
    </div>
    <p class="gx__p">El precio con pago trimestral se calcula solo. La ★ marca el plan recomendado de cada categoría (solo uno). Las etiquetas Ágil / Pro / Premium salen en la fila «Edición» de la tarjeta.</p>`;
}

function cartaHTML() {
  const d = st.draft.marca;
  return `
    <p class="gx__p">Las categorías salen como desplegables en la página, en este orden. Marca <b>Agotado</b> para que un servicio salga tachado. Los precios de «Video ágil», «Video Pro», «Video Premium», «Recorte vertical», «Video horizontal Pro», «Carrusel» y «Anuncio para pauta» también son los de la librería: no les cambies el nombre.</p>
    <div class="gx__cgs">
      ${d.carta.map((g, i) => {
        const open = st.carta === i;
        const b = `carta.${i}`;
        return `
        <section class="gx__cg${open ? ' is-open' : ''}">
          <div class="gx__cg-head">
            <button type="button" class="gx__cg-btn" data-open="carta" data-i="${i}" aria-expanded="${open}">
              <span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${esc(g.name)}</b><span class="mono">${g.items.length} ${g.items.length === 1 ? 'servicio' : 'servicios'}</span><span aria-hidden="true">${open ? '−' : '+'}</span>
            </button>
            ${moveBtns('carta', i, 'carta')}
            <button type="button" class="gx__mini" data-del="carta" data-i="${i}" data-ask="¿Quitar la categoría «${esc(g.name)}» con todos sus servicios?" aria-label="Quitar categoría">✕</button>
          </div>
          ${open ? `
          <div class="gx__cg-body">
            ${field('Nombre de la categoría', `${b}.name`, g.name)}
            <div class="gx__items">
              <div class="gx__item gx__item--head mono"><span>Servicio</span><span>Unidad</span><span>Precio</span><span>Descripción (se ve debajo)</span><span></span></div>
              ${g.items.map(([name, unit, price, desc, out], j) => `
              <div class="gx__item${out ? ' is-out' : ''}">
                <input data-path="${b}.items.${j}.0" value="${esc(name)}" aria-label="Servicio">
                <input data-path="${b}.items.${j}.1" value="${esc(unit)}" aria-label="Unidad">
                <input data-path="${b}.items.${j}.2" data-kind="price" value="${esc(price)}" aria-label="Precio" inputmode="numeric">
                <input data-path="${b}.items.${j}.3" value="${esc(desc)}" aria-label="Descripción">
                <span class="gx__item-act">
                  <label class="gx__check" title="Agotado (se ve tachado)"><input type="checkbox" data-path="${b}.items.${j}.4" data-rerender="1"${out ? ' checked' : ''}><span class="mono">Agotado</span></label>
                  ${moveBtns(`${b}.items`, j)}
                  <button type="button" class="gx__mini" data-del="${b}.items" data-i="${j}" aria-label="Quitar servicio">✕</button>
                </span>
              </div>`).join('')}
            </div>
            <button type="button" class="gx__add mono" data-add="${b}.items" data-tpl="item">+ Agregar servicio</button>
          </div>` : ''}
        </section>`;
      }).join('')}
    </div>
    <button type="button" class="gx__add mono" data-add="carta" data-tpl="group">+ Agregar categoría</button>`;
}

function libHTML() {
  const d = st.draft.marca;
  const pieceOpts = (sel) => Object.entries(PIECES).map(([k, p]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  return `
    <p class="gx__p">Cada grupo es una sección de <b>libreria.html</b>. El precio de cada formato sale solo de la carta del club según su tipo: si cambias el precio del «Video Pro» en la carta, cambia en todas las tarjetas Pro de la librería.</p>
    <div class="gx__cgs">
      ${d.library.map((g, i) => {
        const open = st.lib === i;
        const b = `library.${i}`;
        return `
        <section class="gx__cg${open ? ' is-open' : ''}" style="--c:${g.color}">
          <div class="gx__cg-head">
            <button type="button" class="gx__cg-btn" data-open="lib" data-i="${i}" aria-expanded="${open}">
              <span class="gx__cg-dot" aria-hidden="true"></span><b>${esc(g.title)}</b><span class="mono">${g.formats.length} formatos</span><span aria-hidden="true">${open ? '−' : '+'}</span>
            </button>
            ${moveBtns('library', i, 'lib')}
            <button type="button" class="gx__mini" data-del="library" data-i="${i}" data-ask="¿Quitar el grupo «${esc(g.title)}» con todos sus formatos?" aria-label="Quitar grupo">✕</button>
          </div>
          ${open ? `
          <div class="gx__cg-body">
            <div class="gx__row2">${field('Nombre del grupo', `${b}.title`, g.title)}${colorSelect(`${b}.color`, g.color)}</div>
            <p class="gx__f"><span>Perfiles de este grupo (los chips de «Para»)</span></p>
            <div class="gx__chips">
              ${g.profiles.map((p, j) => `<span class="gx__pchip"><input data-path="${b}.profiles.${j}" value="${esc(p)}" aria-label="Perfil" size="${Math.max(6, p.length)}"><button type="button" data-del="${b}.profiles" data-i="${j}" aria-label="Quitar perfil">✕</button></span>`).join('')}
              <button type="button" class="gx__add mono" data-add="${b}.profiles" data-tpl="profile">+ Agregar perfil</button>
            </div>
            <div class="gx__items gx__items--lib">
              <div class="gx__item gx__item--head mono"><span>Formato</span><span>Descripción</span><span>Tipo de edición</span><span>Precio (de la carta)</span><span></span></div>
              ${g.formats.map(([name, desc, piece], j) => {
                const pc = PIECES[piece] && priceInCarta(d, PIECES[piece].item);
                return `
              <div class="gx__item">
                <input data-path="${b}.formats.${j}.0" value="${esc(name)}" aria-label="Formato">
                <input data-path="${b}.formats.${j}.1" value="${esc(desc)}" aria-label="Descripción">
                <select data-path="${b}.formats.${j}.2" data-rerender="1" aria-label="Tipo de edición">${pieceOpts(piece)}</select>
                <span class="mono gx__item-price">${pc ? `${cop(pc.price)} · ${esc(pc.unit.toLowerCase())}` : 'Sin precio en la carta'}</span>
                <span class="gx__item-act">
                  ${moveBtns(`${b}.formats`, j)}
                  <button type="button" class="gx__mini" data-del="${b}.formats" data-i="${j}" aria-label="Quitar formato">✕</button>
                </span>
              </div>`;
              }).join('')}
            </div>
            <button type="button" class="gx__add mono" data-add="${b}.formats" data-tpl="format">+ Agregar formato</button>
          </div>` : ''}
        </section>`;
      }).join('')}
    </div>
    <button type="button" class="gx__add mono" data-add="library" data-tpl="lib">+ Agregar grupo de perfiles</button>`;
}

/* ---------- Producción: tarifas base para las cotizaciones ---------- */
function prodHTML() {
  const rates = st.draft.produccion.rates;
  const stages = [...new Set(rates.map((r) => r[1]))];
  return `
    <p class="gx__p">Producción no tiene planes con precio en la página: se cotiza por proyecto. Estas son las <b>tarifas base</b> que salen en el cotizador (03 Proyectos → Cotizaciones) al armar un bloque de Producción audiovisual. Las que estén en $0 se llenan al cotizar.</p>
    <datalist id="stages">${stages.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
    <div class="gx__items gx__items--rates">
      <div class="gx__item gx__item--head mono"><span>Concepto</span><span>Etapa</span><span>Unidad</span><span>Precio</span><span></span></div>
      ${rates.map(([name, stage, unit, price], j) => `
      <div class="gx__item">
        <input data-path="rates.${j}.0" value="${esc(name)}" aria-label="Concepto">
        <input data-path="rates.${j}.1" value="${esc(stage)}" list="stages" aria-label="Etapa">
        <input data-path="rates.${j}.2" value="${esc(unit)}" aria-label="Unidad">
        <input data-path="rates.${j}.3" data-kind="price" value="${esc(price)}" inputmode="numeric" aria-label="Precio">
        <span class="gx__item-act">${moveBtns('rates', j)}<button type="button" class="gx__mini" data-del="rates" data-i="${j}" aria-label="Quitar tarifa">✕</button></span>
      </div>`).join('')}
    </div>
    <button type="button" class="gx__add mono gx__pad-end" data-add="rates" data-tpl="rate">+ Agregar tarifa</button>`;
}

/* ---------- Recibo: los datos que salen en cada cotización ---------- */
/* ---------- Inicio: secciones que se prenden y se apagan ---------- */
function sitioHTML() {
  const d = st.draft.sitio;
  return `
    <p class="gx__p">Secciones del Inicio que puedes mostrar u ocultar. Toca «Publicar en la página» para que se aplique.</p>
    <div class="gx__recibo">
      <label class="gx__check gx__switch"><input type="checkbox" data-path="testimonios"${d.testimonios !== false ? ' checked' : ''}><span><b>«Lo que dicen»</b> · los testimonios de clientes (en «¿Por qué RAKÜN?»)</span></label>
    </div>`;
}

function reciboHTML() {
  const r = st.draft.recibo;
  const area = (label, path, value, rows = 3) => `<label class="gx__f"><span>${label}</span><textarea data-path="${path}" rows="${rows}">${esc(value || '')}</textarea></label>`;
  return `
    <p class="gx__p">Estos datos salen en el recibo de cada cotización (el enlace y el PDF que recibe el cliente). La factura electrónica llega en otra fase.</p>
    <div class="gx__recibo">
      <div class="gx__row2">${field('Razón social o nombre', 'legal', r.legal)}${field('NIT o cédula', 'nit', r.nit)}</div>
      <div class="gx__row2">${field('Ciudad', 'city', r.city)}${field('WhatsApp de contacto (para el botón del recibo)', 'whatsapp', r.whatsapp)}</div>
      ${area('Cómo pagar (sale al aceptar la cotización: cuenta, Nequi, llave…)', 'payInfo', r.payInfo, 4)}
      ${area('Condiciones (sale al final del recibo)', 'terms', r.terms, 3)}
    </div>`;
}

function webHTML() {
  const plans = st.draft.web.plans;
  return `
    <p class="gx__p">Los planes de <b>web.html</b>. El precio es texto libre: “$3.500.000”, “A cotizar”…</p>
    <div class="gx__plan-grid gx__plan-grid--web">
      ${plans.map((p, i) => {
        const b = `plans.${i}`;
        return `<article class="gx__plan-card${p.hidden ? ' is-hidden' : ''}${p.hot ? ' is-hot' : ''}">
          ${field('Nombre', `${b}.name`, p.name)}
          ${field('Para quién', `${b}.for`, p.for)}
          ${field('Precio (desde)', `${b}.price`, p.price)}
          <label class="gx__f"><span>Qué incluye (una línea por punto)</span><textarea data-path="${b}.list" data-kind="lines" rows="5">${esc((p.list || []).join('\n'))}</textarea></label>
          <div class="gx__plan-flags">${check('★ Recomendado', `${b}.hot`, p.hot)}${check('Ocultar en la página', `${b}.hidden`, p.hidden)}</div>
        </article>`;
      }).join('')}
    </div>`;
}
