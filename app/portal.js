/* ==========================================================================
   RAKÜN · portal del cliente
   Resumen (proyectos y su etapa, reunión, cuenta) y Parrilla (aprobar o pedir cambios).
   El cliente solo ve sus propios datos: lo garantizan las reglas de la base de datos.
   ========================================================================== */
import { $, $$, esc, initials, safeUrl } from './util.js';
import { getClient, getProfile, isStaff, isConfigured, accountUrl, errorText } from './supa.js';
import { CALCOM_URL, CONTACT_EMAIL } from './config.js';
import {
  STAGES, WORLD_NAME, WORLD_COLOR, netInfo, FORMATS, statusInfo, DOW,
  monthStart, addMonths, monthLabel, monthCells, ymd,
} from './content.js';

let sb, me;
const st = { projects: [], project: null, month: monthStart(new Date()), posts: [], sel: null };

(async () => {
  const boot = $('[data-boot]');
  if (!isConfigured()) { boot.textContent = 'El portal se activa pronto.'; return; }
  try {
    sb = await getClient();
    me = await getProfile();
  } catch (err) { boot.textContent = errorText(err); return; }
  if (!me) { location.replace('login.html'); return; }

  const name = me.full_name || me.email;
  $('[data-first]').textContent = `${name.split(' ')[0]}.`;
  $('[data-me-name]').textContent = name;
  $('[data-me-full]').textContent = name;
  $('[data-me-mail]').textContent = me.email;
  $('[data-me-ava]').textContent = initials(name);
  $('[data-me-ava]').style.background = '#F3C9A8';
  $('[data-date]').textContent = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  $('[data-staff-note]').hidden = !isStaff(me);

  const cal = $('[data-cal]');
  cal.href = CALCOM_URL || `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Quiero agendar una reunión')}`;
  if (!CALCOM_URL) cal.removeAttribute('target');

  $('[data-change-pass]').addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.resetPasswordForEmail(me.email, { redirectTo: accountUrl() });
    e.target.textContent = error ? errorText(error) : '✓ Te enviamos un enlace a tu correo';
  });
  $('[data-logout]').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('login.html'); });

  // sus proyectos (las reglas de la base de datos solo devuelven los suyos)
  const { data } = await sb.from('projects').select('id, name, world, plan, stage, status, end_date').neq('status', 'terminado').order('created_at', { ascending: false });
  st.projects = data || [];
  renderProjects();

  boot.hidden = true;
  $('[data-app]').hidden = false;
  window.addEventListener('hashchange', route);
  route();
})();

/* ---------- pestañas ---------- */
function route() {
  const tab = location.hash.slice(1) === 'parrilla' ? 'parrilla' : 'resumen';
  $$('[data-tab]').forEach((s) => { s.hidden = s.dataset.tab !== tab; });
  $$('[data-tab-link]').forEach((a) => {
    const on = a.dataset.tabLink === tab;
    a.classList.toggle('is-on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (tab === 'parrilla') openParrilla();
}

/* ---------- resumen: dónde va cada proyecto ---------- */
function renderProjects() {
  const box = $('[data-projects]');
  $('[data-empty-hero]').hidden = st.projects.length > 0;
  box.innerHTML = st.projects.map((p) => {
    const stages = STAGES[p.world] || [];
    const cur = Math.max(0, stages.indexOf(p.stage));
    const fill = stages.length > 1 ? (cur / (stages.length - 1)) * 100 : 0;
    return `
    <section class="px__proj">
      <div class="px__proj-head">
        <div>
          <p class="mono px__proj-k"><span class="gx__tag" style="background:${WORLD_COLOR[p.world]}">${WORLD_NAME[p.world]}</span>${p.plan ? ` · ${esc(p.plan)}` : ''}${p.status === 'pausado' ? ' · en pausa' : ''}</p>
          <h2 class="px__proj-title">${esc(p.name)} <span>va en <em>${esc(stages[cur] || p.stage || '—')}.</em></span></h2>
        </div>
        ${p.end_date ? `<p class="mono px__proj-eta">Entrega estimada<br><b>${new Date(`${p.end_date}T12:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</b></p>` : ''}
      </div>
      <div class="px__stages" style="--n:${stages.length};--fill:${(fill / 100).toFixed(3)}">
        ${stages.map((s, i) => `<div class="px__stage${i < cur ? ' is-done' : ''}${i === cur ? ' is-now' : ''}"><i></i><span class="mono">${esc(s)}</span></div>`).join('')}
      </div>
      ${p.world === 'marca' ? '<a class="gx__btn" href="#parrilla" data-goto-grid="' + p.id + '">Ver mi parrilla de contenido →</a>' : ''}
    </section>`;
  }).join('');
  $$('[data-goto-grid]', box).forEach((a) => a.addEventListener('click', () => { st.project = a.dataset.gotoGrid; }));
}

/* ---------- parrilla ---------- */
async function openParrilla() {
  const box = $('[data-parrilla]');
  const grids = st.projects.filter((p) => p.world === 'marca');
  if (!grids.length) {
    box.innerHTML = '<div class="gx__soon"><p>Cuando arranquemos tu plan de contenido, aquí vas a ver tu parrilla para aprobar cada pieza.</p></div>';
    return;
  }
  if (!st.project || !grids.some((p) => p.id === st.project)) st.project = grids[0].id;
  box.innerHTML = '<p class="mono gx__empty">Cargando tu parrilla…</p>';
  const from = st.month, to = addMonths(st.month, 1);
  const { data, error } = await sb.from('posts').select('*').eq('project_id', st.project)
    .gte('publish_at', from.toISOString()).lt('publish_at', to.toISOString()).order('publish_at');
  if (error) { box.innerHTML = `<p class="gx__error">${esc(errorText(error))}</p>`; return; }
  st.posts = data;
  if (!st.sel || !data.some((p) => p.id === st.sel)) st.sel = (data.find((p) => p.status === 'por_aprobar') || data[0])?.id || null;
  renderParrilla(grids);
}

function renderParrilla(grids) {
  const box = $('[data-parrilla]');
  const pending = st.posts.filter((p) => p.status === 'por_aprobar').length;
  const sel = st.posts.find((p) => p.id === st.sel);
  box.innerHTML = `
    <div class="px__grid-head">
      <div>
        <p class="mono px__date">Parrilla de contenido</p>
        <h1 class="px__hello px__month">${esc(monthLabel(st.month))}</h1>
      </div>
      <div class="gx__actions">
        ${grids.length > 1 ? `<select class="gx__pick" data-proj aria-label="Proyecto">${grids.map((p) => `<option value="${p.id}"${p.id === st.project ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
        <button class="gx__chip" type="button" data-prev aria-label="Mes anterior">‹</button>
        <button class="gx__chip" type="button" data-next aria-label="Mes siguiente">›</button>
      </div>
    </div>
    ${pending ? `<p class="px__pending">● Tienes <b>${pending}</b> ${pending === 1 ? 'pieza' : 'piezas'} por aprobar este mes.</p>` : ''}
    <div class="px__gridwrap">
      <div class="gx__cal px__cal">
        ${DOW.map((d) => `<span class="gx__cal-h mono">${d}</span>`).join('')}
        ${monthCells(st.month).map(({ date }) => {
          if (!date) return '<div class="gx__cell gx__cell--off"></div>';
          const items = st.posts.filter((p) => ymd(new Date(p.publish_at)) === ymd(date));
          return `<div class="gx__cell px__cell"><span class="gx__cell-n mono">${date.getDate()}</span>
            ${items.map((p) => {
              const [, , sc] = statusInfo(p.status);
              return `<button type="button" class="gx__post${p.id === st.sel ? ' is-sel' : ''}" data-post="${p.id}" style="--f:${(FORMATS[p.format] || FORMATS.post)[1]}">
                <span class="gx__post-t"><i style="background:${sc}"></i>${esc(p.title)}</span>
                <span class="gx__post-n">${p.networks.map((k) => `<b style="background:${netInfo(k)[2]}">${esc(k)}</b>`).join('')}</span>
              </button>`;
            }).join('')}</div>`;
        }).join('')}
      </div>
      <aside class="px__detail" data-detail>${sel ? detailHTML(sel) : '<p class="gx__p">Este mes todavía no tiene piezas para revisar.</p>'}</aside>
    </div>`;

  $('[data-proj]', box)?.addEventListener('change', (e) => { st.project = e.target.value; st.sel = null; openParrilla(); });
  $('[data-prev]', box).addEventListener('click', () => { st.month = addMonths(st.month, -1); st.sel = null; openParrilla(); });
  $('[data-next]', box).addEventListener('click', () => { st.month = addMonths(st.month, 1); st.sel = null; openParrilla(); });
  $$('[data-post]', box).forEach((b) => b.addEventListener('click', () => { st.sel = b.dataset.post; renderParrilla(grids); }));
  bindReview(grids);
}

function detailHTML(p) {
  const [fname, fcolor] = FORMATS[p.format] || FORMATS.post;
  const [, sname, scolor] = statusInfo(p.status);
  const when = new Date(p.publish_at).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const canReview = ['por_aprobar', 'cambios', 'aprobada'].includes(p.status);
  const media = safeUrl(p.media_url);
  return `
    <div class="px__detail-top"><span class="mono gx__tag" style="background:${fcolor}">${esc(fname)}</span><span class="mono" style="color:${scolor === '#1B1A35' ? 'var(--navy)' : scolor}">● ${esc(sname)}</span></div>
    <h2 class="px__detail-title">${esc(p.title)}</h2>
    <p class="mono px__detail-when">${esc(when)}</p>
    <div class="px__nets">${p.networks.map((k) => { const [, n, c] = netInfo(k); return `<span class="mono"><b style="background:${c}">${esc(k)}</b>${esc(n)}</span>`; }).join('')}</div>
    ${media ? `<a class="gx__btn" href="${esc(media)}" target="_blank" rel="noopener noreferrer">▶ Ver el video o diseño ↗</a>` : ''}
    ${p.copy ? `<p class="mono px__detail-k">Texto de la publicación</p><p class="px__copy">${esc(p.copy)}</p>` : ''}
    ${p.copy_variants?.alt ? `<p class="mono px__detail-k">Texto para TikTok / YouTube</p><p class="px__copy">${esc(p.copy_variants.alt)}</p>` : ''}
    ${p.status === 'cambios' && p.client_note ? `<div class="gx__note"><b>Pediste:</b> “${esc(p.client_note)}” · el equipo ya lo está ajustando.</div>` : ''}
    ${p.status === 'publicada' && safeUrl(p.published_url) ? `<a class="gx__btn" href="${esc(safeUrl(p.published_url))}" target="_blank" rel="noopener noreferrer">Ver la publicación ↗</a>` : ''}
    ${canReview ? `
      <label class="gx__f px__review"><span>¿Algo que cambiar?</span><textarea rows="3" data-note placeholder="Escribe aquí qué te gustaría ajustar"></textarea></label>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="px__review-btns">
        <button class="gx__btn" type="button" data-review="cambios">Pedir cambio</button>
        <button class="gx__btn gx__btn--hot" type="button" data-review="aprobada"${p.status === 'aprobada' ? ' disabled' : ''}>${p.status === 'aprobada' ? '✓ Aprobada' : '✓ Aprobar'}</button>
      </div>` : ''}`;
}

function bindReview(grids) {
  $$('[data-review]').forEach((b) => b.addEventListener('click', async () => {
    const decision = b.dataset.review;
    const note = $('[data-note]')?.value.trim() || '';
    const msg = $('[data-msg]');
    if (decision === 'cambios' && !note) { msg.textContent = 'Cuéntanos qué te gustaría cambiar.'; $('[data-note]').focus(); return; }
    b.disabled = true;
    msg.textContent = 'Enviando…';
    const { error } = await sb.rpc('review_post', { post_id: st.sel, decision, note });
    if (error) { msg.textContent = errorText(error); b.disabled = false; return; }
    const p = st.posts.find((x) => x.id === st.sel);
    p.status = decision;
    if (decision === 'cambios') p.client_note = note;
    renderParrilla(grids);
  }));
}
