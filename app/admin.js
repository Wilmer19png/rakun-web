/* ==========================================================================
   RAKÜN · gestor (admin y equipo)
   Fase 1: Solicitudes, Clientes (con creación de acceso) y Equipo.
   Todo lo que escribe un visitante pasa por esc() antes de pintarse.
   ========================================================================== */
import { $, $$, esc, safeUrl, initials, ago, waNumber } from './util.js';
import { getClient, getProfile, isStaff, isConfigured, accountUrl, errorText } from './supa.js';
import { viewProjects } from './admin-proyectos.js';
import { viewParrilla } from './admin-parrilla.js';
import { viewPlans } from './admin-planes.js';
import { viewDocuments } from './admin-documentos.js';
import { viewShoots, viewMeetings } from './admin-agenda.js';
import { openPasswordDialog } from './password.js';

const WORLD = { marca: ['Marca', 'var(--yellow)'], produccion: ['Producción', 'var(--blue)'], web: ['Web', 'var(--pink)'] };
const STATUS = [
  ['nueva', 'Nueva', 'var(--pink)'], ['contactado', 'Contactado', 'var(--yellow)'], ['reunion', 'Reunión', 'var(--blue)'],
  ['propuesta', 'Propuesta', '#8B6CF0'], ['ganado', 'Ganado', '#3C8C6E'], ['perdido', 'Perdido', 'var(--mist)'],
];
const ROLE = { admin: 'Admin', equipo: 'Equipo', cliente: 'Cliente' };

let sb, me, staff = [];
const main = $('[data-main]');
const state = { view: 'solicitudes', world: '', q: '', showLost: false, leads: [], clients: [] };

/* ---------- arranque: solo entra el equipo ---------- */
(async () => {
  const boot = $('[data-boot]');
  if (!isConfigured()) { boot.textContent = 'Falta conectar Supabase (app/config.js).'; return; }
  try {
    sb = await getClient();
    me = await getProfile();
    if (!me) { location.replace('login.html'); return; }
    if (!isStaff(me)) { location.replace('portal.html'); return; }
  } catch (err) { boot.textContent = errorText(err); return; }

  $('[data-me-ava]').textContent = initials(me.full_name || me.email);
  $('[data-me-ava]').style.background = me.color || 'var(--pink)';
  $('[data-me-name]').textContent = me.full_name || me.email;
  $('[data-me-role]').textContent = me.area || ROLE[me.role];
  $('[data-logout]').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('login.html'); });
  $('[data-change-pass]').addEventListener('click', () => openPasswordDialog(sb, me));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
  $$('[data-close-drawer]').forEach((b) => b.addEventListener('click', closeDrawer));
  $$('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });

  const { data } = await sb.from('profiles').select('id, full_name, email, role, area, color').in('role', ['admin', 'equipo']).order('full_name');
  staff = data || [];

  // avisos en el menú: reuniones que pidieron los clientes y aún no tienen fecha
  sb.from('meetings').select('id', { count: 'exact', head: true }).eq('status', 'solicitada').then(({ count }) => {
    const b = $('[data-badge-meet]');
    if (b && count) { b.hidden = false; b.textContent = count; }
  });

  boot.hidden = true;
  $('[data-app]').hidden = false;
  go(location.hash.slice(1) || 'solicitudes');
})();

function go(view, opts = {}) {
  if (!VIEWS[view]) view = 'solicitudes';
  state.view = view;
  history.replaceState(null, '', `#${view}`);
  $$('[data-view]').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
  closeDrawer();
  closeModal();
  return VIEWS[view](opts);
}

/** Herramientas que reciben las secciones que viven en otros módulos. */
const ctx = () => ({ sb, me, staff, main, head, loading, fail, openModal, closeModal, openDrawer, closeDrawer, go, WORLD });

function openDrawer(html, label = 'Detalle') {
  const box = $('[data-drawer-box]');
  box.setAttribute('aria-label', label);
  box.innerHTML = html;
  $$('[data-close-drawer]', box).forEach((b) => b.addEventListener('click', closeDrawer));
  $('[data-drawer]').hidden = false;
  return box;
}

const head = (n, kicker, title, actions = '') => `
  <header class="gx__head">
    <div><p class="mono gx__kicker">${n} · ${kicker}</p><h1 class="gx__title">${title}</h1></div>
    <div class="gx__actions">${actions}</div>
  </header>`;

const loading = () => { main.innerHTML = '<p class="mono gx__empty">Cargando…</p>'; };
const fail = (err) => { main.insertAdjacentHTML('beforeend', `<p class="gx__error">${esc(errorText(err))}</p>`); };

/* ==========================================================================
   01 · Solicitudes
   ========================================================================== */
async function viewLeads() {
  loading();
  const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) { main.innerHTML = ''; fail(error); return; }
  state.leads = data;
  renderLeads();
}

function renderLeads() {
  const q = state.q.toLowerCase();
  const list = state.leads.filter((l) => (!state.world || l.world === state.world)
    && (!q || [l.name, l.email, l.city, l.plan, l.occupation, ...(l.links || [])].join(' ').toLowerCase().includes(q)));
  const cols = STATUS.filter(([k]) => state.showLost || k !== 'perdido');
  const nuevas = state.leads.filter((l) => l.status === 'nueva').length;
  const badge = $('[data-badge-leads]');
  badge.hidden = !nuevas; badge.textContent = nuevas;

  main.innerHTML = head('01', 'Quién pidió un plan', 'Solicitudes', `
    <input class="gx__search" type="search" placeholder="Buscar nombre, ciudad, link…" value="${esc(state.q)}" data-q aria-label="Buscar solicitudes">
    ${[['', 'Todos'], ['marca', 'Marca'], ['produccion', 'Producción'], ['web', 'Web']].map(([k, n]) => `<button class="gx__chip${state.world === k ? ' is-on' : ''}" type="button" data-world="${k}">${n}</button>`).join('')}
    <button class="gx__chip${state.showLost ? ' is-on' : ''}" type="button" data-lost>Perdidas</button>
    <button class="gx__chip" type="button" data-reload title="Actualizar">↻</button>`) + `
    <div class="gx__board" style="--cols:${cols.length}">
      ${cols.map(([k, name, color]) => {
        const items = list.filter((l) => l.status === k);
        return `<section class="gx__col">
          <h2 class="gx__col-h" style="--c:${color}"><span>${name}</span><span>${items.length}</span></h2>
          ${items.map(leadCard).join('') || '<p class="gx__col-empty">—</p>'}
        </section>`;
      }).join('')}
    </div>
    ${state.leads.length ? '' : '<p class="gx__empty">Todavía no llegan solicitudes. Cuando alguien toque "Quiero este plan", aparece aquí.</p>'}`;

  const search = $('[data-q]', main);
  search.addEventListener('input', () => { state.q = search.value; renderLeads(); const s = $('[data-q]', main); s.focus(); s.setSelectionRange(s.value.length, s.value.length); });
  $$('[data-world]', main).forEach((b) => b.addEventListener('click', () => { state.world = b.dataset.world; renderLeads(); }));
  $('[data-lost]', main).addEventListener('click', () => { state.showLost = !state.showLost; renderLeads(); });
  $('[data-reload]', main).addEventListener('click', viewLeads);
  $$('[data-lead-id]', main).forEach((c) => c.addEventListener('click', () => openLead(c.dataset.leadId)));
}

function leadCard(l) {
  const [wn, wc] = WORLD[l.world] || ['—', 'var(--mist)'];
  const owner = staff.find((s) => s.id === l.assigned_to);
  return `<button class="gx__card" type="button" data-lead-id="${l.id}" style="--w:${wc}">
    <span class="gx__card-top"><b>${esc(l.name)}</b><span class="mono">${ago(l.created_at)}</span></span>
    <span class="mono gx__card-plan">${esc(l.plan || wn)}</span>
    <span class="gx__card-meta">📍 ${esc(l.city || '—')} · 🔗 ${(l.links || []).length}</span>
    <span class="gx__card-foot"><span class="mono gx__tag" style="background:${wc}">${wn}</span>${owner ? `<span class="gx__ava gx__ava--sm" style="background:${esc(owner.color)}" title="${esc(owner.full_name)}">${esc(initials(owner.full_name))}</span>` : ''}</span>
  </button>`;
}

function openLead(id) {
  const l = state.leads.find((x) => x.id === id);
  if (!l) return;
  const [wn, wc] = WORLD[l.world] || ['—', 'var(--mist)'];
  const box = $('[data-drawer-box]');
  const wa = waNumber(l.phone);
  box.innerHTML = `
    <div class="gx__drawer-top">
      <span class="mono gx__tag" style="background:${wc}">${wn} · ${ago(l.created_at)}</span>
      <button class="gx__x" type="button" data-close-drawer aria-label="Cerrar">✕</button>
    </div>
    <h2 class="gx__lead-name">${esc(l.name)}</h2>
    <p class="gx__lead-job">${esc(l.occupation || '')}</p>
    <div class="gx__plan"><p class="mono">Plan elegido</p><p class="gx__plan-name">${esc(l.plan || wn)}</p>${l.plan_detail ? `<p class="gx__plan-detail">${esc(l.plan_detail)}</p>` : ''}${l.price_label ? `<p class="mono gx__plan-price">${esc(l.price_label)}</p>` : ''}</div>
    <dl class="gx__dl">
      <div><dt>WhatsApp</dt><dd>${esc(l.phone)}</dd></div>
      <div><dt>Correo</dt><dd><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></dd></div>
      <div><dt>Ubicación</dt><dd>${esc(l.city || '—')}</dd></div>
      <div><dt>Perfiles</dt><dd class="gx__links">${(l.links || []).map((u) => { const s = safeUrl(u); return s ? `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, ''))} ↗</a>` : ''; }).join('') || '—'}</dd></div>
      <div><dt>Quiere</dt><dd>${l.goal ? `“${esc(l.goal)}”` : '—'}</dd></div>
      <div><dt>Contactar</dt><dd>${esc([l.contact_via, l.contact_time].filter(Boolean).join(' · ') || '—')}</dd></div>
    </dl>
    <div class="gx__row2">
      <label class="gx__f"><span>Estado</span><select data-status>${STATUS.map(([k, n]) => `<option value="${k}"${l.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="gx__f"><span>A cargo</span><select data-owner><option value="">Sin asignar</option>${staff.map((s) => `<option value="${s.id}"${l.assigned_to === s.id ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}</select></label>
    </div>
    <label class="gx__f"><span>Notas internas</span><textarea rows="3" data-notes placeholder="Solo las ve el equipo">${esc(l.notes || '')}</textarea></label>
    <p class="mono gx__saved" data-saved aria-live="polite"></p>
    <div class="gx__btns">
      ${wa ? `<a class="gx__btn gx__btn--wa" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${l.name.split(' ')[0]}, te escribimos de RAKÜN por tu solicitud del plan ${l.plan || ''}.`)}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}
      <a class="gx__btn" href="mailto:${esc(l.email)}?subject=${encodeURIComponent('RAKÜN · tu solicitud')}">Correo ↗</a>
      <button class="gx__btn gx__btn--hot" type="button" data-convert>Convertir en cliente →</button>
    </div>
    ${me.role === 'admin' ? '<button class="gx__danger mono" type="button" data-del-lead>Eliminar solicitud</button>' : ''}`;
  $$('[data-close-drawer]', box).forEach((b) => b.addEventListener('click', closeDrawer));

  const saved = $('[data-saved]', box);
  const patch = async (fields, label) => {
    saved.textContent = 'Guardando…';
    const { error } = await sb.from('leads').update(fields).eq('id', l.id);
    if (error) { saved.textContent = errorText(error); return; }
    Object.assign(l, fields);
    saved.textContent = `✓ ${label}`;
    renderLeads();
  };
  $('[data-status]', box).addEventListener('change', (e) => patch({ status: e.target.value }, 'Estado actualizado'));
  $('[data-owner]', box).addEventListener('change', (e) => patch({ assigned_to: e.target.value || null }, 'Responsable actualizado'));
  let t;
  $('[data-notes]', box).addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => patch({ notes: e.target.value }, 'Notas guardadas'), 700); });
  $('[data-convert]', box).addEventListener('click', () => convertLead(l));
  $('[data-del-lead]', box)?.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar la solicitud de ${l.name}? No se puede deshacer.`)) return;
    const { error } = await sb.from('leads').delete().eq('id', l.id);
    if (error) { saved.textContent = errorText(error); return; }
    state.leads = state.leads.filter((x) => x.id !== l.id);
    closeDrawer();
    renderLeads();
  });

  $('[data-drawer]').hidden = false;
  $('.gx__x', box).focus();
}
function closeDrawer() { const d = $('[data-drawer]'); if (d) d.hidden = true; }

async function convertLead(l) {
  const { data: found } = await sb.from('clients').select('*').eq('email', l.email.toLowerCase()).maybeSingle();
  let client = found;
  if (!client) {
    const { data, error } = await sb.from('clients').insert({
      name: l.name, email: l.email.toLowerCase(), phone: l.phone, city: l.city, lead_id: l.id, notes: l.plan ? `Plan: ${l.plan}` : null,
    }).select().single();
    if (error) { $('[data-saved]').textContent = errorText(error); return; }
    client = data;
  }
  await sb.from('leads').update({ status: 'ganado' }).eq('id', l.id);
  closeDrawer();
  await go('clientes');
  openInvite(client);
}

/* ==========================================================================
   02 · Clientes
   ========================================================================== */
async function viewClients() {
  loading();
  const { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false });
  if (error) { main.innerHTML = ''; fail(error); return; }
  state.clients = data;
  main.innerHTML = head('02', 'A quiénes acompañamos', 'Clientes', '<button class="gx__btn gx__btn--dark" type="button" data-new-client>+ Nuevo cliente</button>') + `
    <div class="gx__table">
      <div class="gx__tr gx__tr--h"><span>Cliente</span><span>Contacto</span><span>Ciudad</span><span>Portal</span><span></span></div>
      ${data.map((c) => `
        <div class="gx__tr">
          <span><b>${esc(c.name)}</b>${c.company ? `<br><small>${esc(c.company)}</small>` : ''}</span>
          <span>${esc(c.email)}<br><small>${esc(c.phone || '')}</small></span>
          <span>${esc(c.city || '—')}</span>
          <span><span class="mono gx__tag" style="background:${c.user_id ? '#3C8C6E' : 'var(--mist)'};color:${c.user_id ? '#fff' : 'var(--navy)'}">${c.user_id ? 'Con acceso' : 'Sin acceso'}</span></span>
          <span class="gx__row-actions"><button class="gx__btn" type="button" data-invite="${c.id}">${c.user_id ? 'Nuevo enlace' : 'Crear acceso'}</button>${me.role === 'admin' ? `<button class="gx__mini" type="button" data-del-client="${c.id}" aria-label="Eliminar a ${esc(c.name)}" title="Eliminar cliente">✕</button>` : ''}</span>
        </div>`).join('') || '<p class="gx__empty">Aún no hay clientes. Convierte una solicitud o crea uno nuevo.</p>'}
    </div>`;
  $('[data-new-client]', main).addEventListener('click', newClientForm);
  $$('[data-invite]', main).forEach((b) => b.addEventListener('click', () => openInvite(state.clients.find((c) => c.id === b.dataset.invite))));
  $$('[data-del-client]', main).forEach((b) => b.addEventListener('click', () => deleteClient(state.clients.find((c) => c.id === b.dataset.delClient))));
}

/* ---------- eliminar un cliente: muestra qué se borra y pide escribir su nombre ---------- */
async function deleteClient(c) {
  if (!c) return;
  const count = async (table) => (await sb.from(table).select('id', { count: 'exact', head: true }).eq('client_id', c.id)).count || 0;
  const [projects, posts, docs, shoots, meets] = await Promise.all(['projects', 'posts', 'documents', 'shoots', 'meetings'].map(count));
  openModal(`
    <p class="mono gx__kicker">Eliminar cliente</p>
    <h2 class="gx__modal-title">¿Eliminar a <em>${esc(c.name)}?</em></h2>
    <p class="gx__p">Se borra para siempre, junto con todo lo suyo:</p>
    <ul class="gx__del-list">
      <li><b>${projects}</b> proyectos</li><li><b>${posts}</b> piezas de parrilla</li><li><b>${docs}</b> documentos (y sus archivos)</li>
      <li><b>${shoots}</b> grabaciones</li><li><b>${meets}</b> reuniones</li>
      ${c.user_id ? '<li>Su <b>acceso al portal</b>: ya no podrá iniciar sesión</li>' : ''}
    </ul>
    <p class="gx__p">La solicitud original, si la hay, se conserva en <b>Solicitudes</b>.</p>
    <label class="gx__f"><span>Para confirmar, escribe el nombre: ${esc(c.name)}</span><input data-confirm-name autocomplete="off"></label>
    <p class="mono gx__saved" data-msg aria-live="polite"></p>
    <button class="gx__btn gx__btn--danger" type="button" data-go disabled>Eliminar para siempre</button>`);
  const box = $('[data-modal-box]');
  const input = $('[data-confirm-name]', box);
  const go = $('[data-go]', box);
  input.focus();
  input.addEventListener('input', () => { go.disabled = input.value.trim().toLowerCase() !== c.name.trim().toLowerCase(); });
  go.addEventListener('click', async () => {
    const msg = $('[data-msg]', box);
    go.disabled = true;
    msg.textContent = 'Eliminando…';
    // primero los archivos privados (la base de datos no puede borrarlos sola)
    const { data: files } = await sb.from('documents').select('storage_path').eq('client_id', c.id).not('storage_path', 'is', null);
    const paths = (files || []).map((f) => f.storage_path);
    if (paths.length) await sb.storage.from('documentos').remove(paths);
    const { error } = await sb.rpc('delete_client', { target: c.id });
    if (error) {
      msg.textContent = /delete_client/.test(error.message) ? 'Falta correr supabase/fase5.sql en Supabase.' : errorText(error);
      go.disabled = false;
      return;
    }
    closeModal();
    viewClients();
  });
}

function newClientForm() {
  openModal(`
    <p class="mono gx__kicker">Nuevo cliente</p>
    <h2 class="gx__modal-title">¿A quién <em>sumamos?</em></h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Nombre *</span><input name="name" required maxlength="160"></label>
      <label class="gx__f"><span>Empresa o marca</span><input name="company" maxlength="160"></label>
      <label class="gx__f"><span>Correo * (con este entra al portal)</span><input name="email" type="email" required></label>
      <label class="gx__f"><span>WhatsApp</span><input name="phone" type="tel"></label>
      <label class="gx__f"><span>Ciudad</span><input name="city"></label>
      <p class="mono gx__saved" data-msg></p>
      <button class="gx__btn gx__btn--hot" type="submit">Guardar y crear acceso →</button>
    </form>`);
  const f = $('[data-form]', $('[data-modal-box]'));
  f.elements.name.focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    if (!fd.name.trim() || !f.elements.email.checkValidity() || !fd.email.trim()) { $('[data-msg]', f).textContent = 'Falta el nombre o un correo válido.'; return; }
    const { data, error } = await sb.from('clients').insert({
      name: fd.name.trim(), company: fd.company.trim() || null, email: fd.email.trim().toLowerCase(), phone: fd.phone.trim() || null, city: fd.city.trim() || null,
    }).select().single();
    if (error) { $('[data-msg]', f).textContent = /duplicate|unique/i.test(error.message) ? 'Ya hay un cliente con ese correo.' : errorText(error); return; }
    await viewClients();
    openInvite(data);
  });
}

/* ---------- crear acceso: enlace para copiar o correo de invitación ---------- */
function openInvite(person, role = 'cliente') {
  if (!person) return;
  const isClient = role === 'cliente';
  openModal(`
    <p class="mono gx__kicker">${isClient ? 'Acceso al portal' : 'Acceso al gestor'}</p>
    <h2 class="gx__modal-title">${esc(person.name || person.full_name)}</h2>
    <p class="gx__p">Se crea su cuenta con <b>${esc(person.email)}</b>. Con el enlace crea su propia contraseña y, desde ahí, entra cuando quiera por <b>Iniciar sesión</b>.</p>
    <div class="gx__seg" role="radiogroup" aria-label="Cómo enviar el acceso">
      <label><input type="radio" name="mode" value="link" checked><span><b>Generar enlace</b><small>Lo copias y lo mandas por WhatsApp</small></span></label>
      <label><input type="radio" name="mode" value="email"><span><b>Enviar por correo</b><small>Requiere el correo configurado en Supabase</small></span></label>
    </div>
    <p class="mono gx__saved" data-msg aria-live="polite"></p>
    <button class="gx__btn gx__btn--hot" type="button" data-go>Crear acceso →</button>
    <div class="gx__result" data-result hidden></div>`);
  const box = $('[data-modal-box]');
  $('[data-go]', box).addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const mode = $('input[name="mode"]:checked', box).value;
    const msg = $('[data-msg]', box);
    btn.disabled = true;
    msg.textContent = 'Creando el acceso…';
    const { data, error } = await sb.functions.invoke('invitar', {
      body: { email: person.email, full_name: person.name || person.full_name, role, client_id: isClient ? person.id : null, mode, redirect_to: accountUrl() },
    });
    btn.disabled = false;
    if (error || !data?.ok) {
      let text = data?.error;
      try { text = text || (await error?.context?.json())?.error; } catch { /* sin cuerpo */ }
      msg.textContent = text || errorText(error);
      return;
    }
    msg.textContent = '';
    btn.hidden = true;
    const out = $('[data-result]', box);
    out.hidden = false;
    if (!data.link) {
      out.innerHTML = `<p class="gx__ok">✓ Le enviamos el correo de invitación a ${esc(person.email)}.</p>`;
    } else {
      const first = String(person.name || person.full_name || '').split(' ')[0];
      // el enlace pasa por cuenta.html: así las vistas previas de WhatsApp no gastan el enlace de un solo uso
      const share = `${accountUrl()}?activar=${encodeURIComponent(data.link)}`;
      const text = `Hola ${first}, este es tu acceso al ${isClient ? 'portal de clientes' : 'gestor'} de RAKÜN. Entra aquí para crear tu contraseña: ${share}`;
      const wa = waNumber(person.phone);
      out.innerHTML = `
        <p class="gx__ok">✓ Acceso creado${data.existed ? ' (ya tenía cuenta: este enlace le permite crear una contraseña nueva)' : ''}.</p>
        <p class="mono gx__kicker">Enlace de un solo uso · mándalo pronto, caduca</p>
        <div class="gx__copy"><input readonly value="${esc(share)}" aria-label="Enlace de acceso"><button class="gx__btn" type="button" data-copy>Copiar</button></div>
        <div class="gx__btns">
          ${wa ? `<a class="gx__btn gx__btn--wa" href="https://wa.me/${wa}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Enviar por WhatsApp ↗</a>` : ''}
          <a class="gx__btn" href="mailto:${esc(person.email)}?subject=${encodeURIComponent('Tu acceso a RAKÜN')}&body=${encodeURIComponent(text)}">Enviar por correo ↗</a>
        </div>`;
      $('[data-copy]', out).addEventListener('click', async (ev) => {
        try { await navigator.clipboard.writeText(share); ev.target.textContent = '✓ Copiado'; } catch { $('input', out).select(); }
      });
    }
    if (isClient && state.view === 'clientes') viewClients();
    if (!isClient && state.view === 'equipo') viewTeam();
  });
}

function openModal(html) {
  $('[data-modal-box]').innerHTML = `<button class="gx__x gx__x--abs" type="button" data-close-modal aria-label="Cerrar">✕</button>${html}`;
  $$('[data-close-modal]', $('[data-modal-box]')).forEach((b) => b.addEventListener('click', closeModal));
  $('[data-modal]').hidden = false;
}
function closeModal() { const m = $('[data-modal]'); if (m) m.hidden = true; }

/* ==========================================================================
   07 · Equipo
   ========================================================================== */
async function viewTeam() {
  loading();
  const { data, error } = await sb.from('profiles').select('id, full_name, email, role, area, color').in('role', ['admin', 'equipo']).order('full_name');
  if (error) { main.innerHTML = ''; fail(error); return; }
  staff = data;
  const isAdmin = me.role === 'admin';
  main.innerHTML = head('09', 'Quiénes trabajan aquí', 'Equipo', isAdmin ? '<button class="gx__btn gx__btn--dark" type="button" data-new-staff>+ Invitar al equipo</button>' : '') + `
    <div class="gx__team">
      ${data.map((s) => `
        <div class="gx__person">
          <span class="gx__ava gx__ava--lg" style="background:${esc(s.color)}">${esc(initials(s.full_name || s.email))}</span>
          <div><b>${esc(s.full_name || s.email)}</b><p class="mono">${esc(s.area || ROLE[s.role])}</p><small>${esc(s.email || '')}</small></div>
          ${isAdmin ? `<label class="gx__f gx__f--inline"><span>Área</span><input value="${esc(s.area || '')}" data-area="${s.id}" placeholder="Edición y montaje"></label>` : ''}
        </div>`).join('')}
    </div>`;
  if (!isAdmin) return;
  $('[data-new-staff]', main).addEventListener('click', () => {
    openModal(`
      <p class="mono gx__kicker">Invitar al equipo</p>
      <h2 class="gx__modal-title">Nueva persona <em>en RAKÜN.</em></h2>
      <form class="gx__form" data-form novalidate>
        <label class="gx__f"><span>Nombre *</span><input name="name" required></label>
        <label class="gx__f"><span>Correo *</span><input name="email" type="email" required></label>
        <label class="gx__f"><span>WhatsApp (para mandarle el enlace)</span><input name="phone" type="tel"></label>
        <p class="mono gx__saved" data-msg></p>
        <button class="gx__btn gx__btn--hot" type="submit">Continuar →</button>
      </form>`);
    const f = $('[data-form]', $('[data-modal-box]'));
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(f));
      if (!fd.name.trim() || !fd.email.trim() || !f.elements.email.checkValidity()) { $('[data-msg]', f).textContent = 'Falta el nombre o un correo válido.'; return; }
      openInvite({ name: fd.name.trim(), email: fd.email.trim().toLowerCase(), phone: fd.phone.trim() }, 'equipo');
    });
  });
  $$('[data-area]', main).forEach((input) => input.addEventListener('change', async () => {
    const { error } = await sb.from('profiles').update({ area: input.value.trim() || null }).eq('id', input.dataset.area);
    input.classList.toggle('is-bad', Boolean(error));
  }));
}

/* ==========================================================================
   Secciones del gestor
   ========================================================================== */

const VIEWS = {
  solicitudes: viewLeads,
  clientes: viewClients,
  proyectos: (o) => viewProjects(ctx(), o),
  parrillas: (o) => viewParrilla(ctx(), o),
  grabaciones: () => viewShoots(ctx()),
  reuniones: () => viewMeetings(ctx()),
  documentos: () => viewDocuments(ctx()),
  planes: (o) => viewPlans(ctx(), o),
  equipo: viewTeam,
};
