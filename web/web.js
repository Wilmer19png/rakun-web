/* ==========================================================================
   RAKÜN — web.js (Mundo 03 · Web y apps)
   Terminal que se escribe solo, comparador boceto/píxel con el ojo como
   divisor, historial de commits, escritorio con ventanas, dock y el error 404
   que lleva a los planes. Todo "a pocos cuadros".
   ========================================================================== */

import { RakunEye } from '../eye.js';
import { $, $$, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';

/* ---------- Smooth scroll + anclas ---------- */
let lenis = null;
function initLenis() {
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });
}

/* ==========================================================================
   001 · Terminal que se escribe solo
   ========================================================================== */
function initTerminal() {
  const body = $('[data-term]');
  if (!body) return;
  // Las líneas vienen del HTML (sin JS se ven completas); aquí se reescriben a saltos.
  const lines = $$('span', body).map((s) => ({ text: s.textContent, cls: s.className }));
  let timer = 0;

  const render = (chars) => {
    let left = chars;
    const out = [];
    for (const { text, cls } of lines) {
      if (left <= 0) break;
      let t = text;
      if (cls === 't-prog') {
        const p = Math.min(10, Math.floor(left / 4));
        t = `▸ desplegando ${'█'.repeat(p)}${'░'.repeat(10 - p)} ${p * 10}%`;
        left -= 40;
      } else {
        t = text.slice(0, left);
        left -= text.length;
      }
      out.push(`<span class="${cls}">${t}</span>`);
    }
    body.innerHTML = `${out.join('\n')}<span class="term__cursor"></span>`;
    return left > 0;                                     // true = terminó
  };

  const run = () => {
    clearInterval(timer);
    if (reduced) { render(Infinity); return; }
    let chars = 0;
    render(0);
    timer = setInterval(() => {
      chars += 3;                                        // 3 caracteres por cuadro
      if (render(chars)) clearInterval(timer);
    }, 70);
  };

  let started = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !started) { started = true; run(); }
  }, { threshold: 0.3 }).observe(body);
  $('[data-term-replay]')?.addEventListener('click', run);
}

/* ==========================================================================
   002 · Comparador: el ojo es el divisor
   ========================================================================== */
function initCompare() {
  const box = $('[data-bx]');
  if (!box) return;
  const stage = $('.bx__stage', box);
  const range = $('[data-bx-range]', box);
  const mode = $('[data-bx-mode]');
  let split = 50;
  let manual = false;
  let visible = false;
  let t = 0;

  const set = (v) => {
    split = Math.max(2, Math.min(98, v));
    box.style.setProperty('--split', `${split}%`);
    box.style.setProperty('--ix', `${(118 + (split / 100 - 0.5) * 100).toFixed(1)}px`);   // el ojo mira hacia donde vas
    range.value = String(Math.round(split));
  };
  const setManual = (m) => {
    manual = m;
    mode.textContent = m ? 'el ojo en tu mano' : 'el ojo barre solo';
  };
  set(50);

  // con el mouse basta pasar por encima; con teclado o táctil, el control deslizante
  if (fine) {
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = stage.getBoundingClientRect();
      setManual(true);
      set(((e.clientX - r.left) / r.width) * 100);
    });
    stage.addEventListener('pointerleave', () => setManual(false));
  }
  range.addEventListener('input', () => { setManual(true); set(Number(range.value)); });
  range.addEventListener('blur', () => setManual(false));

  // sin interacción, el ojo barre solo de un lado a otro (a saltos)
  setInterval(() => {
    if (!visible || manual || reduced) return;
    t += 1;
    set(50 + Math.sin(t * 0.09) * 40);
  }, 110);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);
}

/* ==========================================================================
   003 · Historial de commits (uno abierto a la vez)
   ========================================================================== */
function initCommits() {
  const commits = $$('[data-commits] .commit');
  const open = (c) => {
    commits.forEach((k) => {
      const on = k === c;
      k.classList.toggle('is-open', on);
      $('.commit__head', k).setAttribute('aria-expanded', String(on));
    });
  };
  commits.forEach((c) => {
    const head = $('.commit__head', c);
    head.addEventListener('click', () => open(c));
    head.addEventListener('focus', () => open(c));
    if (fine) c.addEventListener('pointerenter', () => open(c));
  });
}

/* ==========================================================================
   005 · El escritorio: ventanas, dock y el error 404
   ========================================================================== */
function initDesk() {
  const desk = $('[data-desk]');
  if (!desk) return;

  // clic (o Enter) en una ventana = al frente
  const wins = $$('[data-win]', desk);
  let z = 20;
  const front = (w) => { z += 1; w.style.zIndex = String(z); };
  front($('[data-404]', desk));                         // el 404 empieza adelante
  wins.forEach((w) => {
    w.addEventListener('pointerdown', () => front(w));
    w.addEventListener('focusin', () => front(w));
  });

  // "Ignorar" no es una opción: el aviso tiembla y contesta
  const e404 = $('[data-404]', desk);
  const text = $('[data-404-text]', desk);
  const replies = [
    '¿Seguro? Tus clientes sí te están ignorando.',
    'Mientras tanto, tu competencia ya tiene planes.',
    'Ok, ok… ya te vimos. Mira los planes.',
  ];
  let tries = 0;
  $('[data-404-ignore]', desk).addEventListener('click', () => {
    text.textContent = replies[Math.min(tries, replies.length - 1)];
    tries += 1;
    e404.classList.remove('is-shaking');
    void e404.offsetWidth;                               // reinicia la animación
    e404.classList.add('is-shaking');
  });

  // el ojo del aviso mira a los lados, a saltos
  if (!reduced) {
    const looks = [96, 118, 140, 118];
    let k = 0;
    setInterval(() => { e404.style.setProperty('--ix', `${looks[k++ % looks.length]}px`); }, 600);
  }

  // dock: cada servicio cuenta qué es
  const tip = $('[data-dock-tip]', desk);
  const base = tip.textContent;
  $$('.dock__ic', desk).forEach((ic) => {
    const show = () => { tip.textContent = ic.dataset.tip; };
    ic.addEventListener('pointerenter', show);
    ic.addEventListener('focus', show);
    ic.addEventListener('click', show);
    ic.addEventListener('pointerleave', () => { tip.textContent = base; });
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
initTerminal();
initCompare();
initCommits();
initDesk();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).followCursor();
