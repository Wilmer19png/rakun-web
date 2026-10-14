/* ==========================================================================
   RAKÜN · Inicio: «Nuestro trabajo», «Marcas e identidades» y «Páginas web»
   Todo sale de los proyectos publicados en el gestor (trabajo/data.js):
   - franjas: los videos con ★ (máximo 4; si no hay ★, los 4 primeros)
   - reels: hasta 4 videos verticales (si faltan, el último espacio invita a los planes)
   - identidades: hasta 4 marcas (si hay menos, páginas «en maquetación»); al tocar una, su manual se abre ahí mismo
   - webs: hasta 3 sitios en el computador antiguo
   Las secciones sin proyectos se quedan ocultas.
   ========================================================================== */
import { loadWorks, esc, cover, projectUrl, CAT_LABEL, safeUrl } from './data.js';
import { wireFragments, openVideo, confirmLeave } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
const small = window.matchMedia('(max-width: 700px)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = (n) => String(n).padStart(2, '0');
const fragSrc = (w) => safeUrl(small && w.frag_v_url ? w.frag_v_url : w.frag_url);
const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; } };

/* ---------- 002 · franjas de lado a lado ---------- */
function renderBands(works) {
  const box = $('[data-work-bands]');
  if (!box) return;
  const videos = works.filter((w) => w.kind === 'video');
  const feat = videos.filter((w) => w.featured);
  const list = (feat.length ? feat : videos).slice(0, 4);
  box.hidden = !list.length;
  box.innerHTML = list.map((w, i) => {
    const src = fragSrc(w);
    const meta = [w.client, w.year].filter(Boolean).join(' · ');
    return `
    <a class="band${src ? ' has-frag' : ''}" href="${projectUrl(w)}" data-frag-hover>
      <span class="band__media">
        <img src="${esc(cover(w))}" alt="" loading="lazy" decoding="async">
        ${src ? `<video data-frag data-src="${esc(src)}" muted loop playsinline preload="none" poster="${esc(cover(w))}" aria-hidden="true"></video>` : ''}
        <span class="band__bars" aria-hidden="true"></span>
        ${src ? '<span class="band__live mono" aria-hidden="true"><i></i>En movimiento</span>' : ''}
      </span>
      <span class="band__side">
        <span class="band__cat mono">[${esc(CAT_LABEL[w.category] || 'Video')}]</span>
        <span class="band__title">${esc(w.title)}</span>
        ${w.summary ? `<span class="band__text">${esc(w.summary)}</span>` : ''}
        <span class="band__meta mono">${esc(meta)}${w.did ? `<br>${esc(w.did)}` : ''}</span>
        <span class="band__go mono">Ver proyecto ↗</span>
      </span>
      <span class="band__idx mono" aria-hidden="true">${pad(i + 1)} / ${pad(list.length)}</span>
    </a>`;
  }).join('');
  wireFragments(box);
}

/* ---------- 002 · los reels (verticales) ---------- */
function renderReels(works) {
  const box = $('[data-work-reels]');
  // hasta 4 reels, de todos los proyectos de reels; si faltan, el último espacio invita a los planes
  const reels = works.filter((x) => x.kind === 'reel').flatMap((x) => x.reels.map((r) => ({ ...r, w: x }))).slice(0, 4);
  if (!box || !reels.length) return;
  box.hidden = false;
  box.innerHTML = `
    <div class="wk__reels-copy">
      <span class="mono wk__reels-k">[Redes · reels]</span>
      <p class="wk__reels-title">En <br>vertical.</p>
      <p class="wk__reels-p">Contenido para marcas personales: estrategia, grabación y edición para redes.</p>
      <a class="link" href="libreria.html">Ver la librería de formatos <svg class="ico" aria-hidden="true"><use href="#i-ne"/></svg></a>
    </div>
    ${reels.map((r, i) => `
      <button class="reel" type="button" data-reel="${i}" aria-label="Ver ${esc(r.label || `reel ${i + 1}`)} de ${esc(r.w.title)}">
        <img src="${esc(safeUrl(r.poster) || (r.yt ? `https://i.ytimg.com/vi/${esc(r.yt)}/oardefault.jpg` : ''))}" alt="" loading="lazy" decoding="async">
        <span class="reel__cap"><b>${esc(r.w.title)}</b><span class="mono">${esc(r.w.client || '')}${r.label ? ` · ${esc(r.label)}` : ''}</span></span>
        <span class="reel__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
      </button>`).join('')}
    ${reels.length < 4 ? `
      <a class="reel reel--you" href="marca.html#planes">
        <span class="reel__you-k mono">${pad(reels.length + 1)} · tu turno</span>
        <span class="reel__you-t">Tu marca,<br>en vertical.</span>
        <span class="reel__you-go mono">Ver los planes de Redes ↗</span>
      </a>` : ''}`;
  box.querySelectorAll('[data-reel]').forEach((b) => b.addEventListener('click', () => {
    const r = reels[Number(b.dataset.reel)];
    openVideo({ yt: r.yt, src: r.video_url, vertical: true, title: `${r.w.title} · ${r.label || 'reel'}` });
  }));
}

/* ---------- 003 · identidades: la mesa de trabajo ---------- */
const TOOLS = [
  '<path d="M5 3l14 9-6 1.5L10 20z" fill="currentColor"/>',
  '<path d="M5 5h14M12 5v14" fill="none" stroke="currentColor" stroke-width="2"/>',
  '<rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/>',
  '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
  '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4.5-4.5" stroke="currentColor" stroke-width="2"/>',
];
const swatches = (w) => (w.palette.length ? w.palette : ['#1B1A35', '#FF2C68', '#F3F0EA']).slice(0, 4)
  .map((c) => `<i style="background:${esc(c)}"></i>`).join('');
const brandMark = (w) => {
  const img = safeUrl(w.cover_url);
  if (img) return `<img src="${esc(img)}" alt="" loading="lazy">`;
  const [a = '#FF2C68', b = '#272727'] = w.palette;
  const [first, ...rest] = String(w.title).split(' ');
  return `<span class="idn__word"><b style="color:${esc(a)}">${esc(first)}</b><span style="color:${esc(b)}">${esc(rest.join(' '))}</span></span>`;
};

function renderIdentities(works) {
  const sec = $('[data-idn]');
  const app = $('[data-idn-app]');
  const ids = works.filter((w) => w.kind === 'identidad').slice(0, 4);
  if (!sec || !app || !ids.length) return;
  // páginas «en maquetación» para que la mesa no se vea con una sola marca (siempre 4 páginas)
  const SOON = [['Salud', 'Consultorio · clínica'], ['Gastronomía', 'Restaurante · café'], ['Música', 'Artista · banda']];
  const ghosts = SOON.slice(0, Math.max(0, 4 - ids.length));
  const ghostHTML = ([field, kind], i) => `
          <div class="idn__page idn__page--soon" aria-hidden="true">
            <span class="idn__lbl mono">${pad(ids.length + i + 1)} · En maquetación</span>
            <span class="idn__frame"></span>
            <span class="idn__sw idn__sw--soon"><i></i><i></i><i></i><i></i></span>
            <span class="idn__meta"><b>Próxima marca</b><span class="mono">${field} · ${kind}</span></span>
          </div>`;
  sec.hidden = false;
  let open = -1;

  const draw = () => {
    const w = ids[open];
    const tabs = `<span class="idn__tab${open < 0 ? ' is-on' : ''}">identidades_rakun.indd @ 50%</span>${w ? `<span class="idn__tab is-on">manual_${esc(w.slug)}.indd @ 100%</span>` : ''}`;
    const stage = w ? `
      <div class="idn__spread">
        ${w.pages.length
          ? w.pages.slice(0, 4).map((p, i) => `<figure class="idn__mp"><span class="mono">${pad(i + 1)}</span><img src="${esc(safeUrl(p))}" alt="Página ${i + 1} del manual de ${esc(w.title)}" loading="lazy"></figure>`).join('')
          : `<figure class="idn__mp"><span class="mono">01 · Logotipo</span><span class="idn__logo">${brandMark(w)}</span></figure>
             <figure class="idn__mp"><span class="mono">02 · Paleta de color</span><span class="idn__pal">${w.palette.map((c) => `<i style="background:${esc(c)}"><b>${esc(c)}</b></i>`).join('')}</span></figure>`}
      </div>` : `
      <div class="idn__pages">
        ${ids.map((x, i) => `
          <button class="idn__page" type="button" data-open="${i}" aria-label="Abrir el manual de ${esc(x.title)}">
            <span class="idn__lbl mono">${pad(i + 1)} · ${esc(CAT_LABEL.identidad)}</span>
            <span class="idn__logo">${brandMark(x)}</span>
            <span class="idn__sw" aria-hidden="true">${swatches(x)}</span>
            <span class="idn__meta"><b>${esc(x.title)}</b><span class="mono">${esc(x.did || x.client || '')}</span></span>
            <span class="idn__sel" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          </button>`).join('')}
        ${ghosts.map(ghostHTML).join('')}
      </div>`;
    const panel = w ? `
      <div class="idn__panel idn__panel--info">
        <p class="idn__ph mono">Proyecto</p>
        <div class="idn__info">
          <span class="mono idn__k">[Identidad visual]</span>
          <span class="idn__name">${esc(w.title)}</span>
          ${w.summary ? `<span class="idn__desc">${esc(w.summary)}</span>` : ''}
          ${w.did ? `<span class="mono idn__did">${esc(w.did)}</span>` : ''}
          <a class="wk-btn wk-btn--hot" href="${projectUrl(w)}">Ver proyecto completo ↗</a>
          <button class="wk-btn wk-btn--ghost" type="button" data-back>← Volver a las marcas</button>
        </div>
      </div>` : `
      <div class="idn__panel">
        <p class="idn__ph mono">Páginas</p>
        <div class="idn__thumbs">${ids.map((x, i) => `<span><i style="background:${esc(x.palette[2] || '#F3F0EA')}"></i>${pad(i + 1)}</span>`).join('')}${ghosts.map((g, i) => `<span><i class="idn__thumb-soon"></i>${pad(ids.length + i + 1)}</span>`).join('')}</div>
        <p class="idn__ph mono">Capas</p>
        <span class="idn__row"><i style="background:#FF2C68"></i>Logotipo</span>
        <span class="idn__row"><i style="background:#FFF02B"></i>Paleta de color</span>
        <span class="idn__row"><i style="background:#2BCDFF"></i>Tipografía</span>
        <span class="idn__row"><i style="background:#C3C0DD"></i>Aplicaciones</span>
      </div>`;
    app.innerHTML = `
      <div class="idn__menu mono" aria-hidden="true"><b>◉ RAKÜN</b><span>Archivo</span><span>Edición</span><span>Maquetación</span><span>Texto</span><span>Objeto</span><span>Ver</span><span class="idn__ws">Espacio de trabajo: Identidades</span></div>
      <div class="idn__tabs mono">${tabs}</div>
      <div class="idn__work">
        <div class="idn__tools" aria-hidden="true">${TOOLS.map((t, i) => `<i class="${i === (w ? 4 : 0) ? 'is-on' : ''}"><svg viewBox="0 0 24 24">${t}</svg></i>`).join('')}</div>
        <div class="idn__stage"><span class="idn__rx" aria-hidden="true"></span><span class="idn__ry" aria-hidden="true"></span>${stage}</div>
        ${panel}
      </div>
      <div class="idn__status mono"><span>${w ? `Manual de marca${w.pages.length ? ` · ${w.pages.length} páginas` : ''}` : `${ids.length} ${ids.length === 1 ? 'marca' : 'marcas'}`}</span><span>${w ? '100%' : '50%'}</span></div>`;
    app.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { open = Number(b.dataset.open); draw(); app.querySelector('[data-back]')?.focus({ preventScroll: true }); }));
    app.querySelector('[data-back]')?.addEventListener('click', () => { const was = open; open = -1; draw(); app.querySelector(`[data-open="${was}"]`)?.focus({ preventScroll: true }); });
  };
  draw();
}

/* ---------- 004 · páginas web: el computador antiguo ---------- */
function renderWebs(works) {
  const sec = $('[data-webs]');
  const screen = $('[data-webs-screen]');
  const listBox = $('[data-webs-list]');
  const webs = works.filter((w) => w.kind === 'web').slice(0, 3);
  if (!sec || !screen || !webs.length) return;
  sec.hidden = false;
  const LABEL = ['Sitio', 'Tienda', 'App'];
  listBox.innerHTML = webs.map((w, i) => `<li><span><span class="mono">${pad(i + 1)} ·</span> ${esc(w.title)}</span><span class="mono">${esc(hostOf(w.site_url))}</span></li>`).join('');

  const home = () => {
    screen.innerHTML = `
      <div class="pc__hud mono"><span>RAKÜN OS · webs</span><span>${webs.length} ${webs.length === 1 ? 'ventana' : 'ventanas'}</span></div>
      <div class="pc__wins">${webs.map((w, i) => `
        <button class="pc__win" type="button" data-win="${i}">
          <span class="pc__bar mono"><span>${pad(i + 1)} · ${esc(w.category && CAT_LABEL[w.category] !== 'Página web' ? CAT_LABEL[w.category] : LABEL[i] || 'Web')}</span><span>▶ VER</span></span>
          <span class="pc__pv">${cover(w) ? `<img src="${esc(cover(w))}" alt="" loading="lazy">` : ''}</span>
          <span class="pc__nm">${esc(w.title)}</span>
        </button>`).join('')}</div>
      <div class="pc__hud pc__hud--bot mono"><span>&gt; abre una ventana_</span><span>REC ●</span></div>`;
    screen.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('click', () => openWin(Number(b.dataset.win))));
  };
  const openWin = (i) => {
    const w = webs[i];
    const vid = safeUrl(w.frag_url);
    const media = w.youtube_id
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(w.youtube_id)}?autoplay=1&rel=0&playsinline=1" title="Presentación de ${esc(w.title)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
      : vid ? `<video src="${esc(vid)}" controls autoplay playsinline poster="${esc(cover(w))}"></video>`
        : `<img src="${esc(cover(w))}" alt="">`;
    screen.innerHTML = `
      <div class="pc__full">
        <span class="pc__bar mono"><span>${pad(i + 1)} · ${esc(w.title)} · presentación</span><button type="button" data-close-win aria-label="Cerrar la ventana">✕</button></span>
        <div class="pc__vid">${media}</div>
        ${safeUrl(w.site_url) ? `<button class="pc__url mono" type="button" data-leave><span>${esc(w.site_url)}</span><span>Visitar la página ↗</span></button>` : ''}
      </div>`;
    screen.querySelector('[data-close-win]').addEventListener('click', () => { home(); screen.querySelector(`[data-win="${i}"]`)?.focus({ preventScroll: true }); });
    screen.querySelector('[data-leave]')?.addEventListener('click', () => confirmLeave(w.site_url));
    screen.querySelector('[data-close-win]').focus({ preventScroll: true });
  };
  home();
}

/* ---------- el sello se mueve más lento que la página (parallax) ---------- */
function stampParallax() {
  const el = $('[data-parallax]');
  if (!el || reduced || small) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
    const off = (r.top + r.height / 2 - window.innerHeight / 2) * -0.18;
    el.style.translate = `0 ${off.toFixed(1)}px`;
  };
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

(async () => {
  stampParallax();
  const works = await loadWorks();
  renderBands(works);
  renderReels(works);
  renderIdentities(works);
  renderWebs(works);
  // las secciones cambiaron de alto: que el scroll animado recalcule
  window.ScrollTrigger?.refresh();
  window.lenis?.resize?.();
})();
