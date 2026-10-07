/* RAKÜN · portal del cliente (fase 1: bienvenida, reunión y cuenta) */
import { $, initials } from './util.js';
import { getClient, getProfile, isStaff, isConfigured, accountUrl, errorText } from './supa.js';
import { CALCOM_URL, CONTACT_EMAIL } from './config.js';

(async () => {
  const boot = $('[data-boot]');
  if (!isConfigured()) { boot.textContent = 'El portal se activa pronto.'; return; }
  let sb, me;
  try {
    sb = await getClient();
    me = await getProfile();
  } catch (err) { boot.textContent = errorText(err); return; }
  if (!me) { location.replace('login.html'); return; }

  const name = me.full_name || me.email;
  $('[data-first]').textContent = `${name.split(' ')[0]}.`;
  $('[data-me-name]').textContent = name;
  $('[data-me-full]').textContent = name;
  $('[data-me-mail]').textContent = me.email;
  $('[data-me-ava]').textContent = initials(name);
  $('[data-me-ava]').style.background = 'var(--blush, #F3C9A8)';
  $('[data-date]').textContent = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  $('[data-staff-note]').hidden = !isStaff(me);

  const cal = $('[data-cal]');
  cal.href = CALCOM_URL || `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Quiero agendar una reunión')}`;
  if (!CALCOM_URL) cal.removeAttribute('target');

  // cambiar contraseña: le llega un enlace a su correo
  $('[data-change-pass]').addEventListener('click', async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.resetPasswordForEmail(me.email, { redirectTo: accountUrl() });
    e.target.textContent = error ? errorText(error) : '✓ Te enviamos un enlace a tu correo';
  });
  $('[data-logout]').addEventListener('click', async () => { await sb.auth.signOut(); location.replace('login.html'); });

  boot.hidden = true;
  $('[data-app]').hidden = false;
})();
