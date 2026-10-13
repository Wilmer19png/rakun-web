/* ==========================================================================
   RAKÜN · arranque común de trabajo.html y proyecto.html
   (encabezado, menú, reloj, cursor, scroll suave y anclas)
   ========================================================================== */
import { RakunEye } from '../eye.js';
import { $, reduced, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';

let lenis = null;
export const getLenis = () => lenis;

export function startPage() {
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.16, smoothWheel: true });
    window.lenis = lenis;
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  initClock();
  initHeader(() => lenis);
  initMegaMenu();
  initCursor();
  // anclas internas con el scroll suave
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-start')) return;
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.1 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
  const hdrEye = $('[data-eye="eye-hdr"]');
  if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).explore();   // no persigue el cursor
}

/** Después de pintar: vuelve a medir el alto de la página para el scroll suave. */
export const remeasure = () => lenis?.resize?.();
