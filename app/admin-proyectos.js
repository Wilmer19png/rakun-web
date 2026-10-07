/* ==========================================================================
   RAKÜN · gestor · 03 Proyectos
   Cada cliente puede tener varios proyectos (marca, producción, web).
   La etapa que se elige aquí es la que ve el cliente en su portal.
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';
import { STAGES, WORLD_NAME, WORLD_COLOR } from './content.js';

export async function viewProjects(ctx) {
  const { sb, main, head, loading, fail, staff, go } = ctx;
  loading();
  const [{ data: projects, error }, { data: clients }] = await Promise.all([
    sb.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
    sb.from('clients').select('id, name').order('name'),
  ]);
  if (error) { main.innerHTML = ''; fail(error); return; }

  main.innerHTML = head('03', 'Etapas y responsables', 'Proyectos', '<button class="gx__btn gx__btn--dark" type="button" data-new>+ Nuevo proyecto</button>') + `
    <div class="gx__table">
      <div class="gx__tr gx__tr--h gx__tr--pj"><span>Proyecto</span><span>Etapa (la ve el cliente)</span><span>Estado</span><span>A cargo</span><span></span></div>
      ${projects.map((p) => `
        <div class="gx__tr gx__tr--pj" data-id="${p.id}">
          <span><span class="mono gx__tag" style="background:${WORLD_COLOR[p.world]}">${WORLD_NAME[p.world]}</span><br><b>${esc(p.name)}</b><br><small>${esc(p.clients?.name || '—')}${p.plan ? ` · ${esc(p.plan)}` : ''}</small></span>
          <span><select data-f="stage" aria-label="Etapa">${(STAGES[p.world] || []).map((s) => `<option${p.stage === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></span>
          <span><select data-f="status" aria-label="Estado">${[['activo', 'Activo'], ['pausado', 'Pausado'], ['terminado', 'Terminado']].map(([k, n]) => `<option value="${k}"${p.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></span>
          <span><select data-f="owner_id" aria-label="A cargo"><option value="">Sin asignar</option>${staff.map((s) => `<option value="${s.id}"${p.owner_id === s.id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></span>
          <span>${p.world === 'marca' ? '<button class="gx__btn" type="button" data-grid>Parrilla →</button>' : ''}</span>
        </div>`).join('') || '<p class="gx__empty">Aún no hay proyectos. Crea el primero para un cliente.</p>'}
    </div>
    <p class="mono gx__saved" data-saved aria-live="polite"></p>`;

  const saved = $('[data-saved]', main);
  $$('[data-id]', main).forEach((row) => {
    $$('select[data-f]', row).forEach((sel) => sel.addEventListener('change', async () => {
      saved.textContent = 'Guardando…';
      const { error: e } = await sb.from('projects').update({ [sel.dataset.f]: sel.value || null }).eq('id', row.dataset.id);
      saved.textContent = e ? errorText(e) : '✓ Guardado';
    }));
    $('[data-grid]', row)?.addEventListener('click', () => go('parrillas', { project: row.dataset.id }));
  });

  $('[data-new]', main).addEventListener('click', () => newProject(ctx, clients || []));
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
      <label class="gx__f"><span>Nombre del proyecto *</span><input name="name" required maxlength="160" placeholder="Marca personal · octubre"></label>
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
    const { error } = await sb.from('projects').insert({
      client_id: fd.client_id, world: fd.world, name: fd.name.trim(), plan: fd.plan.trim() || null,
      start_date: fd.start_date || null, end_date: fd.end_date || null, owner_id: fd.owner_id || null,
      stage: STAGES[fd.world][0],
    });
    if (error) { $('[data-msg]', f).textContent = errorText(error); return; }
    go('proyectos');
  });
}

