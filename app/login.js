/* RAKÜN · iniciar sesión y "olvidé mi contraseña" */
import { $, $$ } from './util.js';
import { getClient, getProfile, homeFor, accountUrl, errorText, isConfigured } from './supa.js';

const login = $('[data-login]');
const forgot = $('[data-forgot]');
const say = (form, text, bad = false) => {
  const m = $('[data-msg]', form);
  m.textContent = text;
  m.classList.toggle('is-error', bad);
};

// alternar entre los dos formularios
$('[data-show-forgot]').addEventListener('click', () => {
  forgot.elements.email.value = login.elements.email.value;
  login.hidden = true; forgot.hidden = false; forgot.elements.email.focus();
});
$('[data-show-login]').addEventListener('click', () => { forgot.hidden = true; login.hidden = false; login.elements.email.focus(); });

// ver / ocultar la contraseña
$$('[data-toggle-pass]').forEach((b) => b.addEventListener('click', () => {
  const input = b.previousElementSibling;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  b.textContent = show ? 'Ocultar' : 'Ver';
  b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
}));

// si ya tiene sesión, directo a su lugar
(async () => {
  if (!isConfigured()) { say(login, 'El acceso se activa pronto. Si eres cliente, escríbenos.'); return; }
  try {
    const p = await getProfile();
    if (p) location.replace(homeFor(p));
  } catch { /* sin sesión: se queda aquí */ }
})();

login.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = login.elements.email.value.trim();
  const password = login.elements.password.value;
  if (!email || !password) { say(login, 'Escribe tu correo y tu contraseña.', true); return; }
  const btn = $('button[type="submit"]', login);
  btn.disabled = true;
  say(login, 'Entrando…');
  try {
    const sb = await getClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await getProfile();
    location.replace(homeFor(p));
  } catch (err) {
    say(login, errorText(err), true);
    btn.disabled = false;
  }
});

forgot.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = forgot.elements.email.value.trim();
  if (!email) { say(forgot, 'Escribe tu correo.', true); return; }
  const btn = $('button[type="submit"]', forgot);
  btn.disabled = true;
  try {
    const sb = await getClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: accountUrl() });
    if (error) throw error;
    // mismo mensaje exista o no la cuenta: no revelamos qué correos están registrados
    say(forgot, 'Si ese correo tiene cuenta, te llega un enlace en unos minutos. Revisa también spam.');
  } catch (err) {
    say(forgot, errorText(err), true);
  } finally {
    btn.disabled = false;
  }
});
