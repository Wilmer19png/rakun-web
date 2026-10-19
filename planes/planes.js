/* ==========================================================================
   RAKÜN — planes.js
   Planes de Redes (mundo 01): Solo contenido y Gestión completa, la carta del
   club y las etiquetas de edición. Datos en planes/data.js (REDES); lo que se
   publica desde el gestor los reemplaza. Precios en COP antes de IVA.
   ========================================================================== */

import { RakunEye } from '../eye.js';
import { initFormats, openTier } from './formatos.js';
import { REDES, LEVELS, isRedes } from './data.js';
import { loadCatalog } from '../app/catalog.js';
import { $, $$, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';
const small = window.matchMedia('(max-width: 700px)').matches;




/* ---------- utilidades ---------- */
const cop = (n) => (typeof n === 'number' ? `$${n.toLocaleString('es-CO')}` : n);
// en tipografía display el "$" de Knuckle Down parece una barra: va en la tipografía de texto
const copBig = (n) => (typeof n === 'number' ? `<span class="cur">$</span>${n.toLocaleString('es-CO')}` : n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- estado ---------- */
let D = REDES;                                            // lo publicado en el gestor reemplaza a REDES
const state = { cat: 'contenido', mode: 'edicion', quarterly: false, carta: 0 };
const catOf = () => D.cats.find((c) => c.key === state.cat) || D.cats[0];
const roundK = (n) => Math.round(n / 1000) * 1000;

/* ---------- precio de cada tarjeta ---------- */
function priceOf(p) {
  const rec = state.mode === 'grabacion';
  const full = rec ? p.rec : p.ed;
  const price = state.quarterly ? roundK(full * (1 - D.quarterlyPct / 100)) : full;
  return {
    label: rec ? 'Con grabación RAKÜN' : 'Solo edición · tú grabas',
    price,
    was: state.quarterly ? full : null,
    note: ['/ mes · antes de IVA', state.quarterly ? 'pago trimestral anticipado' : null].filter(Boolean).join(' · '),
  };
}

// las etiquetas de edición llevan a «Tipos de edición» y abren ese nivel
const levelTag = (k) => {
  const l = LEVELS[k];
  if (!l) return '';
  return `<a class="lvl mono" href="#tipos-de-edicion" data-tier="${l.tier}" style="--l:${l.color}" title="${esc(l.desc)}">${esc(l.name)}<span aria-hidden="true">?</span></a>`;
};

function cardHTML(p, cat) {
  const pr = priceOf(p);
  const rec = state.mode === 'grabacion';
  const subject = `Quiero el plan ${cat.name} ${p.name}`;
  // datos que viajan al formulario "Quiero este plan" (app/lead-form.js)
  const lead = {
    world: 'marca',
    plan: `Redes · ${cat.name} · ${p.name}`,
    detail: [pr.label, state.quarterly ? 'pago trimestral' : null].filter(Boolean).join(' · '),
    price: `${cop(pr.price)} / mes`,
  };
  return `
    <li class="plc${p.hot ? ' plc--hot' : ''}${small && p.hot ? ' is-open' : ''}" style="--c: ${cat.color}">
      <button class="plc__fold" type="button" aria-expanded="${small && p.hot}" aria-label="Ver qué incluye ${esc(cat.name)} ${esc(p.name)}"></button>
      ${p.hot ? '<span class="plc__badge mono">★ Recomendado</span>' : ''}
      <p class="mono plc__tag">${esc(cat.name)}</p>
      <h3 class="plc__name">${esc(p.name)}</h3>
      <p class="plc__ideal">${esc(p.ideal)}</p>
      <div class="plc__price-box">
        <p class="mono plc__label">${esc(pr.label)}</p>
        <p class="plc__price">${copBig(pr.price)}<small>COP</small></p>
        ${pr.was ? `<p class="plc__was">Antes ${cop(pr.was)} / mes</p>` : ''}
        <p class="plc__note">${esc(pr.note)}</p>
      </div>
      <dl class="plc__rows">
        ${p.rows.slice(0, 1).map(([k, v]) => `<div class="plc__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        ${p.levels?.length ? `<div class="plc__row"><dt>Edición</dt><dd class="plc__lvls">${p.levels.map(levelTag).join('')}</dd></div>` : ''}
        ${p.rows.slice(1).map(([k, v]) => `<div class="plc__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        <div class="plc__row"><dt>Grabación</dt><dd>${esc(rec ? p.recText : 'Tú grabas')}</dd></div>
      </dl>
      ${p.ads ? `<p class="plc__ads mono">Pauta sugerida aparte: desde ${cop(p.ads)} / mes · la pagas directo a Meta</p>` : ''}
      <a class="plc__cta" href="mailto:rakundesigns@gmail.com?subject=${encodeURIComponent(subject)}" data-lead="${esc(JSON.stringify(lead))}">Quiero este plan <svg class="ico" aria-hidden="true"><use href="#i-ne"/></svg></a>
    </li>`;
}

/* ---------- la carta del club: categorías que se despliegan ---------- */
function cartaHTML() {
  return D.carta.map((g, i) => {
    const open = state.carta === i;
    return `
    <section class="cg${open ? ' is-open' : ''}">
      <h3 class="cg__h"><button class="cg__btn" type="button" aria-expanded="${open}" aria-controls="cg-${i}" data-carta-i="${i}">
        <span class="mono cg__n">${String(i + 1).padStart(2, '0')}</span><span class="cg__t">${esc(g.name)}</span>
        <span class="mono cg__c">${g.items.length} ${g.items.length === 1 ? 'servicio' : 'servicios'}</span><span class="cg__ic" aria-hidden="true">${open ? '−' : '+'}</span>
      </button></h3>
      <ul class="carta" id="cg-${i}"${open ? '' : ' hidden'}>
        ${g.items.map(([name, cobro, price, desc, out]) => `
        <li${out ? ' class="is-out"' : ''}><span class="carta__name">${esc(name)}${out ? ' <span class="carta__out mono">Agotado</span>' : ''}</span><span class="carta__price"><span class="mono">${esc(cobro)}</span><b>${copBig(price)}</b></span><span class="carta__desc">${esc(desc)}</span></li>`).join('')}
      </ul>
    </section>`;
  }).join('');
}

/* ---------- render ---------- */
const cards = $('[data-cards]');
// celular (opción B del lienzo): los planes son una lista; se abre uno a la vez para ver qué incluye
cards?.addEventListener('click', (e) => {
  const btn = e.target.closest('.plc__fold');
  if (!btn) return;
  const card = btn.closest('.plc');
  const open = !card.classList.contains('is-open');
  $$('.plc', cards).forEach((c) => { c.classList.remove('is-open'); $('.plc__fold', c).setAttribute('aria-expanded', 'false'); });
  card.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
});
let swapTimers = [];

function renderCarta() {
  const box = $('[data-carta]');
  if (box) box.innerHTML = cartaHTML();
}

function render(animate = true) {
  const cat = catOf();
  // pestañas: nombre y frase de cada categoría (pueden venir del gestor)
  $$('[data-cat]').forEach((t) => {
    const c = D.cats.find((x) => x.key === t.dataset.cat);
    if (!c) { t.hidden = true; return; }
    $('[data-cat-name]', t).textContent = c.name;
    $('[data-cat-desc]', t).textContent = c.desc;
    t.style.setProperty('--t', c.color);
  });
  $('[data-head-lede]').textContent = `Todos los videos verticales duran de ${D.duration}; si son más largos, se cotizan aparte. ${D.note}`;
  $('[data-quarterly-pct]').textContent = `−${D.quarterlyPct}%`;
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $('[data-quarterly]').setAttribute('aria-checked', String(state.quarterly));
  // tarjetas (los planes marcados como ocultos en el gestor no se muestran)
  cards.innerHTML = cat.plans.filter((p) => !p.hidden).map((p) => cardHTML(p, cat)).join('');
  // las tarjetas entran a saltos, una tras otra
  swapTimers.forEach(clearTimeout);
  swapTimers = [];
  if (!animate || reduced || small) return;
  cards.classList.add('is-swapping');
  $$('.plc', cards).forEach((c, i) => swapTimers.push(setTimeout(() => c.classList.add('is-in'), 60 + i * 110)));
  swapTimers.push(setTimeout(() => cards.classList.remove('is-swapping'), 60 + 3 * 110 + 200));
}

function setCat(key, focusTab = false) {
  if (!D.cats.some((c) => c.key === key)) return;
  state.cat = key;
  $$('[data-cat]').forEach((t) => {
    const on = t.dataset.cat === key;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focusTab) t.focus();
  });
  $('[data-panel]').setAttribute('aria-labelledby', `tab-${key}`);
  render();
}

function initPlans() {
  // categorías (pestañas con flechas del teclado)
  const tabs = $$('[data-cat]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setCat(t.dataset.cat));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setCat(next.dataset.cat, true);
    });
  });
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode; render(false); }));
  $('[data-quarterly]').addEventListener('click', () => { state.quarterly = !state.quarterly; render(false); });
  $('[data-carta]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-carta-i]');
    if (!b) return;
    const i = Number(b.dataset.cartaI);
    state.carta = state.carta === i ? -1 : i;
    renderCarta();
    $(`[data-carta-i="${i}"]`)?.focus({ preventScroll: true });
  });

  // llega desde el menú con #gestion o #contenido: esa categoría, directo a los planes
  const fromHash = location.hash.slice(1);
  if (fromHash === 'gestion' || fromHash === 'contenido') {
    setCat(fromHash);
  } else render(false);
  renderCarta();

  // lo publicado desde el gestor (si ya tiene la estructura nueva); si no, se quedan los datos de data.js
  loadCatalog('marca').then((c) => {
    if (!isRedes(c)) return;
    D = { ...REDES, ...c };
    if (!D.cats.some((x) => x.key === state.cat)) state.cat = D.cats[0].key;
    render(false);
    renderCarta();
    window.rkLand?.();                                     // si llegaron con #planes, que sigan en los planes
  });
}

/* ==========================================================================
   Botón de emergencia: la mirilla
   ========================================================================== */
function initSos() {
  const box = $('[data-sos]');
  if (!box) return;
  const hatch = $('[data-sos-hatch]', box);
  const dialog = $('[data-sos-dialog]', box);
  let timers = [];
  let open = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  const show = () => {
    if (open) return;
    open = true;
    timers.forEach(clearTimeout);
    timers = [];
    hatch.setAttribute('aria-expanded', 'true');
    if (reduced) {
      box.style.setProperty('--slide', '-101%');
      dialog.hidden = false;
    } else {
      // la rejilla se corre en 3 cuadros, el ojo mira hacia arriba y sale el diálogo
      ['-34%', '-67%', '-101%'].forEach((v, k) => later(k * 90, () => box.style.setProperty('--slide', v)));
      later(300, () => { dialog.hidden = false; dialog.className = 'sos__dialog is-pop-0'; });
      later(390, () => { dialog.className = 'sos__dialog is-pop-1'; });
      later(480, () => { dialog.className = 'sos__dialog'; });
    }
    box.style.setProperty('--ix', '96px');
    box.style.setProperty('--iy', '52px');
  };
  const hide = () => {
    if (!open) return;
    open = false;
    timers.forEach(clearTimeout);
    timers = [];
    hatch.setAttribute('aria-expanded', 'false');
    dialog.hidden = true;
    box.style.setProperty('--slide', '0%');
    box.style.setProperty('--ix', '118px');
    box.style.setProperty('--iy', '76px');
  };

  if (fine) {
    box.addEventListener('pointerenter', show);
    box.addEventListener('pointerleave', hide);
  }
  hatch.addEventListener('click', () => (open ? hide() : show()));
  box.addEventListener('focusout', (e) => { if (!box.contains(e.relatedTarget)) hide(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); hatch.focus(); } });

  // cerrada, la mirilla "toca" cada ~5 s
  if (!reduced) {
    setInterval(() => {
      if (open) return;
      hatch.classList.remove('is-knocking');
      void hatch.offsetWidth;
      hatch.classList.add('is-knocking');
    }, 5000);
  }
}

/* ---------- Estrategia: "Ver más" despliega el detalle de cada pilar ---------- */
function initPillars() {
  $$('.pillar__more').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const label = btn.firstChild;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Ver menos' : 'Ver más';
      btn.closest('.pillar').classList.toggle('is-open', open);
      panel.hidden = !open;
    });
  });
}


/* ---------- smooth scroll + anclas ---------- */
let lenis = null;
function initLenis() {
  if (lenis || reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.16, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    // las categorías del menú (#contenido, #gestion) cambian la pestaña
    if (id === 'contenido' || id === 'gestion') {
      e.preventDefault();
      closeMenu();
      setCat(id);
      const target = $('#planes');
      if (lenis) lenis.scrollTo(target, { duration: 1 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    // una etiqueta Ágil / Pro / Premium: baja a «Tipos de edición» y abre ese nivel
    if (a.dataset.tier !== undefined) {
      e.preventDefault();
      const target = document.getElementById('tipos-de-edicion');
      if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.1 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      setTimeout(() => openTier(Number(a.dataset.tier)), reduced ? 0 : 700);
      return;
    }
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
}

/* Llegar con un enlace directo (marca.html#planes, #gestion, #extras…): el navegador salta
   antes de que carguen las imágenes y la página sigue creciendo, así que se queda corto.
   Se vuelve a apuntar al destino cuando todo carga y cuando llegan los planes del gestor.
   Mientras tanto el scroll es el normal del navegador: el suave (Lenis) se queda con el alto
   viejo de la página y no deja llegar, así que arranca después de aterrizar. */
function landOnHash() {
  const id = location.hash.slice(1);
  const target = () => (id ? document.getElementById(id === 'contenido' || id === 'gestion' ? 'planes' : id) : null);
  if (!target()) return false;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let userMoved = false;
  let done = false;
  ['wheel', 'touchstart', 'keydown'].forEach((t) => window.addEventListener(t, () => { userMoved = true; }, { once: true, passive: true }));
  const go = () => {
    if (userMoved || done || !target()) return;
    // la página tiene scroll-behavior: smooth; para aterrizar el salto tiene que ser instantáneo
    window.scrollTo({ top: Math.max(0, target().getBoundingClientRect().top + window.scrollY - 40), behavior: 'instant' });
  };
  const finish = () => { if (done) return; go(); done = true; initLenis(); };
  [0, 300, 900].forEach((ms) => setTimeout(go, ms));
  window.addEventListener('load', () => { go(); setTimeout(go, 400); setTimeout(finish, 1500); }, { once: true });
  setTimeout(finish, 6000);                                  // por si la página tarda en terminar de cargar
  window.rkLand = go;                                       // initPlans lo llama al pintar los planes del gestor
  return true;
}

/* ==========================================================================
   Arranque
   ========================================================================== */
initClock();
if (!landOnHash()) initLenis();               // llegaron con #planes, #extras…: Lenis arranca al aterrizar
initHeader(() => lenis);
initMegaMenu();
initCursor();
initAnchors();
initFormats();
initPlans();
initSos();
initPillars();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).explore();   // no persigue el cursor
