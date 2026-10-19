/* ==========================================================================
   RAKÜN · gestor · 11 Métricas → Meta (fase 11)
   · «Por anuncio»: lo que trae cada anuncio (personas, solicitudes, ventas) con
     el gasto de Meta al lado, y el costo por solicitud y por venta.
   · Conectar la cuenta publicitaria de RAKÜN y las de clientes; «Actualizar
     ahora» llama a la función meta-sync, que trae los datos con el token secreto.
   · Clientes: resultados de su cuenta y si se ven en su portal.
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { errorText } from './supa.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const num = (n) => Number(n || 0).toLocaleString('es-CO');
const per = (a, b) => (b ? cop(a / b) : '—');
const when = (d) => (d ? new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'nunca');
const missing = (e) => (/meta_|utm_|relation|column|function/.test(e?.message || '') ? 'Falta correr supabase/fase11.sql en Supabase.' : errorText(e));
export const UTM = 'utm_source=meta&utm_medium=pauta&utm_campaign={{campaign.name}}&utm_content={{ad.name}}';

/* ---------- RAKÜN: el bloque «Por anuncio» dentro de Métricas ---------- */
// los nombres que llegaron antes de la fase 12 vienen codificados (RAK%C3%9CN+%7C+Leads…)
export const plain = (v) => { let t = String(v ?? ''); try { if (/%[0-9a-f]{2}|\+/i.test(t)) t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch { /* lo deja igual */ } return t.trim(); };
const keyOf = (campaign, ad) => `${plain(campaign)}|${plain(ad)}`;
const pct = (a, b) => (b ? `${(a / b * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %` : '—');
const ago = (d) => new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const LEAD_ST = { nueva: 'Nueva', contactado: 'Contactado', reunion: 'Reunión', propuesta: 'Propuesta', ganado: 'Ganado', perdido: 'Perdido' };

// por anuncio (fase 12, con alcance e impresiones; si no está, lo de la fase 11) + las solicitudes de cada uno
export async function loadAds(sb, m, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const [a, l] = await Promise.all([
    sb.rpc('metrics_ads', { days }),
    sb.from('leads').select('id, name, plan, world, status, created_at, utm_campaign, utm_content')
      .not('utm_source', 'is', null).gte('created_at', since).order('created_at', { ascending: false }).limit(300),
  ]);
  const rows = new Map();
  for (const r of (a.error || a.data == null ? m.ads : a.data) || []) {
    const k = keyOf(r.campaign, r.ad);
    const prev = rows.get(k);
    if (!prev) { rows.set(k, { ...r, campaign: plain(r.campaign), ad: plain(r.ad), list: [] }); continue; }
    // antes de la fase 12 el mismo anuncio puede salir dos veces (codificado y no): se suman
    ['visitors', 'views', 'leads', 'won', 'sold', 'impressions', 'reach', 'clicks', 'meta_leads', 'messages'].forEach((f) => { prev[f] = (Number(prev[f]) || 0) + (Number(r[f]) || 0); });
    if (r.spend != null) prev.spend = (Number(prev.spend) || 0) + Number(r.spend);
  }
  const leads = l.error ? [] : (l.data || []).filter((x) => x.utm_source && (x.utm_campaign || x.utm_content));
  for (const x of leads) {
    const k = keyOf(x.utm_campaign, x.utm_content);
    if (!rows.has(k)) rows.set(k, { campaign: plain(x.utm_campaign), ad: plain(x.utm_content), visitors: 0, leads: 0, list: [] });
    rows.get(k).list.push(x);
  }
  return { ads: [...rows.values()], leads, leadsHidden: Boolean(l.error) };
}

export function metaAdsHTML(m, ctx, data = { ads: m.ads || [], leads: [] }) {
  const { ads, leads } = data;
  const isAdmin = ctx.me.role === 'admin';
  const sum = (f) => ads.reduce((s, a) => s + (Number(a[f]) || 0), 0);
  const spend = Number(m.meta_spend) || sum('spend');
  const t = { reach: sum('reach'), impressions: sum('impressions'), clicks: sum('clicks'), visitors: sum('visitors'), leads: sum('leads'), won: sum('won') };
  const hasMeta = ads.some((a) => a.spend != null);
  const name = (a) => (a.ad || a.campaign || '—');
  return `
    <section class="mx__card mx__card--wide ma">
      <div class="ma__h">
        <h2 class="mono">Por anuncio <span class="mx__tag">Página</span> <span class="mx__tag">Gestor</span> <span class="mx__tag">Meta</span></h2>
        <span class="mono qx__dim">${m.meta_synced ? `Meta actualizado: ${when(m.meta_synced)}` : 'Meta aún sin conectar'}</span>
        ${isAdmin ? '<button type="button" class="gx__btn" data-meta-sync>Actualizar ahora</button><button type="button" class="gx__btn gx__btn--dark" data-meta-rakun>Conectar cuenta de RAKÜN</button>' : ''}
      </div>
      ${ads.length ? `
      <div class="ma__kpis">
        <div><span class="mono">Gasto <span class="mx__tag">Meta</span></span><b>${hasMeta ? `<span class="cur">$</span>${Math.round(spend).toLocaleString('es-CO')}` : '—'}</b></div>
        <div><span class="mono">Alcance <span class="mx__tag">Meta</span></span><b>${hasMeta ? num(t.reach) : '—'}</b><small>${hasMeta ? `${num(t.impressions)} impresiones` : 'conecta Meta'}</small></div>
        <div><span class="mono">Clics · CTR <span class="mx__tag">Meta</span></span><b>${hasMeta ? num(t.clicks) : '—'}</b><small>${hasMeta ? `${pct(t.clicks, t.impressions)} de las impresiones` : ''}</small></div>
        <div><span class="mono">Llegaron a la web <span class="mx__tag">Página</span></span><b>${num(t.visitors)}</b><small>personas</small></div>
        <div><span class="mono">Llenaron el formulario <span class="mx__tag">Gestor</span></span><b>${num(t.leads)}</b><small>${pct(t.leads, t.visitors)} de las que llegaron</small></div>
        <div class="ma__kpi--dark"><span class="mono">Costo por solicitud</span><b>${hasMeta && t.leads ? `<span class="cur">$</span>${Math.round(spend / t.leads).toLocaleString('es-CO')}` : '—'}</b><small>${num(t.won)} ${t.won === 1 ? 'venta' : 'ventas'}</small></div>
      </div>
      <div class="ma__row ma__row--h mono"><span>Anuncio · campaña</span><span>Gasto</span><span>Alcance</span><span>Clics · CTR</span><span>Llegaron</span><span>Formularios</span><span>Costo / form.</span><span>Ventas</span></div>
      ${ads.map((a, i) => `
      <div class="ma__ad">
        <button type="button" class="ma__row ma__row--btn" data-ad-open="${i}" aria-expanded="false"${a.list.length ? '' : ' disabled'}>
          <span><b>${esc(name(a))}</b><small>${esc(a.ad ? a.campaign : 'sin nombre de anuncio')}</small></span>
          <span class="mono">${a.spend != null ? cop(a.spend) : '—'}</span>
          <span class="mono">${a.spend != null ? num(a.reach) : '—'}</span>
          <span class="mono">${a.spend != null ? `${num(a.clicks)}<small>${pct(a.clicks, a.impressions)}</small>` : '—'}</span>
          <span class="mono">${num(a.visitors)}</span>
          <span class="mono ma__forms">${a.list.length ? '<i aria-hidden="true">▾</i>' : ''}${num(a.leads)}<small>${a.visitors ? pct(a.leads, a.visitors) : ''}${a.meta_leads && a.meta_leads !== a.leads ? ` · ${num(a.meta_leads)} en Meta` : ''}</small></span>
          <span class="mono">${a.spend != null ? per(a.spend, a.leads) : '—'}</span>
          <span class="mono ma__sold">${a.won ? `${num(a.won)}<small>${cop(a.sold)}</small>` : '0'}</span>
        </button>
        ${a.list.length ? `<div class="ma__leads" data-ad-list="${i}" hidden>${a.list.map(leadHTML).join('')}</div>` : ''}
      </div>`).join('')}
      <p class="mono qx__dim ma__foot">Toca un anuncio para ver quién llenó el formulario · «Formularios» y «Ventas» salen del gestor, no de Meta · Parámetros de URL para cada anuncio: <button class="qx__link" type="button" data-copy-utm>copiar</button></p>
      ${leads.length ? `
      <h2 class="mono mx__h2b">Últimos formularios desde anuncios</h2>
      <div class="ma__leads ma__leads--all">${leads.slice(0, 12).map((x) => leadHTML(x, true)).join('')}</div>` : data.leadsHidden ? '<p class="mono qx__dim">Los nombres de quienes llenaron el formulario solo los ve quien tiene acceso a 01 Solicitudes.</p>' : ''}` : `
      <div class="ma__empty">
        <p>Aún no hay visitas desde anuncios en este periodo. Para que cada anuncio quede identificado, en el Administrador de anuncios → cada anuncio → <b>Parámetros de URL</b>, pega:</p>
        <div class="gx__copy"><input readonly value="${esc(UTM)}" aria-label="Parámetros de URL"><button class="gx__btn" type="button" data-copy-utm>Copiar</button></div>
        <p class="mono qx__dim">Meta cambia solo {{campaign.name}} y {{ad.name}} por los nombres reales. Con eso ves aquí qué anuncio trajo cada visita, solicitud y venta (aunque la persona tenga bloqueador de anuncios).</p>
      </div>`}
      <p class="mono gx__saved" data-meta-msg aria-live="polite"></p>
    </section>`;
}

function leadHTML(x, withAd = false) {
  return `<button type="button" class="ma__lead" data-lead="${x.id}">
    <b>${esc(x.name)}</b>
    <span>${esc(x.plan || '—')}${withAd && x.utm_content ? ` <small class="mono">▸ ${esc(plain(x.utm_content))}</small>` : ''}</span>
    <span class="mono ma__st ma__st--${esc(x.status)}">${esc(LEAD_ST[x.status] || x.status)}</span>
    <span class="mono qx__dim">${ago(x.created_at)}</span>
  </button>`;
}

export function wireMeta(ctx, root, reload) {
  const { sb } = ctx;
  $$('[data-copy-utm]', root).forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(UTM); b.textContent = '✓ Copiado'; } catch { /* sin permiso */ } }));
  $$('[data-ad-open]', root).forEach((b) => b.addEventListener('click', () => {
    const list = $(`[data-ad-list="${b.dataset.adOpen}"]`, root);
    if (!list) return;
    list.hidden = !list.hidden;
    b.setAttribute('aria-expanded', String(!list.hidden));
  }));
  $$('[data-lead]', root).forEach((b) => b.addEventListener('click', () => ctx.openLead?.(b.dataset.lead)));
  $('[data-meta-sync]', root)?.addEventListener('click', async (e) => {
    const msg = $('[data-meta-msg]', root);
    e.target.disabled = true;
    msg.textContent = 'Trayendo los datos de Meta…';
    const res = await syncNow(sb);
    msg.textContent = res;
    e.target.disabled = false;
    if (/^✓/.test(res)) reload();
  });
  $('[data-meta-rakun]', root)?.addEventListener('click', () => metaConnectRakun(ctx, reload));
}

async function syncNow(sb, account_id = null) {
  const { data, error } = await sb.functions.invoke('meta-sync', { body: { days: 30, ...(account_id ? { account_id } : {}) } });
  let text = data?.error;
  try { text = text || (error && (await error.context?.json())?.error); } catch { /* sin cuerpo */ }
  if (error || !data?.ok) return text || (error ? 'No se pudo llamar la función meta-sync (¿ya está desplegada en Supabase?).' : 'Algo salió mal.');
  const bad = (data.accounts || []).filter((a) => a.error);
  if (!(data.accounts || []).length) return 'No hay cuentas conectadas todavía.';
  return bad.length ? `Con errores: ${bad.map((a) => `${a.name}: ${a.error}`).join(' · ')}` : `✓ Listo · ${(data.accounts || []).reduce((s, a) => s + (a.rows || 0), 0)} renglones traídos`;
}

/* ---------- conectar una cuenta (RAKÜN o cliente) ---------- */
function connectForm(ctx, { account = null, client = null, reload }) {
  const { sb, openModal, closeModal } = ctx;
  const a = account || {};
  openModal(`
    <p class="mono gx__kicker">Conectar Meta${client ? ` · ${esc(client.name)}` : ' · RAKÜN'}</p>
    <h2 class="gx__modal-title">Cuenta <em>publicitaria.</em></h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Nombre (para reconocerla)</span><input name="name" value="${esc(a.name || (client ? client.name : 'RAKÜN'))}" maxlength="120"></label>
      <label class="gx__f"><span>ID de la cuenta publicitaria *</span><input name="ad_account_id" value="${esc(a.ad_account_id || '')}" placeholder="act_1234567890"></label>
      <p class="mono qx__dim">En el Administrador de anuncios, arriba a la izquierda; o en Configuración del negocio → Cuentas publicitarias. Empieza por «act_».</p>
      <label class="gx__f"><span>ID del píxel (conjunto de datos)</span><input name="pixel_id" value="${esc(a.pixel_id || (client ? '' : '1106697768774228'))}" inputmode="numeric"></label>
      <label class="gx__f"><span>Página de Facebook / Instagram</span><input name="page_name" value="${esc(a.page_name || '')}" placeholder="@usuario"></label>
      ${client ? `<label class="gx__check"><input type="checkbox" name="show_in_portal"${a.show_in_portal ? ' checked' : ''}><span>Mostrar estos resultados en el portal del cliente</span></label>
      <details class="mt__adv"><summary class="mono">Opción B · token propio del cliente</summary>
        <p class="gx__p">Solo si el cliente no puede agregar a RAKÜN como socio. El token se guarda en secreto: nadie lo puede volver a ver desde el gestor.</p>
        <label class="gx__f"><span>Token del cliente (déjalo vacío para usar el de RAKÜN)</span><input name="token" type="password" autocomplete="off"></label>
      </details>` : ''}
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <div class="gx__btns"><button class="gx__btn gx__btn--hot" type="submit">Guardar y traer datos →</button>${account ? '<button class="gx__danger mono" type="button" data-unlink>Desconectar</button>' : ''}</div>
    </form>`);
  const f = $('[data-modal-box] [data-form]');
  const msg = $('[data-msg]', f);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    let act = String(fd.ad_account_id || '').trim().replace(/\s/g, '');
    if (/^\d+$/.test(act)) act = `act_${act}`;
    if (!/^act_\d{5,25}$/.test(act)) { msg.textContent = 'El ID de la cuenta debe ser como act_1234567890.'; return; }
    const row = { name: String(fd.name || '').trim() || 'Cuenta', ad_account_id: act, pixel_id: String(fd.pixel_id || '').trim() || null, page_name: String(fd.page_name || '').trim() || null, client_id: client?.id || null, show_in_portal: Boolean(fd.show_in_portal) };
    msg.textContent = 'Guardando…';
    const res = account ? await sb.from('meta_accounts').update(row).eq('id', account.id).select().single() : await sb.from('meta_accounts').insert(row).select().single();
    if (res.error) { msg.textContent = /duplicate|unique/.test(res.error.message) ? 'Esa cuenta ya está conectada.' : missing(res.error); return; }
    if (fd.token) {
      const t = await sb.from('meta_tokens').upsert({ account_id: res.data.id, token: String(fd.token).trim(), updated_at: new Date().toISOString() });
      if (t.error) { msg.textContent = errorText(t.error); return; }
    }
    msg.textContent = 'Trayendo los datos de Meta…';
    const r = await syncNow(sb, res.data.id);
    if (!/^✓/.test(r)) { msg.textContent = `Guardada. ${r}`; return; }
    closeModal();
    reload();
  });
  $('[data-unlink]', f)?.addEventListener('click', async () => {
    if (!confirm('¿Desconectar esta cuenta? Se borran sus datos traídos de Meta.')) return;
    await sb.from('meta_accounts').delete().eq('id', account.id);
    closeModal();
    reload();
  });
}

export async function metaConnectRakun(ctx, reload) {
  const { data } = await ctx.sb.from('meta_accounts').select('*').is('client_id', null).maybeSingle();
  connectForm(ctx, { account: data, reload });
}

/* ---------- Clientes: sus cuentas y resultados ---------- */
export async function metaClients(ctx, box, st) {
  const { sb, me } = ctx;
  const [{ data: accounts, error }, { data: clients }] = await Promise.all([
    sb.from('meta_accounts').select('*').not('client_id', 'is', null).order('name'),
    sb.from('clients').select('id, name, company').order('name'),
  ]);
  if (error) { box.innerHTML = `<p class="gx__error">${esc(missing(error))}</p>`; return; }
  const sel = (accounts || []).find((a) => a.id === st.client) || (accounts || [])[0];
  let detail = '';
  if (sel) {
    const { data: s, error: e2 } = await sb.rpc('meta_client_summary', { account: sel.id, days: st.days });
    if (e2) detail = `<p class="gx__error">${esc(missing(e2))}</p>`;
    else {
      const results = Number(s.leads) + Number(s.messages);
      const top = Math.max(1, ...(s.weeks || []).map((w) => Number(w.results)));
      detail = `
        <div class="mx__kpis mc__kpis">
          <div class="mx__kpi"><span class="mono">Alcance</span><b>${num(s.reach)}</b><small>${num(s.impressions)} impresiones</small></div>
          <div class="mx__kpi"><span class="mono">Resultados</span><b>${num(results)}</b><small>${num(s.leads)} clientes potenciales · ${num(s.messages)} mensajes</small></div>
          <div class="mx__kpi"><span class="mono">Gasto</span><b><span class="cur">$</span>${num(Math.round(s.spend))}</b><small>${num(s.clicks)} clics</small></div>
          <div class="mx__kpi mx__kpi--dark"><span class="mono">Costo por resultado</span><b><span class="cur">$</span>${results ? num(Math.round(s.spend / results)) : '—'}</b><small>últimos ${st.days} días</small></div>
        </div>
        <div class="mx__grid">
          <section class="mx__card"><h2 class="mono">Resultados por semana</h2>
            <div class="mc__bars">${(s.weeks || []).map((w) => `<div><i style="height:${Math.max(4, Number(w.results) / top * 100)}%"></i><span class="mono">${new Date(`${w.week}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · ${num(w.results)}</span></div>`).join('') || '<p class="gx__empty">Sin datos en este periodo.</p>'}</div>
          </section>
          <section class="mx__card"><h2 class="mono">Anuncios con mejor resultado</h2>
            ${(s.ads || []).slice(0, 8).map((a) => `<p class="mx__ref"><span>${esc(a.ad_name || '—')}<small class="mono qx__dim"> · ${esc(a.campaign_name || '')}</small></span><b class="mono">${num(Number(a.leads) + Number(a.messages))} · ${cop(a.spend)}</b></p>`).join('') || '<p class="gx__empty">Sin anuncios en este periodo.</p>'}
          </section>
        </div>`;
    }
  }
  box.innerHTML = `
    <div class="mc">
      <aside class="mc__list">
        <p class="mono qx__dim">Cuentas de clientes</p>
        ${(accounts || []).map((a) => `<button type="button" class="mc__acc${a === sel ? ' is-on' : ''}" data-acc="${a.id}"><b>${esc(a.name)}</b><small class="mono">${a.last_error ? '⚠ con error' : a.last_sync ? `✓ ${when(a.last_sync)}` : 'sin datos aún'}${a.show_in_portal ? ' · en su portal' : ''}</small></button>`).join('') || '<p class="gx__empty">Ningún cliente conectado.</p>'}
        ${me.role === 'admin' ? `<label class="gx__f"><span>Conectar un cliente</span><select data-new-client><option value="">Elige el cliente…</option>${(clients || []).filter((c) => !(accounts || []).some((a) => a.client_id === c.id)).map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>` : ''}
        <div class="gx__note mc__how"><b>Lo recomendado:</b> el cliente agrega a RAKÜN como <b>socio</b> en su Business Manager (Configuración del negocio → Socios → Agregar → el ID del negocio de RAKÜN) y le da acceso a su cuenta publicitaria. Así el token de RAKÜN lee su cuenta sin pedirle contraseñas.</div>
      </aside>
      <div class="mc__detail">
        ${sel ? `<div class="mc__head"><div><p class="mono qx__dim">${esc(sel.ad_account_id)}${sel.pixel_id ? ` · píxel ${esc(sel.pixel_id)}` : ''}${sel.page_name ? ` · ${esc(sel.page_name)}` : ''}</p><h2 class="mc__name">${esc(sel.name)}</h2>${sel.last_error ? `<p class="gx__error">${esc(sel.last_error)}</p>` : ''}</div>
          ${me.role === 'admin' ? `<span class="gx__btns"><button class="gx__btn" type="button" data-sync-acc>Actualizar ahora</button><button class="gx__btn" type="button" data-edit-acc>Editar conexión</button></span>` : ''}</div>${detail}<p class="mono gx__saved" data-meta-msg aria-live="polite"></p>`
          : '<div class="mx__soon"><p class="mono">Clientes</p><h2>Conecta la cuenta de un cliente.</h2><p>Elige el cliente a la izquierda y pon el ID de su cuenta publicitaria. Verás alcance, resultados, gasto y costo por resultado, y puedes mostrárselo en su portal.</p></div>'}
      </div>
    </div>`;
  const reload = () => metaClients(ctx, box, st);
  $$('[data-acc]', box).forEach((b) => b.addEventListener('click', () => { st.client = b.dataset.acc; reload(); }));
  $('[data-new-client]', box)?.addEventListener('change', (e) => {
    const c = (clients || []).find((x) => x.id === e.target.value);
    if (c) connectForm(ctx, { client: c, reload });
  });
  $('[data-edit-acc]', box)?.addEventListener('click', () => connectForm(ctx, { account: sel, client: (clients || []).find((c) => c.id === sel.client_id) || { id: sel.client_id, name: sel.name }, reload }));
  $('[data-sync-acc]', box)?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    $('[data-meta-msg]', box).textContent = 'Trayendo los datos de Meta…';
    const r = await syncNow(sb, sel.id);
    $('[data-meta-msg]', box).textContent = r;
    if (/^✓/.test(r)) reload(); else e.target.disabled = false;
  });
}
