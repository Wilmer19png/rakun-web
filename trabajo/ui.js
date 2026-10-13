/* ==========================================================================
   RAKÜN · «Nuestro trabajo»: piezas compartidas
   - Fragmentos: videos cortos, sin sonido y en bucle. Con mouse arrancan al
     pasar por encima; en celular, cuando aparecen en pantalla. El archivo solo
     se descarga cuando hace falta (antes se ve la foto fija).
   - Ventana de video: el video completo (YouTube) o un reel, sobre la página.
   - Aviso antes de salir a la página de un cliente.
   ========================================================================== */
import { esc, safeUrl } from './data.js';

const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lenis = () => window.lenis || null;

/** <video data-frag data-src="…"> dentro de [data-frag-hover] (arranca con el mouse) o suelto (arranca al verse). */
export function wireFragments(root = document) {
  const vids = [...root.querySelectorAll('video[data-frag]')];
  if (!vids.length || reduced) return;
  const play = (v) => {
    if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src;
    v.play().catch(() => {});
  };
  const pause = (v) => v.pause();
  const auto = [];
  vids.forEach((v) => {
    const host = v.closest('[data-frag-hover]');
    if (host && fine) {
      host.addEventListener('pointerenter', () => play(v));
      host.addEventListener('pointerleave', () => pause(v));
      host.addEventListener('focusin', () => play(v));
      host.addEventListener('focusout', () => pause(v));
    } else auto.push(v);
  });
  if (!auto.length) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? play(e.target) : pause(e.target))), { threshold: 0.5 });
  auto.forEach((v) => io.observe(v));
}

/** Botón de sonido de un fragmento (el video ya está sonando sin sonido). */
export function wireSound(btn, video) {
  if (!btn || !video) return;
  btn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) { if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src; video.play().catch(() => {}); }
    btn.setAttribute('aria-pressed', String(!video.muted));
    btn.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Quitar sonido');
  });
}

/* ---------- capa sobre la página (video o aviso) ---------- */
function overlay(cls, label, html) {
  const from = document.activeElement;
  const box = document.createElement('div');
  box.className = `wk-layer ${cls}`;
  box.innerHTML = `<div class="wk-layer__scrim" data-close></div>
    <div class="wk-layer__box" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1" data-lenis-prevent>${html}</div>`;
  document.body.append(box);
  document.documentElement.classList.add('wk-layer-open');
  lenis()?.stop();
  const close = () => {
    box.remove();
    document.documentElement.classList.remove('wk-layer-open');
    lenis()?.start();
    document.removeEventListener('keydown', onKey);
    from?.focus?.({ preventScroll: true });
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  box.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  box.querySelector('.wk-layer__box').focus({ preventScroll: true });
  return { box, close };
}

/** Video completo de YouTube o un archivo, en grande. vertical = reel. */
export function openVideo({ yt, src, vertical = false, title = 'Video' }) {
  const id = String(yt || '').replace(/[^A-Za-z0-9_-]/g, '');
  const file = safeUrl(src);
  const media = id
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
    : `<video src="${esc(file)}" controls autoplay playsinline></video>`;
  overlay(`wk-video${vertical ? ' wk-video--v' : ''}`, title, `
    <button class="wk-layer__x mono" type="button" data-close aria-label="Cerrar">✕</button>
    <div class="wk-video__frame">${media}</div>`);
}

/** Antes de abrir la página de un cliente: «¿Seguro que quieres salir de RAKÜN?» */
export function confirmLeave(url) {
  const link = safeUrl(url);
  if (!link) return;
  const host = new URL(link).host.replace(/^www\./, '');
  const { box, close } = overlay('wk-leave', 'Vas a salir de RAKÜN', `
    <p class="mono wk-leave__k">Vas a salir</p>
    <p class="wk-leave__t">¿Seguro que quieres salir de <em>RAKÜN?</em></p>
    <p class="wk-leave__p">Vas a abrir <b>${esc(host)}</b> en una pestaña nueva. Esta página se queda abierta.</p>
    <div class="wk-leave__btns">
      <button class="wk-btn" type="button" data-close>Quedarme aquí</button>
      <a class="wk-btn wk-btn--hot" href="${esc(link)}" target="_blank" rel="noopener noreferrer" data-go>Sí, abrir la página ↗</a>
    </div>`);
  box.querySelector('[data-go]').addEventListener('click', () => setTimeout(close, 50));
}
