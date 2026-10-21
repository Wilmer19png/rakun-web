/* ==========================================================================
   RAKÜN · gestor · 12 Tarifario
   Todo lo que se vende, a la mano: planes de Redes, la carta del club
   completa (con los videos sueltos por tipo), web y producción. Los precios
   salen de 09 · Planes y precios. Al lado, «Tu pago»: lo que se lleva quien
   está mirando, según los % de 09 → Tarifas y pagos (app/pagos.js).
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { ROLES, mergePagos, loadProducts, planManager, planTeam, partsForPlan, oneTimeManager, r100 } from './pagos.js';
import { loadPiezas, piezasViewHTML } from './admin-piezas.js';

const VIDEO_KEY = { 'Video ágil': 'agil', 'Video Pro': 'pro', 'Video Premium': 'premium', 'Video horizontal Pro': 'horizontal', 'Recorte vertical': 'recorte' };

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const st = { tab: 'todo', q: '', open: null };
const TABS = [['todo', 'Todo'], ['plan', 'Planes de Redes'], ['piezas', 'Piezas de cada plan'], ['carta', 'Carta del club'], ['web', 'Web'], ['produccion', 'Producción']];

export async function viewTarifario(ctx) {
  const { sb, me, main, head, loading } = ctx;
  loading();
  const [groups, { data }, piezas] = await Promise.all([loadProducts(), sb.from('app_settings').select('content').eq('id', 'pagos').maybeSingle(), loadPiezas(sb)]);
  const pagos = mergePagos(data?.content);
  // qué partes cubre quien mira (el admin ve la del manager: venta + operación)
  let mine = ROLES.map(([r]) => r).filter((r) => pagos.cover?.[r] === me.id);
  const admin = !mine.length && me.role === 'admin';
  if (admin) mine = ['venta', 'operacion'];
  const payLabel = admin ? 'Paga al manager' : 'Tu pago';
  const has = (r) => mine.includes(r);

  // lo que se lleva quien mira: en un plan, al mes (solo edición / con grabación); en lo demás, una vez
  const planPay = (catKey, name, withRec) => {
    const m = planManager(pagos, piezas.redes, catKey, name, withRec);
    const t = planTeam(pagos, piezas.piezas, partsForPlan(piezas.piezas, piezas.redes, catKey, name, withRec));
    const parts = [];
    if (m && has('venta') && m.venta + m.grabacion) parts.push(['Venta', m.venta + m.grabacion]);
    if (m && has('operacion') && m.operacion) parts.push(['Operación', m.operacion]);
    if (has('edicion') && t.editor) parts.push(['Edición', t.editor]);
    if (has('camara') && t.camara) parts.push(['Grabación', t.camara]);
    if (has('diseno') && t.diseno) parts.push(['Diseño', t.diseno]);
    return parts;
  };
  const pay = (g, it) => {
    if (!mine.length) return '';
    if (g.kind === 'plan') {
      const a = planPay(it.catKey, it.name, false); const b = planPay(it.catKey, it.name, true);
      const sa = a.reduce((s, [, v]) => s + v, 0); const sb2 = b.reduce((s, [, v]) => s + v, 0);
      if (!sa && !sb2) return '<span class="tf2__pay tf2__pay--none">—</span>';
      return `<span class="tf2__pay"><b>${cop(sa)} – ${cop(sb2)} / mes</b><small>Con grabación: ${b.map(([k, v]) => `${k} ${cop(v)}`).join(' · ')}</small></span>`;
    }
    const price = Number(it.price) || 0;
    if (!price) return '<span class="tf2__pay tf2__pay--none">—</span>';
    const m = oneTimeManager(pagos, it.name, price);
    const parts = [];
    if (has('venta') && m.venta) parts.push(['Venta', m.venta, m.pv]);
    if (has('operacion') && m.operacion) parts.push(['Operación', m.operacion, m.po]);
    if (has('edicion') && VIDEO_KEY[it.name]) parts.push(['Edición', r100(price * (Number(pagos.editor.pct) || 0) / 100), Number(pagos.editor.pct) || 0]);
    if (!parts.length) return '<span class="tf2__pay tf2__pay--none">—</span>';
    return `<span class="tf2__pay"><b>${cop(parts.reduce((s, [, v]) => s + v, 0))} una vez</b><small>${parts.map(([k, , p]) => `${k} ${p} %`).join(' · ')}</small></span>`;
  };

  const draw = () => {
    const q = st.q.trim().toLowerCase();
    const show = groups.filter((g) => st.tab === 'todo' || g.kind === st.tab).map((g) => ({
      ...g, items: g.items.filter((it) => !q || `${it.name} ${it.detail || ''} ${g.title}`.toLowerCase().includes(q)),
    })).filter((g) => g.items.length);
    main.innerHTML = head('12', 'Todo lo que vendemos, a la mano', 'Tarifario') + `
      <div class="tf2">
        <div class="tf2__main">
          <input class="gx__search tf2__search" type="search" data-q value="${esc(st.q)}" placeholder="Buscar: «reel», «pauta», «fotos», «videoclip»…" aria-label="Buscar en el tarifario">
          <div class="gx__subtabs">${TABS.map(([k, n]) => `<button type="button" class="gx__chip${st.tab === k ? ' is-on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
          ${st.tab === 'piezas' ? piezasViewHTML(piezas) : show.map((g) => `
          <section class="tf2__g">
            <h2 class="mono tf2__gt">${g.color ? `<i style="background:${g.color}"></i>` : ''}${esc(g.title)}${g.kind === 'plan' ? ' <span>· mensual</span>' : ''}</h2>
            ${g.kind === 'plan' ? `
            <div class="tf2__r tf2__r--h"><span>Plan</span><span>Solo edición</span><span>Con grabación</span>${mine.length ? `<span>${payLabel}</span>` : ''}</div>
            ${g.items.map((it, i) => `
            <button type="button" class="tf2__r" data-open="${esc(g.title)}|${i}">
              <span><b>${esc(it.name)}${it.hot ? ' ★' : ''}</b>${it.detail ? `<small>${esc(it.detail)}</small>` : ''}${it.ads ? `<small>Pauta aparte desde ${cop(it.ads)}</small>` : ''}</span>
              <span class="tf2__m">${cop(it.ed)}</span><span class="tf2__m">${cop(it.rec)}</span>${pay(g, it)}
            </button>`).join('')}` : `
            <div class="tf2__r tf2__r--h"><span>${g.kind === 'produccion' ? 'Tarifa' : 'Servicio'}</span><span>Cobro</span><span>Precio</span>${mine.length ? `<span>${payLabel}</span>` : ''}</div>
            ${g.items.map((it, i) => `
            <button type="button" class="tf2__r" data-open="${esc(g.title)}|${i}">
              <span><b>${esc(it.name)}</b></span><span class="mono tf2__u">${esc(String(it.unit || '').toLowerCase())}</span>
              <span class="tf2__m">${it.price ? cop(it.price) : '<span class="qx__dim">a cotizar</span>'}</span>${pay(g, it)}
            </button>`).join('')}`}
          </section>`).join('') || '<p class="gx__empty">Nada con ese nombre.</p>'}
        </div>
        <aside class="tf2__side">
          <div class="tf2__how">
            <p class="mono">Cómo se paga</p>
            <p><b>Planes de Redes → el manager cobra cada mes</b> mientras el cliente siga pagando: <b>venta</b> (% del plan), <b>operación</b> (% de la gestión: campañas, publicación, reporte) y una parte de la <b>grabación</b>.</p>
            <p><b>Ventas sueltas</b> → <b>una sola vez</b>: video 8 %, campañas extra 15 % + 32 %, lo demás 5 %. El editor, quien graba y la diseñadora cobran por pieza (09 → Tarifas y pagos).</p>
          </div>
          <div class="tf2__pick" data-pick>${pickHTML()}</div>
        </aside>
      </div>`;

    const s = $('[data-q]', main);
    s.addEventListener('input', () => { st.q = s.value; draw(); const n = $('[data-q]', main); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });
    $$('[data-tab]', main).forEach((b) => b.addEventListener('click', () => { st.tab = b.dataset.tab; draw(); }));
    $$('[data-open]', main).forEach((b) => b.addEventListener('click', () => {
      const [title, i] = b.dataset.open.split('|');
      const g = groups.find((x) => x.title === title);
      st.open = { g, it: g.items[Number(i)] };
      $('[data-pick]', main).innerHTML = pickHTML();
      wirePick();
      $$('.tf2__r.is-on', main).forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
    }));
    wirePick();
  };

  // el producto elegido: resumen para mandar o armar la cotización
  function summary() {
    const { g, it } = st.open;
    if (g.kind === 'plan') return `RAKÜN · ${g.title.replace('Redes · ', '')} · ${it.name}\n${it.detail || ''}\nSolo edición: ${cop(it.ed)} / mes\nCon grabación: ${cop(it.rec)} / mes${it.ads ? `\nPauta aparte desde ${cop(it.ads)} / mes` : ''}`;
    return `RAKÜN · ${it.name}${it.detail ? `\n${it.detail}` : ''}\n${it.price ? cop(it.price) : 'A cotizar'} · ${String(it.unit || '').toLowerCase()}`;
  }
  function pickHTML() {
    if (!st.open) return '<p class="mono qx__dim">Toca un producto para mandarlo o armar una cotización.</p>';
    const { g, it } = st.open;
    return `<p class="mono tf2__pk">Elegiste</p><p class="tf2__pn">${esc(it.name)}</p><p class="tf2__pd">${esc(it.detail || g.title)}</p>
      <div class="tf2__pb"><button type="button" class="gx__btn gx__btn--hot" data-quote>Armar cotización →</button>
      <a class="gx__btn gx__btn--wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(summary())}">Enviar por WhatsApp ↗</a>
      <button type="button" class="gx__btn" data-copy>Copiar resumen</button></div>`;
  }
  function wirePick() {
    $('[data-copy]', main)?.addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(summary()); e.target.textContent = '✓ Copiado'; } catch { /* sin permiso */ } });
    $('[data-quote]', main)?.addEventListener('click', () => {
      const world = st.open.g.kind === 'web' ? 'web' : st.open.g.kind === 'produccion' ? 'produccion' : 'marca';
      ctx.go('proyectos', { quote: 'new', preset: { title: st.open.it.name, world } });
    });
  }
  draw();
}
