/* ==========================================================================
   RAKÜN · gestor · 12 Tarifario
   Todo lo que se vende, a la mano: planes de Redes, la carta del club
   completa (con los videos sueltos por tipo), web y producción. Los precios
   salen de 09 · Planes y precios. Al lado, «Tu pago»: lo que se lleva quien
   está mirando, según los % de 09 → Tarifas y pagos (app/pagos.js).
   ========================================================================== */
import { $, $$, esc } from './util.js';
import { ROLES, ROLE_NAME, pctFor, isMonthly, loadProducts } from './pagos.js';

const cop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const st = { tab: 'todo', q: '', open: null };
const TABS = [['todo', 'Todo'], ['plan', 'Planes de Redes'], ['carta', 'Carta del club'], ['web', 'Web'], ['produccion', 'Producción']];

export async function viewTarifario(ctx) {
  const { sb, me, main, head, loading } = ctx;
  loading();
  const [groups, { data }] = await Promise.all([loadProducts(), sb.from('app_settings').select('content').eq('id', 'pagos').maybeSingle()]);
  const pagos = data?.content || { rows: {}, cover: {} };
  // qué roles cubre quien mira (el admin ve la del manager para saber cuánto se paga)
  let mine = ROLES.map(([r]) => r).filter((r) => pagos.cover?.[r] === me.id);
  if (!mine.length && me.role === 'admin') mine = ['manager'];
  const payLabel = me.role === 'admin' && !ROLES.some(([r]) => pagos.cover?.[r] === me.id) ? 'Paga al manager' : 'Tu pago';

  const pay = (key, ...prices) => {
    if (!mine.length) return '';
    const pct = pctFor(pagos, key);
    const total = mine.reduce((s, r) => s + (Number(pct[r]) || 0), 0);
    if (!total) return '<span class="tf2__pay tf2__pay--none">—</span>';
    const roles = mine.filter((r) => pct[r]).map((r) => ROLE_NAME[r]).join(' + ');
    const when = mine.includes('manager') && pct.manager ? (isMonthly(key) ? 'cada mes' : 'una vez') : 'por venta';
    const amounts = prices.filter(Boolean).map((p) => cop(p * total / 100)).join(' – ');
    return `<span class="tf2__pay"><b>${total} % ${when}</b>${amounts ? `<small>${amounts}${isMonthly(key) ? ' / mes' : ''}</small>` : ''}${mine.length > 1 ? `<small>${esc(roles)}</small>` : ''}</span>`;
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
          ${show.map((g) => `
          <section class="tf2__g">
            <h2 class="mono tf2__gt">${g.color ? `<i style="background:${g.color}"></i>` : ''}${esc(g.title)}${g.kind === 'plan' ? ' <span>· mensual</span>' : ''}</h2>
            ${g.kind === 'plan' ? `
            <div class="tf2__r tf2__r--h"><span>Plan</span><span>Solo edición</span><span>Con grabación</span>${mine.length ? `<span>${payLabel}</span>` : ''}</div>
            ${g.items.map((it, i) => `
            <button type="button" class="tf2__r" data-open="${esc(g.title)}|${i}">
              <span><b>${esc(it.name)}${it.hot ? ' ★' : ''}</b>${it.detail ? `<small>${esc(it.detail)}</small>` : ''}${it.ads ? `<small>Pauta aparte desde ${cop(it.ads)}</small>` : ''}</span>
              <span class="tf2__m">${cop(it.ed)}</span><span class="tf2__m">${cop(it.rec)}</span>${pay(it.key, it.ed, it.rec)}
            </button>`).join('')}` : `
            <div class="tf2__r tf2__r--h"><span>${g.kind === 'produccion' ? 'Tarifa' : 'Servicio'}</span><span>Cobro</span><span>Precio</span>${mine.length ? `<span>${payLabel}</span>` : ''}</div>
            ${g.items.map((it, i) => `
            <button type="button" class="tf2__r" data-open="${esc(g.title)}|${i}">
              <span><b>${esc(it.name)}</b></span><span class="mono tf2__u">${esc(String(it.unit || '').toLowerCase())}</span>
              <span class="tf2__m">${it.price ? cop(it.price) : '<span class="qx__dim">a cotizar</span>'}</span>${pay(it.key, it.price)}
            </button>`).join('')}`}
          </section>`).join('') || '<p class="gx__empty">Nada con ese nombre.</p>'}
        </div>
        <aside class="tf2__side">
          <div class="tf2__how">
            <p class="mono">Cómo se paga</p>
            <p><b>Planes de Redes → la comisión del manager es mensual</b>, cada mes que el cliente siga pagando. Entre mejor el plan, más alto el %.</p>
            <p><b>Ventas sueltas</b> (carta del club, web y producción) → <b>una sola vez</b>, cuando el cliente paga.</p>
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
