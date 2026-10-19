/* ==========================================================================
   RAKÜN · gestor · 03 Proyectos
   Cada cliente puede tener varios proyectos (marca, producción, web).
   La etapa que se elige aquí es la que ve el cliente en su portal.
   Pestañas: Proyectos · Cotizaciones (admin-cotizaciones.js). Cada proyecto
   se abre con sus entregables (admin-entregables.js).
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';
import { STAGES, WORLD_NAME, WORLD_COLOR } from './content.js';
import { viewQuotes, editQuote, quoteUrl } from './admin-cotizaciones.js';
import { deliverablesPanel } from './admin-entregables.js';
import { moneyPanel } from './admin-dinero.js';

/** Encabezado con las pestañas (los proyectos y las cotizaciones viven juntos). */
function tabsHTML(ctx, active, actions = '') {
  const tab = (k, n) => `<button type="button" role="tab" class="gx__chip${active === k ? ' is-on' : ''}" aria-selected="${active === k}" data-tab="${k}">${n}</button>`;
  return `${ctx.head('03', 'Del sí al proyecto', 'Proyectos', actions)}
  <div class="qx__tabs" role="tablist" aria-label="Proyectos o cotizaciones">${tab('proyectos', 'Proyectos')}${ctx.money ? tab('cotizaciones', 'Cotizaciones') : ''}</div>`;
}
const wireTabs = (ctx) => $$('[data-tab]', ctx.main).forEach((b) => b.addEventListener('click', () => ctx.go('proyectos', { tab: b.dataset.tab })));

export async function viewProjects(ctx, opts = {}) {
  const { sb, main, loading, fail, staff, go } = ctx;
  if (opts.quote) return editQuote(ctx, opts.quote, opts.preset);
  if (opts.tab === 'cotizaciones' && ctx.money) {
    await viewQuotes(ctx, (active, actions) => tabsHTML(ctx, active, actions));
    wireTabs(ctx);
    return;
  }
  if (opts.open) return viewProject(ctx, opts.open, opts.ptab);
  loading();
  const [{ data: projects, error }, { data: clients }] = await Promise.all([
    sb.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
    sb.from('clients').select('id, name').order('name'),
  ]);
  if (error) { main.innerHTML = ''; fail(error); return; }

  main.innerHTML = tabsHTML(ctx, 'proyectos', '<button class="gx__btn gx__btn--dark" type="button" data-new>+ Nuevo proyecto</button>') + `
    <div class="gx__table">
      <div class="gx__tr gx__tr--h gx__tr--pj"><span>Proyecto</span><span>Etapa (la ve el cliente)</span><span>Estado</span><span>A cargo</span><span></span></div>
      ${projects.map((p) => `
        <div class="gx__tr gx__tr--pj" data-id="${p.id}">
          <span><span class="mono gx__tag" style="background:${WORLD_COLOR[p.world]}">${WORLD_NAME[p.world]}</span><br><b>${esc(p.name)}</b><br><small>${esc(p.clients?.name || '—')}${p.plan ? ` · ${esc(p.plan)}` : ''}</small></span>
          <span><select data-f="stage" aria-label="Etapa">${(STAGES[p.world] || []).map((s) => `<option${p.stage === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></span>
          <span><select data-f="status" aria-label="Estado">${[['activo', 'Activo'], ['pausado', 'Pausado'], ['terminado', 'Terminado']].map(([k, n]) => `<option value="${k}"${p.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></span>
          <span><select data-f="owner_id" aria-label="A cargo"><option value="">Sin asignar</option>${staff.map((s) => `<option value="${s.id}"${p.owner_id === s.id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></span>
          <span class="gx__row-actions"><button class="gx__btn" type="button" data-open-p>Entregables →</button>${p.world === 'marca' ? '<button class="gx__btn" type="button" data-grid>Parrilla →</button>' : ''}</span>
        </div>`).join('') || '<p class="gx__empty">Aún no hay proyectos. Crea el primero para un cliente o registra el anticipo de una cotización.</p>'}
    </div>
    <p class="mono gx__saved" data-saved aria-live="polite"></p>`;

  wireTabs(ctx);
  const saved = $('[data-saved]', main);
  $$('[data-id]', main).forEach((row) => {
    $$('select[data-f]', row).forEach((sel) => sel.addEventListener('change', async () => {
      saved.textContent = 'Guardando…';
      const { error: e } = await sb.from('projects').update({ [sel.dataset.f]: sel.value || null }).eq('id', row.dataset.id);
      saved.textContent = e ? errorText(e) : '✓ Guardado';
    }));
    $('[data-grid]', row)?.addEventListener('click', () => go('parrillas', { project: row.dataset.id }));
    $('[data-open-p]', row).addEventListener('click', () => go('proyectos', { open: row.dataset.id }));
  });

  $('[data-new]', main).addEventListener('click', () => newProject(ctx, clients || []));
}

/* ---------- un proyecto: sus datos y sus entregables ---------- */
async function viewProject(ctx, id, ptab = 'entregables') {
  const { sb, main, loading, fail } = ctx;
  loading();
  let res = await sb.from('projects').select('*, clients(name), quotes(number, token)').eq('id', id).single();
  // sin la fase 7 todavía no existe la relación con las cotizaciones
  if (res.error) res = await sb.from('projects').select('*, clients(name)').eq('id', id).single();
  if (res.error) { main.innerHTML = ''; fail(res.error); return; }
  const p = res.data;
  const owner = ctx.staff.find((s) => s.id === p.owner_id);
  const date = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  main.innerHTML = `
    <header class="gx__head">
      <div><p class="mono gx__kicker"><button class="qx__crumb" type="button" data-back>03 · Proyectos</button> / ${esc(p.clients?.name || '')}</p><h1 class="gx__title">${esc(p.name)}</h1></div>
      <div class="gx__actions">${p.world === 'marca' ? '<button class="gx__btn" type="button" data-grid>Parrilla →</button>' : ''}</div>
    </header>
    <div class="dx__pinfo">
      <span class="mono gx__tag" style="background:${WORLD_COLOR[p.world]}">${WORLD_NAME[p.world]}</span>
      ${p.plan ? `<span>${esc(p.plan)}</span>` : ''}
      <span>Etapa: <b>${esc(p.stage || '—')}</b></span>
      <span>A cargo: <b>${esc(owner?.full_name || 'Sin asignar')}</b></span>
      ${p.start_date ? `<span>Inicio: ${date(p.start_date)}</span>` : ''}
      ${p.quotes?.token ? `<a class="qx__link" href="${esc(quoteUrl(p.quotes.token))}" target="_blank" rel="noopener">Cotización ${esc(p.quotes.number)} ↗</a>` : ''}
    </div>
    ${ctx.money ? `<div class="qx__tabs" role="tablist" aria-label="Del proyecto">
      <button type="button" role="tab" class="gx__chip${ptab === 'entregables' ? ' is-on' : ''}" aria-selected="${ptab === 'entregables'}" data-ptab="entregables">Entregables</button>
      <button type="button" role="tab" class="gx__chip${ptab === 'dinero' ? ' is-on' : ''}" aria-selected="${ptab === 'dinero'}" data-ptab="dinero">Dinero del proyecto</button></div>` : ''}
    <div data-deliv><p class="mono gx__empty">Cargando…</p></div>`;
  $('[data-back]', main).addEventListener('click', () => ctx.go('proyectos'));
  $('[data-grid]', main)?.addEventListener('click', () => ctx.go('parrillas', { project: p.id }));
  $$('[data-ptab]', main).forEach((b) => b.addEventListener('click', () => ctx.go('proyectos', { open: p.id, ptab: b.dataset.ptab })));
  if (ptab === 'dinero' && ctx.money) moneyPanel(ctx, p, $('[data-deliv]', main));
  else deliverablesPanel(ctx, p, $('[data-deliv]', main));
}

function newProject(ctx, clients) {
  const { sb, openModal, staff, go } = ctx;
  if (!clients.length) {
    openModal('<p class="mono gx__kicker">Nuevo proyecto</p><h2 class="gx__modal-title">Primero un <em>cliente.</em></h2><p class="gx__p">Para crear un proyecto necesitas al menos un cliente. Créalo en <b>Clientes</b> o convierte una solicitud.</p>');
    return;
  }
  openModal(`
    <p class="mono gx__kicker">Nuevo proyecto</p>
    <h2 class="gx__modal-title">¿Qué <em>arrancamos?</em></h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Cliente *</span><select name="client_id" required>${clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label class="gx__f"><span>Tipo *</span><select name="world">${Object.entries(WORLD_NAME).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      <label class="gx__f"><span>Nombre del proyecto *</span><input name="name" required maxlength="160" placeholder="Redes · octubre"></label>
      <label class="gx__f"><span>Plan</span><input name="plan" maxlength="160" placeholder="Agenda llena"></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Inicio</span><input name="start_date" type="date"></label>
        <label class="gx__f"><span>Entrega / cierre</span><input name="end_date" type="date"></label>
      </div>
      <label class="gx__f"><span>A cargo</span><select name="owner_id"><option value="">Sin asignar</option>${staff.map((s) => `<option value="${s.id}">${esc(s.full_name || s.email)}</option>`).join('')}</select></label>
      <p class="mono gx__saved" data-msg></p>
      <button class="gx__btn gx__btn--hot" type="submit">Crear proyecto →</button>
    </form>`);
  const f = $('[data-modal-box] [data-form]');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    if (!fd.name.trim()) { $('[data-msg]', f).textContent = 'Ponle un nombre al proyecto.'; return; }
    const { data, error } = await sb.from('projects').insert({
      client_id: fd.client_id, world: fd.world, name: fd.name.trim(), plan: fd.plan.trim() || null,
      start_date: fd.start_date || null, end_date: fd.end_date || null, owner_id: fd.owner_id || null,
      stage: STAGES[fd.world][0],
    }).select('id').single();
    if (error) { $('[data-msg]', f).textContent = errorText(error); return; }
    go('proyectos', { open: data.id });
  });
}
