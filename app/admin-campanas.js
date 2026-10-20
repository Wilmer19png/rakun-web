/* ==========================================================================
   RAKÜN · gestor · 11 Métricas → por campaña (fase 14)
   · Campaña → conjunto de anuncios → anuncio, cada nivel con su semáforo.
   · Cada campaña se despliega en dos pestañas: «Conjuntos y anuncios» y
     «Seguimiento» (tareas, revisiones del día N, reglas como responder cada
     lead en menos de 15 min y configuraciones). Lo asignado a alguien le sale
     en 00 · Mis pendientes.
   · Sirve para RAKÜN (client_id null) y para la cuenta de cada cliente.
   Lienzo: «Gestor · Métricas por campaña con su seguimiento».
   ========================================================================== */
import { $, $$, esc, initials } from './util.js';
import { errorText } from './supa.js';
import { METRICS, compute, cell, info } from './metas.js';

const DAY = 86400000;
const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const num = (n) => Number(n || 0).toLocaleString('es-CO');
const SUMS = ['visitors', 'leads', 'won', 'sold', 'impressions', 'reach', 'clicks', 'link_clicks', 'video_3s', 'thruplay', 'meta_leads', 'messages'];
const isId = (v) => /^\d{10,}$/.test(v || '');
// los leads que llegaron antes de la fase 12 traen el nombre codificado (RAK%C3%9CN+%7C…)
const plain = (v) => { let t = String(v ?? ''); try { if (/%[0-9a-f]{2}|\+/i.test(t)) t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch { /* igual */ } return t.trim(); };
const NONE = '__sin__';
const KIND = { tarea: ['Tarea', 'task'], revision: ['Revisión', 'rev'], regla: ['Regla', 'rule'], config: ['Configuración', 'set'] };
const WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const first = (s) => String(s || '').split(' ')[0];
const ui = { open: new Set(), tab: {}, sets: new Set(), done: new Set(), seeded: new Set() };

/* ---------- agrupar ---------- */
function sumInto(t, a) {
  SUMS.forEach((f) => { t[f] = (Number(t[f]) || 0) + (Number(a[f]) || 0); });
  if (a.spend != null) t.spend = (Number(t.spend) || 0) + Number(a.spend);
  return t;
}
export function groupCampaigns(ads) {
  const map = new Map();
  for (const a of ads) {
    const name = a.campaign && !isId(a.campaign) ? a.campaign : NONE;
    if (!map.has(name)) map.set(name, { name, ads: [], sets: new Map(), t: { spend: null }, first: null, last: null });
    const c = map.get(name);
    c.ads.push(a);
    sumInto(c.t, a);
    if (a.first_day && (!c.first || a.first_day < c.first)) c.first = a.first_day;
    if (a.last_day && (!c.last || a.last_day > c.last)) c.last = a.last_day;
    const sname = a.adset || 'Sin conjunto (solo visitas)';
    if (!c.sets.has(sname)) c.sets.set(sname, { name: sname, ads: [], t: { spend: null } });
    c.sets.get(sname).ads.push(a);
    sumInto(c.sets.get(sname).t, a);
  }
  return [...map.values()].sort((x, y) => (x.name === NONE) - (y.name === NONE) || (Number(y.t.spend) || 0) - (Number(x.t.spend) || 0) || y.t.leads - x.t.leads);
}

/* ---------- fechas ---------- */
const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayOf = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null);
export function campDay(c) { const f = dayOf(c.first); return f ? Math.max(0, Math.round((startOfDay() - f) / DAY)) : null; }
export function campState(c) {
  if (!c.last) return ['Sin gasto', 'var(--mist)'];
  const idle = Math.round((startOfDay() - dayOf(c.last)) / DAY);
  return idle <= 2 ? ['Activa', '#3FCB86'] : ['Sin gasto reciente', 'var(--mist)'];
}
// la fecha en que vence una tarea: la suya, o el día N contado desde que arrancó la campaña
export function dueOf(f, start) {
  if (f.due_at) return new Date(f.due_at);
  if (f.camp_day != null && start) { const d = dayOf(start); d.setDate(d.getDate() + f.camp_day); d.setHours(18, 0, 0, 0); return d; }
  return null;
}
export function dueLabel(due, done) {
  if (done) return ['Hecha', new Date(done).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }), ''];
  if (!due) return ['Sin fecha', 'cuando se pueda', ''];
  const ms = due - Date.now();
  const time = due.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  const date = due.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  const days = Math.round((startOfDay(due) - startOfDay()) / DAY);
  if (ms < 0) return [days === 0 ? 'Venció hoy' : days === -1 ? 'Atrasada' : `Atrasada ${-days} d`, `${date} · ${time}`, 'late'];
  if (days === 0) return [ms < 3600000 ? `Quedan ${Math.max(1, Math.round(ms / 60000))} min` : `Quedan ${Math.round(ms / 3600000)} h`, `hoy · ${time}`, 'today'];
  if (days === 1) return ['Mañana', date, ''];
  return [`En ${days} días`, date, ''];
}
const bucketOf = (f, due) => (f.done_at ? 'hechas' : f.kind === 'regla' ? 'siempre' : !due ? 'sinfecha' : due < new Date(startOfDay().getTime() + DAY) ? 'hoy' : 'proximas');

/* ---------- la regla de responder los leads ---------- */
const inHours = (rule, d = new Date()) => {
  const r = { from: 8, to: 19, days: [1, 2, 3, 4, 5, 6], ...(rule || {}) };
  return r.days.includes(d.getDay()) && d.getHours() >= r.from && d.getHours() < r.to;
};
export function ruleStatus(f, leads) {
  const r = { sla: 15, from: 8, to: 19, days: [1, 2, 3, 4, 5, 6], ...(f.rule || {}) };
  const waiting = (leads || []).filter((l) => l.status === 'nueva' && (!f.campaign || plain(l.utm_campaign) === f.campaign)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const hours = `${r.days.map((d) => WEEK[d]).join(' ')} · ${r.from}:00–${r.to}:00`;
  if (!waiting.length) return { n: 0, text: `Nadie esperando · horario ${hours}`, due: ['Al día', 'sin leads esperando', ''] };
  const old = waiting[0];
  const mins = Math.max(0, Math.round((Date.now() - new Date(old.created_at)) / 60000));
  const left = r.sla - mins;
  const open = inHours(r);
  return {
    n: waiting.length,
    text: `${waiting.length} ${waiting.length === 1 ? 'lead esperando' : 'leads esperando'} · el más viejo: ${old.name}${old.utm_content ? ` (${plain(old.utm_content)})` : ''}, hace ${mins < 120 ? `${mins} min` : `${Math.round(mins / 60)} h`}${open ? '' : ' · fuera de horario'}`,
    due: left >= 0 ? [`${left} min`, 'para responder', 'today'] : [`Pasado ${-left < 120 ? `${-left} min` : `${Math.round(-left / 60)} h`}`, `límite: ${r.sla} min`, 'late'],
  };
}

/* ---------- cargar el seguimiento ---------- */
export async function loadFollowups(sb, clientId = null) {
  let q = sb.from('followups').select('*').order('created_at');
  q = clientId ? q.eq('client_id', clientId) : q.is('client_id', null);
  const { data, error } = await q;
  return { list: data || [], missing: Boolean(error) };
}
export const pendingCount = (list) => list.filter((f) => !f.done_at && f.kind !== 'regla').length;

/* ---------- HTML ---------- */
const H = (label, k) => `<span>${label}${k ? info(k) : ''}</span>`;
const cols = (t, x) => `
  <span class="mono">${t.spend != null ? cop(t.spend) : '—'}</span>
  <span class="mono">${cell('cpm', x.cpm)}</span>
  <span class="mono">${cell('hook', x.hook)}</span>
  <span class="mono">${cell('ctr', x.ctr)}</span>
  <span class="mono">${num(t.leads)}<small>${t.visitors ? `${cell('conv', x.conv)} de ${num(t.visitors)}` : 'sin visitas'}</small></span>
  <span class="mono">${cell('cpl', x.cpl)}</span>
  <span class="mono">${cell('freq', x.freq)}</span>
  <span class="mono cp__sold">${t.won ? `${num(t.won)}<small>${cop(t.sold)}</small>` : '0'}</span>`;

/* ---------- el orden: activas y recientes primero, o el que elija cada quien ---------- */
const SORTS = [['recientes', 'Activas y recientes'], ['gasto', 'Más gasto'], ['formularios', 'Más formularios'], ['nombre', 'A–Z']];
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`rakun:cp:${k}`)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`rakun:cp:${k}`, JSON.stringify(v)); } catch { /* sin almacenamiento: solo por esta visita */ } },
};
const pinsOf = (scope) => store.get(`pins:${scope}`, []);
function sortCampaigns(groups, scope) {
  const by = store.get('sort', 'recientes');
  const pins = pinsOf(scope);
  const active = (c) => (campState(c)[0] === 'Activa' ? 1 : 0);
  const cmp = {
    recientes: (a, b) => active(b) - active(a) || String(b.last || '').localeCompare(String(a.last || '')) || String(b.first || '').localeCompare(String(a.first || '')),
    gasto: (a, b) => (Number(b.t.spend) || 0) - (Number(a.t.spend) || 0),
    formularios: (a, b) => (b.t.leads || 0) - (a.t.leads || 0) || (Number(b.t.spend) || 0) - (Number(a.t.spend) || 0),
    nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
  }[by] || (() => 0);
  return [...groups].sort((a, b) => {
    if ((a.name === NONE) !== (b.name === NONE)) return a.name === NONE ? 1 : -1;   // «sin campaña» siempre al final
    const pa = pins.indexOf(a.name); const pb = pins.indexOf(b.name);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? Infinity : pa) - (pb === -1 ? Infinity : pb);   // las fijadas, en su orden
    return cmp(a, b);
  });
}

export function campaignsHTML(groups, ctx, o) {
  const scope = o.scope;
  groups = sortCampaigns(groups, scope);
  // de entrada, la primera campaña abierta
  if (!ui.seeded.has(scope) && groups[0]) { ui.open.add(`${scope}|${groups[0].name}`); ui.seeded.add(scope); }
  const by = store.get('sort', 'recientes');
  return `
    <div class="cp__sort" role="group" aria-label="Ordenar campañas">
      <span class="mono">Ordenar</span>
      ${SORTS.map(([k, n]) => `<button type="button" class="gx__chip gx__chip--sm${by === k ? ' is-on' : ''}" aria-pressed="${by === k}" data-cp-sort="${k}">${n}</button>`).join('')}
      ${pinsOf(scope).length ? '<span class="mono qx__dim">· las fijadas ★ van primero</span>' : ''}
    </div>
    <div class="cp__scroll">
      <div class="cp__row cp__row--h mono">${H('Campaña · conjunto · anuncio')}${H('Gasto')}${H('CPM', 'cpm')}${H('Gancho', 'hook')}${H('CTR', 'ctr')}${H('Formularios', 'conv')}${H('Costo / lead', 'cpl')}${H('Frec.', 'freq')}${H('Ventas')}</div>
      ${groups.map((c) => campHTML(c, ctx, o)).join('')}
    </div>`;
}

function campHTML(c, ctx, o) {
  const key = `${o.scope}|${c.name}`;
  const open = ui.open.has(key);
  const tab = ui.tab[key] || 'ads';
  const none = c.name === NONE;
  const fu = o.followups.filter((f) => (f.campaign || '') === (none ? '' : c.name));
  const pend = pendingCount(fu);
  const late = fu.filter((f) => !f.done_at && f.kind !== 'regla' && (dueOf(f, c.first) || Infinity) < Date.now()).length;
  const day = campDay(c);
  const [stName, stColor] = campState(c);
  const x = compute(c.t);
  return `
    <section class="cp${open ? ' is-open' : ''}">
      <button type="button" class="cp__row cp__row--c" data-cp="${esc(key)}" aria-expanded="${open}">
        <span class="cp__name"><i class="cp__tog" aria-hidden="true">${open ? '−' : '+'}</i><span>
          <b>${none ? 'Sin campaña identificada' : esc(c.name)}</b>
          <small>${none ? 'Visitas con el ID de Meta o sin parámetros de URL' : `<span class="cp__st" style="background:${stColor}">${stName}</span>${day != null ? `Día ${day} · arrancó el ${dayOf(c.first).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : 'aún sin gasto en Meta'}`}${pend ? ` · <span class="cp__pend${late ? ' is-late' : ''}">${pend} ${pend === 1 ? 'pendiente' : 'pendientes'}${late ? ` · ${late} ${late === 1 ? 'atrasada' : 'atrasadas'}` : ''}</span>` : ''}</small>
        </span></span>
        ${cols(c.t, x)}
      </button>
      ${open ? `
      <div class="cp__tabs" role="tablist">
        <button type="button" role="tab" class="gx__chip${tab === 'ads' ? ' is-on' : ''}" aria-selected="${tab === 'ads'}" data-cp-tab="${esc(key)}" data-t="ads">Conjuntos y anuncios · ${c.sets.size} · ${c.ads.length}</button>
        ${none ? '' : `<button type="button" role="tab" class="gx__chip${tab === 'seg' ? ' is-on' : ''}" aria-selected="${tab === 'seg'}" data-cp-tab="${esc(key)}" data-t="seg">Seguimiento${pend ? ` <span class="cp__cnt">${pend}</span>` : ''}</button>`}
        ${none ? '' : (() => { const pins = pinsOf(o.scope); const at = pins.indexOf(c.name); return `<span class="cp__pin">
          <button type="button" class="gx__btn gx__btn--sm" data-cp-pin="${esc(c.name)}" aria-pressed="${at !== -1}">${at !== -1 ? '★ Fijada arriba' : '☆ Fijar arriba'}</button>
          ${at !== -1 ? `<button type="button" class="gx__btn gx__btn--sm" data-cp-move="${esc(c.name)}" data-d="-1" aria-label="Subir"${at === 0 ? ' disabled' : ''}>↑</button><button type="button" class="gx__btn gx__btn--sm" data-cp-move="${esc(c.name)}" data-d="1" aria-label="Bajar"${at === pins.length - 1 ? ' disabled' : ''}>↓</button>` : ''}
        </span>`; })()}
      </div>
      ${tab === 'seg' && !none ? segHTML(c, fu, ctx, o) : setsHTML(c, o)}` : ''}
    </section>`;
}

function setsHTML(c, o) {
  return [...c.sets.values()].map((s) => {
    const key = `${o.scope}|${c.name}|${s.name}`;
    const closed = ui.sets.has(key);
    const x = compute(s.t);
    return `
      <button type="button" class="cp__row cp__row--s" data-cs="${esc(key)}" aria-expanded="${!closed}">
        <span class="cp__name"><i class="cp__tog cp__tog--sm" aria-hidden="true">${closed ? '+' : '−'}</i><b>${esc(s.name)}</b></span>
        ${cols(s.t, x)}
      </button>
      ${closed ? '' : s.ads.map((a) => o.adRow(a)).join('')}`;
  }).join('');
}

function segHTML(c, fu, ctx, o) {
  const day = campDay(c);
  const days = fu.filter((f) => f.camp_day != null).map((f) => f.camp_day);
  const span = Math.max(14, day != null ? day + 1 : 0, ...days);
  const marks = [...new Set([0, ...days])].sort((a, b) => a - b).map((d) => {
    const ofDay = fu.filter((f) => f.camp_day === d && f.kind !== 'regla');
    const ok = ofDay.length && ofDay.every((f) => f.done_at);
    const next = !ok && day != null && d > day && d === Math.min(...days.filter((x) => x > day));
    const date = c.first ? (() => { const t = dayOf(c.first); t.setDate(t.getDate() + d); return t.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); })() : '';
    return `<span class="cp__ms${ok ? ' is-ok' : next ? ' is-next' : ''}${d === 0 ? ' is-first' : d === span ? ' is-last' : ''}" style="left:${d / span * 100}%"><i></i>Día ${d}${ok ? ' ✓' : ''}${date ? ` · ${date}` : ''}</span>`;
  }).join('');
  const now = day != null ? `<span class="cp__ms cp__ms--now" style="left:${Math.min(100, day / span * 100)}%"><i></i>Hoy · día ${day}</span>` : '';
  const rows = fu.map((f) => ({ f, due: dueOf(f, c.first) }));
  const B = (k) => rows.filter((r) => bucketOf(r.f, r.due) === k).sort((a, b) => (a.due || Infinity) - (b.due || Infinity));
  const doneKey = `${o.scope}|${c.name}`;
  const hechas = B('hechas');
  const group = (k, title, cls = '') => { const g = B(k); return g.length ? `<h3 class="cp__grp ${cls}">${title} <span class="mono">${g.length}</span></h3>${g.map((r) => taskHTML(r.f, r.due, c, ctx, o)).join('')}` : ''; };
  return `
    <div class="cp__seg">
      <div class="cp__seg-h">
        <p class="mono">Línea de tiempo de la campaña${c.first ? '' : ' · arranca el primer día con gasto en Meta'}</p>
        <span class="gx__btns"><button class="gx__btn" type="button" data-fu-tpl="${esc(c.name)}">Usar plantilla de lanzamiento</button><button class="gx__btn gx__btn--hot" type="button" data-fu-new="${esc(c.name)}">+ Tarea</button></span>
      </div>
      <div class="cp__tl" aria-hidden="true"><span class="cp__tl-done" style="width:${day != null ? Math.min(100, day / span * 100) : 0}%"></span>${marks}${now}</div>
      ${o.missing ? '<p class="gx__error">Falta correr supabase/fase14.sql en Supabase para guardar el seguimiento.</p>' : ''}
      ${fu.length ? '' : '<p class="gx__empty">Aún no hay tareas. Usa la plantilla de lanzamiento para crear las revisiones del día 3, 7 y 14 de una vez.</p>'}
      ${group('hoy', 'Atrasadas y para hoy', 'is-late')}
      ${group('siempre', 'Siempre <small>reglas que no se acaban</small>')}
      ${group('proximas', 'Próximas')}
      ${group('sinfecha', 'Sin fecha')}
      ${hechas.length ? `<button type="button" class="cp__done-btn mono" data-fu-done="${esc(doneKey)}" aria-expanded="${ui.done.has(doneKey)}">✓ ${hechas.length} ${hechas.length === 1 ? 'hecha' : 'hechas'} · ${ui.done.has(doneKey) ? 'ocultar' : 'ver'}</button>${ui.done.has(doneKey) ? hechas.map((r) => taskHTML(r.f, r.due, c, ctx, o)).join('') : ''}` : ''}
    </div>`;
}

// una pista en vivo según los datos de la campaña
function hintOf(f, c, o) {
  if (f.kind === 'regla') return '';
  if (f.kind !== 'revision' || f.done_at) return '';
  const due = dueOf(f, c.first);
  if (due && due - Date.now() > 1.5 * DAY) return '';                // se muestra desde el día anterior
  const idle = c.ads.filter((a) => Number(a.spend) > 0 && !Number(a.leads)).sort((a, b) => b.spend - a.spend);
  const alerts = c.ads.filter((a) => { const x = compute(a); return ['cpm', 'hook', 'ctr', 'freq'].some((k) => { const m = METRICS[k]; const v = x[k]; return v != null && (m.dir === 'high' ? v < m.bad : v > m.bad); }); });
  const bits = [];
  if (idle.length) bits.push(`Sin formularios: ${idle.slice(0, 3).map((a) => `<b>${esc(a.ad || '—')}</b> (${cop(a.spend)})`).join(', ')}`);
  if (alerts.length) bits.push(`En alerta: ${alerts.slice(0, 3).map((a) => `<b>${esc(a.ad || '—')}</b>`).join(', ')}`);
  return bits.length ? `<span class="cp__hint">Hoy · ${bits.join(' · ')}</span>` : '';
}

function taskHTML(f, due, c, ctx, o) {
  const who = ctx.staff.find((s) => s.id === f.assignee_id);
  const [kName, kCls] = KIND[f.kind] || KIND.tarea;
  const rule = f.kind === 'regla' ? ruleStatus(f, o.leads) : null;
  const [dBig, dSmall, dCls] = rule ? rule.due : dueLabel(due, f.done_at);
  const late = !f.done_at && !rule && dCls === 'late';
  const steps = Array.isArray(f.steps) ? f.steps : [];
  return `
    <div class="cp__tk${late ? ' is-late' : !f.done_at && dCls === 'today' ? ' is-today' : ''}${rule ? ' is-rule' : ''}${f.done_at ? ' is-done' : ''}" data-fu="${f.id}">
      ${rule ? '<span class="cp__tk-ic" aria-hidden="true">↻</span>' : `<button type="button" class="cp__ck${f.done_at ? ' is-on' : ''}" role="checkbox" aria-checked="${Boolean(f.done_at)}" aria-label="Marcar «${esc(f.title)}» como ${f.done_at ? 'pendiente' : 'hecha'}" data-fu-check></button>`}
      <div class="cp__tk-b">
        <b><span class="cp__ty cp__ty--${kCls}">${f.kind === 'revision' && f.camp_day != null ? `Revisión día ${f.camp_day}` : kName}</span>${esc(f.title)}</b>
        ${f.note ? `<small>${esc(f.note)}</small>` : ''}
        ${f.done_at ? `<small>Hecha${f.done_by ? ` por ${esc(first(ctx.staff.find((s) => s.id === f.done_by)?.full_name) || '')}` : ''}${f.done_note ? ` · «${esc(f.done_note)}»` : ''}</small>` : ''}
        ${rule ? `<span class="cp__live${rule.n ? '' : ' is-calm'}">${esc(rule.text)}</span>` : hintOf(f, c, o)}
        ${steps.length ? `<div class="cp__steps">${steps.map((s, i) => `<label><input type="checkbox" data-fu-step="${i}"${s.done ? ' checked' : ''}> <span>${esc(s.t)}</span></label>`).join('')}</div>` : ''}
      </div>
      <span class="cp__who">${who ? `<span class="gx__ava gx__ava--sm" style="background:${esc(who.color || 'var(--mist)')}">${esc(initials(who.full_name || who.email))}</span>${esc(first(who.full_name))}` : '<span class="qx__dim">Sin asignar</span>'}</span>
      <span class="cp__due${dCls ? ` is-${dCls}` : ''}"><b>${esc(dBig)}</b>${esc(dSmall)}</span>
      <button type="button" class="cp__more" data-fu-edit aria-label="Editar «${esc(f.title)}»">⋯</button>
    </div>`;
}

/* ---------- eventos ---------- */
export function wireCampaigns(root, ctx, o, rerender) {
  const { sb, me } = ctx;
  $$('[data-cp]', root).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.cp; ui.open.has(k) ? ui.open.delete(k) : ui.open.add(k); rerender(); }));
  $$('[data-cp-tab]', root).forEach((b) => b.addEventListener('click', () => { ui.tab[b.dataset.cpTab] = b.dataset.t; rerender(); }));
  $$('[data-cs]', root).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.cs; ui.sets.has(k) ? ui.sets.delete(k) : ui.sets.add(k); rerender(); }));
  $$('[data-cp-sort]', root).forEach((b) => b.addEventListener('click', () => { store.set('sort', b.dataset.cpSort); rerender(); }));
  $$('[data-cp-pin]', root).forEach((b) => b.addEventListener('click', () => {
    const pins = pinsOf(o.scope).filter((n) => n !== b.dataset.cpPin);
    if (b.getAttribute('aria-pressed') !== 'true') pins.push(b.dataset.cpPin);
    store.set(`pins:${o.scope}`, pins);
    rerender();
  }));
  $$('[data-cp-move]', root).forEach((b) => b.addEventListener('click', () => {
    const pins = pinsOf(o.scope);
    const i = pins.indexOf(b.dataset.cpMove); const j = i + Number(b.dataset.d);
    if (i < 0 || j < 0 || j >= pins.length) return;
    [pins[i], pins[j]] = [pins[j], pins[i]];
    store.set(`pins:${o.scope}`, pins);
    rerender();
  }));
  $$('[data-fu-done]', root).forEach((b) => b.addEventListener('click', () => { const k = b.dataset.fuDone; ui.done.has(k) ? ui.done.delete(k) : ui.done.add(k); rerender(); }));
  const byId = (el) => o.followups.find((f) => f.id === el.closest('[data-fu]').dataset.fu);
  const save = async (f, fields) => {
    const { error } = await sb.from('followups').update(fields).eq('id', f.id);
    if (error) { alert(errorText(error)); return; }
    Object.assign(f, fields);
    rerender();
  };
  $$('[data-fu-check]', root).forEach((b) => b.addEventListener('click', () => {
    const f = byId(b);
    if (f.done_at) { save(f, { done_at: null, done_by: null, done_note: null }); return; }
    const note = f.kind === 'revision' ? prompt('¿Qué decidiste? (opcional, queda en la tarea)', '') : '';
    if (note === null) return;
    save(f, { done_at: new Date().toISOString(), done_by: me.id, done_note: note?.trim() || null });
  }));
  $$('[data-fu-step]', root).forEach((i) => i.addEventListener('change', () => {
    const f = byId(i);
    const steps = (f.steps || []).map((s, n) => (n === Number(i.dataset.fuStep) ? { ...s, done: i.checked } : s));
    save(f, { steps });
  }));
  $$('[data-fu-edit]', root).forEach((b) => b.addEventListener('click', () => taskForm(ctx, o, { f: byId(b) }, rerender)));
  $$('[data-fu-new]', root).forEach((b) => b.addEventListener('click', () => taskForm(ctx, o, { campaign: b.dataset.fuNew }, rerender)));
  $$('[data-fu-tpl]', root).forEach((b) => b.addEventListener('click', () => templateForm(ctx, o, b.dataset.fuTpl, rerender)));
}

const staffOptions = (ctx, sel) => `<option value="">Sin asignar</option>${ctx.staff.map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.full_name || s.email)}</option>`).join('')}`;
const localInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

function taskForm(ctx, o, { f = null, campaign = '' }, rerender) {
  const { sb, openModal, closeModal } = ctx;
  const t = f || { kind: 'tarea', campaign, steps: [], rule: null };
  const when = t.due_at ? 'fecha' : t.camp_day != null ? 'dia' : 'sin';
  const r = { sla: 15, from: 8, to: 19, days: [1, 2, 3, 4, 5, 6], ...(t.rule || {}) };
  openModal(`
    <p class="mono gx__kicker">Seguimiento · ${esc(t.campaign || campaign || 'RAKÜN')}</p>
    <h2 class="gx__modal-title">${f ? 'Editar tarea' : 'Nueva <em>tarea.</em>'}</h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Qué hay que hacer *</span><input name="title" required maxlength="300" value="${esc(t.title || '')}"></label>
      <fieldset class="gx__f cp__seg-f"><legend>Tipo</legend>
        ${Object.entries(KIND).map(([k, [n]]) => `<label><input type="radio" name="kind" value="${k}"${t.kind === k ? ' checked' : ''}> ${n}</label>`).join('')}
      </fieldset>
      <label class="gx__f"><span>Para quién</span><select name="assignee_id">${staffOptions(ctx, t.assignee_id)}</select></label>
      <div data-when-box>
        <fieldset class="gx__f cp__seg-f"><legend>Cuándo</legend>
          <label><input type="radio" name="when" value="fecha"${when === 'fecha' ? ' checked' : ''}> Fecha y hora</label>
          <label><input type="radio" name="when" value="dia"${when === 'dia' ? ' checked' : ''}> Día de la campaña</label>
          <label><input type="radio" name="when" value="sin"${when === 'sin' ? ' checked' : ''}> Sin fecha</label>
        </fieldset>
        <label class="gx__f" data-w="fecha"><span>Fecha y hora</span><input type="datetime-local" name="due_at" value="${localInput(t.due_at)}"></label>
        <label class="gx__f" data-w="dia"><span>Día de la campaña (0 = el primer día con gasto)</span><input type="number" min="0" max="365" name="camp_day" value="${t.camp_day ?? 7}"></label>
      </div>
      <div class="gx__row2" data-rule-box>
        <label class="gx__f"><span>Responder en menos de (min)</span><input type="number" min="1" max="1440" name="sla" value="${r.sla}"></label>
        <label class="gx__f"><span>Horario</span><span class="cp__hrs"><input type="number" min="0" max="23" name="from" value="${r.from}" aria-label="Desde (hora)"> a <input type="number" min="1" max="24" name="to" value="${r.to}" aria-label="Hasta (hora)"></span></label>
        <fieldset class="gx__f cp__seg-f cp__days"><legend>Días</legend>${WEEK.map((d, i) => `<label><input type="checkbox" name="day" value="${i}"${r.days.includes(i) ? ' checked' : ''}> ${d}</label>`).join('')}</fieldset>
      </div>
      <label class="gx__f"><span>Pasos (uno por línea, opcional)</span><textarea name="steps" rows="3">${esc((t.steps || []).map((s) => s.t).join('\n'))}</textarea></label>
      <label class="gx__f"><span>Nota</span><textarea name="note" rows="2" maxlength="2000">${esc(t.note || '')}</textarea></label>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="gx__btns">
        <button class="gx__btn gx__btn--hot" type="submit">${f ? 'Guardar' : 'Crear tarea →'}</button>
        ${f ? '<button class="gx__danger mono" type="button" data-del>Borrar tarea</button>' : ''}
      </div>
    </form>`);
  const form = $('[data-modal-box] [data-form]');
  const sync = () => {
    const kind = form.elements.kind.value;
    const w = form.elements.when.value;
    $('[data-rule-box]', form).hidden = kind !== 'regla';
    $('[data-when-box]', form).hidden = kind === 'regla';
    $$('[data-w]', form).forEach((el) => { el.hidden = el.dataset.w !== w; });
  };
  form.addEventListener('change', sync);
  sync();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const msg = $('[data-msg]', form);
    const title = String(fd.get('title') || '').trim();
    if (title.length < 2) { msg.textContent = 'Escribe qué hay que hacer.'; return; }
    const kind = fd.get('kind');
    const w = fd.get('when');
    const prev = new Map((t.steps || []).map((s) => [s.t, s.done]));
    const row = {
      title, kind, note: String(fd.get('note') || '').trim() || null,
      assignee_id: fd.get('assignee_id') || null,
      campaign: t.campaign || campaign || null, client_id: o.clientId || null,
      steps: String(fd.get('steps') || '').split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ t: s, done: Boolean(prev.get(s)) })),
      due_at: kind !== 'regla' && w === 'fecha' && fd.get('due_at') ? new Date(fd.get('due_at')).toISOString() : null,
      camp_day: kind !== 'regla' && w === 'dia' ? Number(fd.get('camp_day')) || 0 : null,
      rule: kind === 'regla' ? { sla: Number(fd.get('sla')) || 15, from: Number(fd.get('from')) || 0, to: Number(fd.get('to')) || 24, days: fd.getAll('day').map(Number) } : null,
    };
    msg.textContent = 'Guardando…';
    const res = f ? await sb.from('followups').update(row).eq('id', f.id).select().single() : await sb.from('followups').insert(row).select().single();
    if (res.error) { msg.textContent = /followups/.test(res.error.message || '') ? 'Falta correr supabase/fase14.sql en Supabase.' : errorText(res.error); return; }
    if (f) Object.assign(f, res.data); else o.followups.push(res.data);
    closeModal();
    rerender();
  });
  $('[data-del]', form)?.addEventListener('click', async () => {
    if (!confirm('¿Borrar esta tarea?')) return;
    const { error } = await sb.from('followups').delete().eq('id', f.id);
    if (error) { $('[data-msg]', form).textContent = errorText(error); return; }
    o.followups.splice(o.followups.indexOf(f), 1);
    closeModal();
    rerender();
  });
}

/* ---------- plantilla: lanzamiento de campaña ---------- */
const TEMPLATE = [
  { kind: 'config', camp_day: 0, title: 'Llenar el formulario de /marca y confirmar que llega el evento Lead al píxel en el Administrador de eventos', note: 'Administrador de eventos → Probar eventos' },
  { kind: 'revision', camp_day: 3, title: 'CPM, CTR del enlace y gancho (3 s ÷ impresiones) por anuncio' },
  { kind: 'revision', camp_day: 7, title: 'Leads por anuncio · apagar los que gastaron más de $19.000 sin lead' },
  { kind: 'revision', camp_day: 14, title: 'Calificados, agendados y cierres', steps: ['Contar calificados, agendados y cierres en 01 Solicitudes', 'Crear conjunto de remarketing ($3.000–$5.000/día) en pausa'] },
  { kind: 'regla', title: 'Responder cada lead en menos de 15 min dentro de tu horario', rule: { sla: 15, from: 8, to: 19, days: [1, 2, 3, 4, 5, 6] } },
];
function templateForm(ctx, o, campaign, rerender) {
  const { sb, openModal, closeModal } = ctx;
  openModal(`
    <p class="mono gx__kicker">Usar plantilla · ${esc(campaign)}</p>
    <h2 class="gx__modal-title">Lanzamiento <em>de campaña.</em></h2>
    <p class="gx__p">Las revisiones se cuentan desde el primer día con gasto en Meta. Quita las que no quieras y elige a quién va cada una.</p>
    <form class="gx__form" data-form novalidate>
      ${TEMPLATE.map((x, i) => `
        <div class="cp__tpl">
          <label class="cp__tpl-ck"><input type="checkbox" name="use" value="${i}" checked> <span class="cp__tpl-d">${x.kind === 'regla' ? 'Siempre' : `Día ${x.camp_day}`}</span> <span>${esc(x.title)}</span></label>
          <select name="who-${i}" aria-label="Para quién">${staffOptions(ctx, ctx.me.id)}</select>
        </div>`).join('')}
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <button class="gx__btn gx__btn--hot" type="submit">Crear tareas →</button>
    </form>`);
  const form = $('[data-modal-box] [data-form]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const rows = fd.getAll('use').map(Number).map((i) => ({
      ...TEMPLATE[i], steps: (TEMPLATE[i].steps || []).map((t) => ({ t, done: false })),
      assignee_id: fd.get(`who-${i}`) || null, campaign, client_id: o.clientId || null,
    }));
    if (!rows.length) { $('[data-msg]', form).textContent = 'Elige al menos una.'; return; }
    $('[data-msg]', form).textContent = 'Creando…';
    const { data, error } = await sb.from('followups').insert(rows).select();
    if (error) { $('[data-msg]', form).textContent = /followups/.test(error.message || '') ? 'Falta correr supabase/fase14.sql en Supabase.' : errorText(error); return; }
    o.followups.push(...data);
    closeModal();
    rerender();
  });
}

/* ==========================================================================
   00 · Mis pendientes → lo del seguimiento asignado a mí
   ========================================================================== */
export async function myFollowups(sb, me) {
  const { data, error } = await sb.from('followups').select('*').eq('assignee_id', me.id).is('done_at', null);
  if (error || !data?.length) return { list: [], rules: [], leads: [] };
  const rules = data.filter((f) => f.kind === 'regla');
  let leads = [];
  if (rules.length) {
    const r = await sb.from('leads').select('id, name, status, created_at, utm_campaign, utm_content').eq('status', 'nueva').order('created_at').limit(100);
    leads = r.data || [];
  }
  // el día N de la campaña necesita su arranque: el primer día con gasto en Meta
  const camps = [...new Set(data.filter((f) => f.camp_day != null && !f.due_at && f.campaign).map((f) => f.campaign))];
  const starts = {};
  if (camps.length) {
    const r = await sb.from('meta_insights').select('campaign_name, day').in('campaign_name', camps).gt('spend', 0).order('day').limit(500);
    (r.data || []).forEach((x) => { if (!starts[x.campaign_name]) starts[x.campaign_name] = x.day; });
  }
  return { list: data.filter((f) => f.kind !== 'regla').map((f) => ({ f, due: dueOf(f, starts[f.campaign]) })).sort((a, b) => (a.due || Infinity) - (b.due || Infinity)), rules, leads };
}
export function myFollowupsHTML(mine) {
  if (!mine.list.length && !mine.rules.length) return '';
  const today = mine.list.filter((r) => r.due && r.due < new Date(startOfDay().getTime() + DAY));
  const late = today.filter((r) => r.due < Date.now()).length;
  const revToday = today.filter((r) => r.f.kind === 'revision' && r.due >= Date.now());
  return `
    <section class="cp__mine">
      <h2 class="dx__grp"><span>Seguimiento de campañas</span><b>${mine.list.length + mine.rules.length}</b></h2>
      ${revToday.length || late ? `<p class="cp__today"><span class="mono">Hoy</span>${revToday.length ? `Hoy es la <b>${esc(revToday[0].f.kind === 'revision' && revToday[0].f.camp_day != null ? `revisión día ${revToday[0].f.camp_day}` : 'revisión')}</b> de «${esc(revToday[0].f.campaign || 'RAKÜN')}». ` : ''}${late ? `Tienes <b>${late} ${late === 1 ? 'tarea atrasada' : 'tareas atrasadas'}</b>.` : ''}</p>` : ''}
      ${mine.rules.map((f) => { const s = ruleStatus(f, mine.leads); return `<a class="cp__mine-row is-rule" href="#solicitudes"><span><b><span class="cp__ty cp__ty--rule">Regla</span>${esc(s.n ? s.text.split(' · ')[0] : f.title)}</b><small>${esc(s.n ? s.text.split(' · ').slice(1).join(' · ') : s.text)}</small></span><span class="cp__due${s.due[2] ? ` is-${s.due[2]}` : ''}"><b>${esc(s.due[0])}</b>${esc(s.due[1])}</span></a>`; }).join('')}
      ${mine.list.map(({ f, due }) => { const [b, s, cls] = dueLabel(due); return `<a class="cp__mine-row${cls ? ` is-${cls}` : ''}" href="#metricas"><span><b><span class="cp__ty cp__ty--${(KIND[f.kind] || KIND.tarea)[1]}">${f.kind === 'revision' && f.camp_day != null ? `Revisión día ${f.camp_day}` : (KIND[f.kind] || KIND.tarea)[0]}</span>${esc(f.title)}</b><small>${esc(f.campaign || 'RAKÜN')}${!due && f.camp_day != null ? ` · día ${f.camp_day} (la campaña aún no arranca)` : ''}</small></span><span class="cp__due${cls ? ` is-${cls}` : ''}"><b>${esc(b)}</b>${esc(s)}</span></a>`; }).join('')}
    </section>`;
}
export const myFollowupsBadge = (mine) => mine.list.filter((r) => r.due && r.due < new Date(startOfDay().getTime() + DAY)).length + mine.rules.filter((f) => ruleStatus(f, mine.leads).n).length;
