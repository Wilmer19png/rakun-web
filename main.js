/* ==========================================================================
   RAKÜN — main.js
   Intro del ojo, ojos vivos, smooth scroll (Lenis), animaciones de scroll
   (GSAP + ScrollTrigger), cursor, reloj de Bogotá, marquee, carrusel y
   selector de perfil. GSAP y Lenis son opcionales: sin ellos todo el
   contenido queda visible y funcional.
   ========================================================================== */

import { RakunEye, Pointer } from './eye.js';
import { $, $$, root, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from './common.js';

const gsap = window.gsap;
const anime = window.anime;
const ScrollTrigger = window.ScrollTrigger;
const mobile = window.matchMedia('(max-width: 600px)').matches;
const HAS_GSAP = !!(gsap && ScrollTrigger);

if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);

/* ---------- Smooth scroll ---------- */
let lenis = null;
function initLenis() {
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  if (HAS_GSAP) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id.length > 1 ? $(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    if (id === '#main' || id === '#inicio') target.setAttribute('tabindex', '-1');
    target.focus?.({ preventScroll: true });
  });
}

/* ==========================================================================
   000 · INTRO
   ========================================================================== */
function endIntro(intro, eye) {
  try { sessionStorage.setItem('rakun:intro', '1'); } catch (e) { /* modo privado */ }
  root.classList.remove('intro-on');
  eye?.destroy();
  intro?.remove();
  if (!root.classList.contains('door-on')) lenis?.start();   // con la puerta abierta, el scroll sigue quieto
  if (HAS_GSAP) ScrollTrigger.refresh();
}

/* La intro se anima "cuadro a cuadro" (10 fps, como animación hecha a mano):
   el punteado aparece por capas, el ojo se abre, mira a los lados, parpadea y
   vuelve al frente; luego entra el logo. En cada cuadro el punteado, los bordes
   y el polvo "hierven" entre tres dibujos. */
const INTRO_FPS = 7;
const INTRO_EXIT = 50;                                // cuadro en que empieza la salida
const INTRO_T = 0.605;                                // umbral final del punteado (más alto = más sucio)
const INTRO_DRAW = [1.2, 0.95, 0.86, 0.78, 0.72, 0.67];
const INTRO_BOIL = [3, 17, 29];
const INTRO_OPEN = { 8: 0.3, 9: 0.75, 10: 1.08, 19: 0.12, 20: 0.6, 44: 0.12, 45: 0.7 };
const INTRO_ROT = { 14: -2, 15: -4, 16: -4, 17: -4, 18: -4, 19: -4, 20: -4, 21: -4, 22: -1, 23: 2, 24: 3.5, 25: 3.5, 26: 3.5, 27: 3.5, 28: 3.5, 29: 3.5, 30: 3.5, 31: 1.5, 32: -0.6 };
const INTRO_DY = { 15: 6, 16: 6, 17: 6, 18: 6, 19: 6, 20: 6, 21: 6, 24: -6, 25: -6, 26: -6, 27: -6, 28: -6, 29: -6, 30: -6, 33: 3 };

function introLook(f) {
  if (f === 14) return [-0.5, -0.15];
  if (f >= 15 && f <= 21) return [-1, -0.3];
  if (f === 22) return [-0.3, -0.4];
  if (f === 23) return [0.5, -0.6];
  if (f >= 24 && f <= 30) return [1, -0.6];
  if (f === 31) return [0.4, -0.2];
  return [0, 0];
}

function runIntro() {
  const intro = $('[data-intro]');
  if (!intro || !root.classList.contains('intro-on')) {
    intro?.remove();
    return Promise.resolve(false);
  }
  intro.classList.add('is-running');
  lenis?.stop();

  const eye = new RakunEye($('[data-intro-eye]', intro), { prefix: 'eye', openness: 0 });
  const panel = $('.intro__panel', intro);
  const cut = $('.intro__cut', intro);
  const skip = $('[data-intro-skip]', intro);
  const head = $('.i-head', intro);
  const badge = $('.badge--intro', intro);
  const boil = $$('[data-boil]', intro);
  const thr = $$('[data-thr]', intro);

  const paint = (f) => {
    const b = INTRO_BOIL[f % 3];
    boil.forEach((n) => n.setAttribute('seed', b + Number(n.dataset.boil)));

    let t = INTRO_T;
    if (f < 2) t = 1.2;
    else if (f < 8) t = Math.max(INTRO_T, INTRO_DRAW[f - 2]);
    thr.forEach((n) => n.setAttribute('intercept', String(-60 * (t + Number(n.dataset.thr)))));

    const [nx, ny] = introLook(f);
    eye.look(nx, ny);
    eye.ix.snap(eye.ix.target);
    eye.iy.snap(eye.iy.target);
    eye.open$.snap(f < 8 ? 0 : (INTRO_OPEN[f] ?? 1));

    head.setAttribute('transform', `rotate(${INTRO_ROT[f] || 0} 470 800) translate(0 ${INTRO_DY[f] || 0})`);

    badge.style.opacity = f >= 36 ? '1' : '0';
    badge.style.transform = f === 36 ? 'rotate(-4deg) scale(.92)' : f === 37 ? 'rotate(2deg) scale(1.04)' : 'none';
  };

  // Salida: corte diagonal con línea rosa (anime.js si está; si no, transición CSS)
  const closed = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% -34%)';
  const open = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
  panel.style.clipPath = open;
  cut.style.clipPath = open;
  const exitCut = (ms) => {
    if (anime) {
      const out = anime.timeline({ easing: 'easeInOutExpo', duration: ms });
      out.add({ targets: panel, clipPath: [panel.style.clipPath || open, closed] }, 0)
        .add({ targets: cut, clipPath: [cut.style.clipPath || open, closed] }, 90);
      return out.finished;
    }
    [panel, cut].forEach((el, i) => {
      el.style.transition = `clip-path ${ms}ms cubic-bezier(.87, 0, .13, 1) ${i * 90}ms`;
      el.style.clipPath = closed;
    });
    return new Promise((r) => setTimeout(r, ms + 120));
  };

  // Movimiento reducido: el dibujo final quieto y un fundido.
  if (reduced) {
    paint(40);
    return new Promise((resolve) => {
      const done = () => { endIntro(intro, eye); resolve(true); };
      const t = setTimeout(() => {
        intro.style.transition = 'opacity .4s';
        intro.style.opacity = '0';
        setTimeout(done, 420);
      }, 1100);
      skip.addEventListener('click', () => { clearTimeout(t); done(); }, { once: true });
    });
  }

  return new Promise((resolve) => {
    let f = 0;
    let exiting = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      document.removeEventListener('keydown', onKey);
      endIntro(intro, eye);
      resolve(true);
    };
    const leave = (ms) => {
      if (exiting) return;
      exiting = true;
      setTimeout(() => document.dispatchEvent(new CustomEvent('rakun:reveal')), ms * 0.35);
      exitCut(ms).then(finish);
      setTimeout(finish, ms + 900);                   // respaldo por si la animación no avisa
    };

    paint(0);
    const timer = setInterval(() => {
      f += 1;
      paint(f);                                       // sigue hirviendo también durante la salida
      if (f === INTRO_EXIT) leave(950);
    }, 1000 / INTRO_FPS);

    const onKey = (e) => { if (e.key === 'Escape') leave(600); };
    skip.addEventListener('click', () => leave(600));
    document.addEventListener('keydown', onKey);
    skip.focus({ preventScroll: true });
  });
}

/* ==========================================================================
   Ojos vivos (header, hero, manifiesto, CTA, footer)
   ========================================================================== */
const liveEyes = {};
function mountEyes() {
  $$('svg[data-eye]').forEach((svg) => {
    const id = svg.dataset.eye;
    liveEyes[id] = new RakunEye(svg, { prefix: id, openness: id === 'eye-mf' && HAS_GSAP && !reduced ? 0 : 1 });
  });
}
function wakeEyes() {
  Pointer.init();
  Object.entries(liveEyes).forEach(([id, eye]) => {
    if (id === 'eye-cta') eye.watch($('[data-plans]'));
    else eye.followCursor();
  });
}

/* ==========================================================================
   Animaciones
   ========================================================================== */
function heroEntrance() {
  if (!HAS_GSAP || reduced) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .line > span', { yPercent: 115, duration: 1.15, stagger: 0.09 }, 0)
    .from(['.hero__lede', '.hero__meta', '.hero__foot .link'], { y: 24, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.35)
    .from('.collage__blk--blue', { scaleY: 0, transformOrigin: '50% 0%', duration: 1 }, 0.1)
    .from('.collage__blk--yellow', { scaleX: 0, transformOrigin: '0% 50%', duration: 1 }, 0.25)
    .from('.collage__logo', { scale: 0.9, opacity: 0, duration: 1.2, transformOrigin: '50% 50%' }, 0.2)
    .from('.collage__burst', { scale: 0, rotate: -90, duration: 1, ease: 'back.out(2)' }, 0.5)
    .from(['.collage__tag', '.collage .cross'], { opacity: 0, duration: 0.6, stagger: 0.05 }, 0.8)
    .from('.hdr', { yPercent: -100, duration: 0.9, clearProps: 'transform' }, 0);
}

function splitWords(container) {
  const out = [];
  const walk = (node, parent) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = part;
          frag.appendChild(w);
          out.push(w);
        });
        parent.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        walk(child, child);
      }
    });
  };
  walk(container, container);
  return out;
}

function scrollAnimations() {
  if (!HAS_GSAP || reduced) return;

  // Titulares de sección
  $$('.reveal').forEach((el) => {
    gsap.from(el, {
      yPercent: 24, opacity: 0, clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      clearProps: 'clipPath',
    });
  });

  // Cards de enfoque
  gsap.from('.card', {
    y: 70, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.cards', start: 'top 82%', once: true },
  });
  gsap.from('.services li', {
    opacity: 0, x: -20, duration: 0.8, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.services', start: 'top 92%', once: true },
  });

  // Manifiesto: palabra por palabra con el scroll; el ojo se abre al final
  const mf = $('.manifesto');
  const words = splitWords($('[data-words]'));
  mf.classList.add('is-scrub');
  const mfEye = liveEyes['eye-mf'];
  gsap.to(words, {
    opacity: 1, ease: 'none', stagger: 0.12,
    scrollTrigger: {
      trigger: mf, start: 'top 20%', end: 'bottom bottom', scrub: 0.4,
      onUpdate: (st) => {
        if (!mfEye) return;
        if (st.progress > 0.86 && !mfEye._isOpen) { mfEye._isOpen = true; mfEye.open(); }
        else if (st.progress < 0.8 && mfEye._isOpen) { mfEye._isOpen = false; mfEye.close(); }
      },
    },
  });

  // Videos y estrategia viven ahora en marca.html: solo se animan si la sección está en la página
  if ($('.reels__grid')) {
    gsap.from('.reel', {
      y: 80, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.reels__grid', start: 'top 85%', once: true },
    });
  }
  if ($('.pillars')) {
    gsap.from('.pillar', {
      x: -30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08,
      scrollTrigger: { trigger: '.pillars', start: 'top 85%', once: true },
    });
  }

  // Cifras con contador
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v); },
    });
  });

  // CTA
  gsap.from('.cta__row > *', {
    y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12,
    scrollTrigger: { trigger: '.cta__row', start: 'top 85%', once: true },
  });

  // Footer: el RAKÜN gigante sube
  gsap.from('.ftr__giant', {
    yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.ftr__giant', start: 'top 95%', once: true },
  });
}

/* ---------- Marquee infinito (velocidad según scroll) ---------- */
// ---------- Cómo trabajamos: la línea roja recorre los 4 pasos ----------
const TL_DURATION = 3200; // ms que tarda el rojo en cruzar toda la línea (debe coincidir con el CSS)
function initTimeline() {
  const tl = $('[data-tl]');
  if (!tl) return;
  const steps = $$('.tl__step', tl);
  if (reduced || !('IntersectionObserver' in window)) {
    tl.classList.add('is-run');
    steps.forEach((s) => s.classList.add('is-on'));
    return;
  }
  tl.dataset.armed = '';
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    tl.classList.add('is-run');
    // cada paso se enciende cuando el rojo (avance lineal) llega a su nodo
    const width = tl.getBoundingClientRect().width;
    const left = tl.getBoundingClientRect().left;
    steps.forEach((s) => {
      const node = $('.tl__node', s).getBoundingClientRect();
      const at = (node.left + node.width / 2 - left) / width;
      setTimeout(() => s.classList.add('is-on'), Math.max(0, at) * TL_DURATION);
    });
  }, { threshold: 0.45 });
  io.observe(tl);
}

function initMarquee() {
  const track = $('[data-marquee]');
  if (!track) return;
  const group = $('.marquee__group', track);
  const fill = () => {
    $$('.marquee__group', track).slice(1).forEach((g) => g.remove());
    const w = group.getBoundingClientRect().width || 1;
    const copies = Math.ceil((window.innerWidth * 2) / w) + 1;
    for (let i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
    return w;
  };
  let gw = fill();
  window.addEventListener('resize', () => { gw = fill(); });
  document.fonts?.ready.then(() => { gw = fill(); });
  if (reduced) return;

  let x = 0, last = performance.now(), visible = true, boost = 0, lastY = window.scrollY;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(track);
  window.addEventListener('scroll', () => {
    boost = Math.min(18, boost + Math.abs(window.scrollY - lastY) * 0.06);
    lastY = window.scrollY;
  }, { passive: true });
  const bursts = () => $$('.mq__burst', track);
  let bs = bursts();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible) {
      boost *= 0.92;
      x -= (70 + boost * 40) * dt;
      if (x <= -gw) x += gw;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      if (bs.length !== track.querySelectorAll('.mq__burst').length) bs = bursts();
      const rot = (-x / 4) % 360;
      bs.forEach((b) => { b.style.transform = `rotate(${rot}deg)`; });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------- Carrusel de testimonios ---------- */
function initCarousel() {
  const box = $('[data-carousel]');
  if (!box) return;
  const slides = $$('[data-slide]', box);
  const idx = $('[data-carousel-index]', box);
  $('[data-carousel-total]', box).textContent = String(slides.length).padStart(2, '0');
  let i = 0, busy = false;
  const go = (n) => {
    if (busy) return;
    const next = (n + slides.length) % slides.length;
    if (next === i) return;
    const from = slides[i];
    const to = slides[next];
    const dir = n > i ? 1 : -1;
    i = next;
    idx.textContent = String(i + 1).padStart(2, '0');
    if (!HAS_GSAP || reduced) {
      from.hidden = true; from.classList.remove('is-active');
      to.hidden = false; to.classList.add('is-active');
      return;
    }
    busy = true;
    to.hidden = false;
    const tl = gsap.timeline({ onComplete: () => { from.hidden = true; busy = false; } });
    tl.to(from, { opacity: 0, x: -40 * dir, duration: 0.45, ease: 'power3.in' }, 0)
      .fromTo($('.quote__img', to), { clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 0.9, ease: 'expo.out' }, 0.35)
      .fromTo(to, { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' }, 0.35)
      .set(from, { clearProps: 'opacity,transform' });
  };
  $('[data-carousel-next]', box).addEventListener('click', () => go(i + 1));
  $('[data-carousel-prev]', box).addEventListener('click', () => go(i - 1));
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(i + 1);
    if (e.key === 'ArrowLeft') go(i - 1);
  });
  // Swipe en táctil
  let sx = null;
  const vp = $('.quotes__viewport', box);
  vp.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') sx = e.clientX; });
  vp.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
  });
}

/* ---------- Selector de perfil (Ver planes) ---------- */
function initPicker() {
  const btn = $('[data-plans]');
  const picker = $('[data-picker]');
  if (!btn || !picker) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    picker.hidden = !open;
    if (open) {
      if (HAS_GSAP && !reduced) {
        gsap.fromTo($$('.pick', picker), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08 });
      }
      liveEyes['eye-cta']?.blink();
      if (HAS_GSAP) ScrollTrigger.refresh();
      const r = picker.getBoundingClientRect();
      if (r.bottom > window.innerHeight) {
        if (lenis) lenis.scrollTo(picker, { offset: -window.innerHeight * 0.25 });
        else picker.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
    }
  });
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
      if (!anime || reduced) { panel.hidden = !open; return; }
      anime.remove(panel);
      if (open) {
        panel.hidden = false;
        const h = panel.scrollHeight;
        panel.style.height = '0px';
        anime({ targets: panel, height: [0, h], duration: 600, easing: 'easeOutExpo', complete: () => { panel.style.height = ''; } });
        anime({ targets: panel.querySelectorAll('.pillar__inner > p, .pillar__out, .pillar__list li'), opacity: [0, 1], translateY: [14, 0], delay: anime.stagger(45, { start: 120 }), duration: 520, easing: 'easeOutQuad' });
      } else {
        anime({ targets: panel, height: [panel.scrollHeight, 0], duration: 420, easing: 'easeInOutQuad', complete: () => { panel.hidden = true; panel.style.height = ''; } });
      }
      if (HAS_GSAP) setTimeout(() => ScrollTrigger.refresh(), 650);
    });
  });
}

/* ---------- Videos de referencia ----------
   Cada <video data-src="videos/xx.mp4"> se carga al acercarse, se reproduce en
   silencio y en bucle mientras está a la vista. Sin data-src queda el espacio
   con el patrón, listo para recibir el video. */
function initReels() {
  const reels = $$('.reel');
  if (!reels.length) return;
  const setIcon = (btn, playing) => {
    btn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(/^(Reproducir|Pausar)/, playing ? 'Pausar' : 'Reproducir'));
  };
  reels.forEach((reel) => {
    const video = $('video', reel);
    const btn = $('.reel__play', reel);
    const src = video.dataset.src;
    if (!src) { btn.hidden = true; return; }
    let userPaused = reduced; // con movimiento reducido no hay autoplay
    const load = () => {
      if (video.src) return;
      if (video.dataset.poster) video.poster = video.dataset.poster;
      video.src = src;
      video.addEventListener('loadeddata', () => video.classList.add('is-ready'), { once: true });
    };
    const play = () => { load(); video.play().then(() => setIcon(btn, true)).catch(() => {}); };
    const pause = () => { video.pause(); setIcon(btn, false); };
    btn.addEventListener('click', () => {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; pause(); }
    });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { load(); if (!userPaused) play(); }
      else if (!video.paused) { video.pause(); setIcon(btn, false); }
    }, { rootMargin: '200px 0px', threshold: 0.25 }).observe(reel);
  });
}

/* ---------- Video de portada: quieto con movimiento reducido ---------- */
function initHeroVideo() {
  const video = $('[data-hero-video]');
  if (!video || !reduced) return;
  video.removeAttribute('autoplay');
  video.pause();
}

/* ==========================================================================
   000 · La puerta: "¿Qué buscas?"
   Tras la intro, la mirilla se abre a pocos cuadros, el ojo te mira y eliges
   mundo. Marca personal → se abre la puerta y entras a la home.
   Producción → corte rosa y produccion.html. Una vez por sesión.
   ========================================================================== */
function runDoor() {
  const door = $('[data-door]');
  if (!door || !root.classList.contains('door-on')) {
    door?.remove();
    return Promise.resolve();
  }
  lenis?.stop();
  const eye = new RakunEye($('[data-door-eye]', door), { prefix: 'eye-door', openness: 0 });
  const staged = $$('.door__kicker, .door__q, .ticket, .door__enter, .door__fine', door);
  door.tabIndex = -1;
  door.focus({ preventScroll: true });

  return new Promise((resolve) => {
    let timers = [];
    let leaving = false;
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));

    const done = () => {
      eye.destroy();
      door.remove();
      Pointer.target = null;                                  // los ojos de la home vuelven a seguir el cursor
      root.classList.remove('door-on');
      lenis?.start();
      resolve();
    };

    // Entrada: la placa de la mirilla se corre en 3 cuadros, el ojo se abre y aparece la pregunta
    if (reduced) {
      door.classList.add('is-peeking');
      eye.open$.snap(1);
      eye.followCursor();
    } else {
      door.classList.add('is-staging');
      later(350, () => { door.dataset.hatch = '1'; });
      later(470, () => { door.dataset.hatch = '2'; });
      later(590, () => { delete door.dataset.hatch; door.classList.add('is-peeking'); });
      later(760, () => eye.open().then(() => { eye.look(-0.8, 0.1); setTimeout(() => eye.followCursor(), 700); }));
      staged.forEach((el, k) => later(1050 + k * 160, () => el.classList.add('is-in')));
      later(1050 + staged.length * 160 + 120, () => door.classList.remove('is-staging'));
    }

    const leave = (kind, href) => {
      if (leaving) return;
      leaving = true;
      timers.forEach(clearTimeout);
      timers = [];
      delete door.dataset.hatch;
      door.classList.add('is-peeking');
      door.classList.remove('is-staging');
      try { sessionStorage.setItem('rakun:door', '1'); } catch (e) { /* modo privado */ }
      eye.blink();                                            // guiño cómplice
      if (reduced) {
        if (kind === 'page') location.href = href; else done();
        return;
      }
      // la puerta se abre en 3 cuadros
      [1, 2, 3].forEach((s, k) => later(160 + k * 110, () => { door.dataset.leaf = String(s); }));
      if (kind === 'page') {
        [1, 2, 3].forEach((s, k) => later(560 + k * 100, () => { door.dataset.cut = String(s); }));
        later(900, () => { location.href = href; });
      } else {
        [1, 2, 3].forEach((s, k) => later(560 + k * 110, () => { door.dataset.fade = String(s); }));
        later(920, done);
      }
    };

    // "Solo vengo a mirar": la puerta se abre hacia la home
    $('[data-door-enter]', door).addEventListener('click', () => leave('home'));
    // los otros mundos (Producción, Web y apps) son páginas aparte
    $$('a[data-door-pick]', door).forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      leave('page', e.currentTarget.href);
    }));
    door.addEventListener('keydown', (e) => { if (e.key === 'Escape') leave('marca'); });
  });
}

/* ==========================================================================
   Arranque
   ========================================================================== */
initClock();
initLenis();
initAnchors();
initHeader(() => lenis);
initMegaMenu();
initCursor();
mountEyes();
initMarquee();
initTimeline();
initCarousel();
initReels();
initPillars();
initHeroVideo();
initPicker();
scrollAnimations();

const hadIntro = root.classList.contains('intro-on');
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  heroEntrance();
  wakeEyes();
};
// Si toca la puerta, la home solo se revela cuando eliges "Marca personal".
let entered = null;
const enter = () => {
  if (!entered) entered = runDoor().then(reveal);
  return entered;
};
document.addEventListener('rakun:reveal', enter, { once: true });
runIntro().then(() => enter()).then(() => {
  // Saludo: los ojos parpadean juntos al entrar
  if (hadIntro && !reduced) setTimeout(() => Object.values(liveEyes).forEach((e) => e.blink()), 500);
});
