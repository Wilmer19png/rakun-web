/* ==========================================================================
   RAKÜN · gestor · 05 Grabaciones y 06 Reuniones
   Grabaciones: fecha, lugar, equipo que va y qué debe preparar el cliente;
   el cliente confirma o pide otra fecha desde su portal.
   Reuniones: el equipo las agenda con link de Meet, o el cliente las pide y
   el equipo las confirma.
   ========================================================================== */
import { $, $$, esc, safeUrl, initials } from './util.js';
import { errorText } from './supa.js';
import { MEET_KIND, MEET_STATUS, SHOOT_STATUS, fmtTime, ymd, hm } from './content.js';
import { attachPlacePicker } from './places.js';

const st = { pastShoots: false, pastMeets: false };

async function loadRefs(sb) {
  const [{ data: clients }, { data: projects }] = await Promise.all([
    sb.from('clients').select('id, name').order('name'),
    sb.from('projects').select('id, name, client_id').neq('status', 'terminado').order('created_at', { ascending: false }),
  ]);
  return { clients: clients || [], projects: projects || [] };
}

const clientOptions = (clients, sel) => clients.map((c) => `<option value="${c.id}"${sel === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
const dateBlock = (iso) => {
  const d = new Date(iso);
  return `<span class="gx__date"><b>${d.getDate()}</b><span class="mono">${d.toLocaleDateString('es-CO', { month: 'short' })}</span><span class="mono">${d.toLocaleDateString('es-CO', { weekday: 'short' })}</span></span>`;
};
const toISO = (date, time) => new Date(`${date}T${time || '09:00'}`).toISOString();

/* ==========================================================================
   05 · Grabaciones
   ========================================================================== */
export async function viewShoots(ctx) {
  const { sb, main, head, loading, fail, staff } = ctx;
  loading();
  const now = new Date().toISOString();
  let q = sb.from('shoots').select('*').order('starts_at', { ascending: !st.pastShoots });
  q = st.pastShoots ? q.lt('starts_at', now) : q.gte('starts_at', now);
  const [{ data: shoots, error }, refs] = await Promise.all([q.limit(200), loadRefs(sb)]);
  if (error) { main.innerHTML = ''; fail(error); return; }
  const name = Object.fromEntries(refs.clients.map((c) => [c.id, c.name]));
  const person = Object.fromEntries(staff.map((s) => [s.id, s]));

  main.innerHTML = head('05', 'Cuándo, dónde y quién va', 'Grabaciones', `
    <button class="gx__chip${st.pastShoots ? '' : ' is-on'}" type="button" data-when="0">Próximas</button>
    <button class="gx__chip${st.pastShoots ? ' is-on' : ''}" type="button" data-when="1">Anteriores</button>
    <button class="gx__btn gx__btn--dark" type="button" data-new>+ Programar grabación</button>`) + `
    <div class="gx__agenda">
      ${shoots.map((s) => {
        const [sn, sb2, si] = SHOOT_STATUS[s.status];
        const resp = s.client_response === 'confirmada' ? '<span class="gx__resp gx__resp--ok">✓ El cliente confirmó</span>'
          : s.client_response === 'reprogramar' ? `<span class="gx__resp gx__resp--warn">⟳ Pide otra fecha${s.client_note ? `: “${esc(s.client_note)}”` : ''}</span>` : '<span class="gx__resp">Esperando confirmación del cliente</span>';
        return `<article class="gx__ev" data-id="${s.id}">
          ${dateBlock(s.starts_at)}
          <div class="gx__ev-main">
            <p class="gx__ev-title">${esc(name[s.client_id] || '—')} <span class="mono gx__tag" style="background:${sb2};color:${si}">${sn}</span></p>
            <p class="gx__ev-meta">${fmtTime(s.starts_at)} · ${Number(s.duration_hours)} h · ${esc(s.location || 'Lugar por definir')}${s.address ? ` · ${esc(s.address)}` : ''}</p>
            <p class="gx__ev-crew">${(s.crew || []).map((id) => person[id] ? `<span class="gx__ava gx__ava--sm" style="background:${esc(person[id].color)}" title="${esc(person[id].full_name)}">${esc(initials(person[id].full_name))}</span>` : '').join('')}${s.status === 'programada' ? resp : ''}</p>
          </div>
          <div class="gx__ev-act"><button class="gx__btn" type="button" data-edit>Editar</button></div>
        </article>`;
      }).join('') || `<p class="gx__empty">${st.pastShoots ? 'No hay grabaciones anteriores.' : 'No hay grabaciones programadas.'}</p>`}
    </div>`;

  $$('[data-when]', main).forEach((b) => b.addEventListener('click', () => { st.pastShoots = b.dataset.when === '1'; viewShoots(ctx); }));
  $('[data-new]', main).addEventListener('click', () => shootForm(ctx, refs, null));
  $$('[data-id]', main).forEach((row) => $('[data-edit]', row).addEventListener('click', () => shootForm(ctx, refs, shoots.find((s) => s.id === row.dataset.id))));
}

function shootForm(ctx, refs, s) {
  const { sb, staff, openModal, closeModal } = ctx;
  if (!refs.clients.length) { openModal('<h2 class="gx__modal-title">Primero un <em>cliente.</em></h2><p class="gx__p">Crea el cliente en <b>Clientes</b>.</p>'); return; }
  const isNew = !s;
  const when = s ? new Date(s.starts_at) : null;
  openModal(`
    <p class="mono gx__kicker">${isNew ? 'Programar grabación' : 'Editar grabación'}</p>
    <h2 class="gx__modal-title">¿Cuándo <em>grabamos?</em></h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Cliente *</span><select name="client_id">${clientOptions(refs.clients, s?.client_id)}</select></label>
      <label class="gx__f"><span>Proyecto</span><select name="project_id" data-projects></select></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Fecha *</span><input name="date" type="date" required value="${when ? ymd(when) : ''}"></label>
        <label class="gx__f"><span>Hora *</span><input name="time" type="time" required value="${when ? hm(when) : '09:00'}"></label>
      </div>
      <div class="gx__row2">
        <label class="gx__f"><span>Duración (horas)</span><input name="duration_hours" type="number" min="0.5" max="24" step="0.5" value="${s?.duration_hours ?? 3}"></label>
        <label class="gx__f"><span>Estado</span><select name="status">${Object.entries(SHOOT_STATUS).map(([k, [n]]) => `<option value="${k}"${(s?.status || 'programada') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <label class="gx__f"><span>Lugar</span><input name="location" maxlength="160" value="${esc(s?.location || '')}" placeholder="Consultorio, estudio, casa del cliente…"></label>
      <label class="gx__f"><span>Dirección</span><input name="address" maxlength="300" value="${esc(s?.address || '')}" placeholder="Cra. 43A #1-50, Medellín"></label>
      <fieldset class="gx__f gx__fs"><legend>Quién va del equipo</legend>
        <div class="gx__netpick">${staff.map((p) => `<label><input type="checkbox" name="crew" value="${p.id}"${s?.crew?.includes(p.id) ? ' checked' : ''}><span><b style="background:${esc(p.color)};color:var(--ink-0)">${esc(initials(p.full_name))}</b>${esc(p.full_name.split(' ')[0])}</span></label>`).join('')}</div>
      </fieldset>
      <label class="gx__f"><span>Qué debe preparar el cliente (una cosa por línea)</span><textarea name="prep" rows="4" placeholder="3 cambios de ropa en colores lisos&#10;Revisar los guiones que te enviamos">${esc((s?.prep || []).join('\n'))}</textarea></label>
      ${s?.client_response === 'reprogramar' ? '<label class="gx__check gx__f"><input type="checkbox" name="reset"><span>Ya acordamos la nueva fecha (borrar la solicitud del cliente)</span></label>' : ''}
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="gx__btns">
        <button class="gx__btn gx__btn--hot" type="submit">${isNew ? 'Programar' : 'Guardar'}</button>
        ${isNew ? '' : '<button class="gx__btn gx__btn--ghost" type="button" data-del>Eliminar</button>'}
      </div>
    </form>`);
  const f = $('[data-modal-box] [data-form]');
  const fill = () => {
    $('[data-projects]', f).innerHTML = '<option value="">Sin proyecto</option>' + refs.projects.filter((p) => p.client_id === f.elements.client_id.value)
      .map((p) => `<option value="${p.id}"${s?.project_id === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  };
  fill();
  f.elements.client_id.addEventListener('change', fill);

  // buscador de lugares + atajos con los lugares donde ya se grabó
  sb.from('shoots').select('location, address').not('location', 'is', null).order('starts_at', { ascending: false }).limit(60)
    .then(({ data }) => {
      const seen = new Set();
      const previous = (data || []).filter((p) => {
        const k = `${p.location}|${p.address || ''}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).map((p) => ({ name: p.location, address: p.address || '' }));
      attachPlacePicker(f.elements.location, f.elements.address, previous);
    });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('[data-msg]', f);
    const fd = new FormData(f);
    if (!fd.get('date')) { msg.textContent = 'Elige la fecha.'; return; }
    const row = {
      client_id: fd.get('client_id'), project_id: fd.get('project_id') || null,
      starts_at: toISO(fd.get('date'), fd.get('time')), duration_hours: Number(fd.get('duration_hours')) || 3,
      status: fd.get('status'), location: String(fd.get('location')).trim() || null, address: String(fd.get('address')).trim() || null,
      crew: fd.getAll('crew'), prep: String(fd.get('prep')).split('\n').map((x) => x.trim()).filter(Boolean),
    };
    // si se cambia la fecha o se marca "ya acordamos", la respuesta del cliente vuelve a empezar
    if (s && (fd.get('reset') === 'on' || row.starts_at !== new Date(s.starts_at).toISOString())) Object.assign(row, { client_response: null, client_note: null });
    msg.textContent = 'Guardando…';
    const { error } = isNew ? await sb.from('shoots').insert(row) : await sb.from('shoots').update(row).eq('id', s.id);
    if (error) { msg.textContent = errorText(error); return; }
    closeModal();
    viewShoots(ctx);
  });
  $('[data-del]', f)?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta grabación?')) return;
    const { error } = await sb.from('shoots').delete().eq('id', s.id);
    if (error) { $('[data-msg]', f).textContent = errorText(error); return; }
    closeModal();
    viewShoots(ctx);
  });
}

/* ==========================================================================
   06 · Reuniones
   ========================================================================== */
export async function viewMeetings(ctx) {
  const { sb, main, head, loading, fail, staff } = ctx;
  loading();
  const now = new Date(Date.now() - 2 * 3600e3).toISOString();
  const [{ data: all, error }, refs] = await Promise.all([
    sb.from('meetings').select('*').order('starts_at', { ascending: true, nullsFirst: true }).limit(300),
    loadRefs(sb),
  ]);
  if (error) { main.innerHTML = ''; fail(error); return; }
  const name = Object.fromEntries(refs.clients.map((c) => [c.id, c.name]));
  const person = Object.fromEntries(staff.map((s) => [s.id, s]));
  const requested = all.filter((m) => m.status === 'solicitada');
  const upcoming = all.filter((m) => m.status !== 'solicitada' && m.starts_at && m.starts_at >= now && m.status !== 'cancelada');
  const past = all.filter((m) => m.status !== 'solicitada' && (!m.starts_at || m.starts_at < now || m.status === 'cancelada')).reverse();
  setMeetBadge(requested.length);

  const card = (m) => {
    const [sn, sbg, si] = MEET_STATUS[m.status];
    const owner = person[m.owner_id];
    const link = safeUrl(m.link);
    return `<article class="gx__ev${m.status === 'solicitada' ? ' gx__ev--hot' : ''}" data-id="${m.id}">
      ${m.starts_at ? dateBlock(m.starts_at) : '<span class="gx__date gx__date--tbd"><b>?</b><span class="mono">por</span><span class="mono">definir</span></span>'}
      <div class="gx__ev-main">
        <p class="gx__ev-title">${esc(m.title)} <span class="mono gx__tag" style="background:${sbg};color:${si}">${sn}</span></p>
        <p class="gx__ev-meta">${esc(name[m.client_id] || '—')} · ${esc(MEET_KIND[m.kind] || '')}${m.starts_at ? ` · ${fmtTime(m.starts_at)} · ${m.duration_min} min` : ''}</p>
        ${m.client_note ? `<p class="gx__ev-note">“${esc(m.client_note)}”</p>` : ''}
        <p class="gx__ev-crew">${owner ? `<span class="gx__ava gx__ava--sm" style="background:${esc(owner.color)}">${esc(initials(owner.full_name))}</span>${esc(owner.full_name.split(' ')[0])}` : ''}${link ? ` <a class="gx__link" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir Meet ↗</a>` : ''}</p>
      </div>
      <div class="gx__ev-act"><button class="gx__btn${m.status === 'solicitada' ? ' gx__btn--hot' : ''}" type="button" data-edit>${m.status === 'solicitada' ? 'Confirmar →' : 'Editar'}</button></div>
    </article>`;
  };

  main.innerHTML = head('06', 'Lo que hablamos con cada cliente', 'Reuniones', `
    <button class="gx__chip${st.pastMeets ? '' : ' is-on'}" type="button" data-when="0">Próximas</button>
    <button class="gx__chip${st.pastMeets ? ' is-on' : ''}" type="button" data-when="1">Anteriores</button>
    <button class="gx__btn gx__btn--dark" type="button" data-new>+ Agendar reunión</button>`) + `
    ${requested.length && !st.pastMeets ? `<h2 class="gx__sub-h mono">Pedidas por clientes · ${requested.length}</h2><div class="gx__agenda">${requested.map(card).join('')}</div>` : ''}
    <h2 class="gx__sub-h mono">${st.pastMeets ? 'Anteriores' : 'Agendadas'}</h2>
    <div class="gx__agenda">${(st.pastMeets ? past : upcoming).map(card).join('') || '<p class="gx__empty">Nada por aquí.</p>'}</div>`;

  $$('[data-when]', main).forEach((b) => b.addEventListener('click', () => { st.pastMeets = b.dataset.when === '1'; viewMeetings(ctx); }));
  $('[data-new]', main).addEventListener('click', () => meetForm(ctx, refs, null));
  $$('[data-id]', main).forEach((row) => $('[data-edit]', row).addEventListener('click', () => meetForm(ctx, refs, all.find((m) => m.id === row.dataset.id))));
}

function setMeetBadge(n) {
  const b = $('[data-badge-meet]');
  if (!b) return;
  b.hidden = !n;
  b.textContent = n;
}

function meetForm(ctx, refs, m) {
  const { sb, me, staff, openModal, closeModal } = ctx;
  if (!refs.clients.length) { openModal('<h2 class="gx__modal-title">Primero un <em>cliente.</em></h2><p class="gx__p">Crea el cliente en <b>Clientes</b>.</p>'); return; }
  const isNew = !m;
  const confirming = m?.status === 'solicitada';
  const when = m?.starts_at ? new Date(m.starts_at) : null;
  openModal(`
    <p class="mono gx__kicker">${isNew ? 'Agendar reunión' : confirming ? 'Confirmar reunión pedida' : 'Editar reunión'}</p>
    <h2 class="gx__modal-title">${confirming ? 'Ponle <em>fecha.</em>' : '¿Cuándo <em>hablamos?</em>'}</h2>
    ${confirming && m.client_note ? `<div class="gx__note"><b>El cliente escribió:</b> “${esc(m.client_note)}”</div>` : ''}
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Cliente *</span><select name="client_id">${clientOptions(refs.clients, m?.client_id)}</select></label>
      <label class="gx__f"><span>Tema *</span><input name="title" required maxlength="160" value="${esc(m?.title || '')}" placeholder="Revisión del mes"></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Tipo</span><select name="kind">${Object.entries(MEET_KIND).map(([k, n]) => `<option value="${k}"${(m?.kind || 'revision') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="gx__f"><span>Duración (min)</span><input name="duration_min" type="number" min="5" max="480" step="5" value="${m?.duration_min ?? 20}"></label>
      </div>
      <div class="gx__row2">
        <label class="gx__f"><span>Fecha *</span><input name="date" type="date" required value="${when ? ymd(when) : ''}"></label>
        <label class="gx__f"><span>Hora *</span><input name="time" type="time" required value="${when ? hm(when) : '10:00'}"></label>
      </div>
      <label class="gx__f"><span>Link de Google Meet</span><input name="link" inputmode="url" value="${esc(m?.link || '')}" placeholder="https://meet.google.com/…"></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Con quién</span><select name="owner_id"><option value="">—</option>${staff.map((p) => `<option value="${p.id}"${(m?.owner_id || me.id) === p.id ? ' selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></label>
        <label class="gx__f"><span>Estado</span><select name="status">${Object.entries(MEET_STATUS).filter(([k]) => k !== 'solicitada').map(([k, [n]]) => `<option value="${k}"${(confirming ? 'confirmada' : m?.status || 'confirmada') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <label class="gx__f"><span>Acuerdos de la reunión (los ve el cliente)</span><textarea name="summary" rows="3">${esc(m?.summary || '')}</textarea></label>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="gx__btns">
        <button class="gx__btn gx__btn--hot" type="submit">${confirming ? 'Confirmar reunión' : isNew ? 'Agendar' : 'Guardar'}</button>
        ${isNew ? '' : '<button class="gx__btn gx__btn--ghost" type="button" data-del>Eliminar</button>'}
      </div>
    </form>`);
  const f = $('[data-modal-box] [data-form]');
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('[data-msg]', f);
    const fd = new FormData(f);
    if (!String(fd.get('title')).trim()) { msg.textContent = 'Ponle un tema.'; return; }
    if (!fd.get('date')) { msg.textContent = 'Elige la fecha.'; return; }
    const link = String(fd.get('link')).trim();
    if (link && !safeUrl(link)) { msg.textContent = 'El link de Meet no es válido.'; return; }
    const row = {
      client_id: fd.get('client_id'), title: String(fd.get('title')).trim(), kind: fd.get('kind'),
      duration_min: Number(fd.get('duration_min')) || 20, starts_at: toISO(fd.get('date'), fd.get('time')),
      link: link ? safeUrl(link) : null, owner_id: fd.get('owner_id') || null, status: fd.get('status'),
      summary: String(fd.get('summary')).trim() || null,
    };
    msg.textContent = 'Guardando…';
    const { error } = isNew ? await sb.from('meetings').insert(row) : await sb.from('meetings').update(row).eq('id', m.id);
    if (error) { msg.textContent = errorText(error); return; }
    closeModal();
    viewMeetings(ctx);
  });
  $('[data-del]', f)?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta reunión?')) return;
    const { error } = await sb.from('meetings').delete().eq('id', m.id);
    if (error) { $('[data-msg]', f).textContent = errorText(error); return; }
    closeModal();
    viewMeetings(ctx);
  });
}
