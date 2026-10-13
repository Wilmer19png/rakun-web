/* ==========================================================================
   RAKÜN · la página de cada proyecto (proyecto.html?p=<slug>)
   Video: título → fragmento que arranca solo → «el proyecto» con el ojo →
   la experiencia (fragmento 2) → frase → piezas → detrás de cámaras →
   video completo → siguiente proyecto.
   Identidad: el manual completo en una página larga, con su índice y el PDF.
   Web: la presentación y el enlace al sitio (con el aviso antes de salir).
   Cada parte solo aparece si el proyecto la tiene.
   ========================================================================== */
import { loadWorks, esc, cover, projectUrl, safeUrl, CAT_LABEL, groupOf } from './data.js';
import { wireFragments, wireSound, openVideo, confirmLeave } from './ui.js';
import { startPage, remeasure } from './page.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const small = window.matchMedia('(max-width: 700px)').matches;
const pad = (n) => String(n).padStart(2, '0');
const paras = (t) => String(t || '').split(/\n{2,}|\r?\n/).filter((p) => p.trim()).map((p) => `<p>${esc(p)}</p>`).join('');
const WORLD = { video: 'Producción audiovisual', identidad: 'Marca personal', web: 'Web y apps', reel: 'Marca personal' };
const BURST = '<svg class="wk__burst" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#rk-burst"/></svg>';
const RAIL = (n, label) => `<div class="rail" aria-hidden="true"><span class="rail__num">${pad(n)}</span><span class="rail__label">${esc(label)}</span></div>`;

/* el ojo de RAKÜN, horizontal (lienzo: «el ojo totalmente horizontal y centrado») */
const EYE = `<svg class="pj-eye" viewBox="-14 -4 242 84" role="img" aria-label="El ojo de RAKÜN">
  <g transform="rotate(-31.5 106 70)">
    <defs><clipPath id="pjEye"><path d="M36 12L100 12C146 12 174 36 194 123.83L32 24.69Q26 16 36 12Z"/></clipPath></defs>
    <path d="M10 5L100 4C152 4 182 34 204 134L8 14Q2 9 10 5Z" fill="#010221"/>
    <path d="M36 12L100 12C146 12 174 36 194 123.83L32 24.69Q26 16 36 12Z" fill="#2BCDFF"/>
    <g clip-path="url(#pjEye)"><circle cx="118" cy="70" r="58" fill="#FFF02B"/><circle cx="118" cy="70" r="40" fill="#FF2C68"/><circle cx="118" cy="70" r="24.5" fill="#fff"/><circle cx="118" cy="70" r="21" fill="#1B1A35"/></g>
    <line x1="26" y1="23" x2="207" y2="133.8" stroke="#F3F0EA" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;

// la explosión va pegada a la última palabra (nunca sola en una línea)
const titleWithBurst = (t) => {
  const words = String(t).trim().split(/\s+/);
  const last = words.pop();
  return `${words.length ? `${esc(words.join(' '))} ` : ''}<span class="nowrap">${esc(last)}${BURST}</span>`;
};

function head(w, n) {
  const facts = w.kind === 'identidad'
    ? [['Marca', w.client], ['Año', w.year], ['Hicimos', w.did]]
    : [['Cliente', w.client], ['Año', w.year], ['Tipo', CAT_LABEL[w.category]], ['Hicimos', w.did]];
  return `
  <section class="sec sec--navy pj-head" id="inicio" aria-labelledby="pj-title">
    ${RAIL(n, 'Proyecto')}
    <div class="sec__body">
      <a class="mono pj-back" href="trabajo.html#${groupOf(w)}">← Todos los proyectos</a>
      <p class="mono pj-k">[${esc(CAT_LABEL[w.category] || CAT_LABEL[w.kind] || 'Proyecto')}] · ${esc(WORLD[w.kind] || '')}</p>
      <h1 class="pj-title" id="pj-title">${titleWithBurst(w.title)}</h1>
      <dl class="pj-facts">${facts.filter(([, v]) => v).map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>
  </section>`;
}

function fragment(w) {
  const src = safeUrl(small && w.frag_v_url ? w.frag_v_url : w.frag_url);
  const img = cover(w);
  if (!src && !img) return '';
  return `
  <div class="pj-frag${small && w.frag_v_url ? ' pj-frag--v' : ''}">
    <img src="${esc(img)}" alt="" decoding="async">
    ${src ? `<video data-frag data-src="${esc(src)}" muted loop playsinline preload="none" poster="${esc(img)}" aria-hidden="true"></video>
    <span class="mono pj-tag"><i></i>Fragmento · en bucle · sin sonido</span>
    <button class="pj-snd" type="button" aria-label="Activar sonido" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6"/></svg></button>` : ''}
  </div>`;
}

const story = (w, n) => (w.description ? `
  <section class="sec sec--pink pj-story" aria-label="El proyecto">
    ${RAIL(n, 'El proyecto')}
    <div class="sec__body pj-story__body">
      ${EYE}
      <div class="pj-story__text"><p class="mono">El proyecto</p>${paras(w.description)}</div>
    </div>
  </section>` : '');

function experience(w, n) {
  const src = safeUrl(w.frag2_url);
  if (!src && !w.exp_title && !w.exp_text) return '';
  return `
  <section class="sec sec--cream pj-exp" aria-labelledby="pj-exp-t">
    ${RAIL(n, 'La experiencia')}
    <div class="sec__body pj-exp__body${src ? '' : ' pj-exp__body--solo'}">
      ${src ? `<div class="pj-frag pj-frag--box"><video data-frag data-src="${esc(src)}" muted loop playsinline preload="none" poster="${esc(cover(w))}" aria-hidden="true"></video><span class="mono pj-tag"><i></i>Fragmento</span></div>` : ''}
      <div>
        <p class="mono pj-line">La experiencia</p>
        ${w.exp_title ? `<h2 class="pj-h2" id="pj-exp-t">${esc(w.exp_title)}</h2>` : '<h2 class="sr-only" id="pj-exp-t">La experiencia</h2>'}
        <div class="pj-p">${paras(w.exp_text)}</div>
      </div>
    </div>
  </section>`;
}

const quote = (w, n) => (w.quote ? `
  <section class="sec sec--navy pj-quote" aria-label="Una frase">
    ${RAIL(n, 'La frase')}
    <div class="sec__body pj-quote__body">
      ${BURST}
      <blockquote><p>«${esc(w.quote)}»</p>${w.quote_by ? `<footer class="mono">— ${esc(w.quote_by)}</footer>` : ''}</blockquote>
    </div>
  </section>` : '');

const pieces = (w, n) => (w.pieces.length ? `
  <section class="sec pj-pieces" aria-labelledby="pj-pz">
    ${RAIL(n, 'Piezas')}
    <div class="sec__body">
      <h2 class="mono pj-line" id="pj-pz">Piezas que salieron del proyecto</h2>
      <div class="pj-pieces__grid">${w.pieces.map((p) => `<figure><img src="${esc(safeUrl(p.url))}" alt="${esc(p.label || 'Pieza del proyecto')}" loading="lazy">${p.label ? `<figcaption class="mono">${esc(p.label)}</figcaption>` : ''}</figure>`).join('')}</div>
    </div>
  </section>` : '');

const bts = (w, n) => (w.bts.length ? `
  <section class="sec sec--navy pj-bts" aria-labelledby="pj-bts-t" data-bts>
    ${RAIL(n, 'Detrás de cámaras')}
    <div class="sec__body">
      <div class="pj-bts__head">
        <div><p class="mono pj-k">Detrás de cámaras · spinoffs</p><h2 class="pj-h2" id="pj-bts-t">Lo que no salió en el corte.</h2></div>
        ${w.bts.length > 1 ? `<div class="pj-bts__nav"><span class="mono" data-bts-n>01 / ${pad(w.bts.length)}</span><button class="pj-arrow" type="button" data-bts-prev aria-label="Anterior">←</button><button class="pj-arrow" type="button" data-bts-next aria-label="Siguiente">→</button></div>` : ''}
      </div>
      <div class="pj-bts__track" data-bts-track>${w.bts.map((b, i) => `<figure class="pj-bts__item" data-i="${i}">${/\.(mp4|webm)(\?|$)/i.test(b.url || '') ? `<video src="${esc(safeUrl(b.url))}" muted loop playsinline controls preload="metadata"></video>` : `<img src="${esc(safeUrl(b.url))}" alt="${esc(b.label || 'Detrás de cámaras')}" loading="lazy">`}${b.label ? `<figcaption class="mono">${esc(b.label)}</figcaption>` : ''}</figure>`).join('')}</div>
    </div>
  </section>` : '');

const fullVideo = (w, n) => (w.youtube_id ? `
  <section class="sec sec--cream pj-full" aria-labelledby="pj-full-t">
    ${RAIL(n, 'Video completo')}
    <div class="sec__body">
      <div class="pj-full__head">
        <div><p class="mono pj-line">El video completo</p><h2 class="pj-h2" id="pj-full-t">Míralo de principio a fin.</h2></div>
        ${w.kind === 'video' ? '<a class="wk-btn" href="produccion.html#proyectos">Ver más en la videoteca ↗</a>' : ''}
      </div>
      <button class="pj-full__player" type="button" data-full aria-label="Reproducir el video completo de ${esc(w.title)}">
        <img src="${esc(cover(w))}" alt="" loading="lazy">
        <span class="pj-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
        <span class="mono pj-full__tag">Video completo · con sonido</span>
      </button>
    </div>
  </section>` : '');

function manual(w, n) {
  const pdf = safeUrl(w.pdf_url);
  if (!w.pages.length) {
    return w.palette.length ? `
    <section class="sec sec--cream pj-manual" aria-label="Paleta de color">
      ${RAIL(n, 'La marca')}
      <div class="sec__body"><p class="mono pj-line">Paleta de color</p>
        <div class="pj-palette">${w.palette.map((c) => `<span style="background:${esc(c)}"><b>${esc(c)}</b></span>`).join('')}</div>
        ${pdf ? `<a class="wk-btn wk-btn--hot" href="${esc(pdf)}" target="_blank" rel="noopener">Descargar el manual (PDF) ↓</a>` : ''}
      </div>
    </section>` : '';
  }
  return `
  <section class="sec sec--cream pj-manual" aria-label="Manual de marca">
    ${RAIL(n, 'El manual')}
    <div class="sec__body pj-manual__body">
      <aside class="pj-manual__side">
        <p class="mono">Manual de marca · ${w.pages.length} páginas</p>
        ${pdf ? `<a class="wk-btn wk-btn--hot" href="${esc(pdf)}" target="_blank" rel="noopener">Descargar el PDF ↓</a>` : ''}
        ${w.palette.length ? `<span class="pj-manual__pal" aria-hidden="true">${w.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span>` : ''}
      </aside>
      <div class="pj-manual__pages">
        ${w.pages.map((p, i) => `<figure class="pj-page"><figcaption class="mono"><span>Página</span><span>${pad(i + 1)} / ${pad(w.pages.length)}</span></figcaption><a href="${esc(safeUrl(p))}" target="_blank" rel="noopener" aria-label="Ver la página ${i + 1} en grande"><img src="${esc(safeUrl(p))}" alt="Página ${i + 1} del manual de ${esc(w.title)}" loading="lazy" decoding="async"></a></figure>`).join('')}
      </div>
    </div>
  </section>`;
}

function webBlock(w, n) {
  const site = safeUrl(w.site_url);
  return `
  <section class="sec sec--cream pj-web" aria-label="La presentación">
    ${RAIL(n, 'La página')}
    <div class="sec__body">
      ${w.youtube_id || safeUrl(w.frag_url) ? `<button class="pj-full__player" type="button" data-full aria-label="Ver la presentación de ${esc(w.title)}"><img src="${esc(cover(w))}" alt="" loading="lazy"><span class="pj-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></button>` : (cover(w) ? `<img class="pj-web__shot" src="${esc(cover(w))}" alt="Captura de ${esc(w.title)}">` : '')}
      ${site ? `<button class="wk-btn wk-btn--hot pj-web__go" type="button" data-leave>Visitar ${esc(new URL(site).host.replace(/^www\./, ''))} ↗</button>` : ''}
    </div>
  </section>`;
}

function closing(w, works) {
  const same = works.filter((x) => x.kind !== 'reel');
  const i = same.findIndex((x) => x.slug === w.slug);
  const next = same.length > 1 ? same[(i + 1) % same.length] : null;
  return `
  <section class="sec sec--cream pj-next" aria-label="Siguiente">
    <div class="rail" aria-hidden="true"></div>
    <div class="sec__body pj-next__body">
      ${next ? `<a class="pj-next__link" href="${projectUrl(next)}"><span class="mono">Siguiente proyecto →</span><span class="pj-next__t">${esc(next.title)}</span></a>` : '<span></span>'}
      <a class="wk-btn wk-btn--hot pj-next__cta" href="index.html#planes" data-start>¿Quieres algo así? Cotiza ↗</a>
    </div>
  </section>`;
}

function wireBts(root) {
  const box = $('[data-bts]', root);
  if (!box) return;
  const items = $$('.pj-bts__item', box);
  let i = 0;
  const show = () => {
    items.forEach((it, k) => { it.classList.toggle('is-on', k === i); it.classList.toggle('is-next', k === (i + 1) % items.length || k === (i + 2) % items.length); });
    const order = items.map((_, k) => (k - i + items.length) % items.length);
    items.forEach((it, k) => { it.style.order = order[k]; });
    const n = $('[data-bts-n]', box);
    if (n) n.textContent = `${pad(i + 1)} / ${pad(items.length)}`;
  };
  $('[data-bts-prev]', box)?.addEventListener('click', () => { i = (i - 1 + items.length) % items.length; show(); });
  $('[data-bts-next]', box)?.addEventListener('click', () => { i = (i + 1) % items.length; show(); });
  show();
}

(async () => {
  startPage();
  const root = $('[data-pj]');
  const slug = new URLSearchParams(location.search).get('p') || '';
  const works = await loadWorks();
  const w = works.find((x) => x.slug === slug);
  if (w && w.kind === 'reel') { location.replace('trabajo.html#reel'); return; }   // los reels no tienen página propia
  if (!w) {
    root.innerHTML = `<section class="sec sec--navy pj-head" id="inicio"><div class="rail" aria-hidden="true"></div><div class="sec__body"><p class="mono pj-k">Proyecto</p><h1 class="pj-title">No encontramos este proyecto.</h1><a class="wk-btn wk-btn--hot" href="trabajo.html">Ver todos los proyectos ↗</a></div></section>`;
    return;
  }
  document.title = `${w.title} — RAKÜN Visual Design`;
  let n = 1;
  const parts = [head(w, n++)];
  if (w.kind === 'identidad') {
    parts.push(story(w, n++), manual(w, n++));
  } else if (w.kind === 'web') {
    parts.push(webBlock(w, n++), story(w, n++), pieces(w, n++));
  } else {
    parts.push(fragment(w), story(w, n++), experience(w, n++), quote(w, n++), pieces(w, n++), bts(w, n++), fullVideo(w, n++));
  }
  parts.push(closing(w, works));
  root.innerHTML = parts.join('');

  wireFragments(root);
  wireSound($('.pj-snd', root), $('.pj-frag video', root));
  wireBts(root);
  $$('[data-full]', root).forEach((b) => b.addEventListener('click', () => {
    if (w.youtube_id) openVideo({ yt: w.youtube_id, title: w.title });
    else if (safeUrl(w.frag_url)) openVideo({ src: w.frag_url, title: w.title });
  }));
  $('[data-leave]', root)?.addEventListener('click', () => confirmLeave(w.site_url));
  remeasure();
})();
