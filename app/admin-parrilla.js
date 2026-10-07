/* ==========================================================================
   RAKÜN · gestor · 04 Parrillas
   Calendario del mes por proyecto. Cada pieza: formato, redes, texto, links,
   responsable y estado. El cliente solo ve lo que se le envía ("Por aprobar" en adelante).
   ========================================================================== */
import { $, $$, esc, safeUrl } from './util.js';
import { errorText } from './supa.js';
import {
  NETWORKS, netInfo, FORMATS, POST_STATUS, statusInfo, DOW,
  monthStart, addMonths, monthLabel, monthCells, ymd, hm,
} from './content.js';

const st = { project: null, month: monthStart(new Date()), net: '', posts: [], projects: [] };

export async function viewParrilla(ctx, opts = {}) {
  const { sb, main, head, loading, fail } = ctx;
  loading();
  const { data: projects, error } = await sb.from('projects')
    .select('id, name, client_id, world, clients(name)').eq('world', 'marca').order('created_at', { ascending: false });
  if (error) { main.innerHTML = ''; fail(error); return; }
  st.projects = projects;
  if (opts.project) st.project = opts.project;
  if (!st.project || !projects.some((p) => p.id === st.project)) st.project = projects[0]?.id || null;

  if (!st.project) {
    main.innerHTML = head('04', 'Parrilla de contenido', 'Parrillas') +
      '<div class="gx__soon"><p>Aún no hay proyectos de Marca personal. Crea uno en <b>Proyectos</b> y vuelve aquí para armar su parrilla.</p></div>';
    return;
  }
  await loadMonth(ctx);
}

async function loadMonth(ctx) {
  const { sb, fail, main } = ctx;
  const from = st.month, to = addMonths(st.month, 1);
  const { data, error } = await sb.from('posts').select('*')
    .eq('project_id', st.project).gte('publish_at', from.toISOString()).lt('publish_at', to.toISOString())
    .order('publish_at');
  if (error) { main.innerHTML = ''; fail(error); return; }
  st.posts = data;
  render(ctx);
}

function render(ctx) {
  const { main, head } = ctx;
  const project = st.projects.find((p) => p.id === st.project);
  const ready = st.posts.filter((p) => p.status === 'lista').length;
  const counts = POST_STATUS.map(([k, n, c]) => [n, c, st.posts.filter((p) => p.status === k).length]).filter((x) => x[2]);

  main.innerHTML = head('04', `Parrilla · ${esc(project?.clients?.name || '')}`, `<span class="gx__month">${esc(monthLabel(st.month))}</span>`, `
    <select class="gx__pick" data-project aria-label="Proyecto">${st.projects.map((p) => `<option value="${p.id}"${p.id === st.project ? ' selected' : ''}>${esc(p.clients?.name || '—')} · ${esc(p.name)}</option>`).join('')}</select>
    <button class="gx__chip" type="button" data-prev aria-label="Mes anterior">‹</button>
    <button class="gx__chip" type="button" data-next aria-label="Mes siguiente">›</button>
    <button class="gx__chip" type="button" data-dup>⧉ Duplicar al mes siguiente</button>
    <button class="gx__btn gx__btn--dark" type="button" data-add>+ Pieza</button>`) + `
    <div class="gx__pbar">
      <div class="gx__counts">${counts.map(([n, c, k]) => `<span class="mono"><i style="background:${c}"></i>${k} · ${n}</span>`).join('') || '<span class="mono">Mes vacío · toca un día para agregar una pieza</span>'}</div>
      <div class="gx__nets"><span class="mono">Ver red</span>
        ${[['', 'Todas'], ...NETWORKS.slice(0, 6).map((n) => [n[0], n[1]])].map(([k, n]) => `<button type="button" class="gx__chip gx__chip--sm${st.net === k ? ' is-on' : ''}" data-net="${k}">${n}</button>`).join('')}
      </div>
    </div>
    <div class="gx__cal">
      ${DOW.map((d) => `<span class="gx__cal-h mono">${d}</span>`).join('')}
      ${monthCells(st.month).map(({ date }) => {
        if (!date) return '<div class="gx__cell gx__cell--off"></div>';
        const day = ymd(date);
        const items = st.posts.filter((p) => ymd(new Date(p.publish_at)) === day);
        return `<div class="gx__cell" data-day="${day}">
          <span class="gx__cell-n mono">${date.getDate()}</span>
          ${items.map((p) => {
            const [fn, fc] = FORMATS[p.format] || FORMATS.post;
            const [, , sc] = statusInfo(p.status);
            const dim = st.net && !p.networks.includes(st.net);
            return `<button type="button" class="gx__post" data-post="${p.id}" style="--f:${fc};opacity:${dim ? 0.25 : 1}" title="${esc(fn)} · ${esc(statusInfo(p.status)[1])}">
              <span class="gx__post-t"><i style="background:${sc}"></i>${esc(p.title)}</span>
              <span class="gx__post-n">${p.networks.map((k) => `<b style="background:${netInfo(k)[2]}">${esc(k)}</b>`).join('')}</span>
            </button>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>
    <div class="gx__sendbar"${ready ? '' : ' hidden'}>
      <span class="mono">● ${ready} ${ready === 1 ? 'pieza lista' : 'piezas listas'} que el cliente aún no ve</span>
      <button class="gx__btn gx__btn--dark" type="button" data-send>Enviar al cliente para aprobar →</button>
    </div>`;

  $('[data-project]', main).addEventListener('change', (e) => { st.project = e.target.value; loadMonth(ctx); });
  $('[data-prev]', main).addEventListener('click', () => { st.month = addMonths(st.month, -1); loadMonth(ctx); });
  $('[data-next]', main).addEventListener('click', () => { st.month = addMonths(st.month, 1); loadMonth(ctx); });
  $('[data-add]', main).addEventListener('click', () => editPost(ctx, null, ymd(new Date(Math.max(Date.now(), st.month.getTime())))));
  $('[data-dup]', main).addEventListener('click', () => duplicateMonth(ctx));
  $('[data-send]', main)?.addEventListener('click', () => sendToClient(ctx));
  $$('[data-net]', main).forEach((b) => b.addEventListener('click', () => { st.net = b.dataset.net; render(ctx); }));
  $$('[data-post]', main).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); editPost(ctx, st.posts.find((p) => p.id === b.dataset.post)); }));
  $$('[data-day]', main).forEach((c) => c.addEventListener('click', () => editPost(ctx, null, c.dataset.day)));
}

/* ---------- ficha de una pieza ---------- */
function editPost(ctx, post, day) {
  const { sb, staff, openDrawer, closeDrawer } = ctx;
  const isNew = !post;
  const project = st.projects.find((p) => p.id === st.project);
  const p = post || { title: '', format: 'reel', networks: ['IG', 'FB'], status: 'borrador', has_ads: false, copy: '', copy_variants: {}, publish_at: new Date(`${day}T18:30`).toISOString() };
  const when = new Date(p.publish_at);
  const [, statusName, statusColor] = statusInfo(p.status);

  const box = openDrawer(`
    <div class="gx__drawer-top">
      <span class="mono gx__tag" style="background:${statusColor};color:${['programada', 'publicada', 'aprobada'].includes(p.status) ? '#fff' : 'var(--ink-0)'}">${esc(statusName)}</span>
      <button class="gx__x" type="button" data-close-drawer aria-label="Cerrar">✕</button>
    </div>
    <h2 class="gx__lead-name">${isNew ? 'Nueva pieza' : esc(p.title)}</h2>
    <p class="gx__lead-job">${esc(project?.clients?.name || '')} · ${esc(project?.name || '')}</p>
    ${p.status === 'cambios' && p.client_note ? `<div class="gx__note"><b>El cliente pidió un cambio:</b> “${esc(p.client_note)}”</div>` : ''}
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Título interno *</span><input name="title" required maxlength="160" value="${esc(p.title)}"></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Formato</span><select name="format">${Object.entries(FORMATS).map(([k, [n]]) => `<option value="${k}"${p.format === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="gx__f"><span>Estado</span><select name="status">${POST_STATUS.map(([k, n]) => `<option value="${k}"${p.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="gx__row2">
        <label class="gx__f"><span>Fecha</span><input name="date" type="date" value="${ymd(when)}" required></label>
        <label class="gx__f"><span>Hora</span><input name="time" type="time" value="${hm(when)}" required></label>
      </div>
      <fieldset class="gx__f gx__fs"><legend>Dónde se publica</legend>
        <div class="gx__netpick">${NETWORKS.map(([k, n, c]) => `<label><input type="checkbox" name="networks" value="${k}"${p.networks.includes(k) ? ' checked' : ''}><span><b style="background:${c}">${k}</b>${n}</span></label>`).join('')}</div>
      </fieldset>
      <label class="gx__f"><span>Texto (copy)</span><textarea name="copy" rows="4">${esc(p.copy || '')}</textarea></label>
      <label class="gx__f"><span>Texto distinto para TikTok / YouTube (opcional)</span><textarea name="alt" rows="2">${esc(p.copy_variants?.alt || '')}</textarea></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Video o diseño (link)</span><input name="media_url" inputmode="url" value="${esc(p.media_url || '')}" placeholder="drive.google.com/…"></label>
        <label class="gx__f"><span>Guion (link)</span><input name="script_url" inputmode="url" value="${esc(p.script_url || '')}" placeholder="docs.google.com/…"></label>
      </div>
      <div class="gx__row2">
        <label class="gx__f"><span>A cargo</span><select name="assigned_to"><option value="">Sin asignar</option>${staff.map((s) => `<option value="${s.id}"${p.assigned_to === s.id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></label>
        <label class="gx__f gx__check"><input type="checkbox" name="has_ads"${p.has_ads ? ' checked' : ''}><span>Lleva pauta</span></label>
      </div>
      <label class="gx__f"><span>Link del post publicado (cuando salga)</span><input name="published_url" inputmode="url" value="${esc(p.published_url || '')}" placeholder="instagram.com/p/…"></label>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="gx__btns">
        <button class="gx__btn gx__btn--hot" type="submit">${isNew ? 'Crear pieza' : 'Guardar'}</button>
        ${isNew ? '' : '<button class="gx__btn gx__btn--ghost" type="button" data-del>Eliminar</button>'}
      </div>
    </form>`, 'Pieza de la parrilla');

  const f = $('[data-form]', box);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('[data-msg]', f);
    const fd = new FormData(f);
    const title = String(fd.get('title')).trim();
    if (!title) { msg.textContent = 'Ponle un título.'; return; }
    const at = new Date(`${fd.get('date')}T${fd.get('time') || '18:30'}`);
    if (Number.isNaN(at.getTime())) { msg.textContent = 'Revisa la fecha y la hora.'; return; }
    const row = {
      title, format: fd.get('format'), status: fd.get('status'), publish_at: at.toISOString(),
      networks: fd.getAll('networks'),
      copy: String(fd.get('copy')).trim() || null,
      copy_variants: String(fd.get('alt')).trim() ? { alt: String(fd.get('alt')).trim() } : {},
      media_url: safeUrl(fd.get('media_url')) || null,
      script_url: safeUrl(fd.get('script_url')) || null,
      assigned_to: fd.get('assigned_to') || null,
      has_ads: fd.get('has_ads') === 'on',
      published_url: safeUrl(fd.get('published_url')) || null,
    };
    msg.textContent = 'Guardando…';
    const q = isNew
      ? sb.from('posts').insert({ ...row, project_id: st.project, client_id: project.client_id })
      : sb.from('posts').update(row).eq('id', p.id);
    const { error } = await q;
    if (error) { msg.textContent = errorText(error); return; }
    closeDrawer();
    st.month = monthStart(at);
    loadMonth(ctx);
  });
  $('[data-del]', f)?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta pieza de la parrilla?')) return;
    const { error } = await sb.from('posts').delete().eq('id', p.id);
    if (error) { $('[data-msg]', f).textContent = errorText(error); return; }
    closeDrawer();
    loadMonth(ctx);
  });
  $('input[name="title"]', f).focus();
}

/* ---------- enviar al cliente: lo "listo" pasa a "por aprobar" ---------- */
async function sendToClient(ctx) {
  const { sb } = ctx;
  const ids = st.posts.filter((p) => p.status === 'lista').map((p) => p.id);
  if (!ids.length) return;
  const { error } = await sb.from('posts').update({ status: 'por_aprobar' }).in('id', ids);
  if (error) { alert(errorText(error)); return; }
  loadMonth(ctx);
}

/* ---------- duplicar el mes: misma estructura, todo en borrador ---------- */
async function duplicateMonth(ctx) {
  const { sb } = ctx;
  if (!st.posts.length) { alert('Este mes no tiene piezas para duplicar.'); return; }
  const next = addMonths(st.month, 1);
  if (!confirm(`¿Copiar las ${st.posts.length} piezas a ${monthLabel(next)} como borrador?`)) return;
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  const project = st.projects.find((p) => p.id === st.project);
  const rows = st.posts.map((p) => {
    const d = new Date(p.publish_at);
    const nd = new Date(next.getFullYear(), next.getMonth(), Math.min(d.getDate(), lastDay), d.getHours(), d.getMinutes());
    return {
      project_id: st.project, client_id: project.client_id, publish_at: nd.toISOString(),
      format: p.format, title: p.title, networks: p.networks, copy: p.copy, copy_variants: p.copy_variants,
      assigned_to: p.assigned_to, has_ads: p.has_ads, status: 'borrador',
    };
  });
  const { error } = await sb.from('posts').insert(rows);
  if (error) { alert(errorText(error)); return; }
  st.month = next;
  loadMonth(ctx);
}

