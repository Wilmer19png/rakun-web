/* ==========================================================================
   RAKÜN — eye.js
   El ojo RAKÜN como componente reutilizable. Toda la lógica (apertura,
   parpadeo, mirada, seguimiento del cursor y exploración) es JavaScript
   puro sobre un SVG inline, animado con requestAnimationFrame y resortes.

   Uso:
     import { RakunEye } from './eye.js';
     const eye = new RakunEye(svgElement, { prefix: 'eye' });
     await eye.open();
     eye.lookAt(clientX, clientY);
     eye.followCursor();
   ========================================================================== */

const NS = 'http://www.w3.org/2000/svg';

/* ---------- Geometría (viewBox 0 0 212 140) ------------------------------ */
// El borde inferior del ojo es un corte diagonal recto.
const VIEW_W = 212;
const VIEW_H = 140;
const SLOPE = 0.612;
const D = (x) => 14 + SLOPE * (x - 8);   // borde exterior inferior
const DS = (x) => D(x) - 4;              // borde inferior de la esclerótica

// Puntos del contorno abierto; al cerrar, cada punto cae sobre la diagonal.
const OUTER = { p0: [10, 5], p1: [100, 4], c1: [152, 4], c2: [182, 34], q: [2, 9] };
const SCLERA = { p0: [36, 12], p1: [100, 12], c1: [146, 12], c2: [174, 36], q: [26, 16] };
const TIP = [204, 134];
const SCLERA_TIP = [194, DS(194)];

// Iris: centro en reposo sobre la diagonal, como en el logo.
const IRIS_REST = { x: 118, y: 76 };
const IRIS = { yellow: 58, pink: 40, ring: 24.5, pupil: 21 };
const RANGE = { left: 52, right: 50, up: 38, down: 26 };

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => a + Math.random() * (b - a);
const fmt = (n) => Math.round(n * 100) / 100;

function pt(open, o) {
  const [x, y] = open;
  return `${fmt(x)} ${fmt(lerp(DS(x), y, o))}`;
}

function outerPath(o) {
  const { p0, p1, c1, c2, q } = OUTER;
  return `M${pt(p0, o)}L${pt(p1, o)}C${pt(c1, o)} ${pt(c2, o)} ${TIP[0]} ${TIP[1]}L8 14Q${pt(q, o)} ${pt(p0, o)}Z`;
}

function scleraPath(o) {
  const { p0, p1, c1, c2, q } = SCLERA;
  return `M${pt(p0, o)}L${pt(p1, o)}C${pt(c1, o)} ${pt(c2, o)} ${fmt(SCLERA_TIP[0])} ${fmt(SCLERA_TIP[1])}L32 ${fmt(DS(32))}Q${pt(q, o)} ${pt(p0, o)}Z`;
}

/** Limita el centro del iris para que la pupila nunca salga del área visible. */
function clampIris(x, y) {
  const cx = clamp(x, IRIS_REST.x - RANGE.left, IRIS_REST.x + RANGE.right);
  const cy = clamp(y, IRIS_REST.y - RANGE.up, DS(cx) + 2);
  return [cx, cy];
}

/* ---------- Resorte amortiguado ------------------------------------------ */
class Spring {
  constructor(value, stiffness = 170, damping = 14) {
    this.value = value;
    this.target = value;
    this.v = 0;
    this.k = stiffness;
    this.c = damping;
  }
  set(target, k, c) {
    this.target = target;
    if (k) this.k = k;
    if (c) this.c = c;
  }
  snap(value) {
    this.value = this.target = value;
    this.v = 0;
  }
  step(dt) {
    const a = this.k * (this.target - this.value) - this.c * this.v;
    this.v += a * dt;
    this.value += this.v * dt;
  }
  get settled() {
    return Math.abs(this.target - this.value) < 0.002 && Math.abs(this.v) < 0.02;
  }
}

/* ---------- Ticker único + puntero compartido ---------------------------- */
const eyes = new Set();
let rafId = 0;
let last = 0;

function tick(now) {
  const dt = Math.min(1 / 30, (now - (last || now)) / 1000) || 1 / 60;
  last = now;
  eyes.forEach((eye) => eye._update(dt, now));
  rafId = eyes.size ? requestAnimationFrame(tick) : 0;
}
function ensureTicker() {
  if (!rafId) {
    last = 0;
    rafId = requestAnimationFrame(tick);
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/** Estado global del puntero: posición, última actividad y CTA bajo el cursor. */
export const Pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 3,
  moved: 0,
  target: null,      // elemento CTA bajo el cursor
  tilt: null,        // { nx, ny } del giroscopio si hay permiso
  scrollLook: 0,     // -1..1 según dirección del scroll (móvil)
  scrollAt: 0,
  _init: false,

  init() {
    if (this._init) return;
    this._init = true;

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.x = e.clientX;
      this.y = e.clientY;
      this.moved = performance.now();
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest?.('[data-eye-target]');
      if (t) this.target = t;
    });
    document.addEventListener('pointerout', (e) => {
      const t = e.target.closest?.('[data-eye-target]');
      if (t && !t.contains(e.relatedTarget)) this.target = null;
    });
    document.addEventListener('focusin', (e) => {
      const t = e.target.closest?.('[data-eye-target]');
      this.target = t || null;
      if (t) this.moved = performance.now();
    });

    // Móvil: el scroll y (si hay permiso) el giroscopio mueven la mirada.
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (Math.abs(dy) > 1) {
        this.scrollLook = clamp(dy / 24, -1, 1);
        this.scrollAt = performance.now();
      }
    }, { passive: true });

    const onTilt = (e) => {
      if (e.gamma == null) return;
      this.tilt = { nx: clamp(e.gamma / 30, -1, 1), ny: clamp((e.beta - 45) / 30, -1, 1) };
    };
    const askTilt = () => {
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        DOE.requestPermission().then((s) => {
          if (s === 'granted') window.addEventListener('deviceorientation', onTilt);
        }).catch(() => {});
      } else if (DOE) {
        window.addEventListener('deviceorientation', onTilt);
      }
    };
    if (!finePointer.matches) window.addEventListener('touchend', askTilt, { once: true });
  },
};

/* ---------- RakunEye ----------------------------------------------------- */
let uid = 0;

export class RakunEye {
  /**
   * @param {SVGSVGElement} svg  <svg> (puede estar anidado en otro SVG) donde se dibuja el ojo.
   * @param {object} [opts]
   * @param {string} [opts.prefix]  prefijo de ids (el ojo de la intro usa "eye": #eye-clip, #eye-iris…)
   * @param {number} [opts.openness]  apertura inicial 0..1
   * @param {{k:number,c:number}} [opts.gaze]  rigidez y amortiguación de la mirada
   */
  constructor(svg, opts = {}) {
    this.svg = svg;
    this.prefix = opts.prefix || `eye-${++uid}`;
    this.open$ = new Spring(opts.openness ?? 1, 260, 18);
    // Resorte de la mirada: más suave = movimientos más lentos y calmados.
    const gaze = { k: 95, c: 15, ...(opts.gaze || {}) };
    this.ix = new Spring(IRIS_REST.x, gaze.k, gaze.c);
    this.iy = new Spring(IRIS_REST.y, gaze.k, gaze.c);
    this.dilate$ = new Spring(1, 200, 18);
    this.mode = 'idle';           // idle | follow | explore
    this.fixedTarget = null;      // elemento al que mira siempre (p. ej. el botón del CTA)
    this.visible = true;
    this._drawn = { o: -1, x: -1, y: -1, d: -1 };
    this._waiters = [];
    this._nextBlink = 0;
    this._nextExplore = 0;
    this._exploring = false;

    this._build();
    this._render(true);

    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; }, { rootMargin: '80px' });
      this._io.observe(svg);
    }
    eyes.add(this);
    ensureTicker();
  }

  /* ----- construcción del SVG con capas separadas ----- */
  _build() {
    const p = this.prefix;
    const svg = this.svg;
    svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('rk-eye');
    svg.replaceChildren();

    const el = (tag, attrs = {}, parent = svg) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };

    const defs = el('defs');
    const clip = el('clipPath', { id: `${p}-clip` }, defs);
    this.$clip = el('path', {}, clip);

    this.$lidTop = el('path', { id: `${p}-lid-top`, class: 'rk-eye__lid' });
    const bot = el('g', { id: `${p}-lid-bot`, class: 'rk-eye__cut' });
    el('line', { x1: 26, y1: fmt(D(26) - 2), x2: 207, y2: fmt(D(207) - 2), 'stroke-width': 3.6, 'stroke-linecap': 'round' }, bot);
    this.$sclera = el('path', { id: `${p}-sclera`, class: 'rk-eye__sclera' });

    const clipped = el('g', { 'clip-path': `url(#${p}-clip)` });
    this.$iris = el('g', { id: `${p}-iris` }, clipped);
    el('circle', { r: IRIS.yellow, class: 'rk-eye__yellow' }, this.$iris);
    el('circle', { r: IRIS.pink, class: 'rk-eye__pink' }, this.$iris);
    this.$ring = el('circle', { r: IRIS.ring, class: 'rk-eye__ring' }, this.$iris);
    this.$pupil = el('circle', { r: IRIS.pupil, class: 'rk-eye__pupil' }, this.$iris);
  }

  /* ----- API pública ----- */

  /** Abre el ojo con rebote elástico. */
  open() {
    const rm = reducedMotion.matches;
    this.open$.set(1, rm ? 400 : 260, rm ? 40 : 11);
    return this._waitFor(() => this.open$.settled || (this.open$.value > 0.98 && Math.abs(this.open$.v) < 0.4), 900);
  }

  /** Cierra el ojo hasta dejar solo la línea diagonal. */
  close() {
    this.open$.set(0, 900, 60);
    return this._waitFor(() => this.open$.value < 0.04, 500);
  }

  /** Parpadeo rápido. */
  async blink() {
    if (this._blinking || this.open$.target < 0.5) return;
    this._blinking = true;
    this.open$.set(0, 1600, 80);
    await this._waitFor(() => this.open$.value < 0.08, 220);
    await new Promise((r) => setTimeout(r, 40));
    this.open$.set(1, 520, 30);
    this._blinking = false;
  }

  /**
   * Mira hacia un punto de la pantalla (coordenadas de viewport, como clientX/clientY).
   * El desplazamiento se limita para que el iris nunca salga del ojo.
   */
  lookAt(x, y) {
    const r = this.svg.getBoundingClientRect();
    if (!r.width) return this;
    const cx = r.left + r.width * (IRIS_REST.x / VIEW_W);
    const cy = r.top + r.height * (IRIS_REST.y / VIEW_H);
    const reach = Math.max(240, r.width * 2.2);
    return this.look(clamp((x - cx) / reach, -1, 1), clamp((y - cy) / (reach * 0.7), -1, 1));
  }

  /** Mira en una dirección normalizada: nx, ny en -1..1 (0,0 = al frente). */
  look(nx, ny) {
    const tx = IRIS_REST.x + nx * (nx < 0 ? RANGE.left : RANGE.right);
    const ty = IRIS_REST.y + ny * (ny < 0 ? RANGE.up : RANGE.down);
    const [cx, cy] = clampIris(tx, ty);
    this.ix.set(cx);
    this.iy.set(cy);
    return this;
  }

  /** Dilata (amount > 1) o contrae la pupila. */
  dilate(amount = 1) {
    this.dilate$.set(clamp(amount, 0.7, 1.45));
    return this;
  }

  /** Sigue al cursor (o al scroll / giroscopio en móvil), parpadea solo y explora si el cursor se queda quieto. */
  followCursor() {
    Pointer.init();
    this.mode = 'follow';
    this._scheduleBlink(performance.now());
    return this;
  }

  /** Mira siempre a un elemento (p. ej. un botón). Pasa null para soltarlo. */
  watch(element) {
    Pointer.init();
    this.fixedTarget = element;
    this.mode = element ? 'follow' : this.mode;
    this._scheduleBlink(performance.now());
    return this;
  }

  /** Explora: mira a puntos aleatorios hasta que el cursor vuelva a moverse. */
  explore() {
    this._exploring = true;
    this._nextExplore = 0;
    if (this.mode === 'idle') this.mode = 'explore';
    return this;
  }

  stop() {
    this.mode = 'idle';
    this._exploring = false;
    this.fixedTarget = null;
    return this;
  }

  destroy() {
    this.stop();
    this._io?.disconnect();
    eyes.delete(this);
  }

  /* ----- internos ----- */

  _waitFor(test, timeout) {
    return new Promise((resolve) => {
      const started = performance.now();
      this._waiters.push({ test, resolve, until: started + timeout });
    });
  }

  _scheduleBlink(now) {
    this._nextBlink = now + rand(3000, 6000);
  }

  _behave(now) {
    if (this.mode === 'idle') return;
    const rm = reducedMotion.matches;

    if (this.mode === 'follow') {
      // Si el elemento bajo el cursor se eliminó del documento (p. ej. la puerta), se suelta:
      // si no, los ojos se quedarían mirando su posición vacía (0, 0).
      if (Pointer.target && !Pointer.target.isConnected) Pointer.target = null;
      const target = this.fixedTarget && !Pointer.target ? this.fixedTarget : Pointer.target;
      if (target) {
        const r = target.getBoundingClientRect();
        this.lookAt(r.left + r.width / 2, r.top + r.height / 2);
        this.dilate(Pointer.target ? 1.38 : 1.15);
        this._exploring = false;
      } else if (finePointer.matches) {
        this.dilate(1);
        const idle = !Pointer.moved || now - Pointer.moved > 4000;
        if (idle && !rm) this._exploring = true;
        else {
          this._exploring = false;
          this.lookAt(Pointer.x, Pointer.y);
        }
      } else {
        // Táctil: giroscopio si hay permiso; si no, reacciona al scroll y explora.
        this.dilate(1);
        if (Pointer.tilt) {
          this._exploring = false;
          this.look(Pointer.tilt.nx, Pointer.tilt.ny);
        } else if (now - Pointer.scrollAt < 700) {
          this._exploring = false;
          this.look(this.ix.target > IRIS_REST.x ? 0.4 : -0.4, Pointer.scrollLook);
        } else if (!rm) {
          this._exploring = true;
        }
      }
    }

    if (this._exploring && !rm && now > this._nextExplore) {
      this.look(rand(-1, 1), rand(-1, 0.8));
      this._nextExplore = now + rand(1400, 2800);
    }

    if (!rm && now > this._nextBlink && this.open$.target > 0.5) {
      this.blink();
      this._scheduleBlink(now);
    }
  }

  _update(dt, now) {
    if (this.visible) this._behave(now);

    this.open$.step(dt);
    this.ix.step(dt);
    this.iy.step(dt);
    this.dilate$.step(dt);

    if (this.visible) this._render();

    if (this._waiters.length) {
      this._waiters = this._waiters.filter((w) => {
        if (w.test() || now > w.until) { w.resolve(this); return false; }
        return true;
      });
    }
  }

  _render(force = false) {
    const o = clamp(this.open$.value, 0, 1.08);
    const d = this._drawn;
    if (force || Math.abs(o - d.o) > 0.001) {
      const outer = outerPath(o);
      const sclera = scleraPath(o);
      this.$lidTop.setAttribute('d', outer);
      this.$sclera.setAttribute('d', sclera);
      this.$clip.setAttribute('d', sclera);
      d.o = o;
    }
    const x = this.ix.value;
    const y = this.iy.value;
    if (force || Math.abs(x - d.x) > 0.02 || Math.abs(y - d.y) > 0.02) {
      this.$iris.setAttribute('transform', `translate(${fmt(x)} ${fmt(y)})`);
      d.x = x;
      d.y = y;
    }
    const k = this.dilate$.value;
    if (force || Math.abs(k - d.d) > 0.002) {
      const pupil = IRIS.pupil * k;
      this.$pupil.setAttribute('r', fmt(pupil));
      this.$ring.setAttribute('r', fmt(pupil + 3.5));
      d.d = k;
    }
  }
}

/** Monta un ojo en cada <svg data-eye> del documento. */
export function mountEyes(root = document, selector = 'svg[data-eye]') {
  return [...root.querySelectorAll(selector)].map((svg) => new RakunEye(svg, { prefix: svg.dataset.eye || undefined }));
}
