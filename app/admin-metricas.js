/* ==========================================================================
   RAKÜN · gestor · 11 Métricas
   Todo medido en un solo lugar, con datos propios (fase 9):
   · la página: visitas, páginas más vistas, «¿Qué buscas?», de dónde llegan
   · ventas: solicitudes, planes pedidos y vendidos, cotizaciones y cobros
   La conexión con Meta (campañas propias y de clientes) llega en otra fase.
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';
import { metaAdsHTML, metaClients, metaConnectRakun, wireMeta } from './admin-meta.js';

const st = { days: 30, tab: 'rakun', client: null };
const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const big = (n) => (n >= 1e6 ? `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M` : cop(n));
const bigH = (n) => `<span class="cur">$</span>${big(n).slice(1)}`;   // la letra grande dibuja el $ como /
const num = (n) => Number(n || 0).toLocaleString('es-CO');
const PAGE = {
  'index.html': 'Inicio', 'marca.html': 'Redes', 'produccion.html': 'Producción', 'web.html': 'Web y apps',
  'libreria.html': 'Librería de formatos', 'trabajo.html': 'Todos los proyectos', 'cotizacion.html': 'Cotización (cliente)',
};
const PICK = { Redes: ['Redes', 'var(--yellow)'], Produccion: ['Producción', 'var(--blue)'], Web: ['Web y apps', 'var(--pink)'], SoloMirar: ['Solo mirar', 'var(--mist)'] };
const pageName = (p) => PAGE[p] || (p?.startsWith('proyecto.html?p=') ? `Proyecto · ${p.slice(16).replace(/-/g, ' ')}` : p || '—');

export async function viewMetrics(ctx) {
  const { sb, main, head, loading } = ctx;
  loading();
  const { data: m, error } = st.tab === 'rakun' ? await sb.rpc('metrics_summary', { days: st.days }) : { data: null, error: null };
  const tabs = `
    <div class="qx__tabs" role="tablist" aria-label="Métricas">
      <button type="button" role="tab" class="gx__chip${st.tab === 'rakun' ? ' is-on' : ''}" aria-selected="${st.tab === 'rakun'}" data-mtab="rakun">RAKÜN</button>
      <button type="button" role="tab" class="gx__chip${st.tab === 'clientes' ? ' is-on' : ''}" aria-selected="${st.tab === 'clientes'}" data-mtab="clientes">Clientes</button>
    </div>`;
  const ranges = [[7, '7 días'], [30, '30 días'], [365, 'Este año']].map(([d, n]) => `<button type="button" class="gx__chip${st.days === d ? ' is-on' : ''}" data-days="${d}">${n}</button>`).join('');
  let body = '';

  if (st.tab === 'clientes') {
    body = '<div data-meta-clients><p class="mono gx__empty">Cargando…</p></div>';
  } else if (error) {
    body = `<p class="gx__error">${esc(/metrics_summary|page_events/.test(error.message || '') ? 'Falta correr supabase/fase9.sql en Supabase.' : errorText(error))}</p>`;
  } else {
    const pages = m.pages || [];
    const top = Math.max(1, ...pages.map((p) => p.n));
    const picks = m.picks || [];
    const pickTotal = picks.reduce((s, p) => s + p.n, 0);
    const rate = m.views ? (m.leads / Math.max(1, m.visitors || m.views)) * 100 : 0;
    body = `
      <p class="mono qx__dim mx__src">Fuentes: <span class="mx__tag">Página</span> nuestro propio contador (sin cookies) · <span class="mx__tag">Gestor</span> solicitudes, cotizaciones y pagos</p>
      <div class="mx__kpis">
        <div class="mx__kpi"><span class="mono">Visitas <span class="mx__tag">Página</span></span><b>${num(m.views)}</b><small>${num(m.visitors)} personas</small></div>
        <div class="mx__kpi"><span class="mono">Solicitudes <span class="mx__tag">Gestor</span></span><b>${num(m.leads)}</b><small>${rate.toLocaleString('es-CO', { maximumFractionDigits: 1 })} % de las personas</small></div>
        <div class="mx__kpi"><span class="mono">Cotizaciones enviadas</span><b>${num(m.quotes_sent)}</b><small>${num(m.quotes_won)} aceptadas${m.quotes_sent ? ` · ${Math.round(m.quotes_won / m.quotes_sent * 100)} %` : ''}</small></div>
        <div class="mx__kpi"><span class="mono">Vendido <span class="mx__tag">Gestor</span></span><b>${bigH(m.sold_total)}</b><small>cotizaciones con anticipo o pagadas</small></div>
        <div class="mx__kpi mx__kpi--dark"><span class="mono">Cobrado</span><b>${bigH(m.paid)}</b><small>pagos registrados</small></div>
      </div>

      <div class="mx__grid">
        <section class="mx__card">
          <h2 class="mono">Páginas más vistas <span class="mx__tag">Página</span></h2>
          ${pages.map((p) => `<div class="mx__bar"><span>${esc(pageName(p.path))}</span><i style="width:${Math.max(2, p.n / top * 100)}%"></i><b class="mono">${num(p.n)}</b></div>`).join('') || '<p class="gx__empty">Aún no hay visitas en este periodo.</p>'}
        </section>
        <section class="mx__card">
          <h2 class="mono">«¿Qué buscas?» · qué eligen al entrar <span class="mx__tag">Página</span></h2>
          ${pickTotal ? `
          <div class="mx__split">${picks.map((p) => `<span style="flex:${p.n};background:${(PICK[p.label] || [0, 'var(--navy)'])[1]}" title="${esc((PICK[p.label] || [p.label])[0])}"></span>`).join('')}</div>
          <div class="mx__legend">${picks.map((p) => `<span><i style="background:${(PICK[p.label] || [0, 'var(--navy)'])[1]}"></i>${esc((PICK[p.label] || [p.label])[0])} <b>${Math.round(p.n / pickTotal * 100)} %</b> <small class="mono">${num(p.n)}</small></span>`).join('')}</div>` : '<p class="gx__empty">Aún nadie ha elegido en este periodo.</p>'}
          <h2 class="mono mx__h2b">El embudo</h2>
          <div class="mx__funnel">
            <div><span>Personas</span><b>${num(m.visitors)}</b></div>
            <div><span>Solicitudes</span><b>${num(m.leads)}</b></div>
            <div><span>Cotizadas</span><b>${num(m.quotes_sent)}</b></div>
            <div><span>Aceptadas</span><b>${num(m.quotes_won)}</b></div>
          </div>
          ${(m.refs || []).length ? `<h2 class="mono mx__h2b">De dónde llegan</h2>${m.refs.map((r) => `<p class="mx__ref"><span>${esc(r.ref)}</span><b class="mono">${num(r.n)}</b></p>`).join('')}` : ''}
        </section>
      </div>

      <section class="mx__card mx__card--wide">
        <h2 class="mono">Planes más pedidos y más vendidos <span class="mx__tag">Gestor</span></h2>
        <div class="mx__two">
          <div><p class="mono qx__dim">Pedidos (solicitudes)</p>${(m.lead_plans || []).map((p) => `<p class="mx__ref"><span>${esc(p.plan || '—')}</span><b class="mono">${num(p.n)}</b></p>`).join('') || '<p class="gx__empty">Sin solicitudes en este periodo.</p>'}</div>
          <div><p class="mono qx__dim">Vendidos (cotizaciones con anticipo)</p>${(m.sold_plans || []).map((p) => `<p class="mx__ref"><span>${esc(p.plan)} <small class="mono">× ${num(p.n)}</small></span><b class="mono">${big(p.total)}</b></p>`).join('') || '<p class="gx__empty">Sin ventas de planes en este periodo.</p>'}</div>
        </div>
      </section>

      ${metaAdsHTML(m, ctx)}`;
  }

  main.innerHTML = head('11', 'Todo medido en un solo lugar', 'Métricas', st.tab === 'rakun' ? ranges : '') + tabs + body;
  $$('[data-days]', main).forEach((b) => b.addEventListener('click', () => { st.days = Number(b.dataset.days); viewMetrics(ctx); }));
  $$('[data-mtab]', main).forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.mtab; viewMetrics(ctx); }));
  if (st.tab === 'clientes') metaClients(ctx, $('[data-meta-clients]', main), st);
  else wireMeta(ctx, main, () => viewMetrics(ctx));
}
