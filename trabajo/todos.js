/* ==========================================================================
   RAKÜN · Todos los proyectos (trabajo.html)
   Por categoría: videoclips, cortos, documentales, magazine y podcast…,
   identidades, páginas web y reels. Una categoría sin proyectos no aparece.
   ========================================================================== */
import { loadWorks, CATEGORIES, groupOf, esc, cover, projectUrl, safeUrl } from './data.js';
import { openVideo } from './ui.js';
import { startPage, remeasure, getLenis } from './page.js';

const $ = (s, r = document) => r.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');

const card = (w) => {
  const meta = [w.client, w.year].filter(Boolean).join(' · ');
  const art = w.kind === 'identidad' && !safeUrl(w.cover_url)
    ? `<span class="tp-card__ident" aria-hidden="true"><span><b style="color:${esc(w.palette[0] || '#FF2C68')}">${esc(String(w.title).split(' ')[0])}</b><span style="color:${esc(w.palette[1] || '#272727')}">${esc(String(w.title).split(' ').slice(1).join(' '))}</span></span><span class="tp-card__pal">${(w.palette.length ? w.palette : ['#FF2C68', '#272727', '#FFF4C8']).slice(0, 3).map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span></span>`
    : `<img src="${esc(cover(w))}" alt="" loading="lazy" decoding="async">`;
  return `<a class="tp-card" href="${projectUrl(w)}">
    <span class="tp-card__art">${art}</span>
    <b class="tp-card__t">${esc(w.title)}</b>
    <span class="mono tp-card__m">${esc(meta || w.did || '')}${meta || w.did ? ' · ' : ''}Ver proyecto ↗</span>
  </a>`;
};

const reelsBlock = (list) => list.map((w) => w.reels.map((r, i) => `
  <button class="reel" type="button" data-reel="${esc(w.slug)}:${i}" aria-label="Ver ${esc(r.label || `reel ${i + 1}`)} de ${esc(w.title)}">
    <img src="${esc(safeUrl(r.poster) || (r.yt ? `https://i.ytimg.com/vi/${esc(r.yt)}/oardefault.jpg` : ''))}" alt="" loading="lazy">
    <span class="reel__cap"><b>${esc(w.title)}</b><span class="mono">${esc(r.label || '')}</span></span>
    <span class="reel__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
  </button>`).join('')).join('');

(async () => {
  startPage();
  const works = await loadWorks();
  const groups = CATEGORIES.map(([key, name]) => [key, name, works.filter((w) => groupOf(w) === key)]).filter(([, , list]) => list.length);
  const body = $('[data-tp-body]');
  const cats = $('[data-tp-cats]');
  if (!groups.length) { body.innerHTML = '<p class="tp__empty">Pronto vas a ver aquí nuestros proyectos.</p>'; return; }

  cats.innerHTML = groups.map(([key, name, list], i) => `<a class="tp__chip mono${i === 0 ? ' is-on' : ''}" href="#${key}">${esc(name)} <span>${list.length}</span></a>`).join('');
  body.innerHTML = groups.map(([key, name, list], i) => `
    <section class="tp-cat" id="${key}" aria-labelledby="h-${key}">
      <div class="tp-cat__head"><span class="mono">${pad(i + 1)}</span><h2 id="h-${key}">${esc(name)}</h2><span class="mono tp-cat__n">${key === 'reel' ? esc(list.map((w) => w.title).join(' · ')) : `${list.length} ${list.length === 1 ? 'proyecto' : 'proyectos'}`}</span></div>
      ${key === 'reel' ? `<div class="tp-reels">${reelsBlock(list)}</div>` : `<div class="tp-grid">${list.map(card).join('')}</div>`}
    </section>`).join('');

  body.querySelectorAll('[data-reel]').forEach((b) => b.addEventListener('click', () => {
    const [slug, i] = b.dataset.reel.split(':');
    const w = works.find((x) => x.slug === slug);
    const r = w.reels[Number(i)];
    openVideo({ yt: r.yt, src: r.video_url, vertical: true, title: `${w.title} · ${r.label || 'reel'}` });
  }));

  // la categoría en pantalla queda marcada en la barra
  const chips = [...cats.querySelectorAll('a')];
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    chips.forEach((c) => c.classList.toggle('is-on', c.getAttribute('href') === `#${e.target.id}`));
  }), { rootMargin: '-40% 0px -55% 0px' });
  body.querySelectorAll('.tp-cat').forEach((s) => io.observe(s));

  remeasure();
  // si llegan con #documental, etc.
  const start = location.hash && document.getElementById(location.hash.slice(1));
  if (start) setTimeout(() => (getLenis() ? getLenis().scrollTo(start, { offset: -150, immediate: true }) : start.scrollIntoView()), 60);
})();
