/* ==========================================================================
   RAKÜN — planes.js
   Planes de marca personal. Datos de Tarifas_RAKUN_2026.xlsx (hojas de cara
   al cliente: Creadores, Salud, Planes mensuales, extras y condiciones).
   Precios en COP antes de IVA. Para cambiar un precio, edita DATA.
   ========================================================================== */

import { RakunEye } from '../eye.js';
import { initFormats } from './formatos.js';
import { DATA, SESSION_PRICE } from './data.js';
import { loadCatalog } from '../app/catalog.js';
import { $, $$, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu, waLink } from '../common.js';




/* ---------- utilidades ---------- */
const cop = (n) => (typeof n === 'number' ? `$${n.toLocaleString('es-CO')}` : n);
// en tipografía display el "$" de Knuckle Down parece una barra: va en la tipografía de texto
const copBig = (n) => (typeof n === 'number' ? `<span class="cur">$</span>${n.toLocaleString('es-CO')}` : n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- estado ---------- */
const state = { profile: 'creador', line: 'flujo', mode: 'edicion', quarterly: false };

/* ---------- precio de cada tarjeta ---------- */
function priceOf(p) {
  if (state.profile !== 'creador') {
    return {
      label: state.profile === 'medico' ? 'Precio mensual · pauta aparte' : 'Precio mensual',
      price: p.price, was: null,
      note: state.profile === 'medico' ? `/ mes · antes de IVA · pauta sugerida desde ${cop(p.ads)} / mes, aparte*` : '/ mes · antes de IVA',
    };
  }
  const rec = state.mode === 'grabacion';
  const base = state.quarterly ? p.tri : p.ed;
  const price = base + (rec ? p.sessions * SESSION_PRICE : 0);
  const full = p.ed + (rec ? p.sessions * SESSION_PRICE : 0);
  const sess = `${p.sessions} ${p.sessions > 1 ? 'sesiones' : 'sesión'} de grabación`;
  return {
    label: rec ? 'Con grabación RAKÜN' : 'Solo edición · tú grabas',
    price,
    was: state.quarterly ? full : null,
    note: [
      '/ mes · antes de IVA',
      rec ? `incluye ${sess}` : null,
      state.quarterly ? 'pago trimestral anticipado' : null,
    ].filter(Boolean).join(' · '),
  };
}

function cardHTML(p, color) {
  const pr = priceOf(p);
  const subject = `Quiero el plan ${p.tag} ${p.name}`;
  // datos que viajan al formulario "Quiero este plan" (app/lead-form.js)
  const who = { creador: 'Creador', medico: 'Médico', mentor: 'Mentor' }[state.profile];
  const lead = {
    world: 'marca',
    plan: `${who} · ${p.tag} · ${p.name}`,
    detail: [pr.label, state.quarterly && state.profile === 'creador' ? 'pago trimestral' : null].filter(Boolean).join(' · '),
    price: `${cop(pr.price)} / mes`,
  };
  return `
    <li class="plc${p.hot ? ' plc--hot' : ''}" style="--c: ${color}">
      ${p.hot ? '<span class="plc__badge mono">★ Más elegido</span>' : ''}
      <p class="mono plc__tag">${esc(p.tag)}</p>
      <h3 class="plc__name">${esc(p.name)}</h3>
      <p class="plc__ideal">${esc(p.ideal)}</p>
      <div class="plc__price-box">
        <p class="mono plc__label">${esc(pr.label)}</p>
        <p class="plc__price">${copBig(pr.price)}<small>COP</small></p>
        ${pr.was ? `<p class="plc__was">Antes ${cop(pr.was)} / mes</p>` : ''}
        <p class="plc__note">${esc(pr.note)}</p>
      </div>
      <dl class="plc__rows">
        ${p.rows.map(([k, v]) => `<div class="plc__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <a class="plc__cta" href="mailto:rakundesigns@gmail.com?subject=${encodeURIComponent(subject)}" data-lead="${esc(JSON.stringify(lead))}">Quiero este plan <svg class="ico" aria-hidden="true"><use href="#i-ne"/></svg></a>
    </li>`;
}

function specialHTML(profile) {
  if (profile === 'creador') {
    return `
      <div class="quiz">
        <div><p class="mono quiz__kicker">¿No sabes cuál elegir?</p><p class="quiz__title">Responde 6 preguntas y te decimos cuál.</p></div>
        <div>
          <ul class="quiz__qs mono">
            <li>¿Muchos reels o reels elaborados?</li><li>¿En qué etapa estás?</li><li>¿Cuánto quieres invertir?</li>
            <li>¿Quién graba?</li><li>¿Quieres pauta?</li><li>¿Qué es lo más importante?</li>
          </ul>
          <a class="quiz__cta" href="${waLink('Hola RAKÜN, quiero que me ayuden a elegir mi plan de creador.')}" target="_blank" rel="noopener" data-whatsapp-dyn>Encontrar mi plan →</a>
        </div>
      </div>`;
  }
  if (profile === 'medico') {
    return `
      <div class="gear-why">
        <p class="mono gear-why__kicker">¿Por qué cuesta lo que cuesta?</p>
        <p class="gear-why__title">Lo que llega a tu <em>consultorio.</em></p>
        <ul class="gear-why__grid">${DATA.medico.gear.map(([n, g]) => `<li><b>${esc(n)}</b><span>${esc(g)}</span></li>`).join('')}</ul>
        <p class="mono gear-why__note">* La inversión en pauta se paga directamente a Meta con la tarjeta del consultorio; con menos inversión llegan menos pacientes potenciales. Contenido ético y verificable: nunca prometemos curas ni resultados garantizados.</p>
      </div>`;
  }
  return `
    <div class="includes">
      <p class="mono includes__kicker">Todos los planes incluyen</p>
      <ul class="includes__chips mono">
        <li style="--c: var(--yellow)">Investigación y estrategia</li><li style="--c: var(--blue)">Ideas de contenido</li><li style="--c: var(--pink)">Plan de contenidos</li>
        <li style="--c: var(--yellow)">Guiones</li><li style="--c: var(--blue)">Edición</li><li style="--c: var(--pink)">Publicación</li>
      </ul>
      <p class="includes__text">Comprado por piezas sueltas te sale parecido o más barato, pero sin la estrategia, los guiones y la publicación: eso es lo que hace que funcione.</p>
    </div>`;
}

/* ---------- render ---------- */
const cards = $('[data-cards]');
let swapTimers = [];

function render(animate = true) {
  const d = DATA[state.profile];
  // encabezado
  $('[data-head-kicker]').textContent = d.head.kicker;
  $('[data-head-lede]').textContent = d.head.lede;
  // interruptores (solo creadores)
  $('[data-switches]').hidden = state.profile !== 'creador';
  $$('[data-line]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.line === state.line)));
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $('[data-quarterly]').setAttribute('aria-checked', String(state.quarterly));
  // tarjetas
  // los planes marcados como ocultos en el gestor no se muestran
  const plans = (state.profile === 'creador' ? d.lines[state.line] : d.plans).filter((p) => !p.hidden);
  cards.innerHTML = plans.map((p) => cardHTML(p, d.color)).join('');
  $('[data-special]').innerHTML = specialHTML(state.profile);
  // la carta: lo marcado como agotado sale tachado y no se puede pedir
  $('[data-carta]').innerHTML = d.extras.map(([name, cobro, price, desc, out]) => `
    <li${out ? ' class="is-out"' : ''}><span class="carta__name">${esc(name)}${out ? ' <span class="carta__out mono">Agotado</span>' : ''}</span><span class="carta__price"><span class="mono">${esc(cobro)}</span><b>${copBig(price)}</b></span><span class="carta__desc">${esc(desc)}</span></li>`).join('');
  // las tarjetas entran a saltos, una tras otra
  swapTimers.forEach(clearTimeout);
  swapTimers = [];
  if (!animate || reduced) return;
  cards.classList.add('is-swapping');
  $$('.plc', cards).forEach((c, i) => swapTimers.push(setTimeout(() => c.classList.add('is-in'), 60 + i * 110)));
  swapTimers.push(setTimeout(() => cards.classList.remove('is-swapping'), 60 + 3 * 110 + 200));
}

function setProfile(p, focusTab = false) {
  if (!DATA[p]) return;
  state.profile = p;
  $$('[data-profile]').forEach((t) => {
    const on = t.dataset.profile === p;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focusTab) t.focus();
  });
  $('[data-panel]').setAttribute('aria-labelledby', `tab-${p}`);
  history.replaceState(null, '', `#${p}`);
  render();
}

function initPlans() {
  // perfiles (pestañas con flechas del teclado)
  const tabs = $$('[data-profile]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setProfile(t.dataset.profile));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setProfile(next.dataset.profile, true);
    });
  });
  $$('[data-line]').forEach((b) => b.addEventListener('click', () => { state.line = b.dataset.line; render(); }));
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode; render(false); }));
  $('[data-quarterly]').addEventListener('click', () => { state.quarterly = !state.quarterly; render(false); });

  const fromHash = location.hash.slice(1);
  if (DATA[fromHash]) {
    setProfile(fromHash);
    requestAnimationFrame(() => $('#planes').scrollIntoView());   // llega desde otra página: directo a los planes
  } else render(false);

  // precios publicados desde el gestor (si hay); si no, se quedan los de data.js
  loadCatalog('marca').then((c) => {
    if (!c) return;
    ['creador', 'medico', 'mentor'].forEach((k) => { if (c[k]) DATA[k] = c[k]; });
    render(false);
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
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.16, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    // los perfiles del menú (#creador, #medico, #mentor) cambian la pestaña
    if (DATA[id]) {
      e.preventDefault();
      closeMenu();
      setProfile(id);
      const target = $('#planes');
      if (lenis) lenis.scrollTo(target, { duration: 1 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
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

/* ==========================================================================
   Arranque
   ========================================================================== */
initClock();
initLenis();
initHeader(() => lenis);
initMegaMenu();
initCursor();
initAnchors();
initFormats();
initPlans();
initSos();
initPillars();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).followCursor();
