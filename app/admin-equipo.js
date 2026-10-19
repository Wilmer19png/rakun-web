/* ==========================================================================
   RAKÜN · gestor · 10 Equipo (fase 10)
   · Permisos de cada persona (solo el admin): qué secciones ve y edita y si ve plata
   · Mensajes al equipo: a todos, a una persona o al equipo de un proyecto
   · Pagos y comisiones: lo que se le debe a cada quien (tareas y comisiones)
   ========================================================================== */
import { $, $$, esc, initials, ago } from './util.js';
import { errorText } from './supa.js';
import { SECTIONS, PRESETS, presetOf } from './perms.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const first = (s) => String(s || '').split(' ')[0];
const ava = (p, sm = true) => (p ? `<span class="gx__ava${sm ? ' gx__ava--sm' : ''}" style="background:${esc(p.color || 'var(--mist)')}" title="${esc(p.full_name || p.email)}">${esc(initials(p.full_name || p.email))}</span>` : '');
const missing = (e, fase = 'fase10') => (/perms|team_messages|message_reads|commissions|pay_amount|column|relation/.test(e?.message || '') ? `Falta correr supabase/${fase}.sql en Supabase.` : errorText(e));

/* ==========================================================================
   Permisos (modal desde «Personas y permisos»)
   ========================================================================== */
export function openPerms(ctx, person, onSaved) {
  const { sb, openModal, closeModal } = ctx;
  let perms = person.perms ? { ...person.perms } : null;
  const draw = () => {
    const preset = presetOf(perms);
    const box = $('[data-modal-box]');
    openModal(`
      <p class="mono gx__kicker">Permisos</p>
      <h2 class="gx__modal-title">${esc(person.full_name || person.email)}</h2>
      <label class="gx__f"><span>Rol listo</span><select data-preset>
        ${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}"${preset === k ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}
        ${preset === 'personalizado' ? '<option value="personalizado" selected>Personalizado</option>' : ''}
      </select></label>
      ${perms === null ? '<p class="gx__note">Ve y edita todo (como ahora). Elige un rol o marca abajo para limitarlo.</p>' : ''}
      <div class="pm">
        <div class="pm__row pm__row--h"><span>Sección</span><span>Ver</span><span>Editar</span></div>
        ${SECTIONS.filter(([k]) => k !== 'pendientes').map(([k, n, t]) => {
          const v = perms === null ? 'editar' : perms[k];
          return `<div class="pm__row"><span><i class="mono">${n}</i> ${esc(t)}</span>
            <label><input type="checkbox" data-see="${k}"${v === 'ver' || v === 'editar' ? ' checked' : ''}${perms === null ? ' disabled' : ''}></label>
            <label><input type="checkbox" data-edit="${k}"${v === 'editar' ? ' checked' : ''}${perms === null ? ' disabled' : ''}></label></div>`;
        }).join('')}
        <div class="pm__row pm__row--money"><span><b>Ve plata</b> · precios de cotizaciones, pagos, % y comisiones</span>
          <label><input type="checkbox" data-money${perms === null || perms.dinero === 'ver' ? ' checked' : ''}${perms === null ? ' disabled' : ''}></label><span></span></div>
      </div>
      <p class="mono qx__dim">00 · Mis pendientes siempre se ve: cada quien ve sus entregables y mensajes.</p>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <button class="gx__btn gx__btn--hot" type="button" data-save>Guardar permisos →</button>`);
    const m = box || $('[data-modal-box]');
    $('[data-preset]', m).addEventListener('change', (e) => {
      const p = PRESETS[e.target.value];
      if (p) { perms = p.perms ? { ...p.perms } : null; draw(); }
    });
    $$('[data-see]', m).forEach((c) => c.addEventListener('change', () => {
      const k = c.dataset.see;
      if (c.checked) perms[k] = perms[k] || 'ver'; else delete perms[k];
      draw();
    }));
    $$('[data-edit]', m).forEach((c) => c.addEventListener('change', () => {
      const k = c.dataset.edit;
      if (c.checked) perms[k] = 'editar'; else if (perms[k]) perms[k] = 'ver';
      draw();
    }));
    $('[data-money]', m)?.addEventListener('change', (e) => { if (e.target.checked) perms.dinero = 'ver'; else delete perms.dinero; draw(); });
    $('[data-save]', m).addEventListener('click', async () => {
      const msg = $('[data-msg]', m);
      msg.textContent = 'Guardando…';
      const { error } = await sb.from('profiles').update({ perms }).eq('id', person.id);
      if (error) { msg.textContent = missing(error); return; }
      person.perms = perms;
      closeModal();
      onSaved?.();
    });
  };
  draw();
}

/* ==========================================================================
   Mensajes al equipo
   ========================================================================== */
export async function viewMessages(ctx, box) {
  const { sb, me, staff } = ctx;
  const [{ data: msgs, error }, { data: reads }, { data: projects }] = await Promise.all([
    sb.from('team_messages').select('*, projects(name)').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(80),
    sb.from('message_reads').select('message_id, user_id'),
    sb.from('projects').select('id, name').eq('status', 'activo').order('name'),
  ]);
  if (error) { box.innerHTML = `<p class="gx__error">${esc(missing(error))}</p>`; return; }
  const person = (id) => staff.find((s) => s.id === id);
  const readBy = (id) => (reads || []).filter((r) => r.message_id === id).map((r) => r.user_id);
  const target = (m) => (m.to_kind === 'todos' ? 'para todo el equipo' : m.to_kind === 'persona' ? `para ${esc(first(person(m.to_user)?.full_name) || 'alguien')}` : `equipo de ${esc(m.projects?.name || 'un proyecto')}`);
  box.innerHTML = `
    <div class="ms">
      <div class="ms__list">
        ${(msgs || []).map((m) => {
          const a = person(m.author_id);
          const seen = readBy(m.id);
          const mine = m.author_id === me.id;
          const unread = !mine && !seen.includes(me.id);
          return `<article class="ms__m${m.pinned ? ' is-pin' : ''}${unread ? ' is-new' : ''}">
            <header><span>${ava(a)} <b>${esc(first(a?.full_name) || 'Equipo')}</b> <span class="mono qx__dim">· ${target(m)}${m.pinned ? ' · fijado 📌' : ''}</span></span><span class="mono qx__dim">${ago(m.created_at)}</span></header>
            <p>${esc(m.body).replace(/\n/g, '<br>')}</p>
            <footer>
              ${mine || me.role === 'admin' ? `<span class="mono qx__dim">${m.to_kind === 'persona' ? (seen.length ? '✓ Visto' : '○ Sin ver') : `✓ Visto por ${seen.length}`}</span>` : '<span></span>'}
              <span class="ms__act">
                ${unread ? `<button class="gx__btn" type="button" data-read="${m.id}">Marcar visto</button>` : ''}
                ${mine || me.role === 'admin' ? `<button class="qx__link" type="button" data-pin="${m.id}">${m.pinned ? 'Desfijar' : 'Fijar arriba'}</button> <button class="qx__link" type="button" data-del-msg="${m.id}">Borrar</button>` : ''}
              </span>
            </footer>
          </article>`;
        }).join('') || '<p class="gx__empty">Aún no hay mensajes. Deja el primero.</p>'}
      </div>
      <form class="ms__new" data-msg-form>
        <p class="mono qx__pink">Dejar mensaje</p>
        <label class="gx__f"><span>Para</span><select name="to_kind" data-to>
          <option value="todos">Todo el equipo</option><option value="persona">Una persona</option><option value="proyecto">El equipo de un proyecto</option>
        </select></label>
        <label class="gx__f" data-to-person hidden><span>Persona</span><select name="to_user">${staff.filter((s) => s.id !== me.id).map((s) => `<option value="${s.id}">${esc(s.full_name || s.email)}</option>`).join('')}</select></label>
        <label class="gx__f" data-to-project hidden><span>Proyecto</span><select name="project_id">${(projects || []).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
        <label class="gx__f"><span>Mensaje</span><textarea name="body" rows="5" maxlength="2000" required placeholder="Escribe el mensaje…"></textarea></label>
        <label class="gx__check"><input type="checkbox" name="pinned"><span>Fijar arriba</span></label>
        <p class="mono gx__saved" data-msg aria-live="polite"></p>
        <button class="gx__btn gx__btn--hot" type="submit">Publicar mensaje →</button>
      </form>
    </div>`;
  const f = $('[data-msg-form]', box);
  $('[data-to]', f).addEventListener('change', (e) => {
    $('[data-to-person]', f).hidden = e.target.value !== 'persona';
    $('[data-to-project]', f).hidden = e.target.value !== 'proyecto';
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    if (!fd.body.trim()) return;
    $('[data-msg]', f).textContent = 'Publicando…';
    const { error: err } = await sb.from('team_messages').insert({
      author_id: me.id, to_kind: fd.to_kind, body: fd.body.trim(), pinned: Boolean(fd.pinned),
      to_user: fd.to_kind === 'persona' ? fd.to_user : null, project_id: fd.to_kind === 'proyecto' ? fd.project_id : null,
    });
    if (err) { $('[data-msg]', f).textContent = missing(err); return; }
    viewMessages(ctx, box);
  });
  $$('[data-read]', box).forEach((b) => b.addEventListener('click', async () => {
    await sb.from('message_reads').insert({ message_id: b.dataset.read, user_id: me.id });
    viewMessages(ctx, box);
  }));
  $$('[data-pin]', box).forEach((b) => b.addEventListener('click', async () => {
    const m = msgs.find((x) => x.id === b.dataset.pin);
    await sb.from('team_messages').update({ pinned: !m.pinned }).eq('id', m.id);
    viewMessages(ctx, box);
  }));
  $$('[data-del-msg]', box).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar este mensaje?')) return;
    await sb.from('team_messages').delete().eq('id', b.dataset.delMsg);
    viewMessages(ctx, box);
  }));
}

/** Mensajes sin ver de quien tiene sesión (para el aviso en Mis pendientes y el menú). */
export async function unreadMessages(sb, me) {
  const [{ data: msgs, error }, { data: reads }] = await Promise.all([
    sb.from('team_messages').select('id, author_id, body, to_kind, created_at, pinned').neq('author_id', me.id).order('created_at', { ascending: false }).limit(30),
    sb.from('message_reads').select('message_id').eq('user_id', me.id),
  ]);
  if (error) return [];
  const seen = new Set((reads || []).map((r) => r.message_id));
  return (msgs || []).filter((m) => !seen.has(m.id));
}

/* ==========================================================================
   Pagos y comisiones (admin): lo que se le debe a cada quien
   ========================================================================== */
export async function viewPayouts(ctx, box) {
  const { sb, staff } = ctx;
  const [{ data: tasks, error }, { data: coms, error: e2 }] = await Promise.all([
    sb.from('deliverables').select('id, title, pay_amount, pay_note, paid_at, status, assignee_id, projects(name)').not('pay_amount', 'is', null).is('paid_at', null).order('due_at'),
    sb.from('commissions').select('*, projects(name)').eq('status', 'por_pagar').order('created_at'),
  ]);
  if (error || e2) { box.innerHTML = `<p class="gx__error">${esc(missing(error || e2))}</p>`; return; }
  const people = staff.map((p) => {
    const t = (tasks || []).filter((x) => x.assignee_id === p.id);
    const c = (coms || []).filter((x) => x.manager_id === p.id);
    return { p, t, c, total: t.filter((x) => x.status === 'aprobado').reduce((s, x) => s + Number(x.pay_amount), 0) + c.reduce((s, x) => s + Number(x.amount), 0), pending: t.filter((x) => x.status !== 'aprobado').reduce((s, x) => s + Number(x.pay_amount), 0) };
  }).filter((x) => x.t.length || x.c.length);
  box.innerHTML = `
    <p class="gx__p">Lo que se le debe a cada quien: tareas <b>aprobadas</b> con valor y comisiones causadas. Lo que está en curso aparece aparte (todavía no se debe).</p>
    ${people.map(({ p, t, c, total, pending }) => `
    <section class="po">
      <header class="po__h">${ava(p, false)}<div><b>${esc(p.full_name || p.email)}</b><span class="mono qx__dim">${esc(p.area || '')}</span></div>
        <div class="po__tot"><span class="mono">Por pagar</span><b><span class="cur">$</span>${cop(total).slice(1)}</b>${pending ? `<small class="mono">+ ${cop(pending)} en curso</small>` : ''}</div></header>
      ${t.map((x) => `<div class="po__r"><span>${esc(x.title)} <small class="mono qx__dim">${esc(x.projects?.name || '')}${x.pay_note ? ` · ${esc(x.pay_note)}` : ''}</small></span><span class="mono">${cop(x.pay_amount)}</span>
        ${x.status === 'aprobado' ? `<button class="gx__btn" type="button" data-pay-task="${x.id}">Marcar pagado</button>` : '<span class="mono qx__dim">en curso</span>'}</div>`).join('')}
      ${c.map((x) => `<div class="po__r"><span>Comisión ${x.kind === 'mensual' ? 'mensual' : 'única'} · ${esc(x.concept)} <small class="mono qx__dim">${esc(x.projects?.name || '')}${x.period ? ` · ${new Date(`${x.period}T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}` : ''} · ${x.pct} %</small></span><span class="mono">${cop(x.amount)}</span>
        <button class="gx__btn" type="button" data-pay-com="${x.id}">Marcar pagada</button></div>`).join('')}
    </section>`).join('') || '<p class="gx__empty">No se le debe nada a nadie. 🎉</p>'}
    <p class="mono gx__saved" data-po-msg aria-live="polite"></p>`;
  const today = new Date().toISOString().slice(0, 10);
  $$('[data-pay-task]', box).forEach((b) => b.addEventListener('click', async () => {
    const { error: err } = await sb.from('deliverables').update({ paid_at: today }).eq('id', b.dataset.payTask);
    if (err) $('[data-po-msg]', box).textContent = errorText(err); else viewPayouts(ctx, box);
  }));
  $$('[data-pay-com]', box).forEach((b) => b.addEventListener('click', async () => {
    const { error: err } = await sb.from('commissions').update({ status: 'pagada', paid_at: today }).eq('id', b.dataset.payCom);
    if (err) $('[data-po-msg]', box).textContent = errorText(err); else viewPayouts(ctx, box);
  }));
}
