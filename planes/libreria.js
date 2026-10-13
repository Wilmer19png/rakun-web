/* ==========================================================================
   RAKÜN — Librería de formatos (libreria.html)
   Todos los formatos de Redes, una sección por grupo de perfiles (REDES.library
   en planes/data.js, o lo publicado en el gestor). Cada tarjeta dice qué tipo
   de edición lleva y cuánto cuesta suelta (el precio sale de la carta del club),
   y abre debajo su pestaña de ejemplos.
   ========================================================================== */
import { RakunEye } from '../eye.js';
import { $, $$, reduced, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';
import { placeholders, fillDrawer, shutDrawer, showDrawer } from './formatos.js';
import { REDES, PIECES, priceInCarta, isRedes } from './data.js';
import { loadCatalog } from '../app/catalog.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const cop = (n) => `<span class="cur">$</span>${Number(n).toLocaleString('es-CO')}`;

let D = REDES;                                            // lo publicado en el gestor reemplaza a REDES
let open = null;                                          // { sec, i } o null
const groupOf = (key) => D.library.find((g) => g.key === key);
const priceOf = (piece) => {
  const p = PIECES[piece];
  const c = p && priceInCarta(D, p.item);
  return c ? `${cop(c.price)} <span class="mono">${esc(c.unit.toLowerCase())}</span>` : '';
};

const cardHTML = (id) => ([name, desc, piece], i) => {
  const p = PIECES[piece] || { name: piece, color: 'var(--mist)' };
  const price = priceOf(piece);
  return `
  <li><button class="fx-card" type="button" data-i="${i}" aria-expanded="false" aria-controls="drawer-${id}">
    <span class="fx-card__meta mono"><span>${pad(i + 1)}</span><span class="lvl lvl--tag" style="--l: ${p.color}">${esc(p.name)}</span></span>
    <span class="fx-card__name">${esc(name)}</span>
    <span class="fx-card__desc">${esc(desc)}</span>
    ${price ? `<span class="fx-card__price">${price}</span>` : ''}
    <span class="fx-card__foot mono"><span>Ver ejemplos</span><span class="fx-card__arrow" aria-hidden="true">↓</span></span>
  </button></li>`;
};

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
  const g = groupOf(id);
  const [name, desc, piece] = g.formats[i];
  const btn = $(`.fx-card[data-i="${i}"]`, sec);
  btn.classList.add('is-on');
  btn.setAttribute('aria-expanded', 'true');
  const drawer = $('[data-fx-drawer]', sec);
  fillDrawer(drawer, { kicker: `${PIECES[piece]?.name || piece} · ${g.title}`, title: name, desc, examples: placeholders(id) });
  showDrawer(drawer);
  open = { sec, i };
}

// cada grupo de perfiles: su enlace en el índice y su sección (tarjetas + pestaña de ejemplos)
const idxHTML = (g) => `<a class="fx-who__btn" href="#${esc(g.key)}" style="--t: ${g.color}"><span class="mono">${esc(g.profiles.slice(0, 3).join(' · '))}</span>${esc(g.title)}</a>`;
const secHTML = (g) => `
  <section class="lib__sec" id="${esc(g.key)}" aria-labelledby="h-${esc(g.key)}" data-lib-sec="${esc(g.key)}" style="--t: ${g.color}">
    <div class="fx-head">
      <h2 class="fx-head__title" id="h-${esc(g.key)}"><mark>${esc(g.title)}</mark></h2>
      <p class="mono fx-head__note">${g.formats.length} formatos</p>
    </div>
    ${g.profiles.length ? `<ul class="lib__for" aria-label="Para quién es"><li class="mono">Para:</li>${g.profiles.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <ul class="lib__grid" aria-label="Formatos: ${esc(g.title)}">${g.formats.map(cardHTML(g.key)).join('')}</ul>
    <div class="fx-drawer" id="drawer-${esc(g.key)}" data-fx-drawer inert>
      <div class="fx-drawer__in">
        <div class="fx-drawer__panel">
          <div class="fx-drawer__head">
            <div>
              <p class="mono fx-drawer__kicker" data-fx-kicker></p>
              <h3 class="fx-drawer__title" data-fx-title></h3>
              <p class="fx-drawer__desc" data-fx-desc></p>
            </div>
            <div class="fx-drawer__side"><span class="mono" data-fx-count></span><button class="fx-x" type="button" data-fx-close aria-label="Cerrar ejemplos">✕</button></div>
          </div>
          <div class="fx-videos" data-fx-videos></div>
        </div>
      </div>
    </div>
  </section>`;

function renderLibrary() {
  close();
  const groups = D.library.filter((g) => g.formats.length);
  const idx = $('[data-lib-idx]');
  $$('.fx-who__btn', idx).forEach((a) => a.remove());
  $('[data-lib-total]').insertAdjacentHTML('beforebegin', groups.map(idxHTML).join(''));
  $('[data-lib-total]').textContent = `${groups.reduce((n, g) => n + g.formats.length, 0)} formatos · ${groups.length} grupos`;
  $('[data-lib-groups]').innerHTML = groups.map(secHTML).join('');
}

function initLibrary() {
  // las secciones se rehacen si llega lo publicado en el gestor: los clics se escuchan desde afuera
  $('[data-lib-groups]').addEventListener('click', (e) => {
    const sec = e.target.closest('[data-lib-sec]');
    if (!sec) return;
    if (e.target.closest('[data-fx-close]')) { close(); return; }
    const b = e.target.closest('.fx-card');
    if (b) toggle(sec, Number(b.dataset.i));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  renderLibrary();
  loadCatalog('marca').then((c) => {
    if (!isRedes(c) || !Array.isArray(c.library)) return;
    D = { ...REDES, ...c };
    renderLibrary();
  });
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
  // si llegan desde Redes con #creador / #medico / #mentor
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
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).explore();   // no persigue el cursor
