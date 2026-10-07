/* RAKÜN · crear contraseña (desde el enlace de invitación o de recuperación) */
import { $, $$ } from './util.js';
import { getClient, getProfile, homeFor, errorText, isConfigured, withTimeout } from './supa.js';
import { SUPABASE_URL } from './config.js';

/* Los enlaces que mandamos por WhatsApp llegan aquí como ?activar=<enlace de Supabase>.
   Las vistas previas de WhatsApp o del correo "abren" los enlaces y gastarían el de un solo uso;
   por eso primero se muestra un botón y el enlace real solo se usa cuando la persona lo toca. */
function activationLink() {
  const raw = new URLSearchParams(location.search).get('activar');
  if (!raw || !SUPABASE_URL) return null;
  try {
    const u = new URL(raw);
    const ok = u.origin === new URL(SUPABASE_URL).origin && u.pathname.startsWith('/auth/v1/verify');
    return ok ? u.href : null;                    // nunca redirige a otro sitio
  } catch { return null; }
}

const show = (name) => $$('[data-state]').forEach((el) => { el.hidden = el.dataset.state !== name; });
const form = $('[data-state="form"]');
const say = (text, bad = false) => { const m = $('[data-msg]', form); m.textContent = text; m.classList.toggle('is-error', bad); };

$$('[data-toggle-pass]').forEach((b) => b.addEventListener('click', () => {
  const input = b.previousElementSibling;
  const on = input.type === 'password';
  input.type = on ? 'text' : 'password';
  b.textContent = on ? 'Ocultar' : 'Ver';
}));

(async () => {
  // Supabase devuelve los errores del enlace en la URL (#error=…)
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('error') || !isConfigured()) { show('expired'); return; }
  const go = activationLink();
  if (go) {
    show('activate');
    $('[data-activate]').addEventListener('click', () => { location.href = go; });
    return;
  }
  try {
    // Leemos nosotros mismos lo que trae el enlace (más confiable que la detección automática)
    const sb = await withTimeout(getClient({ detectSessionInUrl: false }), 20000, 'No se pudo cargar la conexión');
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const code = new URLSearchParams(location.search).get('code');
    let session = null;
    if (accessToken && refreshToken) {
      const { data, error } = await withTimeout(sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }), 15000);
      if (error) throw error;
      session = data.session;
    } else if (code) {
      const { data, error } = await withTimeout(sb.auth.exchangeCodeForSession(code), 15000);
      if (error) throw error;
      session = data.session;
    } else {
      ({ data: { session } } = await withTimeout(sb.auth.getSession(), 15000));
    }
    if (!session) { show('expired'); return; }
    history.replaceState(null, '', location.pathname);   // saca los tokens de la barra de direcciones

    let p = null;
    try { p = await withTimeout(getProfile(), 10000); } catch { /* el nombre es opcional */ }
    $('[data-who]').textContent = p?.full_name ? `Hola, ${p.full_name.split(' ')[0]}` : session.user.email;
    form.elements.username.value = session.user.email;
    show('form');
    form.elements.password.focus();
  } catch (err) {
    $('[data-detail]').textContent = `Detalle: ${errorText(err)}`;
    show('expired');
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pass = form.elements.password.value;
  if (pass.length < 8) { say('Usa al menos 8 caracteres.', true); return; }
  if (pass !== form.elements.again.value) { say('Las dos contraseñas no coinciden.', true); return; }
  const btn = $('button[type="submit"]', form);
  btn.disabled = true;
  say('Guardando…');
  try {
    const sb = await getClient();
    const { error } = await withTimeout(sb.auth.updateUser({ password: pass }), 20000);
    if (error) throw error;
    const p = await getProfile();
    location.replace(homeFor(p));
  } catch (err) {
    say(errorText(err), true);
    btn.disabled = false;
  }
});
