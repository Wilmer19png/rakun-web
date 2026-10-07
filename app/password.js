/* RAKÜN · cambiar la contraseña sin salir del portal ni del gestor
   Primero se confirma la contraseña actual (así nadie la cambia con una sesión
   abierta ajena) y luego se guarda la nueva. No depende del correo. */
import { $, esc } from './util.js';
import { errorText, withTimeout } from './supa.js';

export function openPasswordDialog(sb, me) {
  const dlg = document.createElement('dialog');
  dlg.className = 'pw';
  dlg.innerHTML = `
    <form class="pw__form" novalidate>
      <p class="mono pw__k">Tu cuenta · ${esc(me.email)}</p>
      <h2 class="pw__title">Cambiar <em>contraseña</em></h2>
      <input type="email" name="email" value="${esc(me.email)}" autocomplete="username" hidden>
      <label class="pw__f"><span>Contraseña actual</span><input name="current" type="password" autocomplete="current-password" required></label>
      <label class="pw__f"><span>Contraseña nueva</span><input name="next" type="password" autocomplete="new-password" required minlength="8"></label>
      <label class="pw__f"><span>Repítela</span><input name="again" type="password" autocomplete="new-password" required minlength="8"></label>
      <label class="pw__show mono"><input type="checkbox" data-show> Ver contraseñas</label>
      <p class="pw__msg" data-msg aria-live="polite">Mínimo 8 caracteres.</p>
      <div class="pw__act">
        <button class="gx__btn" type="button" data-cancel>Cancelar</button>
        <button class="gx__btn gx__btn--dark" type="submit">Guardar contraseña</button>
      </div>
    </form>`;
  document.body.append(dlg);
  const form = $('form', dlg);
  const msg = $('[data-msg]', dlg);
  const say = (text, bad = false) => { msg.textContent = text; msg.classList.toggle('is-error', bad); };
  const close = () => { dlg.close(); dlg.remove(); };

  $('[data-cancel]', dlg).addEventListener('click', close);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  $('[data-show]', dlg).addEventListener('change', (e) => {
    ['current', 'next', 'again'].forEach((n) => { form.elements[n].type = e.target.checked ? 'text' : 'password'; });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { current, next, again } = form.elements;
    if (!current.value) { say('Escribe tu contraseña actual.', true); current.focus(); return; }
    if (next.value.length < 8) { say('La nueva debe tener mínimo 8 caracteres.', true); next.focus(); return; }
    if (next.value !== again.value) { say('Las dos contraseñas nuevas no coinciden.', true); again.focus(); return; }
    if (next.value === current.value) { say('La nueva debe ser distinta a la actual.', true); next.focus(); return; }
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;
    say('Guardando…');
    try {
      const check = await withTimeout(sb.auth.signInWithPassword({ email: me.email, password: current.value }), 20000);
      if (check.error) { say('La contraseña actual no es correcta.', true); current.select(); return; }
      const { error } = await withTimeout(sb.auth.updateUser({ password: next.value }), 20000);
      if (error) throw error;
      form.innerHTML = `
        <p class="mono pw__k">Tu cuenta</p>
        <h2 class="pw__title">¡Listo!</h2>
        <p class="pw__msg">Tu contraseña quedó cambiada. La próxima vez entra con la nueva.</p>
        <div class="pw__act"><button class="gx__btn gx__btn--dark" type="button" data-cancel>Cerrar</button></div>`;
      $('[data-cancel]', dlg).addEventListener('click', close);
    } catch (err) {
      say(errorText(err), true);
    } finally {
      btn.disabled = false;
    }
  });

  dlg.showModal();
  form.elements.current.focus();
}
