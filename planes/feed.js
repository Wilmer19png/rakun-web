/* ==========================================================================
   Marca personal · el celular del header y el antes/después de "Ser visto".
   Todo es decorativo (aria-hidden) y solo corre mientras se ve en pantalla.
   ========================================================================== */
import { $, $$, reduced } from '../common.js';

const fmt = (n) => Math.round(n).toLocaleString('es-CO');
const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.', ',')}K` : String(Math.round(n)));
const pick = (arr, i) => arr[i % arr.length];

/** Ejecuta start/stop según la sección esté visible y la pestaña activa. */
function whileVisible(el, start, stop) {
  let on = false, seen = false;
  const sync = () => {
    const want = seen && !document.hidden;
    if (want && !on) { on = true; start(); } else if (!want && on) { on = false; stop(); }
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { threshold: 0.15 }).observe(el);
  document.addEventListener('visibilitychange', sync);
}

/** Burbuja que sube y se desvanece (la animación vive en CSS). */
function spawnFloat(box, [txt, tone], side, k) {
  const b = document.createElement('span');
  b.className = `mk-float mk-float--${tone} mk-float--${side}`;
  b.textContent = txt;
  b.style.setProperty('--x', `${(k % 3) * 18}px`);
  b.style.setProperty('--r', `${side === 'l' ? -4 + (k % 3) * 2 : 3 - (k % 2) * 4}deg`);
  b.addEventListener('animationend', () => b.remove(), { once: true });
  box.append(b);
}

/* ---------- 001 · el celular que scrollea ---------- */
const POSTS = [
  ['var(--pink)', 'var(--blue)', 'esto nadie te lo dice', '1,2M', '84K', '1,9K', '12K'],
  ['var(--blue)', 'var(--yellow)', '3 errores que matan', '890K', '61K', '1,1K', '8,4K'],
  ['var(--yellow)', 'var(--pink)', 'mi rutina real', '2,4M', '210K', '4,3K', '31K'],
  ['#3C3A5C', 'var(--blue)', 'antes vs. después', '640K', '48K', '980', '6,1K'],
];
const HERO_BUBBLES = [
  ['♥ +1', 'pink'], ['@valen.m empezó a seguirte', 'paper'], ['♥ 2,4K', 'pink'], ['💬 ¡Me encanta!', 'white'],
  ['+ 128 seguidores', 'yellow'], ['@dr.salud te mencionó', 'blue'], ['♥ +1', 'pink'], ['↗ 312 compartidos', 'paper'],
  ['@lau.coach empezó a seguirte', 'paper'], ['♥ 18K', 'pink'],
];

const postHTML = ([bg, shirt, cap, views, likes, com, sh]) => `
  <article class="mk-post">
    <div class="mk-post__top"><span class="mk-ava mk-ava--sm"></span><i></i></div>
    <div class="mk-post__media" style="--bg:${bg};--shirt:${shirt}">
      <span class="mk-post__head"></span><span class="mk-post__body"></span>
      <span class="mk-post__cap">${cap}</span>
      <span class="mk-post__views mono">▷ ${views}</span>
    </div>
    <div class="mk-post__acts"><span class="is-like">♥ ${likes}</span><span>💬 ${com}</span><span>↗ ${sh}</span></div>
  </article>`;

function initFeed() {
  const stage = $('[data-feed]');
  if (!stage) return;
  const list = $('[data-feed-list]', stage);
  const heart = $('[data-feed-heart]', stage);
  const floats = $('[data-feed-floats]', stage);
  const counts = $$('[data-feed-count]', stage);
  const delta = $('[data-feed-delta]', stage);
  // la lista va duplicada para que el bucle no se note
  list.innerHTML = [...POSTS, ...POSTS].map(postHTML).join('');

  let followers = 12480, today = 320, k = 0, b = 0;
  const paint = () => {
    counts.forEach((c) => { c.textContent = fmt(followers); });
    delta.textContent = fmt(today);
  };
  paint();
  if (reduced) return;

  let timers = [];
  const every = (ms, fn) => timers.push(setInterval(fn, ms));
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const postH = () => list.firstElementChild.offsetHeight + 10;

  const scrollNext = () => {
    k += 1;
    list.style.transition = '';
    list.style.transform = `translateY(${-k * postH()}px)`;
    // doble toque: aparece el corazón cuando la publicación se detiene
    later(1500, () => { heart.classList.remove('is-tap'); void heart.offsetWidth; heart.classList.add('is-tap'); });
    if (k === POSTS.length) {
      later(1000, () => { list.style.transition = 'none'; k = 0; list.style.transform = 'translateY(0)'; });
    }
  };

  whileVisible(stage, () => {
    every(4200, scrollNext);
    every(650, () => { followers += 2 + Math.floor(Math.random() * 8); today += 1; paint(); });
    every(700, () => { spawnFloat(floats, pick(HERO_BUBBLES, b), b % 2 ? 'r' : 'l', b); b += 1; });
  }, () => { timers.forEach((t) => { clearInterval(t); clearTimeout(t); }); timers = []; });
}

/* ---------- 002 · ser visto: antes y después ---------- */
const TOASTS = [['@valen.m empezó a seguirte', 'pink'], ['A 2,3K personas les gustó tu reel', 'yellow'], ['@marca.co quiere colaborar contigo', 'blue'], ['Tu video llegó a 1M de vistas', 'pink'], ['@dr.salud compartió tu post', 'blue']];
const SEEN_BUBBLES = [['♥ +1', 'pink'], ['+ 214 seguidores', 'yellow'], ['♥ 9,8K', 'pink'], ['💬 ¿Dónde te encuentro?', 'white'], ['↗ 1,1K compartidos', 'white'], ['♥ +1', 'pink'], ['🔖 640 guardados', 'blue'], ['♥ 41K', 'pink']];
const GROW_FROM = 112, GROW_TO = 48200, GROW_MS = 3200, HOLD_MS = 4200;

function initSeen() {
  const sec = $('[data-seen]');
  if (!sec) return;
  const high = $('[data-seen-high]', sec);
  const low = $('[data-seen-low]', sec);
  const lost = $('[data-seen-lost]', sec);
  const cells = $$('[data-seen-grid] i', sec);
  const toasts = $('[data-seen-toasts]', sec);
  const floats = $('[data-seen-floats]', sec);

  const toast = (i) => {
    const [txt, tone] = pick(TOASTS, i);
    const t = document.createElement('div');
    t.className = `mk-toast mk-toast--${tone}`;
    t.innerHTML = `<i></i>${txt}`;
    toasts.prepend(t);
    while (toasts.children.length > 3) toasts.lastElementChild.remove();
  };
  [0, 1, 2].forEach((i) => toast(2 - i));

  if (reduced) { high.textContent = short(GROW_TO); return; }

  let timers = [], raf = 0, n = 3, b = 0;
  const every = (ms, fn) => timers.push(setInterval(fn, ms));
  const grow = () => {
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / GROW_MS);
      high.textContent = short(GROW_FROM + (GROW_TO - GROW_FROM) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  whileVisible(sec, () => {
    grow();
    every(GROW_MS + HOLD_MS, grow);
    every(1800, () => toast(n++));
    every(900, () => {
      const c = cells[Math.floor(Math.random() * cells.length)];
      c.classList.remove('is-like'); void c.offsetWidth; c.classList.add('is-like');
      setTimeout(() => c.classList.remove('is-like'), 750);
    });
    every(800, () => { spawnFloat(floats, pick(SEEN_BUBBLES, b), b % 2 ? 'r' : 'l', b); b += 1; });
    // el perfil sin estrategia pierde un seguidor de vez en cuando
    every(5200, () => {
      low.textContent = '111';
      lost.classList.remove('is-on'); void lost.offsetWidth; lost.classList.add('is-on');
      setTimeout(() => { low.textContent = '112'; }, 2600);
    });
  }, () => { timers.forEach(clearInterval); timers = []; cancelAnimationFrame(raf); });
}

initFeed();
initSeen();
