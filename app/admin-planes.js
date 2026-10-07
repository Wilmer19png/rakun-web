/* ==========================================================================
   RAKÜN · gestor · 06 Planes y precios
   Edita una copia de los planes (borrador) y, al publicar, la guarda en
   plan_catalog: marca.html y web.html la leen al cargar.
   Si nunca se ha publicado, se parte de los precios base de planes/data.js.
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';
import { DATA as BASE_MARCA, WEB as BASE_WEB } from '../planes/data.js';

const clone = (o) => JSON.parse(JSON.stringify(o));
const BASE = { marca: BASE_MARCA, web: BASE_WEB };
const PROFILE = { creador: 'Creador', medico: 'Médico', mentor: 'Mentor' };
const st = { world: 'marca', profile: 'creador', line: 'flujo', draft: {}, saved: {}, info: {} };

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

export async function viewPlans(ctx) {
  const { sb, loading, fail, main } = ctx;
  loading();
  for (const w of ['marca', 'web']) {
    if (st.draft[w]) continue;
    const { data, error } = await sb.from('plan_catalog').select('content, updated_at').eq('id', w).maybeSingle();
    if (error) { main.innerHTML = ''; fail(error); return; }
    st.draft[w] = clone(data?.content || BASE[w]);
    st.saved[w] = JSON.stringify(st.draft[w]);
    st.info[w] = data ? `Publicado por última vez el ${new Date(data.updated_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Aún no se ha publicado: estos son los precios base del Excel';
  }
  render(ctx);
}

function render(ctx) {
  const { main, head } = ctx;
  const w = st.world;
  main.innerHTML = head('08', 'Lo que ve el cliente en la página', 'Planes y precios', `
    ${[['marca', 'Marca personal', 'var(--yellow)'], ['web', 'Web y apps', 'var(--pink)'], ['produccion', 'Producción', 'var(--blue)']]
      .map(([k, n, c]) => `<button class="gx__chip gx__chip--world${st.world === k ? ' is-on' : ''}" style="--c:${c}" type="button" data-world="${k}">${n}</button>`).join('')}`) +
    (w === 'marca' ? marcaHTML() : w === 'web' ? webHTML() : `
      <div class="gx__soon"><p>Producción se cotiza por proyecto (con el guion de "Cotizar producción"), así que no tiene planes con precio fijo en la página.</p><p class="mono">Cuando definan tarifas base, las agregamos aquí.</p></div>`) +
    (w === 'produccion' ? '' : `
      <div class="gx__pubbar" data-pubbar>
        <span class="mono" data-pubstate></span>
        <span class="gx__btns">
          <button class="gx__btn" type="button" data-reset>Volver a los precios del Excel</button>
          <button class="gx__btn" type="button" data-discard>Descartar cambios</button>
          <button class="gx__btn gx__btn--dark" type="button" data-publish>Publicar en la página →</button>
        </span>
      </div>`);

  $$('[data-world]', main).forEach((b) => b.addEventListener('click', () => { st.world = b.dataset.world; render(ctx); }));
  $$('[data-profile]', main).forEach((b) => b.addEventListener('click', () => { st.profile = b.dataset.profile; render(ctx); }));
  $$('[data-line]', main).forEach((b) => b.addEventListener('click', () => { st.line = b.dataset.line; render(ctx); }));
  if (w === 'produccion') return;

  // cada campo escribe directo en el borrador
  $$('[data-path]', main).forEach((el) => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.dataset.kind === 'price') v = toPrice(el.value);
    else if (el.dataset.kind === 'int') v = Math.max(0, parseInt(el.value, 10) || 0);
    else if (el.dataset.kind === 'lines') v = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else v = el.value;
    setPath(st.draft[w], el.dataset.path, v);
    const fmt = el.closest('.gx__f')?.querySelector('[data-fmt]');
    if (fmt) fmt.textContent = typeof v === 'number' ? cop(v) : '';
    if (el.dataset.rerender) render(ctx); else syncBar();
  }));
  // agregar / quitar filas
  $$('[data-add]', main).forEach((b) => b.addEventListener('click', () => {
    const list = getPath(st.draft[w], b.dataset.add);
    list.push(b.dataset.tpl === 'extra' ? ['Nuevo servicio', 'Único', 0, ''] : ['', '']);
    render(ctx);
  }));
  $$('[data-del]', main).forEach((b) => b.addEventListener('click', () => {
    const [path, i] = [b.dataset.del, Number(b.dataset.i)];
    getPath(st.draft[w], path).splice(i, 1);
    render(ctx);
  }));
  $('[data-discard]', main).addEventListener('click', () => {
    if (!confirm('¿Descartar los cambios que no has publicado?')) return;
    st.draft[w] = JSON.parse(st.saved[w]);
    render(ctx);
  });
  $('[data-reset]', main).addEventListener('click', () => {
    if (!confirm('¿Cargar de nuevo los precios base del Excel? (no se publica hasta que toques "Publicar")')) return;
    st.draft[w] = clone(BASE[w]);
    render(ctx);
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
  if (error) { $('[data-pubstate]').textContent = errorText(error); btn.disabled = false; return; }
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

function marcaHTML() {
  const d = st.draft.marca;
  const prof = st.profile;
  const isCreator = prof === 'creador';
  const base = isCreator ? `creador.lines.${st.line}` : `${prof}.plans`;
  const plans = getPath(d, base);
  const extras = d[prof].extras;
  return `
    <div class="gx__subtabs">
      ${Object.entries(PROFILE).map(([k, n]) => `<button type="button" class="gx__chip${prof === k ? ' is-on' : ''}" data-profile="${k}">${n}</button>`).join('')}
      ${isCreator ? `<span class="gx__sep"></span>${[['flujo', 'Línea Flujo'], ['impacto', 'Línea Impacto']].map(([k, n]) => `<button type="button" class="gx__chip gx__chip--sm${st.line === k ? ' is-on' : ''}" data-line="${k}">${n}</button>`).join('')}` : ''}
    </div>
    <div class="gx__plans-ed">
      <div class="gx__plan-grid">
        ${plans.map((p, i) => {
          const b = `${base}.${i}`;
          const prices = isCreator
            ? field('Solo edición · mensual', `${b}.ed`, p.ed, 'price') + field('Pago trimestral (por mes)', `${b}.tri`, p.tri, 'price') + field('Sesiones de grabación incluidas', `${b}.sessions`, p.sessions, 'int')
            : prof === 'medico'
              ? field('Precio mensual', `${b}.price`, p.price, 'price') + field('Pauta sugerida (aparte)', `${b}.ads`, p.ads, 'price')
              : field('Precio mensual', `${b}.price`, p.price, 'price');
          return `
          <article class="gx__plan-card${p.hidden ? ' is-hidden' : ''}${p.hot ? ' is-hot' : ''}">
            ${field('Nombre', `${b}.name`, p.name)}
            ${field('Para quién', `${b}.ideal`, p.ideal)}
            <div class="gx__row2">${prices}</div>
            <p class="gx__f"><span>Qué incluye</span></p>
            ${rowsHTML(b, p.rows || [])}
            <div class="gx__plan-flags">
              ${check('★ Más elegido', `${b}.hot`, p.hot)}
              ${check('Ocultar en la página', `${b}.hidden`, p.hidden)}
            </div>
          </article>`;
        }).join('')}
      </div>
      <aside class="gx__extras">
        <p class="mono gx__extras-k">Carta de extras · ${PROFILE[prof]}</p>
        <p class="gx__extras-p">Marca <b>Agotado</b> para que salga tachado en la página.</p>
        ${extras.map(([name, cobro, price, desc, out], j) => `
          <div class="gx__extra${out ? ' is-out' : ''}">
            <input data-path="${prof}.extras.${j}.0" value="${esc(name)}" aria-label="Servicio" class="gx__extra-name">
            <div class="gx__extra-row">
              <input data-path="${prof}.extras.${j}.1" value="${esc(cobro)}" aria-label="Cobro">
              <input data-path="${prof}.extras.${j}.2" data-kind="price" value="${esc(price)}" aria-label="Precio">
            </div>
            <textarea data-path="${prof}.extras.${j}.3" rows="2" aria-label="Descripción">${esc(desc)}</textarea>
            <div class="gx__extra-row">
              <label class="gx__check"><input type="checkbox" data-path="${prof}.extras.${j}.4" data-rerender="1"${out ? ' checked' : ''}><span>Agotado</span></label>
              <button type="button" class="gx__mini" data-del="${prof}.extras" data-i="${j}" aria-label="Quitar servicio">✕</button>
            </div>
          </div>`).join('')}
        <button type="button" class="gx__add mono" data-add="${prof}.extras" data-tpl="extra">+ Agregar servicio</button>
      </aside>
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
