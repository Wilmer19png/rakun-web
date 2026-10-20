/* ==========================================================================
   RAKÜN · gestor · entregables
   · 00 Mis pendientes: lo de cada persona (por proyecto, con fecha límite y
     dónde entregar) + lo que le toca revisar.
   · Dentro de cada proyecto: la tabla de entregables (con plantillas).
   · 10 Equipo → Carga de trabajo: quién tiene qué; se arrastra para reasignar.
   ========================================================================== */
import { $, $$, esc, initials, safeUrl } from './util.js';
import { errorText } from './supa.js';
import { WORLD_NAME, WORLD_COLOR } from './content.js';
import { TEMPLATES, KINDS, DSTATUS } from './quote-sources.js';
import { unreadMessages } from './admin-equipo.js';
import { myFollowups, myFollowupsHTML, myFollowupsBadge } from './admin-campanas.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

const DAY = 86400000;
const ui = { project: '', kind: '', done: false, open: null };
const first = (s) => String(s || '').split(' ')[0];
const person = (staff, id) => staff.find((s) => s.id === id);
const ava = (p, sm = true) => (p ? `<span class="gx__ava${sm ? ' gx__ava--sm' : ''}" style="background:${esc(p.color || 'var(--mist)')}" title="${esc(p.full_name || p.email)}">${esc(initials(p.full_name || p.email))}</span>` : '');
const statusOf = (k) => DSTATUS.find(([s]) => s === k) || DSTATUS[0];

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function bucket(d) {
  if (!d.due_at) return 'sin';
  const due = new Date(d.due_at);
  const today = startOfDay();
  if (due < Date.now() && d.status !== 'aprobado') return 'vencido';
  if (due < new Date(today.getTime() + DAY)) return 'hoy';
  if (due < new Date(today.getTime() + 7 * DAY)) return 'semana';
  return 'luego';
}
const GROUPS = [['vencido', 'Vencido'], ['hoy', 'Hoy'], ['semana', 'Esta semana'], ['luego', 'Más adelante'], ['sin', 'Sin fecha']];

function dueLabel(d) {
  if (!d.due_at) return ['Sin fecha', ''];
  const due = new Date(d.due_at);
  const ms = due - Date.now();
  const time = due.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  const date = due.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  if (ms < 0) {
    const days = Math.round((startOfDay() - startOfDay(due)) / DAY);
    return [days < 1 ? 'Venció hoy' : days < 2 ? 'Venció ayer' : `Venció hace ${days} d`, `${date} · ${time}`];
  }
  if (ms < DAY && due.getDate() === new Date().getDate()) return [`Faltan ${Math.max(1, Math.round(ms / 3600000))} h`, `hoy · ${time}`];
  return [due.toLocaleDateString('es-CO', { weekday: 'long' }), `${date} · ${time}`];
}

/** Abre una entrega: enlace normal o archivo de la carpeta privada «entregas». */
export async function openDelivery(sb, url) {
  if (!url) return;
  if (url.startsWith('storage:')) {
    const win = window.open('', '_blank');
    const { data, error } = await sb.storage.from('entregas').createSignedUrl(url.slice(8), 3600);
    if (error) { win?.close(); alert(errorText(error)); return; }
    if (win) win.location = data.signedUrl; else location.href = data.signedUrl;
    return;
  }
  const s = safeUrl(url);
  if (s) window.open(s, '_blank', 'noopener');
}

async function uploadDelivery(sb, d, file) {
  const path = `${d.project_id}/${d.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-80)}`;
  const { error } = await sb.storage.from('entregas').upload(path, file, { upsert: false });
  if (error) throw error;
  return `storage:${path}`;
}

/* ==========================================================================
   00 · Mis pendientes
   ========================================================================== */
export async function viewPending(ctx) {
  const { sb, me, staff, main, head, loading, fail } = ctx;
  loading();
  let query = sb.from('deliverables').select('*, projects(id, name, world, clients(name))')
    .or(`assignee_id.eq.${me.id},and(reviewer_id.eq.${me.id},status.eq.en_revision)`);
  query = ui.done ? query.eq('status', 'aprobado').order('delivered_at', { ascending: false }).limit(30) : query.neq('status', 'aprobado').order('due_at', { ascending: true, nullsFirst: false });
  const { data, error } = await query;
  if (error) {
    main.innerHTML = head('00', 'Lo primero que ves al entrar', `Hola, ${esc(first(me.full_name) || 'equipo')}.`);
    fail(/deliverables/.test(error.message) ? { message: 'Falta correr supabase/fase7.sql en Supabase.' } : error);
    return;
  }
  const items = data.map((d) => ({ ...d, review: d.reviewer_id === me.id && d.status === 'en_revision' && d.assignee_id !== me.id }));
  setBadge(items.filter((d) => !ui.done).length);
  const projects = [...new Map(items.map((d) => [d.project_id, d.projects])).entries()];
  const list = items.filter((d) => (!ui.project || d.project_id === ui.project) && (!ui.kind || (ui.kind === 'revision' ? d.review : d.kind === ui.kind)));
  const late = items.filter((d) => bucket(d) === 'vencido').length;
  const today = items.filter((d) => bucket(d) === 'hoy').length;

  main.innerHTML = head('00', 'Lo primero que ves al entrar', `Hola, ${esc(first(me.full_name) || 'equipo')}.`, `
    <button class="gx__chip${ui.done ? '' : ' is-on'}" type="button" data-done="0">Pendientes</button>
    <button class="gx__chip${ui.done ? ' is-on' : ''}" type="button" data-done="1">Terminados</button>`) + `
    <p class="dx__hello">${ui.done ? 'Lo último que entregaste y te aprobaron.' : items.length
      ? `Tienes <b>${items.length} ${items.length === 1 ? 'pendiente' : 'pendientes'}</b> en ${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}${late ? ` · <b class="dx__red">${late} ${late === 1 ? 'vencido' : 'vencidos'}</b>` : ''}${today ? ` · ${today} para hoy` : ''}.`
      : 'No tienes pendientes. Cuando te asignen un entregable aparece aquí.'}</p>
    <div data-extras></div>
    <div data-fu-mine></div>
    ${projects.length > 1 ? `<div class="dx__filters"><span class="mono">Proyecto</span>
      <button class="gx__chip${ui.project ? '' : ' is-on'}" type="button" data-fp="">Todos</button>
      ${projects.map(([id, p]) => `<button class="gx__chip dx__pchip${ui.project === id ? ' is-on' : ''}" type="button" data-fp="${id}" style="--w:${WORLD_COLOR[p?.world] || 'var(--mist)'}">${esc(p?.name || '—')} <b>${items.filter((d) => d.project_id === id).length}</b></button>`).join('')}</div>` : ''}
    ${items.length > 1 ? `<div class="dx__filters"><span class="mono">Tipo</span>
      <button class="gx__chip gx__chip--sm${ui.kind ? '' : ' is-on'}" type="button" data-fk="">Todos</button>
      ${[...new Set(items.map((d) => (d.review ? 'revision' : d.kind)))].map((k) => `<button class="gx__chip gx__chip--sm${ui.kind === k ? ' is-on' : ''}" type="button" data-fk="${k}">${KINDS[k]}</button>`).join('')}</div>` : ''}
    <div class="dx__groups">
      ${ui.done ? list.map((d) => taskHTML(ctx, d)).join('') : GROUPS.map(([k, name]) => {
        const g = list.filter((d) => bucket(d) === k);
        return g.length ? `<h2 class="dx__grp${k === 'vencido' ? ' is-late' : ''}"><span>${name}</span><b>${g.length}</b></h2>${g.map((d) => taskHTML(ctx, d)).join('')}` : '';
      }).join('')}
    </div>`;

  $$('[data-done]', main).forEach((b) => b.addEventListener('click', () => { ui.done = b.dataset.done === '1'; ui.open = null; viewPending(ctx); }));
  $$('[data-fp]', main).forEach((b) => b.addEventListener('click', () => { ui.project = b.dataset.fp; viewPending(ctx); }));
  $$('[data-fk]', main).forEach((b) => b.addEventListener('click', () => { ui.kind = b.dataset.fk; viewPending(ctx); }));
  wireTasks(ctx, items, () => viewPending(ctx));
  if (!ui.done) {
    pendingExtras(ctx, $('[data-extras]', main));
    // lo del seguimiento de campañas (11 Métricas) asignado a mí
    myFollowups(sb, me).then((mine) => {
      const box = $('[data-fu-mine]', main);
      if (box) box.innerHTML = myFollowupsHTML(mine);
      setBadge(items.length + myFollowupsBadge(mine));
    }).catch(() => {});
  }
}

/* mensajes sin ver + lo que gana (tareas con valor y comisiones) */
async function pendingExtras(ctx, box) {
  const { sb, me, staff } = ctx;
  const [msgs, { data: pays }, { data: coms }] = await Promise.all([
    unreadMessages(sb, me),
    sb.from('deliverables').select('pay_amount, status').eq('assignee_id', me.id).not('pay_amount', 'is', null).is('paid_at', null),
    sb.from('commissions').select('amount, kind, period, created_at').eq('manager_id', me.id).eq('status', 'por_pagar'),
  ]);
  const ok = (pays || []).filter((d) => d.status === 'aprobado').reduce((t, d) => t + Number(d.pay_amount), 0);
  const doing = (pays || []).filter((d) => d.status !== 'aprobado').reduce((t, d) => t + Number(d.pay_amount), 0);
  const com = (coms || []).reduce((t, c) => t + Number(c.amount), 0);
  const monthly = (coms || []).filter((c) => c.kind === 'mensual').length;
  const who = (id) => staff.find((p) => p.id === id);
  box.innerHTML = `
    ${msgs.slice(0, 3).map((m) => `<div class="dx__msg"><span class="mono">✉ ${esc(first(who(m.author_id)?.full_name) || 'Equipo')} · ${m.to_kind === 'persona' ? 'para ti' : 'para el equipo'}</span><p>${esc(m.body)}</p><button class="gx__btn" type="button" data-seen="${m.id}">Marcar visto</button></div>`).join('')}
    ${ok || doing || com ? `<div class="dx__earn">
      <div><span class="mono">Por cobrar</span><b><span class="cur">$</span>${cop(ok + com).slice(1)}</b><small>${ok ? `${cop(ok)} de tareas aprobadas` : ''}${ok && com ? ' · ' : ''}${com ? `${cop(com)} en comisiones${monthly ? ` (${monthly} mensuales)` : ''}` : ''}</small></div>
      ${doing ? `<div><span class="mono">En curso</span><b><span class="cur">$</span>${cop(doing).slice(1)}</b><small>se suma cuando te aprueben</small></div>` : ''}
    </div>` : ''}`;
  $$('[data-seen]', box).forEach((b) => b.addEventListener('click', async () => {
    await sb.from('message_reads').insert({ message_id: b.dataset.seen, user_id: me.id });
    b.closest('.dx__msg').remove();
  }));
}

function setBadge(n) {
  const b = $('[data-badge-pend]');
  if (b) { b.hidden = !n; b.textContent = n; }
}
export async function refreshPendingBadge(sb, me) {
  const { count } = await sb.from('deliverables').select('id', { count: 'exact', head: true })
    .or(`assignee_id.eq.${me.id},and(reviewer_id.eq.${me.id},status.eq.en_revision)`).neq('status', 'aprobado');
  const mine = await myFollowups(sb, me).catch(() => ({ list: [], rules: [], leads: [] }));
  setBadge((count || 0) + myFollowupsBadge(mine));
}

function taskHTML(ctx, d) {
  const { staff } = ctx;
  const p = d.projects || {};
  const [when, date] = dueLabel(d);
  const late = bucket(d) === 'vencido';
  const rev = person(staff, d.reviewer_id);
  const who = person(staff, d.assignee_id);
  const [, sName, sColor] = statusOf(d.status);
  const open = ui.open === d.id;
  return `
  <article class="dx__task${late ? ' is-late' : ''}${open ? ' is-open' : ''}" style="--w:${WORLD_COLOR[p.world] || 'var(--mist)'}" data-task="${d.id}">
    <div class="dx__task-main">
      <p><span class="mono dx__pill">${d.review ? 'Revisión' : KINDS[d.kind]}</span> <b>${esc(d.title)}</b>${!d.review && d.pay_amount ? ` <span class="mono dx__pay">Ganas ${cop(d.pay_amount)}</span>` : ''}</p>
      <p class="dx__task-sub">${esc(WORLD_NAME[p.world] || '')} · ${esc(p.name || '—')}${p.clients?.name ? ` · ${esc(p.clients.name)}` : ''}${d.review ? ` · lo entregó: ${esc(first(who?.full_name) || '—')}` : rev ? ` · lo revisa: ${esc(first(rev.full_name))}` : ''}</p>
      ${d.delivery_note ? `<p class="dx__task-note">“${esc(d.delivery_note)}”</p>` : ''}
    </div>
    <div class="dx__task-due"><span class="mono${late ? ' dx__red' : ''}">${esc(when)}</span><small>${esc(date)}</small></div>
    <div>${d.review || d.status === 'aprobado' ? `<span class="mono gx__tag" style="background:${sColor};${d.status === 'aprobado' ? 'color:var(--cream)' : ''}">${sName}</span>`
      : `<select class="dx__status" data-status="${d.id}" aria-label="Estado" style="--s:${sColor}">${DSTATUS.filter(([k]) => k !== 'aprobado' || !d.reviewer_id).map(([k, n]) => `<option value="${k}"${d.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select>`}</div>
    <div class="dx__task-act">
      ${d.brief_url ? `<button class="gx__btn" type="button" data-open-url="${esc(d.brief_url)}">Brief ↗</button>` : ''}
      ${d.delivery_url ? `<button class="gx__btn" type="button" data-open-url="${esc(d.delivery_url)}">${d.review ? 'Ver entrega' : 'Mi entrega'} ↗</button>` : ''}
      ${d.review ? `<button class="gx__btn gx__btn--dark" type="button" data-approve="${d.id}">Aprobar ✓</button><button class="gx__btn" type="button" data-return="${d.id}">Devolver</button>`
        : d.status !== 'aprobado' ? `<button class="gx__btn${open ? '' : ' gx__btn--hot'}" type="button" data-deliver="${d.id}">${open ? 'Cerrar' : 'Entregar ↑'}</button>` : ''}
    </div>
    ${open ? `
    <form class="dx__deliver" data-deliver-form="${d.id}">
      <label class="gx__f"><span>Pega el enlace</span><input name="url" placeholder="Drive, Docs, Frame.io, Vimeo, Figma…" value="${d.delivery_url && !d.delivery_url.startsWith('storage:') ? esc(d.delivery_url) : ''}"></label>
      <label class="gx__f"><span>O sube el archivo (hasta 50 MB)</span><input name="file" type="file"></label>
      <label class="gx__f"><span>Nota para ${rev ? esc(first(rev.full_name)) : 'el equipo'}</span><textarea name="note" rows="2" maxlength="1000"></textarea></label>
      <div class="dx__deliver-go"><p class="mono gx__saved" data-msg aria-live="polite"></p><button class="gx__btn gx__btn--hot" type="submit">${rev ? `Enviar a revisión de ${esc(first(rev.full_name))} →` : 'Entregar →'}</button></div>
    </form>` : ''}
  </article>`;
}

function wireTasks(ctx, items, reload) {
  const { sb, main, me } = ctx;
  const find = (id) => items.find((d) => d.id === id);
  $$('[data-open-url]', main).forEach((b) => b.addEventListener('click', () => openDelivery(sb, b.dataset.openUrl)));
  $$('[data-status]', main).forEach((s) => s.addEventListener('change', async () => {
    const { error } = await sb.from('deliverables').update({ status: s.value }).eq('id', s.dataset.status);
    if (error) alert(errorText(error)); else reload();
  }));
  $$('[data-deliver]', main).forEach((b) => b.addEventListener('click', () => { ui.open = ui.open === b.dataset.deliver ? null : b.dataset.deliver; reload(); }));
  $$('[data-deliver-form]', main).forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = find(f.dataset.deliverForm);
    const msg = $('[data-msg]', f);
    const fd = new FormData(f);
    const file = fd.get('file');
    let url = String(fd.get('url') || '').trim();
    if (url && !safeUrl(url)) { msg.textContent = 'Ese enlace no parece válido.'; return; }
    if (!url && !(file && file.size)) { msg.textContent = 'Pega un enlace o sube un archivo.'; return; }
    $('button[type="submit"]', f).disabled = true;
    msg.textContent = 'Entregando…';
    try {
      if (file && file.size) {
        if (file.size > 50 * 1024 * 1024) throw new Error('El archivo pesa más de 50 MB: súbelo a Drive y pega el enlace.');
        url = await uploadDelivery(sb, d, file);
      } else url = safeUrl(url);
    } catch (err) { msg.textContent = errorText(err); $('button[type="submit"]', f).disabled = false; return; }
    const { error } = await sb.from('deliverables').update({
      delivery_url: url, delivery_note: String(fd.get('note') || '').trim() || null, delivered_at: new Date().toISOString(),
      status: d.reviewer_id && d.reviewer_id !== me.id ? 'en_revision' : 'aprobado',
    }).eq('id', d.id);
    if (error) { msg.textContent = errorText(error); $('button[type="submit"]', f).disabled = false; return; }
    ui.open = null;
    reload();
  }));
  $$('[data-approve]', main).forEach((b) => b.addEventListener('click', async () => {
    const { error } = await sb.from('deliverables').update({ status: 'aprobado' }).eq('id', b.dataset.approve);
    if (error) alert(errorText(error)); else reload();
  }));
  $$('[data-return]', main).forEach((b) => b.addEventListener('click', async () => {
    const why = prompt('¿Qué hay que cambiar? (le llega como nota)');
    if (why === null) return;
    const { error } = await sb.from('deliverables').update({ status: 'en_curso', delivery_note: why.trim() ? `Devuelto: ${why.trim()}` : 'Devuelto para ajustes' }).eq('id', b.dataset.return);
    if (error) alert(errorText(error)); else reload();
  }));
}

/* ==========================================================================
   Dentro de un proyecto: la tabla de entregables
   ========================================================================== */
export async function deliverablesPanel(ctx, project, box) {
  const { sb, staff } = ctx;
  const { data, error } = await sb.from('deliverables').select('*').eq('project_id', project.id).order('due_at', { ascending: true, nullsFirst: false }).order('sort');
  if (error) {
    box.innerHTML = `<p class="gx__error">${esc(/deliverables/.test(error.message) ? 'Falta correr supabase/fase7.sql en Supabase.' : errorText(error))}</p>`;
    return;
  }
  const opts = (sel, empty) => `<option value="">${empty}</option>${staff.map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}`;
  const dateVal = (iso) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '');
  box.innerHTML = `
    <div class="dx__ptable-head">
      <h2 class="dx__ptitle">Entregables</h2>
      <span class="gx__btns"><button class="gx__btn" type="button" data-template>Cargar plantilla de ${WORLD_NAME[project.world]}</button><button class="gx__btn gx__btn--hot" type="button" data-add-d>+ Entregable</button></span>
    </div>
    <div class="dx__ptable">
      <div class="dx__prow dx__prow--h mono"><span>Entregable</span><span>Tipo</span><span>Lo hace</span><span>Lo revisa</span><span>Fecha límite</span><span>Estado</span><span>Brief</span><span>Entrega</span><span></span></div>
      ${data.map((d) => `
      <div class="dx__prow" data-d="${d.id}">
        <input data-df="title" value="${esc(d.title)}" aria-label="Entregable">
        <select data-df="kind" aria-label="Tipo">${Object.entries(KINDS).map(([k, n]) => `<option value="${k}"${d.kind === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <select data-df="assignee_id" aria-label="Lo hace">${opts(d.assignee_id, 'Sin asignar')}</select>
        <select data-df="reviewer_id" aria-label="Lo revisa">${opts(d.reviewer_id, 'Nadie')}</select>
        <input data-df="due_at" type="date" value="${dateVal(d.due_at)}" aria-label="Fecha límite">
        <select data-df="status" aria-label="Estado">${DSTATUS.map(([k, n]) => `<option value="${k}"${d.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <input data-df="brief_url" value="${esc(d.brief_url || '')}" placeholder="https://" aria-label="Enlace del brief">
        <span>${d.delivery_url ? `<button class="qx__link" type="button" data-open-url="${esc(d.delivery_url)}">Ver ↗</button>` : '<span class="qx__dim">—</span>'}</span>
        <button type="button" class="gx__mini" data-del-d="${d.id}" aria-label="Quitar entregable">✕</button>
      </div>`).join('') || '<p class="gx__empty">Aún no hay entregables. Carga la plantilla o agrega uno.</p>'}
    </div>
    <p class="mono gx__saved" data-dmsg aria-live="polite"></p>`;
  const msg = $('[data-dmsg]', box);
  const reload = () => deliverablesPanel(ctx, project, box);
  $$('[data-open-url]', box).forEach((b) => b.addEventListener('click', () => openDelivery(sb, b.dataset.openUrl)));
  $$('[data-df]', box).forEach((el) => el.addEventListener('change', async () => {
    let v = el.value.trim() || null;
    if (el.dataset.df === 'due_at' && v) v = new Date(`${v}T18:00:00`).toISOString();
    if (el.dataset.df === 'brief_url' && v) v = safeUrl(v) || null;
    if (el.dataset.df === 'title' && !v) { el.value = data.find((d) => d.id === el.closest('[data-d]').dataset.d).title; return; }
    msg.textContent = 'Guardando…';
    const { error: e } = await sb.from('deliverables').update({ [el.dataset.df]: v }).eq('id', el.closest('[data-d]').dataset.d);
    msg.textContent = e ? errorText(e) : '✓ Guardado';
  }));
  $$('[data-del-d]', box).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Quitar este entregable?')) return;
    const { error: e } = await sb.from('deliverables').delete().eq('id', b.dataset.delD);
    if (e) msg.textContent = errorText(e); else reload();
  }));
  $('[data-add-d]', box).addEventListener('click', async () => {
    const due = new Date(); due.setDate(due.getDate() + 7); due.setHours(18, 0, 0, 0);
    const { error: e } = await sb.from('deliverables').insert({ project_id: project.id, title: 'Nuevo entregable', assignee_id: project.owner_id, due_at: due.toISOString(), sort: data.length });
    if (e) msg.textContent = errorText(e); else reload();
  });
  $('[data-template]', box).addEventListener('click', async () => {
    if (!confirm(`¿Agregar los entregables de la plantilla de ${WORLD_NAME[project.world]}, contando desde hoy?`)) return;
    const start = new Date();
    const rows = TEMPLATES[project.world].map(([title, kind, days], k) => {
      const due = new Date(start); due.setDate(due.getDate() + days); due.setHours(18, 0, 0, 0);
      return { project_id: project.id, title, kind, assignee_id: project.owner_id, due_at: due.toISOString(), sort: data.length + k };
    });
    const { error: e } = await sb.from('deliverables').insert(rows);
    if (e) msg.textContent = errorText(e); else reload();
  });
}

/* ==========================================================================
   10 · Equipo → Carga de trabajo
   ========================================================================== */
export async function teamLoad(ctx, box) {
  const { sb, staff } = ctx;
  const { data, error } = await sb.from('deliverables').select('id, title, kind, due_at, status, assignee_id, project_id, projects(name, world)').neq('status', 'aprobado').order('due_at', { ascending: true, nullsFirst: false });
  if (error) {
    box.innerHTML = `<p class="gx__error">${esc(/deliverables/.test(error.message) ? 'Falta correr supabase/fase7.sql en Supabase.' : errorText(error))}</p>`;
    return;
  }
  const people = [...staff.map((s) => ({ id: s.id, p: s })), ...(data.some((d) => !d.assignee_id) ? [{ id: '', p: null }] : [])];
  const max = Math.max(1, ...people.map(({ id }) => data.filter((d) => (d.assignee_id || '') === id).length));
  box.innerHTML = `
    <p class="gx__p">Lo pendiente de cada persona, por fecha. <b>Arrastra</b> una tarjeta a otra columna para pasársela.</p>
    <div class="dx__load" style="--cols:${people.length}">
      ${people.map(({ id, p }) => {
        const mine = data.filter((d) => (d.assignee_id || '') === id);
        const late = mine.filter((d) => bucket(d) === 'vencido').length;
        return `<section class="dx__lcol" data-drop="${id}">
          <div class="dx__lhead">${p ? ava(p, false) : '<span class="gx__ava" style="background:var(--mist)">?</span>'}<div><b>${esc(p ? first(p.full_name) || p.email : 'Sin asignar')}</b><small class="mono">${esc(p?.area || '')}</small></div></div>
          <p class="mono dx__lcount"><span>${mine.length} ${mine.length === 1 ? 'pendiente' : 'pendientes'}</span><span class="${late ? 'dx__red' : ''}">${late ? `${late} ${late === 1 ? 'vencido' : 'vencidos'}` : mine.length ? 'al día' : 'libre'}</span></p>
          <span class="qx__bar"><i style="width:${Math.round(mine.length / max * 100)}%;${late ? 'background:var(--pink)' : ''}"></i></span>
          ${mine.map((d) => `<div class="dx__lcard${bucket(d) === 'vencido' ? ' is-late' : ''}" draggable="true" data-drag="${d.id}" style="--w:${WORLD_COLOR[d.projects?.world] || 'var(--mist)'}">
            <span class="mono">${esc(dueLabel(d)[0])}</span><b>${esc(d.title)}</b><small>${esc(d.projects?.name || '')}</small></div>`).join('') || '<p class="gx__col-empty">—</p>'}
        </section>`;
      }).join('')}
    </div>
    <p class="mono gx__saved" data-lmsg aria-live="polite"></p>`;
  let dragging = null;
  $$('[data-drag]', box).forEach((c) => {
    c.addEventListener('dragstart', (e) => { dragging = c.dataset.drag; e.dataTransfer.effectAllowed = 'move'; c.classList.add('is-drag'); });
    c.addEventListener('dragend', () => c.classList.remove('is-drag'));
  });
  $$('[data-drop]', box).forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('is-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('is-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('is-over');
      if (!dragging) return;
      const d = data.find((x) => x.id === dragging);
      dragging = null;
      if (!d || (d.assignee_id || '') === col.dataset.drop) return;
      $('[data-lmsg]', box).textContent = 'Reasignando…';
      const { error: err } = await sb.from('deliverables').update({ assignee_id: col.dataset.drop || null }).eq('id', d.id);
      if (err) $('[data-lmsg]', box).textContent = errorText(err); else teamLoad(ctx, box);
    });
  });
}
