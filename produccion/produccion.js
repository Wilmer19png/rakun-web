/* ==========================================================================
   RAKÜN — produccion.js
   Etapas desplegables con mini animaciones, plano del set con HUD de
   grabación, crew a oscuras con linterna, videoteca de casetes y el ojo que
   estalla en el CTA. Todo "a pocos cuadros", como la intro.
   ========================================================================== */

import { RakunEye } from '../eye.js';
import { $, $$, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';

const pad = (n) => String(n).padStart(2, '0');
const timecode = (sec) => {
  const s = Math.floor(sec);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(Math.floor((sec % 1) * 24))}`;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ---------- Smooth scroll ---------- */
let lenis = null;
function initLenis() {
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
function scrollToEl(el) {
  if (lenis) lenis.scrollTo(el, { offset: -40, duration: 1.2 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}

/* ==========================================================================
   002 · Etapas
   ========================================================================== */
const STAGE_IDS = ['preproduccion', 'rodaje', 'postproduccion'];
const stagesBox = $('[data-stages]');
const stages = $$('[data-stage]');
let stageTimers = [];

function stageIn(stage) {
  const detail = $('.stage__detail', stage);
  const list = $('.svcs', stage);
  const items = $$('.svc', list);
  stageTimers.forEach(clearTimeout);
  stageTimers = [];
  const later = (ms, fn) => stageTimers.push(setTimeout(fn, ms));
  if (reduced) { detail.style.clipPath = ''; return; }
  // el panel se abre en 3 cuadros, de izquierda a derecha
  ['inset(0 100% 0 0)', 'inset(0 66% 0 0)', 'inset(0 33% 0 0)', ''].forEach((c, k) => later(k * 90, () => { detail.style.clipPath = c; }));
  detail.style.clipPath = 'inset(0 100% 0 0)';
  // y los servicios aparecen uno a uno, a saltos
  list.classList.add('is-staging');
  items.forEach((it) => it.classList.remove('is-in', 'is-set'));
  items.forEach((it, k) => {
    later(300 + k * 110, () => it.classList.add('is-in'));
    later(300 + k * 110 + 90, () => it.classList.add('is-set'));
  });
  later(300 + items.length * 110 + 200, () => list.classList.remove('is-staging'));
}

function openStage(i, focus = false) {
  stagesBox.classList.add('has-open');
  stages.forEach((st, k) => {
    const active = k === i;
    st.classList.toggle('is-active', active);
    $('.stage__tab', st).hidden = active;
    $('.stage__detail', st).hidden = !active;
    $('.stage__open', st).setAttribute('aria-expanded', String(active));
  });
  stageIn(stages[i]);
  if (focus) $('.stage__close', stages[i]).focus({ preventScroll: true });
}

function closeStage(from) {
  stagesBox.classList.remove('has-open');
  stages.forEach((st) => {
    st.classList.remove('is-active');
    $('.stage__tab', st).hidden = true;
    $('.stage__detail', st).hidden = true;
    $('.stage__open', st).setAttribute('aria-expanded', 'false');
  });
  if (from) $('.stage__open', from).focus({ preventScroll: true });
}

function initStages() {
  if (!stagesBox) return;
  stages.forEach((st, i) => {
    // con teclado (detail 0) el foco pasa al panel abierto; con el mouse no
    $$('[data-stage-open]', st).forEach((b) => b.addEventListener('click', (e) => openStage(i, e.detail === 0)));
    $('[data-stage-close]', st).addEventListener('click', () => closeStage(st));
  });
}

/* ---------- Mini animaciones de cada servicio ----------
   Quietas en su cuadro de reposo; solo se mueven mientras el cursor está encima.
   (En el pase de móvil se podrán recorrer una por una.) */
const REST = { bulb: 0, lens: 3, type: 13, table: 6, panels: 5, photos: 3, pin: 5, cal: 15, count: 11, clap: 3, rec: 0, wave: 0, cut: 4, color: 0, iris: 3, burst: 4 };
const MONO = 'font-family="JetBrains Mono, monospace"';
const MARK = 'font-family="Permanent Marker, cursive"';
const svg = (inner) => `<svg viewBox="0 0 220 92">${inner}</svg>`;
const BURST = '0,-50 4.4,-16.4 18,-31.2 12,-12 40.7,-23.5 16.4,-4.4 31,0 16.4,4.4 43.3,25 12,12 20,34.6 4.4,16.4 0,45 -4.4,16.4 -16.5,28.6 -12,12 -42.4,24.5 -16.4,4.4 -38,0 -16.4,-4.4 -39.8,-23 -12,-12 -17.5,-30.3 -4.4,-16.4';

const ANIM = {
  bulb(s) {
    const on = [1, 1, 0.2, 1, 1, 1, 0.3, 1][s % 8];
    const rays = on > 0.5 ? [1, 0.4][s % 2] : 0;
    return svg(`<g stroke="#FFF02B" stroke-width="3" opacity="${rays}"><line x1="110" y1="8" x2="110" y2="16"/><line x1="76" y1="22" x2="83" y2="28"/><line x1="144" y1="22" x2="137" y2="28"/><line x1="66" y1="46" x2="76" y2="46"/><line x1="144" y1="46" x2="154" y2="46"/></g><circle cx="110" cy="46" r="20" fill="#FFF02B" opacity="${on}"/><circle cx="110" cy="46" r="20" fill="none" stroke="#fff" stroke-width="2"/><rect x="100" y="66" width="20" height="14" fill="#C3C0DD"/>`);
  },
  lens(s) {
    const x = [0, 30, 60, 90, 120, 150, 120, 90, 60, 30][s % 10];
    return svg(`<g fill="rgba(255,255,255,.25)"><rect x="20" y="18" width="180" height="5"/><rect x="20" y="32" width="150" height="5"/><rect x="20" y="46" width="170" height="5"/><rect x="20" y="60" width="120" height="5"/><rect x="20" y="74" width="160" height="5"/></g><g transform="translate(${x} 0)"><circle cx="40" cy="44" r="20" fill="rgba(43,205,255,.25)" stroke="#2BCDFF" stroke-width="4"/><line x1="54" y1="58" x2="70" y2="74" stroke="#2BCDFF" stroke-width="6" stroke-linecap="round"/></g>`);
  },
  type(s) {
    const p = s % 14;
    const w = [160, 130, 150, 90].map((full, k) => clamp((p - k * 3) * 50, 0, full));
    const line = Math.min(3, Math.floor(p / 3));
    return svg(`<text x="20" y="20" fill="#C3C0DD" ${MONO} font-size="9" letter-spacing="1">ESC. 01 — INT. CALLE · NOCHE</text><rect x="20" y="32" width="${w[0]}" height="5" fill="#fff"/><rect x="20" y="46" width="${w[1]}" height="5" fill="#fff"/><rect x="20" y="60" width="${w[2]}" height="5" fill="#fff"/><rect x="20" y="74" width="${w[3]}" height="5" fill="#FF2C68"/><rect x="${22 + w[line]}" y="${29 + line * 14}" width="6" height="11" fill="#FFF02B" opacity="${s % 2}"/>`);
  },
  table(s) {
    const p = s % 7;
    const r = (k) => (p > k ? 1 : 0);
    return svg(`<g ${MONO} font-size="9" letter-spacing="1"><text x="14" y="16" fill="#FF2C68">PL · VALOR · LENTE · MOV.</text><text x="14" y="34" fill="#fff" opacity="${r(0)}">01 · PG · 28mm · FIJO</text><text x="14" y="50" fill="#fff" opacity="${r(1)}">02 · PM · 50mm · GIMBAL</text><text x="14" y="66" fill="#fff" opacity="${r(2)}">03 · PP · ANAM. · PANEO</text><text x="14" y="82" fill="#fff" opacity="${r(3)}">04 · PD · 50mm · FIJO</text></g><line x1="10" y1="22" x2="210" y2="22" stroke="rgba(255,255,255,.3)"/>`);
  },
  panels(s) {
    const p = s % 6;
    const r = (k) => (p > k ? 1 : 0.15);
    return svg(`<g opacity="${r(0)}"><rect x="12" y="18" width="60" height="44" fill="none" stroke="#fff" stroke-width="2"/><circle cx="42" cy="38" r="9" fill="none" stroke="#fff" stroke-width="2"/><line x1="30" y1="58" x2="54" y2="58" stroke="#fff" stroke-width="2"/></g><g opacity="${r(1)}"><rect x="80" y="18" width="60" height="44" fill="none" stroke="#fff" stroke-width="2"/><line x1="88" y1="56" x2="132" y2="28" stroke="#2BCDFF" stroke-width="2"/><polygon points="126,26 134,27 130,34" fill="#2BCDFF"/></g><g opacity="${r(2)}"><rect x="148" y="18" width="60" height="44" fill="none" stroke="#fff" stroke-width="2"/><circle cx="170" cy="40" r="7" fill="#FF2C68"/><circle cx="188" cy="44" r="7" fill="#FF2C68"/></g><text x="12" y="80" fill="#C3C0DD" ${MONO} font-size="9" letter-spacing="1">01        02        03</text>`);
  },
  photos(s) {
    const p = s % 4;
    const [a, b, c] = [[20, 70, 120], [70, 120, 20], [120, 20, 70], [70, 20, 120]][p];
    const pol = (x, y, rot, fill) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="44" height="54" fill="#F3F0EA"/><rect x="5" y="5" width="34" height="34" fill="${fill}"/></g>`;
    return svg(`${pol(a, 14, -6, '#2BCDFF')}${pol(b, 16, 5, '#FF2C68')}${pol(c, 12, -2, '#FFF02B')}<text x="150" y="84" fill="#FF2C68" ${MARK} font-size="14" opacity="${p === 3 ? 1 : 0}">¡ESA!</text>`);
  },
  pin(s) {
    const p = s % 6;
    const drop = [-40, -20, 0, -6, 0, 0][p];
    const ring = [0, 0, 6, 14, 22, 0][p];
    return svg(`<g stroke="rgba(255,255,255,.22)" stroke-width="2" fill="none"><path d="M0 60 C40 50 70 70 110 58 S180 40 220 52"/><path d="M60 0 L80 92"/><path d="M150 0 C140 30 160 60 150 92"/></g><circle cx="112" cy="66" r="${ring}" fill="none" stroke="#FF2C68" stroke-width="2" opacity="${p >= 2 && p <= 4 ? 1 : 0}"/><g transform="translate(0 ${drop})"><path d="M112 66 C100 50 100 40 112 32 C124 40 124 50 112 66Z" fill="#FF2C68"/><circle cx="112" cy="44" r="4" fill="#010221"/></g>`);
  },
  cal(s) {
    const p = s % 16;
    const cells = Array.from({ length: 14 }, (_, k) => {
      const on = k < p;
      return `<span style="background:${on ? (k % 5 === 4 ? '#FFF02B' : '#FF2C68') : 'transparent'}">${on ? '✓' : ''}</span>`;
    }).join('');
    return `<div class="an-cal">${cells}</div>`;
  },
  count(s) {
    const v = Math.min(100, (s % 12) * 10);
    return svg(`<text x="20" y="44" fill="#fff" ${MONO} font-size="24" font-weight="500">${v}%</text><text x="120" y="44" fill="#C3C0DD" ${MONO} font-size="9" letter-spacing="1">CUADRADO</text><rect x="20" y="58" width="180" height="10" fill="none" stroke="rgba(255,255,255,.4)"/><rect x="20" y="58" width="${v * 1.8}" height="10" fill="#FFF02B"/>`);
  },
  clap(s) {
    const p = s % 5;
    const ang = [-26, -26, 0, 0, 0][p];
    return svg(`<g transform="rotate(${ang} 64 34)"><rect x="64" y="22" width="96" height="12" fill="#F3F0EA"/><polygon points="72,22 84,22 78,34 66,34" fill="#010221"/><polygon points="96,22 108,22 102,34 90,34" fill="#010221"/><polygon points="120,22 132,22 126,34 114,34" fill="#010221"/><polygon points="144,22 156,22 150,34 138,34" fill="#010221"/></g><rect x="64" y="36" width="96" height="44" fill="#1B1A35" stroke="#F3F0EA" stroke-width="2"/><text x="72" y="62" fill="#F3F0EA" ${MARK} font-size="14">TOMA ${pad(1 + (Math.floor(s / 5) % 9))}</text><text x="166" y="40" fill="#FF2C68" ${MARK} font-size="16" opacity="${p >= 2 && p <= 3 ? 1 : 0}">¡ACCIÓN!</text>`);
  },
  rec(s, i) {
    return svg(`<g stroke="#fff" stroke-width="2" fill="none"><path d="M14 22V12H28M192 12H206V22M206 70V80H192M28 80H14V70"/></g><circle cx="32" cy="28" r="5" fill="#FF2C68" opacity="${s % 2}"/><text x="42" y="32" fill="#fff" ${MONO} font-size="10" letter-spacing="1">REC</text><text x="118" y="32" fill="#fff" ${MONO} font-size="10" letter-spacing="1">${timecode(s * 0.16 + i)}</text><path d="M104 52h12M110 46v12" stroke="#fff" stroke-width="1.5"/><text x="30" y="72" fill="#C3C0DD" ${MONO} font-size="8" letter-spacing="1">ISO 800  1/48  T2.8  4K</text>`);
  },
  wave(s, i) {
    const bars = Array.from({ length: 16 }, (_, k) => `<span style="height:${8 + Math.abs(Math.round(Math.sin(k * 1.7 + s * 0.9 + i) * 34))}px"></span>`).join('');
    return `<div class="an-wave">${bars}</div>`;
  },
  cut(s) {
    const x = 12 + ((s * 16) % 194);
    return svg(`<rect x="12" y="22" width="60" height="18" fill="#2BCDFF"/><rect x="74" y="22" width="44" height="18" fill="#FF2C68"/><rect x="120" y="22" width="86" height="18" fill="#FFF02B"/><rect x="12" y="46" width="110" height="14" fill="rgba(255,255,255,.35)"/><rect x="124" y="46" width="82" height="14" fill="rgba(255,255,255,.2)"/><line x1="${x}" y1="12" x2="${x}" y2="72" stroke="#fff" stroke-width="2"/><polygon points="${x - 5},12 ${x + 5},12 ${x},19" fill="#fff"/><text x="12" y="84" fill="#C3C0DD" ${MONO} font-size="9" letter-spacing="1">V1 · A1 · ${timecode(s * 0.4)}</text>`);
  },
  color(s) {
    const a = s * 0.7;
    const dot = (cx, r, off, fill) => `<circle cx="${(cx + Math.cos(a + off) * r).toFixed(1)}" cy="${(44 + Math.sin(a + off) * r).toFixed(1)}" r="5" fill="${fill}"/>`;
    return svg(`<g fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"><circle cx="50" cy="44" r="26"/><circle cx="110" cy="44" r="26"/><circle cx="170" cy="44" r="26"/></g>${dot(50, 12, 0, '#2BCDFF')}${dot(110, 10, 2, '#FFF02B')}${dot(170, 14, 4, '#FF2C68')}<text x="34" y="86" fill="#C3C0DD" ${MONO} font-size="8" letter-spacing="1">LIFT      GAMMA      GAIN</text>`);
  },
  iris(s) {
    const p = s % 6;
    return svg(`<circle cx="110" cy="46" r="34" fill="#1B1A35" stroke="#fff" stroke-width="2"/><circle cx="110" cy="46" r="${[6, 10, 16, 22, 16, 10][p]}" fill="#2BCDFF"/><g stroke="rgba(255,255,255,.5)" stroke-width="1.5"><line x1="110" y1="12" x2="122" y2="40"/><line x1="140" y1="29" x2="118" y2="50"/><line x1="140" y1="63" x2="110" y2="58"/><line x1="110" y1="80" x2="98" y2="52"/><line x1="80" y1="63" x2="102" y2="42"/><line x1="80" y1="29" x2="110" y2="34"/></g><text x="156" y="50" fill="#fff" ${MONO} font-size="11">${['T8', 'T5.6', 'T4', 'T2.8', 'T4', 'T5.6'][p]}</text>`);
  },
  burst(s) {
    const p = s % 6;
    return svg(`<g transform="translate(110 46) scale(${[0.2, 0.6, 0.85, 0.75, 0.8, 0.8][p]}) rotate(${p * 8})"><polygon fill="#FF2C68" points="${BURST}"/></g><rect x="62" y="8" width="96" height="76" fill="none" stroke="#2BCDFF" stroke-dasharray="3 3"/>`);
  },
};

function initServiceAnims() {
  $$('.svc__anim').forEach((el) => {
    const kind = el.dataset.anim;
    if (!ANIM[kind]) return;
    const i = $$('.svc__anim', el.closest('.svcs')).indexOf(el);
    const draw = (s) => { el.innerHTML = ANIM[kind](s, i); };
    draw(REST[kind]);
    if (reduced) return;
    const svc = el.closest('.svc');
    let timer = 0;
    svc.addEventListener('pointerenter', () => {
      let step = REST[kind] + 1;
      clearInterval(timer);
      draw(step++);
      timer = setInterval(() => draw(step++), 160);    // un paso cada 160 ms: animación a pocos cuadros
    });
    svc.addEventListener('pointerleave', () => { clearInterval(timer); draw(REST[kind]); });
  });
}

/* ==========================================================================
   003 · El set: plano + HUD de grabación
   ========================================================================== */
function initSet() {
  const gearBtns = $$('.gear__item');
  const marks = $$('.mk');
  const label = $('[data-gear-label]');
  if (!gearBtns.length) return;
  const pick = (i) => {
    gearBtns.forEach((b, k) => { b.classList.toggle('is-active', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    marks.forEach((m, k) => m.classList.toggle('is-active', k === i));
    label.textContent = `${pad(i + 1)} · ${$('.gear__name', gearBtns[i]).textContent}`;
  };
  [...gearBtns, ...marks].forEach((b) => {
    const i = Number(b.dataset.gearI);
    ['pointerenter', 'focus', 'click'].forEach((ev) => b.addEventListener(ev, () => pick(i)));
  });
  pick(0);

  const plan = $('[data-plan]');
  const hud = $('[data-hud]');
  const tc = $('[data-hud-tc]');
  let timers = [];
  let recStart = 0;
  let visible = false;
  let played = false;

  const playHud = () => {
    timers.forEach(clearTimeout);
    timers = [];
    recStart = 0;
    if (reduced) { hud.removeAttribute('data-step'); recStart = performance.now(); return; }
    [0, 1, 2, 3, 4].forEach((s, k) => timers.push(setTimeout(() => { hud.dataset.step = String(s); }, k * 110)));
    timers.push(setTimeout(() => { hud.removeAttribute('data-step'); recStart = performance.now(); }, 5 * 110 + 220));
  };
  if (!reduced) hud.dataset.step = '0';                  // a oscuras hasta que llegues a la sección

  let lastTc = '';
  const loop = (now) => {
    if (!visible) return;
    const t = timecode(recStart ? Math.max(0, now - recStart) / 1000 : 0);
    if (t !== lastTc) { tc.textContent = t; lastTc = t; }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) {
      if (!played) { played = true; playHud(); }
      requestAnimationFrame(loop);
    }
  }, { threshold: 0.35 }).observe(plan);

  $('[data-rec-again]')?.addEventListener('click', playHud);
}

/* ==========================================================================
   004 · La crew: linterna + ojo escondido
   ========================================================================== */
function initCrew() {
  const wall = $('[data-wall]');
  if (!wall) return;
  const lightsBtn = $('[data-lights]');
  const lightsLabel = $('[data-lights-label]');
  const modeLabel = $('[data-light-mode]');
  const eyeSvg = $('[data-crew-eye]');
  const eye = new RakunEye(eyeSvg, { prefix: 'eye-crew', gaze: { k: 140, c: 16 } });

  let mx = 0, my = 0, manual = false, lit = false, visible = false, lt = 0, last = 0;
  let nextBlink = performance.now() + 4000;
  const setMode = () => {
    modeLabel.textContent = lit ? 'luces encendidas' : manual ? 'linterna en tu mano' : 'la linterna busca sola';
  };
  const apply = () => {
    wall.style.setProperty('--mx', `${mx.toFixed(1)}px`);
    wall.style.setProperty('--my', `${my.toFixed(1)}px`);
  };
  const center = () => { const r = wall.getBoundingClientRect(); mx = r.width * 0.5; my = r.height * 0.55; apply(); };
  center();

  if (fine) {
    wall.addEventListener('pointermove', (e) => {
      if (lit || e.pointerType === 'touch') return;
      const r = wall.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      if (!manual) { manual = true; setMode(); }
      apply();
    });
    wall.addEventListener('pointerleave', () => { manual = false; setMode(); });
  }

  lightsBtn.addEventListener('click', () => {
    lit = !lit;
    wall.classList.toggle('is-lit', lit);
    lightsBtn.setAttribute('aria-pressed', String(lit));
    lightsLabel.textContent = lit ? 'Apagar la luz' : 'Encender la luz';
    manual = false;
    setMode();
  });

  const loop = (now) => {
    if (!visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const r = wall.getBoundingClientRect();
    // sin cursor (o en táctil) la linterna recorre la pared sola
    if (!manual && !lit && !reduced) {
      lt += dt * 0.75;
      mx = r.width * (0.48 + 0.38 * Math.cos(lt));
      my = r.height * (0.6 + 0.24 * Math.sin(lt * 2));
      apply();
    }
    // el ojo mira la luz; si lo alumbras de frente, se sorprende
    const er = eyeSvg.getBoundingClientRect();
    const lx = r.left + mx, ly = r.top + my;
    const dist = Math.hypot(lx - (er.left + er.width / 2), ly - (er.top + er.height / 2));
    if (lit) eye.look(0, 0); else eye.lookAt(lx, ly);
    eye.dilate(!lit && dist < 180 ? 1.4 : 1);
    if (!reduced && now > nextBlink) { eye.blink(); nextBlink = now + 4000 + Math.random() * 3000; }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) { last = 0; requestAnimationFrame(loop); }
  }, { rootMargin: '100px 0px' }).observe(wall);
}

/* ==========================================================================
   005 · Videoteca
   ========================================================================== */
function initTapes() {
  const spines = $$('.spine');
  const player = $('[data-player]');
  if (!spines.length || !player) return;
  const video = $('[data-player-video]');
  const btn = $('[data-player-btn]');
  const tc = $('[data-player-tc]');
  const set = (key, text) => { $(`[data-player-${key}]`).textContent = text; };
  let timers = [];
  let tcStart = performance.now();
  let visible = false;

  const select = (spine) => {
    spines.forEach((s) => {
      const on = s === spine;
      s.classList.toggle('is-out', on);
      s.setAttribute('aria-pressed', String(on));
    });
    const d = spine.dataset;
    video.pause();
    video.removeAttribute('controls');
    player.classList.remove('is-playing', 'has-video');
    if (d.src) { video.src = d.src; player.classList.add('has-video'); } else { video.removeAttribute('src'); video.load(); }
    set('name', d.name); set('kind', d.kind); set('client', d.client); set('year', d.year); set('did', d.did);
    $('[data-player-ph]').hidden = !!d.src;
    btn.setAttribute('aria-label', `Reproducir ${d.name}`);
    // cambio de casete: negro, estática y PLAY, a pocos cuadros
    timers.forEach(clearTimeout);
    timers = [];
    if (reduced) { tcStart = performance.now(); return; }
    [0, 1, 2, 3].forEach((s, k) => timers.push(setTimeout(() => { player.dataset.step = String(s); }, k * 80)));
    timers.push(setTimeout(() => { player.removeAttribute('data-step'); tcStart = performance.now(); }, 4 * 80));
  };
  spines.forEach((s) => s.addEventListener('click', () => select(s)));

  btn.addEventListener('click', () => {
    if (!video.getAttribute('src')) return;              // TODO: sin video aún, solo el placeholder
    video.controls = true;
    video.play().then(() => player.classList.add('is-playing')).catch(() => {});
  });
  video.addEventListener('pause', () => player.classList.remove('is-playing'));

  let lastTc = '';
  const loop = (now) => {
    if (!visible) return;
    const sec = player.classList.contains('is-playing') ? video.currentTime : Math.max(0, now - tcStart) / 1000;
    const t = timecode(sec);
    if (t !== lastTc) { tc.textContent = t; lastTc = t; }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) requestAnimationFrame(loop);
    else if (!video.paused) video.pause();
  }).observe(player);
}

/* ==========================================================================
   006 · CTA: el ojo mira el botón y estalla al pasar por encima
   ========================================================================== */
function initCta() {
  const box = $('[data-cta-eye]');
  const btn = $('[data-cta-btn]');
  if (!box || !btn) return;
  const eye = new RakunEye($('svg', box), { prefix: 'eye-cta-prod' });
  eye.watch(btn);
  const boom = () => {
    box.classList.remove('is-boom');
    void box.offsetWidth;                                // reinicia la animación
    box.classList.add('is-boom');
  };
  const calm = () => box.classList.remove('is-boom');
  btn.addEventListener('pointerenter', boom);
  btn.addEventListener('focus', boom);
  btn.addEventListener('pointerleave', calm);
  btn.addEventListener('blur', calm);
}

/* ---------- Anclas: las etapas se abren desde el menú y la sub-navegación ---------- */
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    const si = STAGE_IDS.indexOf(id);
    if (si >= 0) { openStage(si); scrollToEl($('#etapas')); } else scrollToEl(target);
    history.replaceState(null, '', `#${id}`);
  });
  const si = STAGE_IDS.indexOf(location.hash.slice(1));
  if (si >= 0) {
    openStage(si);
    requestAnimationFrame(() => $('#etapas').scrollIntoView());
  }
}

/* ==========================================================================
   Arranque
   ========================================================================== */
initClock();
initLenis();
initHeader(() => lenis);
initMegaMenu();
initCursor();
initStages();
initServiceAnims();
initSet();
initCrew();
initTapes();
initCta();
initAnchors();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).followCursor();
