/* ==========================================================================
   Redes · ¿Qué es cada cosa?
   Tres niveles de edición dibujados como líneas de tiempo. Los formatos de la
   librería viven en planes/data.js (REDES.library).
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
export const placeholders = (profile, n = 4) => Array.from({ length: n }, (_, i) => ({ src: '', who: (WHO[profile] || WHO.creador)[i % 4], dur: `0:${String(18 + (i * 7) % 40).padStart(2, '0')}` }));

// Ejemplos reales de cada nivel de edición (videos verticales en YouTube o Vimeo).
// El reproductor solo se carga cuando tocan el video; antes se ve la portada.
const VIMEO_THUMB = (path) => `https://i.vimeocdn.com/video/${path}-d_640?region=us`;
const TIER_VIDEOS = {
  esencial: [
    { yt: 'NqQEHzXv3pU', who: 'Blue · coach' },
    { vimeo: '1142122804', poster: VIMEO_THUMB('2089764880-15b0d7811c9f361464f4b1658e8a7a2dc8fce2ba89b45e0d94c364e781bcdd48'), who: 'AIOM · medicina', dur: '2:02' },
    { yt: 'b1nMUxqFXoo', who: 'Doctora Paola · psicóloga' },
  ],
  pro: [
    { vimeo: '1142126583', poster: VIMEO_THUMB('2089769988-09c0452951382ad35acc04589a7c36a7626d3f747ec02fcfe43195345a4f2967'), who: 'Santi Fit · coach', dur: '0:33' },
    { yt: 'u0QM_uwYp_c', who: 'Doctora Lucía · odontóloga' },
    { yt: 'jPJ-sKQIe0U', who: 'La Cepa · restaurante español' },
  ],
  premium: [
    { yt: 'u6wRut-pz0s', who: 'Doc Mariana Hoyos · veterinaria' },
    { yt: 'rlkpU8R4dfY', who: 'Doc Mariana Hoyos · veterinaria' },
    { yt: 'Dr49vCa60ug', who: 'Doc Mariana Hoyos · veterinaria' },
    { yt: 'fKQqtjsGtWk', who: 'Boncho · coach' },
    { yt: '8SYcDjpq3lU', who: 'Nyurkis Cabrera · coach' },
    { yt: 'd-VCyiDCuzM', who: 'Marco · coach' },
  ],
};
const embedUrl = (v) => (v.yt
  ? `https://www.youtube-nocookie.com/embed/${v.yt}?autoplay=1&rel=0&playsinline=1&modestbranding=1`
  : `https://player.vimeo.com/video/${v.vimeo}?autoplay=1&badge=0&title=0&byline=0&portrait=0`);


/* ---------- los 3 niveles: pistas de la línea de tiempo (en % de 30 s) ---------- */
const C = { v: 'var(--blue)', v2: '#1E9FCB', sub: 'var(--cream)', key: 'var(--yellow)', gfx: 'var(--pink)', sfx: 'var(--yellow)', zoom: 'var(--cream)', mus: '#8B6CF0', aud: '#3C8C6E', col: 'linear-gradient(90deg, var(--pink), #8B6CF0, var(--blue))' };
const cuts = (n) => Array.from({ length: n }, (_, i) => [(100 / n) * i, 100 / n - 0.6, i % 2 ? C.v2 : C.v]);
const blocks = (arr, c, hl = []) => arr.map(([l, w], i) => [l, w, hl.includes(i) ? C.key : c]);
const dots = (arr, c) => arr.map((l) => [l, 1.6, c]);
const full = (c) => [[0, 100, c]];
const SUBS = [[1, 14], [16, 14], [32, 15], [49, 14], [65, 15], [82, 16]];

const TIERS = [
  {
    id: 'esencial', n: 'Nivel 01', name: 'Ágil', file: 'agil_v1.mp4',
    desc: 'Cortes, subtítulos, gancho y música en tendencia.',
    tracks: [['V1', cuts(5)], ['SUB', blocks(SUBS, C.sub)], ['A1', full(C.aud)]],
    legend: [['Cortes', C.v], ['Subtítulos', C.sub], ['Voz', C.aud]],
  },
  {
    id: 'pro', n: 'Nivel 02', name: 'Pro', file: 'pro_v1.mp4',
    desc: 'Lo del Ágil + gráficos, zooms y efectos de sonido.',
    tracks: [['V1', cuts(9)], ['ZOOM', dots([8, 27, 44, 61, 79], C.zoom)], ['SUB', blocks(SUBS, C.sub, [1, 4])], ['GFX', blocks([[20, 12], [55, 10], [84, 12]], C.gfx)], ['SFX', dots([9, 21, 34, 56, 70, 85], C.sfx)], ['A1', full(C.aud)]],
    legend: [['Más cortes', C.v], ['Zooms', C.zoom], ['Palabra clave', C.key], ['Gráficos', C.gfx], ['Efectos', C.sfx]],
  },
  {
    id: 'premium', n: 'Nivel 03', name: 'Premium', file: 'premium_v1.mp4', hook: true,
    desc: 'Motion graphics, diseño sonoro y color.',
    tracks: [['V1', cuts(14)], ['ZOOM', dots([4, 15, 27, 38, 50, 62, 74, 88], C.zoom)], ['SUB', blocks(SUBS, C.sub, [0, 2, 4])], ['GFX', blocks([[0, 10], [18, 9], [36, 14], [58, 9], [76, 16]], C.gfx)], ['SFX', dots([2, 9, 17, 24, 33, 41, 52, 60, 69, 78, 86, 94], C.sfx)], ['MUS', full(C.mus)], ['COLOR', full(C.col)], ['A1', full(C.aud)]],
    legend: [['Gancho 3 s', C.key], ['Animación', C.gfx], ['Música', C.mus], ['Color', '#8B6CF0'], ['Diseño sonoro', C.sfx]],
  },
];

export const MAX_EXAMPLES = 8;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

const fx = { open: null };                      // nivel abierto (índice) o null
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

/* ---------- la pestaña de ejemplos (también la usa la librería) ---------- */
export function fillDrawer(drawer, { kicker, title, desc, examples }) {
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

export function shutDrawer(drawer) {
  drawer.classList.remove('is-open');
  drawer.inert = true;
  // al cerrar, se detienen y descargan los videos
  $$('video', drawer).forEach((v) => v.pause());
  $$('iframe', drawer).forEach((f) => f.remove());        // YouTube y Vimeo: se quitan para que dejen de sonar
}

export function showDrawer(drawer) {
  drawer.classList.add('is-open');
  drawer.inert = false;
  if (!reduced) setTimeout(() => {
    const r = drawer.getBoundingClientRect();
    if (r.bottom > window.innerHeight) drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 360);
}

/* ---------- los tres niveles en Redes ---------- */
function closeTier() {
  shutDrawer($('[data-fx-drawer="tiers"]', root));
  $$('[data-fx-open]', root).forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.classList.remove('is-on'); });
  fx.open = null;
}

export function openTier(i) {
  const same = fx.open === i;
  closeTier();
  if (same) return;
  fx.open = i;
  const btn = $(`[data-fx-open="tier"][data-i="${i}"]`, root);
  btn.setAttribute('aria-expanded', 'true');
  btn.classList.add('is-on');
  const drawer = $('[data-fx-drawer="tiers"]', root);
  fillDrawer(drawer, { kicker: 'Tipos de edición · trabajos reales', title: TIERS[i].name, desc: TIERS[i].desc, examples: TIER_VIDEOS[TIERS[i].id] || placeholders('creador') });
  showDrawer(drawer);
}

export function initFormats() {
  root = $('[data-fx]');
  if (!root) return;
  $('[data-fx-tiers]', root).innerHTML = TIERS.map(tierHTML).join('');
  $$('[data-fx-open="tier"]', root).forEach((b) => b.addEventListener('click', () => openTier(Number(b.dataset.i))));
  $$('[data-fx-close]', root).forEach((b) => b.addEventListener('click', closeTier));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && fx.open !== null) closeTier(); });
}
