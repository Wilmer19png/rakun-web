/* ==========================================================================
   RAKÜN · la página de cada proyecto (proyecto.html?p=<slug>)
   Lienzo «Página de cada proyecto · v2» (referencia Bruut, estilo RAKÜN):
   negro y rosado alternados, escenas de lado a lado y texto centrado.
   Video: portada → escena 1 →
   el proyecto (rosado) → escena 2 → la experiencia (negro, con la explosión) →
   escena 3 → la frase (rosado) → lo que sigue (con «Ver el video completo»).
   Identidad: portada → el proyecto → el manual completo → lo que sigue.
   Web: portada → la presentación → el proyecto → piezas → lo que sigue.
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
const WORLD = { video: 'Producción audiovisual', identidad: 'Identidad visual', web: 'Web y apps', reel: 'Redes' };
const BURST = '<svg class="wk__burst" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#rk-burst"/></svg>';
const RAIL = (n, label) => `<div class="rail" aria-hidden="true"><span class="rail__num">${pad(n)}</span><span class="rail__label">${esc(label)}</span></div>`;
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

/* ---------- portada: título escalonado + datos entre corchetes + entrada grande ---------- */
function head(w, works) {
  const words = String(w.title).trim().split(/\s+/);
  const first = words.shift();
  const rest = words.join(' ');
  const burst = `<span class="nowrap">${esc(rest ? rest.split(' ').pop() : first)}${BURST}</span>`;
  const line2 = rest ? `${esc(rest.split(' ').slice(0, -1).join(' '))}${rest.includes(' ') ? ' ' : ''}${burst}` : '';
  const facts = w.kind === 'identidad'
    ? [['Marca', w.client], ['Año', w.year], ['Hicimos', w.did]]
    : [['Cliente', w.client], ['Categoría', CAT_LABEL[w.category]], ['Año', w.year], ['Hicimos', w.did]];
  const same = works.filter((x) => x.kind === w.kind);
  const idx = same.findIndex((x) => x.slug === w.slug);
  return `
  <section class="pc-hero" id="inicio" aria-labelledby="pj-title">
    <div class="pc-hero__top mono">
      <a class="pc-back" href="trabajo.html#${groupOf(w)}">← Todos los proyectos</a>
      <span class="pc-hero__k">${esc(WORLD[w.kind] || '')}${same.length > 1 ? ` · ${pad(idx + 1)} / ${pad(same.length)}` : ''}</span>
    </div>
    <h1 class="pc-title${w.title.length > 18 ? ' pc-title--long' : ''}" id="pj-title">
      ${rest ? `<span>${esc(first)}</span><span class="pc-title__2">${line2}</span>` : `<span>${burst}</span>`}
    </h1>
    <div class="pc-hero__foot">
      <dl class="pc-facts">${facts.filter(([, v]) => v).map(([k, v]) => `<div><dt class="mono">[${k}]</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${w.summary ? `<p class="pc-intro">${esc(w.summary)}</p>` : ''}
    </div>
  </section>`;
}

/* ---------- escena de lado a lado (un fragmento que arranca solo) ---------- */
function scene(w, src, label, { main = false } = {}) {
  const file = safeUrl(src);
  const img = cover(w);
  if (!file && !(main && img)) return '';
  return `
  <section class="pc-scene${main && small && w.frag_v_url ? ' pc-scene--v' : ''}" aria-label="${esc(label)}">
    ${main ? `<img src="${esc(img)}" alt="" decoding="async">` : ''}
    ${file ? `<video data-frag data-src="${esc(file)}" muted loop playsinline preload="none"${main ? ` poster="${esc(img)}"` : ''} aria-hidden="true"></video>` : ''}
    ${file ? `<span class="mono pc-tag"><i></i>${esc(label)}</span>` : ''}
    ${main && file ? '<button class="pj-snd" type="button" aria-label="Activar sonido" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6"/></svg></button>' : ''}
  </section>`;
}

/* ---------- el proyecto (rosado, centrado) ---------- */
const story = (w) => (w.description ? `
  <section class="pc-block pc-block--pink" aria-labelledby="pc-story-t">
    <p class="mono pc-lbl" id="pc-story-t">[El proyecto]</p>
    <div class="pc-story">${paras(w.description)}</div>
  </section>` : '');

/* ---------- la experiencia (negro, centrado, con la explosión a un lado) ---------- */
function experience(w) {
  if (!w.exp_title && !w.exp_text) return '';
  return `
  <section class="pc-block pc-block--ink pc-exp" aria-labelledby="pc-exp-t">
    <svg class="pc-exp__burst" viewBox="-50 -50 100 100" aria-hidden="true"><use href="#rk-burst"/></svg>
    <p class="mono pc-lbl">[La experiencia]</p>
    ${w.exp_title ? `<h2 class="pc-h2" id="pc-exp-t">${esc(w.exp_title)}</h2>` : '<h2 class="sr-only" id="pc-exp-t">La experiencia</h2>'}
    ${w.exp_text ? `<div class="pc-p">${paras(w.exp_text)}</div>` : ''}
  </section>`;
}

/* ---------- la frase (rosado, recuadro negro) ---------- */
const quote = (w) => (w.quote ? `
  <section class="pc-block pc-block--pink" aria-label="La frase">
    <blockquote class="pc-quote"><p>«${esc(w.quote)}»</p>${w.quote_by ? `<footer class="mono">— ${esc(w.quote_by)}</footer>` : ''}</blockquote>
  </section>` : '');

/* ---------- piezas (solo webs) ---------- */
const pieces = (w, n) => (w.pieces.length ? `
  <section class="sec pj-pieces" aria-labelledby="pj-pz">
    ${RAIL(n, 'Piezas')}
    <div class="sec__body">
      <h2 class="mono pj-line" id="pj-pz">Piezas que salieron del proyecto</h2>
      <div class="pj-pieces__grid">${w.pieces.map((p) => `<figure><img src="${esc(safeUrl(p.url))}" alt="${esc(p.label || 'Pieza del proyecto')}" loading="lazy">${p.label ? `<figcaption class="mono">${esc(p.label)}</figcaption>` : ''}</figure>`).join('')}</div>
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
      ${w.youtube_id || safeUrl(w.frag_url) ? `<button class="pj-full__player" type="button" data-full aria-label="Ver la presentación de ${esc(w.title)}"><img src="${esc(cover(w))}" alt="" loading="lazy"><span class="pj-play" aria-hidden="true">${PLAY}</span></button>` : (cover(w) ? `<img class="pj-web__shot" src="${esc(cover(w))}" alt="Captura de ${esc(w.title)}">` : '')}
      ${site ? `<button class="wk-btn wk-btn--hot pj-web__go" type="button" data-leave>Visitar ${esc(new URL(site).host.replace(/^www\./, ''))} ↗</button>` : ''}
    </div>
  </section>`;
}

/* ---------- lo que sigue: los dos proyectos siguientes ---------- */
function closing(w, works) {
  const same = works.filter((x) => x.kind !== 'reel');
  const i = same.findIndex((x) => x.slug === w.slug);
  const next = same.length > 1 ? [1, 2].map((k) => same[(i + k) % same.length]).filter((x, k, a) => x.slug !== w.slug && a.indexOf(x) === k) : [];
  const more = w.kind === 'video' ? ['produccion.html#proyectos', 'Videoteca']
    : w.kind === 'web' ? ['web.html#planes', 'Planes de web'] : ['index.html#planes', '¿Quieres algo así?'];
  return `
  <section class="pc-next" aria-labelledby="pc-next-t">
    <p class="mono pc-lbl" id="pc-next-t">[Lo que sigue]</p>
    ${next.map((x) => `
    <a class="pc-tile" href="${projectUrl(x)}">
      <span class="pc-tile__txt"><span class="pc-tile__t">${esc(x.title)}</span><span class="mono pc-lbl">[${esc(CAT_LABEL[x.category] || CAT_LABEL[x.kind] || 'Proyecto')}]</span>${x.summary ? `<span class="pc-tile__p">${esc(x.summary)}</span>` : ''}</span>
      <span class="pc-tile__img">${cover(x) ? `<img src="${esc(cover(x))}" alt="" loading="lazy">` : ''}</span>
    </a>`).join('')}
    <div class="pc-next__btns">
      ${w.kind === 'video' && w.youtube_id ? `<button class="pc-btn pc-btn--play" type="button" data-full>${PLAY}Ver el video completo</button>` : ''}
      <a class="pc-btn" href="trabajo.html">Ver todos los proyectos ↗</a>
      <a class="pc-btn pc-btn--line" href="${more[0]}">${more[1]} ↗</a>
    </div>
  </section>`;
}

(async () => {
  startPage();
  const root = $('[data-pj]');
  const slug = new URLSearchParams(location.search).get('p') || '';
  const works = await loadWorks();
  const w = works.find((x) => x.slug === slug);
  if (w && w.kind === 'reel') { location.replace('trabajo.html#reel'); return; }   // los reels no tienen página propia
  if (!w) {
    root.innerHTML = `<section class="pc-hero" id="inicio"><p class="mono pc-hero__k">Proyecto</p><h1 class="pc-title">No encontramos este proyecto.</h1><a class="pc-btn" href="trabajo.html">Ver todos los proyectos ↗</a></section>`;
    return;
  }
  document.title = `${w.title} — RAKÜN Visual Design`;
  // el WhatsApp del pie dice qué proyecto vieron
  document.querySelectorAll('a[data-wa-project]').forEach((a) => { a.dataset.whatsapp = `Hola RAKÜN, vi el proyecto «${w.title}» y quiero más información.`; a.href = `https://wa.me/573504461460?text=${encodeURIComponent(a.dataset.whatsapp)}`; });
  const parts = [head(w, works)];
  if (w.kind === 'identidad') {
    parts.push(story(w), manual(w, 1));
  } else if (w.kind === 'web') {
    parts.push(webBlock(w, 1), story(w), pieces(w, 2));
  } else {
    parts.push(
      scene(w, small && w.frag_v_url ? w.frag_v_url : w.frag_url, 'Fragmento · sin sonido', { main: true }),
      story(w),
      scene(w, w.frag2_url, 'La experiencia'),
      experience(w),
      scene(w, w.frag3_url, 'Escena'),
      quote(w),
    );
  }
  parts.push(closing(w, works));
  root.innerHTML = parts.join('');

  wireFragments(root);
  wireSound($('.pj-snd', root), $('.pc-scene video', root));
  $$('[data-full]', root).forEach((b) => b.addEventListener('click', () => {
    if (w.youtube_id) openVideo({ yt: w.youtube_id, title: w.title });
    else if (safeUrl(w.frag_url)) openVideo({ src: w.frag_url, title: w.title });
  }));
  $('[data-leave]', root)?.addEventListener('click', () => confirmLeave(w.site_url));
  remeasure();
})();
