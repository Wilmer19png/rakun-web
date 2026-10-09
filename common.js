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
}

/* ---------- Menú de celular (opción C del lienzo) ----------
   Papel crema: los 3 mundos como boletos ("Estás aquí" en el actual), las
   secciones de esta página en cuadrícula y abajo una franja azul con el botón
   principal, iniciar sesión y WhatsApp. Se arma con lo que ya trae cada página. */
const WORLDS = [
  { re: /marca|libreria/, href: 'marca.html', n: '01', name: 'Marca personal', tags: 'Creadores · Médicos · Mentores', c: 'var(--yellow)' },
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
      ${cta ? `<a class="mnav__cta" href="${escHTML(cta.getAttribute('href'))}">${escHTML(cta.textContent.trim())} <span aria-hidden="true">↗</span></a>` : ''}
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
