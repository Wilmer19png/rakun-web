/* ==========================================================================
   RAKÜN · píxel de Meta (Facebook e Instagram)
   Se carga en las páginas públicas (no en el gestor, el portal ni el login).
   Eventos: PageView en cada página · Lead al enviar «Quiero este plan» o el
   guion de producción (app/lead-form.js) · Contact al tocar WhatsApp (common.js).
   Para cambiar de píxel, cambia solo el número de abajo.
   ========================================================================== */
(function () {
  var PIXEL_ID = '1106697768774228';
  /* código base de Meta */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
})();

/** Marca un evento del píxel sin romper nada si está bloqueado (adblock). */
window.rkTrack = function (event, data) {
  try { if (window.fbq) window.fbq('track', event, data || {}); } catch (e) { /* bloqueado */ }
};
