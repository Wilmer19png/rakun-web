/* ==========================================================================
   RAKÜN · gestor · 11 Métricas → qué significa cada métrica y cuál es el ideal
   · METRICS: cada métrica con su explicación, cómo se calcula y sus rangos
     (bien / alerta). Los rangos los puede cambiar el admin desde el glosario;
     se guardan en app_settings id 'metas'.
   · La «i» (data-mi): al pasar el mouse abre la explicación; en celular, al
     tocarla, sale desde abajo.
   ========================================================================== */
import { $, $$, esc } from './util.js';

const cop = (n) => `$${Math.round(n).toLocaleString('es-CO')}`;
const pc = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
const dec = (n) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });

// dir 'high': más es mejor (bien desde good, alerta por debajo de bad); 'low': menos es mejor
export const METRICS = {
  cpm: {
    name: 'CPM', long: 'CPM · costo por mil', how: 'gasto ÷ impresiones × 1.000', dir: 'low', good: 4500, bad: 6000, fmt: cop, from: 2500,
    what: 'Lo que pagas para que tu anuncio aparezca 1.000 veces. Mide qué tan caro está el público al que le llegas.',
    tip: { ok: 'El público te está saliendo a buen precio.', mid: 'Un poco caro: prueba un público más amplio o cambia el creativo.', bad: 'Muy caro: el público es pequeño o muy disputado. Amplíalo o cambia la ubicación.' },
  },
  hook: {
    name: 'Gancho', long: 'Gancho · reproducciones de 3 s', how: 'reproducciones de 3 s ÷ impresiones', dir: 'high', good: 25, bad: 15, fmt: pc,
    what: 'De cada 100 veces que el anuncio salió en pantalla, cuántas la persona se quedó al menos 3 segundos. Mide si el inicio del video frena el scroll.',
    tip: { ok: 'El inicio frena el scroll: el gancho funciona.', mid: 'Prueba un inicio más fuerte: pregunta, texto grande o movimiento en el primer segundo.', bad: 'Casi nadie se detiene: cambia los primeros 3 segundos del video.' },
  },
  hold: {
    name: 'Retención', long: 'Retención · ThruPlay', how: 'ThruPlay ÷ reproducciones de 3 s', dir: 'high', good: 15, bad: 8, fmt: pc,
    what: 'De los que engancharon, cuántos vieron el video hasta el final (o al menos 15 segundos). Mide si el video sostiene la atención.',
    tip: { ok: 'El video sostiene la atención hasta el final.', mid: 'Se van a la mitad: acorta el video o sube el ritmo después del gancho.', bad: 'Se van rápido: el video es largo o lento después del inicio.' },
  },
  ctr: {
    name: 'CTR', long: 'CTR · enlace', how: 'clics en el enlace ÷ impresiones', dir: 'high', good: 1.5, bad: 0.8, fmt: pc,
    what: 'De cada 100 personas que vieron el anuncio, cuántas dieron clic para ir a tu web. Un 2 % son 2 de cada 100.',
    tip: { ok: 'El anuncio convence de dar clic.', mid: 'Haz más claro el llamado a la acción y lo que gana la persona al dar clic.', bad: 'Casi nadie da clic: el mensaje o la oferta no conectan con ese público.' },
  },
  cpc: {
    name: 'CPC', long: 'CPC · enlace', how: 'gasto ÷ clics en el enlace', dir: 'low', good: 300, bad: 600, fmt: cop,
    what: 'Lo que te cuesta cada clic que lleva a alguien a tu web.',
    tip: { ok: 'Cada clic sale barato.', mid: 'Sube el CTR o baja el CPM para que el clic salga más barato.', bad: 'El clic está caro: casi siempre es CTR bajo o público caro.' },
  },
  conv: {
    name: 'Leads ÷ visitas', long: 'Leads ÷ visitas a la página', how: 'formularios enviados ÷ personas que llegaron', dir: 'high', good: 5, bad: 2, fmt: pc,
    what: 'Lead: una persona que llenó y envió el formulario «Quiero este plan». Dividido entre las que llegaron a la web: qué tanto convence la página.',
    tip: { ok: 'La página convence: la gente llena el formulario.', mid: 'Revisa que la página diga lo mismo que el anuncio y que el formulario sea corto.', bad: 'Llegan pero no escriben: la página no cumple lo que promete el anuncio.' },
  },
  cpl: {
    name: 'Costo por lead', long: 'Costo por lead', how: 'gasto ÷ formularios enviados', dir: 'low', good: 15000, bad: 30000, fmt: cop,
    what: 'Todo lo que gastaste dividido entre los leads que llegaron: lo que te cuesta cada contacto.',
    tip: { ok: 'Cada contacto sale a buen precio.', mid: 'Mira cuál de los pasos (gancho, CTR o la página) está en amarillo o rosado.', bad: 'Cada contacto sale caro: revisa el paso que está en rosado.' },
  },
  freq: {
    name: 'Frecuencia', long: 'Frecuencia', how: 'impresiones ÷ alcance', dir: 'low', good: 2, bad: 3, fmt: dec,
    what: 'Cuántas veces, en promedio, vio el anuncio cada persona. Si pasa de 3, la gente se aburre y los costos suben.',
    tip: { ok: 'La gente no se ha cansado del anuncio.', mid: 'Prepara un creativo nuevo para cuando pase de 3.', bad: 'La gente ya se cansó: cambia el creativo o amplía el público.' },
  },
};
// solo en el glosario (no tienen semáforo)
export const EXTRA = [
  ['Impresión', 'Cada vez que tu anuncio aparece en la pantalla de alguien. Si la misma persona lo ve 2 veces, son 2 impresiones.'],
  ['Alcance', 'Cuántas personas distintas vieron el anuncio al menos una vez.'],
  ['Visitas a la página', 'Cuántos de los que dieron clic alcanzaron a cargar la web. Si bajan mucho frente a los clics, la página carga lento y la gente se va antes.'],
];

// los rangos que guardó el admin (app_settings 'metas') sobre los de arriba
export function applyRanges(saved) {
  for (const [k, r] of Object.entries(saved || {})) {
    if (!METRICS[k]) continue;
    if (Number.isFinite(r.good)) METRICS[k].good = r.good;
    if (Number.isFinite(r.bad)) METRICS[k].bad = r.bad;
  }
}

// el valor de cada métrica a partir de los totales de un anuncio (o de todos)
export function compute(t) {
  const n = (v) => Number(v) || 0;
  const has = t.spend != null;
  const imp = n(t.impressions); const v3 = n(t.video_3s); const lc = n(t.link_clicks) || n(t.clicks);
  return {
    cpm: has && imp ? n(t.spend) / imp * 1000 : null,
    hook: has && imp && v3 ? v3 / imp * 100 : null,
    hold: has && v3 && t.thruplay != null ? n(t.thruplay) / v3 * 100 : null,
    ctr: has && imp ? lc / imp * 100 : null,
    cpc: has && lc ? n(t.spend) / lc : null,
    conv: n(t.visitors) ? n(t.leads) / n(t.visitors) * 100 : null,
    cpl: has && n(t.leads) ? n(t.spend) / n(t.leads) : null,
    freq: has && n(t.reach) ? imp / n(t.reach) : null,
  };
}

export function status(k, v) {
  const m = METRICS[k];
  if (v == null || !Number.isFinite(v)) return null;
  if (m.dir === 'high') return v >= m.good ? 'ok' : v < m.bad ? 'bad' : 'mid';
  return v <= m.good ? 'ok' : v > m.bad ? 'bad' : 'mid';
}
export const ST_NAME = { ok: 'Bien', mid: 'En medio', bad: 'Alerta' };
const rangeText = (k) => {
  const m = METRICS[k];
  return m.dir === 'high'
    ? { ok: `${m.fmt(m.good)} o más`, bad: `menos de ${m.fmt(m.bad)}` }
    : { ok: m.from ? `${m.fmt(m.from)}–${m.fmt(m.good)}` : `hasta ${m.fmt(m.good)}`, bad: `más de ${m.fmt(m.bad)}` };
};

// el valor con su forma de semáforo (círculo, rombo, triángulo): no depende solo del color
export const dot = (s) => (s ? `<i class="mi-dot mi-dot--${s}" aria-hidden="true"></i>` : '');
export const val = (k, v) => (v == null || !Number.isFinite(v) ? '—' : METRICS[k].fmt(v));
export const cell = (k, v) => { const s = status(k, v); return `${dot(s)}${val(k, v)}${s ? `<span class="sr-only"> · ${ST_NAME[s]}</span>` : ''}`; };
export const chip = (s) => (s ? `<span class="mi-st mi-st--${s}">${dot(s)}${ST_NAME[s]}</span>` : '<span class="mi-st">Sin datos aún</span>');
export const info = (k, v = null) => `<button type="button" class="mi" data-mi="${k}"${v != null && Number.isFinite(v) ? ` data-mi-v="${v}"` : ''} aria-label="Qué es ${esc(METRICS[k].name)} y cuál es el ideal">i</button>`;

function scaleHTML(k, v) {
  const m = METRICS[k];
  const max = m.dir === 'high' ? m.good * 2 : m.bad * 1.5;
  const segs = m.dir === 'high'
    ? [[m.bad, 'bad'], [m.good - m.bad, 'mid'], [max - m.good, 'ok']]
    : [[m.good, 'ok'], [m.bad - m.good, 'mid'], [max - m.bad, 'bad']];
  const at = v == null ? null : Math.max(2, Math.min(98, v / max * 100));
  const ticks = m.dir === 'high' ? ['0', m.fmt(m.bad), m.fmt(m.good), `${m.fmt(max)}+`] : ['0', m.fmt(m.good), m.fmt(m.bad), `${m.fmt(max)}+`];
  return `<div class="mi-scale" aria-hidden="true">${segs.map(([w, s]) => `<span class="mi-scale--${s}" style="flex:${w}"></span>`).join('')}${at != null ? `<i style="left:${at}%">Tú · ${m.fmt(v)}</i>` : ''}</div>
    <div class="mi-ticks" aria-hidden="true"><span>${ticks[0]}</span><span style="flex:${segs[0][0]}"></span><span>${ticks[1]}</span><span style="flex:${segs[1][0]}"></span><span>${ticks[2]}</span><span style="flex:${segs[2][0]}"></span><span>${ticks[3]}</span></div>`;
}

export function explainHTML(k, v = null) {
  const m = METRICS[k];
  const s = status(k, v);
  const r = rangeText(k);
  return `<p class="mi-how">${esc(m.how)}</p>
    <p class="mi-what">${esc(m.what)}</p>
    ${scaleHTML(k, v)}
    <dl class="mi-rg"><dt class="mi-rg--ok">Bien</dt><dd>${esc(r.ok)}</dd><dt class="mi-rg--bad">Alerta</dt><dd>${esc(r.bad)}</dd></dl>
    ${s ? `<p class="mi-verdict mi-verdict--${s}"><b>${ST_NAME[s]}:</b> ${esc(m.tip[s])}</p>` : ''}`;
}

/* ---------- la «i»: un solo recuadro para toda la vista ---------- */
let pop; let veil; let openBtn = null;
const touch = () => window.matchMedia('(hover: none)').matches;
function ensure() {
  if (pop) return;
  veil = document.createElement('div');
  veil.className = 'mi-veil';
  veil.hidden = true;
  pop = document.createElement('div');
  pop.className = 'mi-pop';
  pop.setAttribute('role', 'dialog');
  pop.hidden = true;
  document.body.append(veil, pop);
  veil.addEventListener('click', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { const b = openBtn; hide(); b?.focus(); } });
  window.addEventListener('scroll', () => { if (!pop.classList.contains('mi-pop--sheet')) hide(); }, true);
}
function show(btn, sheet) {
  ensure();
  const k = btn.dataset.mi;
  const v = btn.dataset.miV != null ? Number(btn.dataset.miV) : null;
  openBtn?.classList.remove('is-on');
  openBtn = btn;
  btn.classList.add('is-on');
  btn.setAttribute('aria-expanded', 'true');
  pop.setAttribute('aria-label', METRICS[k].name);
  pop.innerHTML = `${sheet ? '<span class="mi-grab" aria-hidden="true"></span>' : ''}<p class="mi-name">${esc(METRICS[k].name)}</p>${explainHTML(k, v)}${sheet ? '<button type="button" class="mi-close" data-mi-close>Cerrar</button>' : ''}`;
  pop.classList.toggle('mi-pop--sheet', sheet);
  veil.hidden = !sheet;
  pop.hidden = false;
  if (sheet) { $('[data-mi-close]', pop).addEventListener('click', hide); $('[data-mi-close]', pop).focus(); return; }
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth; const h = pop.offsetHeight;
  let left = r.left + r.width / 2 - 40;
  left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
  const below = r.bottom + 12 + h < window.innerHeight;
  pop.style.left = `${left}px`;
  pop.style.top = `${below ? r.bottom + 12 : Math.max(12, r.top - h - 12)}px`;
  pop.style.setProperty('--ax', `${r.left + r.width / 2 - left - 8}px`);
  pop.classList.toggle('mi-pop--up', !below);
}
function hide() {
  if (!pop) return;
  pop.hidden = true;
  veil.hidden = true;
  if (openBtn) { openBtn.classList.remove('is-on'); openBtn.setAttribute('aria-expanded', 'false'); }
  openBtn = null;
}

export function wireInfo(root, only = () => true) {
  $$('[data-mi]', root).filter(only).forEach((b) => {
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('mouseenter', () => { if (!touch()) show(b, false); });
    b.addEventListener('mouseleave', () => { if (!touch()) hide(); });
    b.addEventListener('focus', () => { if (!touch()) show(b, false); });
    b.addEventListener('blur', () => { if (!touch()) hide(); });
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (openBtn === b && !touch()) return; show(b, touch()); });
  });
}

/* ---------- el glosario (y, para el admin, cambiar los rangos) ---------- */
export function glossaryHTML(isAdmin) {
  const items = Object.entries(METRICS).map(([k, m]) => {
    const r = rangeText(k);
    return `<div class="mi-gi">
      <b>${esc(m.long)}</b><p>${esc(m.what)}</p><p class="mi-how">${esc(m.how)}</p>
      <div class="mi-gi__r"><span class="mi-st mi-st--ok">${dot('ok')}Bien ${esc(r.ok)}</span><span class="mi-st mi-st--bad">${dot('bad')}Alerta ${esc(r.bad)}</span></div>
      ${isAdmin ? `<div class="mi-gi__edit"><label><span class="mono">${m.dir === 'high' ? 'Bien desde' : 'Bien hasta'}</span><input type="number" step="any" inputmode="decimal" data-rg="${k}" data-rg-f="good" value="${m.good}"></label><label><span class="mono">${m.dir === 'high' ? 'Alerta por debajo de' : 'Alerta por encima de'}</span><input type="number" step="any" inputmode="decimal" data-rg="${k}" data-rg-f="bad" value="${m.bad}"></label></div>` : ''}
    </div>`;
  }).join('');
  return `
    <div class="gx__drawer-top"><span class="mono gx__tag" style="background:var(--yellow)">Glosario</span><button class="gx__x" type="button" data-close-drawer aria-label="Cerrar">✕</button></div>
    <h2 class="gx__lead-name">Qué significa cada métrica</h2>
    <p class="mi-intro">Lo que mide, cómo se calcula y cuál es el ideal para RAKÜN. El color de cada valor: ${dot('ok')}bien · ${dot('mid')}en medio · ${dot('bad')}alerta.</p>
    ${items}
    ${EXTRA.map(([n, t]) => `<div class="mi-gi"><b>${esc(n)}</b><p>${esc(t)}</p></div>`).join('')}
    ${isAdmin ? '<p class="mono gx__saved" data-rg-msg aria-live="polite"></p><button class="gx__btn gx__btn--dark" type="button" data-rg-save>Guardar rangos</button>' : ''}`;
}

export function wireGlossary(ctx, box, onSaved) {
  $('[data-rg-save]', box)?.addEventListener('click', async (e) => {
    const out = {};
    $$('[data-rg]', box).forEach((i) => { const v = Number(String(i.value).replace(',', '.')); if (i.value !== '' && Number.isFinite(v)) (out[i.dataset.rg] ||= {})[i.dataset.rgF] = v; });
    const msg = $('[data-rg-msg]', box);
    e.target.disabled = true;
    msg.textContent = 'Guardando…';
    const { error } = await ctx.sb.from('app_settings').upsert({ id: 'metas', content: out, updated_at: new Date().toISOString(), updated_by: ctx.me.id });
    e.target.disabled = false;
    if (error) { msg.textContent = /app_settings/.test(error.message || '') ? 'Falta correr supabase/fase9.sql en Supabase.' : error.message; return; }
    applyRanges(out);
    msg.textContent = '✓ Rangos guardados';
    onSaved?.();
  });
}

export async function loadRanges(sb) {
  const { data } = await sb.from('app_settings').select('content').eq('id', 'metas').maybeSingle();
  applyRanges(data?.content);
}
