/* ==========================================================================
   RAKÜN — Librería de formatos (libreria.html)
   Todos los formatos de Marca personal, una sección por perfil. Cada tarjeta
   abre debajo su pestaña de ejemplos (la misma de "Tipos de edición").
   ========================================================================== */
import { RakunEye } from '../eye.js';
import { $, $$, reduced, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';
import { FORMATS, placeholders, fillDrawer, shutDrawer, showDrawer } from './formatos.js';

const WHO = { creador: 'Creador', medico: 'Médico', mentor: 'Mentor' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

let open = null;                                          // { sec, i } o null

const cardHTML = (id) => ([name, desc, unit], i) => `
  <li><button class="fx-card" type="button" data-i="${i}" aria-expanded="false" aria-controls="drawer-${id}">
    <span class="fx-card__meta mono">${pad(i + 1)} · ${esc(unit)}</span>
    <span class="fx-card__name">${esc(name)}</span>
    <span class="fx-card__desc">${esc(desc)}</span>
    <span class="fx-card__foot mono"><span>Ver ejemplos</span><span class="fx-card__arrow" aria-hidden="true">↓</span></span>
  </button></li>`;

function close() {
  if (!open) return;
  shutDrawer($('[data-fx-drawer]', open.sec));
  $$('.fx-card', open.sec).forEach((b) => { b.classList.remove('is-on'); b.setAttribute('aria-expanded', 'false'); });
  open = null;
}

function toggle(sec, i) {
  const same = open && open.sec === sec && open.i === i;
  close();
  if (same) return;
  const id = sec.dataset.libSec;
  const [name, desc, unit] = FORMATS[id][i];
  const btn = $(`.fx-card[data-i="${i}"]`, sec);
  btn.classList.add('is-on');
  btn.setAttribute('aria-expanded', 'true');
  const drawer = $('[data-fx-drawer]', sec);
  fillDrawer(drawer, { kicker: `${unit} · ${WHO[id]}`, title: name, desc, examples: placeholders(id) });
  showDrawer(drawer);
  open = { sec, i };
}

function initLibrary() {
  $$('[data-lib-sec]').forEach((sec) => {
    const id = sec.dataset.libSec;
    $('[data-lib-cards]', sec).innerHTML = FORMATS[id].map(cardHTML(id)).join('');
    $('[data-lib-n]', sec).textContent = FORMATS[id].length;
    $$('.fx-card', sec).forEach((b) => b.addEventListener('click', () => toggle(sec, Number(b.dataset.i))));
    $('[data-fx-close]', sec).addEventListener('click', close);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------- smooth scroll + anclas (#creador, #medico, #mentor) ---------- */
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
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.1 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  // si llegan desde Marca personal con #creador / #medico / #mentor
  const start = location.hash && document.getElementById(location.hash.slice(1));
  if (start) setTimeout(() => (lenis ? lenis.scrollTo(start, { offset: -90, immediate: true }) : start.scrollIntoView()), 60);
}

initClock();
initLenis();
initHeader(() => lenis);
initMegaMenu();
initCursor();
initLibrary();
initAnchors();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).followCursor();
