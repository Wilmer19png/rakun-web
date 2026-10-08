/* ==========================================================================
   Marca personal · ¿Qué es cada cosa?
   Tres niveles de edición dibujados como líneas de tiempo + carrusel de formatos.
   Cada uno abre una pestaña con sus ejemplos; los videos solo se cargan al abrirla.
   ========================================================================== */
import { $, $$, reduced } from '../common.js';

// Formatos sin video todavía: src vacío = espacio de muestra.
//   { src: 'assets/videos/archivo.mp4', poster: 'assets/videos/archivo.jpg', who: 'Dra. · odontología', dur: '0:32' }
const WHO = {
  creador: ['@creadora · lifestyle', '@creador · humor', '@creadora · moda', '@creador · gaming'],
  medico: ['Dra. · odontología', 'Dr. · dermatología', 'Dra. · nutrición', 'Dr. · cirugía plástica'],
  mentor: ['Mentora · finanzas', 'Coach · ventas', 'Mentor · negocios', 'Coach · liderazgo'],
};
const placeholders = (profile, n = 4) => Array.from({ length: n }, (_, i) => ({ src: '', who: WHO[profile][i % 4], dur: `0:${String(18 + (i * 7) % 40).padStart(2, '0')}` }));

// Ejemplos reales de cada nivel de edición (videos verticales en YouTube o Vimeo).
// El reproductor solo se carga cuando tocan el video; antes se ve la portada.
const VIMEO_THUMB = (path) => `https://i.vimeocdn.com/video/${path}-d_640?region=us`;
const TIER_VIDEOS = {
  esencial: [
    { vimeo: '1142122804', poster: VIMEO_THUMB('2089764880-15b0d7811c9f361464f4b1658e8a7a2dc8fce2ba89b45e0d94c364e781bcdd48'), who: 'AIOM · medicina', dur: '2:02' },
    { yt: 'b1nMUxqFXoo', who: 'Doctora Paola · psicóloga' },
    { yt: 'NWRpuQLf0AQ', who: 'Pedro · coach' },
  ],
  pro: [
    { vimeo: '1142126583', poster: VIMEO_THUMB('2089769988-09c0452951382ad35acc04589a7c36a7626d3f747ec02fcfe43195345a4f2967'), who: 'Santi Fit · coach', dur: '0:33' },
    { yt: 'u0QM_uwYp_c', who: 'Doctora Lucía · odontóloga' },
    { yt: 'jPJ-sKQIe0U', who: 'La Cepa · restaurante español' },
  ],
  premium: [
    { yt: 'u6wRut-pz0s', who: 'Doc Mariana Hoyos · veterinaria' },
    { yt: 'fKQqtjsGtWk', who: 'Boncho · coach' },
    { yt: '8SYcDjpq3lU', who: 'Nyurkis Cabrera · coach' },
    { yt: 'd-VCyiDCuzM', who: 'Marco · coach' },
  ],
};
const embedUrl = (v) => (v.yt
  ? `https://www.youtube-nocookie.com/embed/${v.yt}?autoplay=1&rel=0&playsinline=1&modestbranding=1`
  : `https://player.vimeo.com/video/${v.vimeo}?autoplay=1&badge=0&title=0&byline=0&portrait=0`);

const PROFILES = { creador: 'creadores', medico: 'médicos', mentor: 'mentores' };
const TONE = { creador: 'var(--yellow)', medico: 'var(--blue)', mentor: 'var(--pink)' };

/* ---------- los 3 niveles: pistas de la línea de tiempo (en % de 30 s) ---------- */
const C = { v: 'var(--blue)', v2: '#1E9FCB', sub: 'var(--cream)', key: 'var(--yellow)', gfx: 'var(--pink)', sfx: 'var(--yellow)', zoom: 'var(--cream)', mus: '#8B6CF0', aud: '#3C8C6E', col: 'linear-gradient(90deg, var(--pink), #8B6CF0, var(--blue))' };
const cuts = (n) => Array.from({ length: n }, (_, i) => [(100 / n) * i, 100 / n - 0.6, i % 2 ? C.v2 : C.v]);
const blocks = (arr, c, hl = []) => arr.map(([l, w], i) => [l, w, hl.includes(i) ? C.key : c]);
const dots = (arr, c) => arr.map((l) => [l, 1.6, c]);
const full = (c) => [[0, 100, c]];
const SUBS = [[1, 14], [16, 14], [32, 15], [49, 14], [65, 15], [82, 16]];

const TIERS = [
  {
    id: 'esencial', n: 'Nivel 01', name: 'Esencial', file: 'esencial_v1.mp4',
    desc: 'Hablas a cámara; editamos cortes, subtítulos y ritmo básico.',
    tracks: [['V1', cuts(5)], ['SUB', blocks(SUBS, C.sub)], ['A1', full(C.aud)]],
    legend: [['Cortes', C.v], ['Subtítulos', C.sub], ['Voz', C.aud]],
  },
  {
    id: 'pro', n: 'Nivel 02', name: 'Pro', file: 'pro_v1.mp4',
    desc: 'Lo mismo + gráficos, zooms, efectos de sonido y ritmo dinámico.',
    tracks: [['V1', cuts(9)], ['ZOOM', dots([8, 27, 44, 61, 79], C.zoom)], ['SUB', blocks(SUBS, C.sub, [1, 4])], ['GFX', blocks([[20, 12], [55, 10], [84, 12]], C.gfx)], ['SFX', dots([9, 21, 34, 56, 70, 85], C.sfx)], ['A1', full(C.aud)]],
    legend: [['Más cortes', C.v], ['Zooms', C.zoom], ['Palabra clave', C.key], ['Gráficos', C.gfx], ['Efectos', C.sfx]],
  },
  {
    id: 'premium', n: 'Nivel 03', name: 'Premium', file: 'premium_v1.mp4', hook: true,
    desc: 'Edición de alto nivel: animación, diseño sonoro, color y gancho en los primeros 3 segundos.',
    tracks: [['V1', cuts(14)], ['ZOOM', dots([4, 15, 27, 38, 50, 62, 74, 88], C.zoom)], ['SUB', blocks(SUBS, C.sub, [0, 2, 4])], ['GFX', blocks([[0, 10], [18, 9], [36, 14], [58, 9], [76, 16]], C.gfx)], ['SFX', dots([2, 9, 17, 24, 33, 41, 52, 60, 69, 78, 86, 94], C.sfx)], ['MUS', full(C.mus)], ['COLOR', full(C.col)], ['A1', full(C.aud)]],
    legend: [['Gancho 3 s', C.key], ['Animación', C.gfx], ['Música', C.mus], ['Color', '#8B6CF0'], ['Diseño sonoro', C.sfx]],
  },
];

/* ---------- más formatos por perfil (nombres y descripciones de Tarifas_RAKUN_2026) ---------- */
const FORMATS = {
  creador: [
    ['Reacción comentada', 'Reaccionas a un video, noticia o tendencia y das tu opinión en pantalla.', 'Por video'],
    ['Sketch de humor', 'Mini escena actuada y graciosa, pensada para compartirse.', 'Por video'],
    ['Formato POV', 'Grabado como si quien mira viviera la escena en primera persona.', 'Por video'],
    ['Tú vs. tú', 'Apareces dos veces en el mismo video conversando contigo.', 'Por video'],
    ['Clips de tu contenido largo', 'Cortamos los mejores momentos de tu podcast o live.', 'Por video'],
    ['Carrusel animado', 'Varias láminas que se deslizan, con elementos en movimiento.', 'Por carrusel'],
    ['Reel animado', 'Video 100% animado con gráficos y textos. Sin grabación.', 'Por video'],
    ['Aftermovie', 'Resumen rápido y emocionante de un evento o lanzamiento.', 'Por video'],
  ],
  medico: [
    ['Preguntas y respuestas', 'Respondes las dudas que más te hacen tus pacientes.', 'Por video'],
    ['Video publicitario', 'Anuncio para pauta: un mensaje, una acción. Esencial, Pro o Premium.', 'Por video'],
    ['POV de consulta', 'Quien mira vive la consulta en primera persona: cero miedo.', 'Por video'],
    ['Carrusel educativo', 'Información clara en láminas que se guardan y se comparten.', 'Por carrusel'],
    ['Historia con voz en off', 'Contamos un caso con tu voz y video de apoyo, sin que salgas a cámara.', 'Por video'],
    ['El paciente vs. el experto', 'Te interpretas a ti y al paciente para resolver un mito.', 'Por video'],
    ['Clips de tu charla', 'Los mejores minutos de tu conferencia o live, en vertical.', 'Por video'],
    ['Reel animado', 'Explicamos un procedimiento con animación, sin grabarte.', 'Por video'],
  ],
  mentor: [
    ['Video de ventas (VSL)', 'Video largo que explica tu oferta paso a paso y lleva a comprar.', 'Por minuto'],
    ['Podcast en video', 'Edición entre cámaras, audio limpio, nombres y gráficos.', 'Por minuto'],
    ['Video publicitario', 'Anuncio con guion de ventas para llenar tu programa.', 'Por video'],
    ['Clips del podcast', 'Del episodio de una hora salen diez videos cortos.', 'Por video'],
    ['Carrusel de método', 'Tu método en láminas: paso a paso, guardable.', 'Por carrusel'],
    ['Preguntas y respuestas', 'Resuelves objeciones antes de que lleguen a ventas.', 'Por video'],
    ['Webinar recortado', 'Tu clase en vivo convertida en piezas cortas que venden.', 'Por video'],
    ['Reel animado', 'Tu método explicado con animación, sin grabarte.', 'Por video'],
  ],
};

const MAX_EXAMPLES = 4;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

const fx = { profile: 'creador', open: null }; // open = { kind: 'tier'|'format', i }
let root;

/* ---------- render ---------- */
function tierHTML(t, i) {
  const ticks = [0, 5, 10, 15, 20, 25, 30].map((s) => `<span style="left:${(s / 30) * 100}%">00:${pad(s)}</span>`).join('');
  const tracks = t.tracks.map(([name, segs]) => `
    <div class="fx-trk"><span class="fx-trk__name">${name}</span><div class="fx-trk__lane">${segs.map(([l, w, c]) => `<i style="left:${l}%;width:${w}%;background:${c}"></i>`).join('')}</div></div>`).join('');
  return `
  <article class="fx-tier">
    <div class="fx-nle" aria-hidden="true">
      <div class="fx-nle__top mono"><span class="fx-nle__file">● ${t.file}</span><span>${t.tracks.length} pistas</span></div>
      <div class="fx-nle__ruler mono">${ticks}</div>
      <div class="fx-nle__body">
        ${t.hook ? '<span class="fx-nle__hook mono">gancho 3 s</span>' : ''}
        ${tracks}
        <span class="fx-nle__head"></span>
      </div>
    </div>
    <p class="fx-tier__n mono">${t.n}</p>
    <h4 class="fx-tier__name">${t.name}</h4>
    <p class="fx-tier__desc">${t.desc}</p>
    <ul class="fx-legend" aria-label="Qué incluye">${t.legend.map(([n, c]) => `<li class="mono"><i style="background:${c}"></i>${n}</li>`).join('')}</ul>
    <button class="fx-btn mono" type="button" data-fx-open="tier" data-i="${i}" aria-expanded="false" aria-controls="fx-drawer-tiers">Ver ejemplos <span aria-hidden="true">↗</span></button>
  </article>`;
}

function formatCardHTML([name, desc, unit], i) {
  return `
  <li><button class="fx-card" type="button" data-fx-open="format" data-i="${i}" aria-expanded="false" aria-controls="fx-drawer-formats">
    <span class="fx-card__meta mono">${pad(i + 1)} · ${unit}</span>
    <span class="fx-card__name">${esc(name)}</span>
    <span class="fx-card__desc">${esc(desc)}</span>
    <span class="fx-card__foot mono"><span>${MAX_EXAMPLES} ejemplos</span><span class="fx-card__arrow" aria-hidden="true">↓</span></span>
  </button></li>`;
}

function videoHTML(v, i) {
  let frame;
  if (v.yt || v.vimeo) {
    // portada: de YouTube la vertical (oardefault); si no existe (o es la imagen gris de 120 px), la normal
    const img = v.yt
      ? `<img src="https://i.ytimg.com/vi/${v.yt}/oardefault.jpg" onload="if(this.naturalWidth<200)this.src='https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg'" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg'" alt="" loading="lazy">`
      : `<img src="${esc(v.poster)}" alt="" loading="lazy">`;
    frame = `<button class="fx-vid__poster" type="button" data-embed="${esc(embedUrl(v))}" aria-label="Reproducir: ${esc(v.who)}">${img}<span class="fx-vid__play" aria-hidden="true"></span></button>`;
  } else if (v.src) {
    frame = `<video src="${esc(v.src)}"${v.poster ? ` poster="${esc(v.poster)}"` : ''} controls playsinline preload="none"></video>`;
  } else {
    frame = '<span class="fx-vid__play" aria-hidden="true"></span><span class="fx-vid__soon mono">Espacio para video</span>';
  }
  return `
  <figure class="fx-vid">
    <div class="fx-vid__f">${frame}${v.dur ? `<span class="fx-vid__dur mono">${esc(v.dur)}</span>` : ''}</div>
    <figcaption><span class="mono">Ejemplo ${pad(i + 1)}</span>${esc(v.who)}</figcaption>
  </figure>`;
}

function renderFormats() {
  $('[data-fx-who]', root).textContent = PROFILES[fx.profile];
  root.style.setProperty('--t', TONE[fx.profile]);
  $('[data-fx-formats]', root).innerHTML = FORMATS[fx.profile].map(formatCardHTML).join('');
  $('[data-fx-formats]', root).scrollLeft = 0;
  bindOpeners();
  updateArrows();
}

function fillDrawer(drawer, { kicker, title, desc, examples }) {
  $('[data-fx-kicker]', drawer).textContent = kicker;
  $('[data-fx-title]', drawer).textContent = title;
  const d = $('[data-fx-desc]', drawer);
  d.textContent = desc || '';
  d.hidden = !desc;
  $('[data-fx-count]', drawer).textContent = `${examples.length} ejemplos`;
  $('[data-fx-videos]', drawer).innerHTML = examples.slice(0, MAX_EXAMPLES).map(videoHTML).join('');
  // al tocar la portada entra el reproductor (YouTube o Vimeo) y arranca
  $$('[data-embed]', drawer).forEach((b) => b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = b.dataset.embed;
    f.title = b.getAttribute('aria-label');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    b.replaceWith(f);
  }));
}

function closeDrawers() {
  $$('[data-fx-drawer]', root).forEach((d) => {
    d.classList.remove('is-open');
    d.inert = true;
    // al cerrar, se detienen y descargan los videos
    $$('video', d).forEach((v) => v.pause());
    $$('iframe', d).forEach((f) => f.remove());           // YouTube y Vimeo: se quitan para que dejen de sonar
  });
  $$('[data-fx-open]', root).forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.classList.remove('is-on'); });
  fx.open = null;
}

function open(kind, i) {
  const same = fx.open && fx.open.kind === kind && fx.open.i === i;
  closeDrawers();
  if (same) return;
  fx.open = { kind, i };
  const btn = $(`[data-fx-open="${kind}"][data-i="${i}"]`, root);
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('is-on');
  const who = { creador: 'Creador', medico: 'Médico', mentor: 'Mentor' }[fx.profile];
  const drawer = $(`[data-fx-drawer="${kind === 'tier' ? 'tiers' : 'formats'}"]`, root);
  if (kind === 'tier') {
    fillDrawer(drawer, { kicker: 'Tipos de edición · trabajos reales', title: TIERS[i].name, desc: TIERS[i].desc, examples: TIER_VIDEOS[TIERS[i].id] || placeholders(fx.profile) });
  } else {
    const [name, desc, unit] = FORMATS[fx.profile][i];
    fillDrawer(drawer, { kicker: `${unit} · ${who}`, title: name, desc, examples: placeholders(fx.profile) });
  }
  drawer.classList.add('is-open');
  drawer.inert = false;
  if (!reduced) setTimeout(() => {
    const r = drawer.getBoundingClientRect();
    if (r.bottom > window.innerHeight) drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 360);
}

function bindOpeners() {
  $$('[data-fx-open]', root).forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => open(b.dataset.fxOpen, Number(b.dataset.i)));
  });
}

/* ---------- flechas del carrusel ---------- */
function updateArrows() {
  const rail = $('[data-fx-formats]', root);
  const max = rail.scrollWidth - rail.clientWidth - 2;
  $('[data-fx-prev]', root).disabled = rail.scrollLeft <= 2;
  $('[data-fx-next]', root).disabled = rail.scrollLeft >= max;
}

export function setFormatsProfile(p) {
  if (!root || !FORMATS[p] || p === fx.profile) return;
  fx.profile = p;
  closeDrawers();
  $$('[data-fx-profile]', root).forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.fxProfile === p)));
  renderFormats();
}

export function initFormats(onProfile) {
  root = $('[data-fx]');
  if (!root) return;
  $('[data-fx-tiers]', root).innerHTML = TIERS.map(tierHTML).join('');
  renderFormats();

  $$('[data-fx-profile]', root).forEach((t) => t.addEventListener('click', () => {
    setFormatsProfile(t.dataset.fxProfile);
    onProfile?.(t.dataset.fxProfile);   // los planes de abajo cambian al mismo perfil
  }));
  $$('[data-fx-close]', root).forEach((b) => b.addEventListener('click', closeDrawers));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fx.open) closeDrawers(); });

  const rail = $('[data-fx-formats]', root);
  const step = () => (rail.querySelector('li')?.offsetWidth || 220) * 2 + 32;
  $('[data-fx-prev]', root).addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }));
  $('[data-fx-next]', root).addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' }));
  rail.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
}
