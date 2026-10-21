/* ==========================================================================
   RAKÜN — common.js
   Lo que comparten todas las páginas: reloj (hora de Colombia), WhatsApp y redes, header (se esconde al
   bajar + menú móvil), menú "Lo que hacemos" y cursor personalizado.
   ========================================================================== */

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const root = document.documentElement;
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------- Contacto: WhatsApp y redes (se cambian solo aquí) ---------- */
export const WHATSAPP = '573504461460';                      // +57 350 446 1460
export const SOCIAL = {
  instagram: 'https://www.instagram.com/rakun.designs/',
  tiktok: 'https://www.tiktok.com/@rakn.design',
  behance: 'https://www.behance.net/rakundesign',
};
export const waLink = (text = 'Hola RAKÜN, quiero más información.') => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

// Todo enlace a wa.me sale con el número de RAKÜN; data-whatsapp="…" pone el mensaje ya escrito.
export function initContact(scope = document) {
  $$('a[href^="https://wa.me/"], a[data-whatsapp]', scope).forEach((a) => {
    a.href = waLink(a.dataset.whatsapp);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('a[data-social]', scope).forEach((a) => { if (SOCIAL[a.dataset.social]) a.href = SOCIAL[a.dataset.social]; });
}
initContact();

/* ---------- WhatsApp flotante (solo en la página, no en el gestor) ---------- */
// lleva el mismo mensaje del pie de esa página («vi los planes de Redes…», «vi el proyecto…»)
function initWaFab() {
  if (!document.querySelector('[data-header]') || document.querySelector('.wa-fab')) return;
  const foot = document.querySelector('a[data-wa-from="Pie de página"]') || document.querySelector('footer a[data-whatsapp]');
  const a = document.createElement('a');
  a.className = 'wa-fab';
  a.dataset.whatsapp = foot?.dataset.whatsapp || 'Hola RAKÜN, vi su página y quiero más información.';
  a.dataset.waFrom = 'Botón flotante';
  if (foot?.hasAttribute('data-wa-project')) a.setAttribute('data-wa-project', '');
  a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
  a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.3 28.8l6.6-1.7A12.7 12.7 0 1 0 16 3.2Zm0 23.2c-2 0-3.9-.5-5.5-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.5 10.5 0 1 1 16 26.4Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.6-1.9-1.7-2.2-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.9 5.1 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4Z"/></svg>';
  a.href = waLink(a.dataset.whatsapp);
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.append(a);
}
initWaFab();

// píxel de Meta: cada vez que alguien abre WhatsApp desde la página (también enlaces creados después)
// y nuestro contador (11 · Métricas → WhatsApp): desde qué página y qué botón
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="https://wa.me/"]');
  if (!a) return;
  window.rkTrack?.('Contact', { content_name: 'WhatsApp' });
  const from = a.dataset.waFrom || (a.closest('footer') ? 'Pie de página' : a.closest('[data-sos]') ? '¿Ningún plan te cuadra?' : a.closest('section[id]')?.id || 'Botón');
  const slug = new URLSearchParams(location.search).get('p');
  const page = location.pathname.split('/').pop() || 'index.html';
  window.rkEvent?.('whatsapp', from, slug ? `${page}?p=${slug}` : page);
});

/* ---------- Reloj (hora de Colombia) ---------- */
export function initClock() {
  const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
  const els = $$('[data-clock]');
  const tick = () => {
    const now = new Date();
    const t = fmt.format(now);
    els.forEach((el) => { el.textContent = t; el.dateTime = now.toISOString(); });
  };
  tick();
  setInterval(tick, 15000);
}

/* ---------- Header: se esconde al bajar, menú móvil ---------- */
let getLenis = () => null;
const header = $('[data-header]');
const menuBtn = $('[data-menu]');

export function closeMenu() {
  closeMega();
  if (!root.classList.contains('menu-open')) return;
  root.classList.remove('menu-open');
  menuBtn?.setAttribute('aria-expanded', 'false');
  const label = menuBtn?.querySelector('.hdr__menu-label');
  if (label) label.textContent = 'Menú';
  getLenis()?.start();
}

export function initHeader(lenisGetter) {
  if (lenisGetter) getLenis = lenisGetter;
  if (!header) return;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (!root.classList.contains('menu-open')) {
      const hide = y > lastY && y > 240;
      header.classList.toggle('is-hidden', hide);
      if (hide) closeMega();
    }
    lastY = y;
  }, { passive: true });

  const mnav = buildMobileNav();
  menuBtn?.addEventListener('click', () => {
    const open = !root.classList.contains('menu-open');
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.hdr__menu-label').textContent = open ? 'Cerrar' : 'Menú';
    if (open) getLenis()?.stop(); else getLenis()?.start();
    if (open && mnav && getComputedStyle(mnav).display !== 'none') $('[data-mnav-close]', mnav).focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  $$('.hdr__nav a').forEach((a) => a.addEventListener('click', closeMenu));
  initNavSpy();
  initStart();
}

/* ---------- "Iniciar proyecto": primero eliges el mundo y te lleva a sus planes ----------
   Cualquier enlace con data-start abre este cuadro (sin JS, el enlace va a #planes). */
const START = [
  { href: 'marca.html#planes', go: 'Ver los planes' },
  { href: 'produccion.html#guion', go: 'Escribir tu guion de cotización' },
  { href: 'web.html#planes', go: 'Ver los planes' },
];
let startBox = null;
let startFrom = null;
function closeStart() {
  if (!startBox || startBox.hidden) return;
  startBox.hidden = true;
  root.classList.remove('start-open');
  getLenis()?.start();
  startFrom?.focus({ preventScroll: true });
}
function openStart(from) {
  if (!startBox) {
    startBox = document.createElement('div');
    startBox.className = 'start';
    startBox.hidden = true;
    startBox.innerHTML = `
      <div class="start__scrim" data-start-close></div>
      <div class="start__box" role="dialog" aria-modal="true" aria-labelledby="start-title" tabindex="-1" data-lenis-prevent>
        <button class="start__x mono" type="button" data-start-close aria-label="Cerrar">✕</button>
        <p class="mono start__k">Iniciar proyecto</p>
        <h2 class="start__title" id="start-title">¿Qué quieres <em>iniciar?</em></h2>
        <div class="start__list">${WORLDS.map((w, i) => `
          <a class="start__ticket" href="${START[i].href}" style="--t: ${w.c}">
            <span class="mono start__tags">${w.n} · ${w.tags}</span>
            <span class="start__name">${w.name}</span>
            <span class="mono start__go">${START[i].go} →</span>
          </a>`).join('')}</div>
      </div>`;
    document.body.append(startBox);
    $$('[data-start-close]', startBox).forEach((b) => b.addEventListener('click', closeStart));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStart(); });
  }
  startFrom = from;
  startBox.hidden = false;
  root.classList.add('start-open');
  getLenis()?.stop();
  $('.start__box', startBox).focus({ preventScroll: true });
}
function initStart() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-start]');
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();                                 // antes que el desplazamiento a #planes de la página
    closeMenu();
    openStart(a);
  }, true);
}

/* ---------- Menú de celular (opción C del lienzo) ----------
   Papel crema: los 3 mundos como boletos ("Estás aquí" en el actual), las
   secciones de esta página en cuadrícula y abajo una franja azul con el botón
   principal, iniciar sesión y WhatsApp. Se arma con lo que ya trae cada página. */
const WORLDS = [
  { re: /marca|libreria/, href: 'marca.html', n: '01', name: 'Redes', tags: 'Creadores · Médicos · Mentores', c: 'var(--yellow)' },
  { re: /produccion/, href: 'produccion.html', n: '02', name: 'Producción audiovisual', tags: 'Videoclips · Cortos · Comerciales', c: 'var(--blue)' },
  { re: /web\.html/, href: 'web.html', n: '03', name: 'Web y apps', tags: 'Sitios · Tiendas · Apps', c: 'var(--pink)' },
];
const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildMobileNav() {
  if (!header || !menuBtn) return null;
  const page = location.pathname.toLowerCase();
  const sections = $$('.hdr__nav > ul > li > a', header).map((a) => {
    const href = a.getAttribute('href') || '#';
    const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
    const num = target?.querySelector('.rail__num')?.textContent.trim() || '';
    return `<a class="mnav__sec" href="${escHTML(href)}"><span>${escHTML(a.textContent.trim())}</span><span class="mono">${escHTML(num)}</span></a>`;
  }).join('');
  const cta = $('.hdr__cta', header);
  const login = $('.hdr__login', header);
  const nav = document.createElement('div');
  nav.className = 'mnav';
  nav.id = 'mnav';
  nav.setAttribute('role', 'dialog');
  nav.setAttribute('aria-modal', 'true');
  nav.setAttribute('aria-label', 'Menú');
  nav.setAttribute('data-lenis-prevent', '');             // el scroll suave no se queda con el dedo: el menú baja hasta el final
  nav.innerHTML = `
    <div class="mnav__top">
      <a class="mnav__logo" href="index.html" aria-label="RAKÜN, ir al inicio">RAK<span>Ü</span>N</a>
      <button class="mnav__close mono" type="button" data-mnav-close>Cerrar <span aria-hidden="true">✕</span></button>
    </div>
    <nav class="mnav__body" aria-label="Principal">
      <p class="mono mnav__k">Lo que hacemos</p>
      <div class="mnav__worlds">${WORLDS.map((w) => `
        <a class="mnav__ticket" href="${w.href}" style="--t: ${w.c}"${w.re.test(page) ? ' aria-current="page"' : ''}>
          <span class="mono mnav__tags">${w.n} · ${w.tags}</span>
          <span class="mnav__name">${w.name}</span>
          ${w.re.test(page) ? '<span class="mono mnav__here">Estás aquí</span>' : ''}
          <svg class="ico" aria-hidden="true"><use href="#i-ne"/></svg>
        </a>`).join('')}</div>
      ${sections ? `<p class="mono mnav__k">En esta página</p><div class="mnav__secs">${sections}</div>` : ''}
    </nav>
    <div class="mnav__foot">
      ${cta ? `<a class="mnav__cta" href="${escHTML(cta.getAttribute('href'))}"${cta.hasAttribute('data-start') ? ' data-start' : ''}>${escHTML(cta.textContent.trim())} <span aria-hidden="true">↗</span></a>` : ''}
      <div class="mnav__row">
        ${login ? `<a class="mnav__ghost mono" href="${escHTML(login.getAttribute('href'))}">Iniciar sesión</a>` : ''}
        <a class="mnav__ghost mono" href="${waLink()}" target="_blank" rel="noopener">WhatsApp ↗</a>
      </div>
      <div class="mnav__end">
        <a class="mono mnav__back" href="index.html?alcantarilla">← Volver a la alcantarilla</a>
        <span class="mono mnav__clock">Pereira · <time data-mnav-clock>--:--</time></span>
      </div>
    </div>`;
  document.body.append(nav);
  $('[data-mnav-close]', nav).addEventListener('click', closeMenu);
  $$('a', nav).forEach((a) => a.addEventListener('click', closeMenu));
  // la hora, aparte del reloj del encabezado
  const clock = $('[data-mnav-clock]', nav);
  const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => { clock.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 30000);
  menuBtn.setAttribute('aria-controls', 'mnav');
  return nav;
}

/* ---------- El nav de cada página marca la sección en la que estás ---------- */
function initNavSpy() {
  const links = $$('.hdr__nav a[data-spy]');
  const targets = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (!targets.length) return;
  let current = null;
  const mark = (id) => {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      const on = a.getAttribute('href') === `#${id}`;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  };
  // "actual" = la última sección enlazada cuyo inicio ya pasó la mitad de la pantalla
  let queued = false;
  const update = () => {
    queued = false;
    const mid = window.innerHeight * 0.5;
    let id = '';
    targets.forEach((t) => { if (t.getBoundingClientRect().top <= mid) id = t.id; });
    mark(id);
  };
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- Menú "Lo que hacemos": los dos mundos de RAKÜN ---------- */
const megaBtn = $('[data-mega-btn]');
const mega = $('[data-mega]');

function closeMega() {
  if (!megaBtn || megaBtn.getAttribute('aria-expanded') !== 'true') return;
  megaBtn.setAttribute('aria-expanded', 'false');
  mega.classList.remove('is-open');
}

export function initMegaMenu() {
  if (!megaBtn || !mega) return;
  megaBtn.addEventListener('click', (e) => {
    const open = megaBtn.getAttribute('aria-expanded') !== 'true';
    megaBtn.setAttribute('aria-expanded', String(open));
    mega.classList.toggle('is-open', open);
    // con teclado (detail 0) el foco entra al panel; con el mouse no
    if (open && e.detail === 0) $('a', mega)?.focus({ preventScroll: true });
  });
  // Se cierra al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (megaBtn.getAttribute('aria-expanded') !== 'true') return;
    if (!mega.contains(e.target) && !megaBtn.contains(e.target)) closeMega();
  });
  // Al salir del panel con el teclado, se cierra
  mega.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !mega.contains(e.relatedTarget) && e.relatedTarget !== megaBtn) closeMega();
  });
}

/* ---------- Cursor personalizado ---------- */
export function initCursor() {
  if (!fine) return;
  const cursor = $('.cursor');
  if (!cursor) return;
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  root.classList.add('has-cursor');
  let x = -100, y = -100, rx = -100, ry = -100, s = 1, sTarget = 1, last = 0;
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.remove('is-hidden');
    const hit = e.target.closest?.('a, button, [data-eye-target]');
    cursor.classList.toggle('is-link', !!hit);
    sTarget = hit ? 1.9 : 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  // La escala va dentro del mismo transform (después del translate): con la propiedad
  // CSS `scale` también se escalaba la posición y el aro se alejaba del puntero.
  const loop = (now) => {
    const dt = Math.min(0.05, (now - (last || now)) / 1000) || 1 / 60;
    last = now;
    const k = reduced ? 1 : 1 - Math.pow(0.65, dt * 60);   // seguimiento estable aunque bajen los fps
    rx += (x - rx) * k;
    ry += (y - ry) * k;
    s += (sTarget - s) * (reduced ? 1 : 1 - Math.pow(0.8, dt * 60));
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${s.toFixed(3)})`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
