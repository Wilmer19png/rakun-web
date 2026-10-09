/* ==========================================================================
   RAKÜN · formulario "Quiero este plan"
   Cualquier botón con data-lead='{"world":"marca","plan":"…","detail":"…","price":"…"}'
   abre este formulario. La solicitud se guarda en Supabase (tabla leads);
   si Supabase aún no está conectado, se abre el correo con todo escrito.
   ========================================================================== */
import { $, $$, safeUrl } from './util.js';
import { isConfigured, getClient, errorText } from './supa.js';
import { CALCOM_URL, CONTACT_EMAIL } from './config.js';

const CODES = [['+57', 'CO'], ['+1', 'US'], ['+52', 'MX'], ['+34', 'ES'], ['+51', 'PE'], ['+56', 'CL'], ['+54', 'AR'], ['+593', 'EC'], ['+58', 'VE'], ['+507', 'PA']];
const WORLD_NAME = { marca: 'Marca personal', produccion: 'Producción audiovisual', web: 'Web y apps' };
const MAX_LINKS = 5;

let root = null;
let current = null;      // plan elegido
let lastFocus = null;

/* ---------- envío (también lo usa el guion de Producción) ---------- */
export async function submitLead(lead) {
  const payload = {
    world: lead.world,
    plan: lead.plan || null,
    plan_detail: lead.plan_detail || null,
    price_label: lead.price_label || null,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city || null,
    occupation: lead.occupation || null,
    links: (lead.links || []).slice(0, 6),
    goal: lead.goal || null,
    contact_via: lead.contact_via || null,
    contact_time: lead.contact_time || null,
    consent: true,
    page: location.pathname.split('/').pop() + location.hash,
  };
  if (!isConfigured()) {
    // respaldo: abre el correo con la solicitud completa
    const body = [
      `Plan: ${payload.plan || WORLD_NAME[payload.world]}`, payload.plan_detail && `Detalle: ${payload.plan_detail}`, payload.price_label && `Precio: ${payload.price_label}`, '',
      `Nombre: ${payload.name}`, `Correo: ${payload.email}`, `WhatsApp: ${payload.phone}`, `Ciudad: ${payload.city || '—'}`,
      `A qué se dedica: ${payload.occupation || '—'}`, `Perfiles: ${payload.links.join(' · ') || '—'}`, '',
      `Quiere lograr: ${payload.goal || '—'}`, `Contactar por: ${payload.contact_via || '—'} · ${payload.contact_time || '—'}`,
    ].filter((l) => l !== null && l !== undefined && l !== false).join('\n');
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Quiero este plan · ${payload.plan || WORLD_NAME[payload.world]}`)}&body=${encodeURIComponent(body)}`;
    return { via: 'email' };
  }
  const sb = await getClient();
  const { error } = await sb.from('leads').insert(payload);
  if (error) throw error;
  return { via: 'db' };
}

/* ---------- el modal ---------- */
function build() {
  root = document.createElement('div');
  root.className = 'lf';
  root.hidden = true;
  root.innerHTML = `
    <div class="lf__scrim" data-lf-close></div>
    <div class="lf__box" role="dialog" aria-modal="true" aria-labelledby="lf-title" data-lenis-prevent>
      <aside class="lf__plan">
        <p class="mono lf__k">Elegiste</p>
        <div class="lf__ticket">
          <p class="mono lf__world" data-lf-world></p>
          <p class="lf__name" data-lf-plan></p>
          <p class="lf__detail" data-lf-detail></p>
          <p class="lf__price" data-lf-price></p>
        </div>
        <p class="mono lf__k lf__k--y">¿Qué pasa después?</p>
        <ol class="lf__steps">
          <li><b>01</b><span>Te escribimos en menos de <strong>24 h hábiles</strong>.</span></li>
          <li><b>02</b><span>Una reunión de <strong>15 minutos</strong> para conocerte y revisar tu perfil.</span></li>
          <li><b>03</b><span>Te damos acceso a <strong>tu portal</strong> y arrancamos.</span></li>
        </ol>
        <p class="mono lf__fine">Sin pago todavía.<br>Primero hablamos.</p>
      </aside>

      <div class="lf__main">
        <button class="lf__x" type="button" aria-label="Cerrar" data-lf-close>✕</button>

        <form class="lf__form" data-lf-form novalidate>
          <p class="mono lf__k lf__k--dark">Quiero este plan</p>
          <h2 class="lf__title" id="lf-title">Cuéntanos <em>de ti.</em></h2>

          <div class="lf__grid">
            <label class="lf__f"><span class="lf__l">Nombre <b>*</b></span><input name="name" autocomplete="name" required maxlength="120"></label>
            <label class="lf__f"><span class="lf__l">Correo <b>*</b></span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>
            <div class="lf__f"><span class="lf__l" id="lf-phone-l">WhatsApp <b>*</b></span>
              <div class="lf__phone">
                <select name="code" aria-label="Indicativo del país">${CODES.map(([c, n]) => `<option value="${c}">${n} ${c}</option>`).join('')}</select>
                <input name="phone" type="tel" autocomplete="tel-national" required minlength="7" maxlength="15" pattern="[0-9]*" aria-labelledby="lf-phone-l" inputmode="numeric" placeholder="3001234567" data-digits>
              </div>
            </div>
            <label class="lf__f"><span class="lf__l">Ciudad y país <b>*</b></span><input name="city" autocomplete="address-level2" required maxlength="120" placeholder="Medellín, Colombia"></label>
            <label class="lf__f lf__f--wide"><span class="lf__l">¿A qué te dedicas?</span><input name="occupation" maxlength="200" placeholder="Odontóloga estética, creadora de lifestyle, banda de rock…"></label>

            <div class="lf__f lf__f--wide">
              <span class="lf__l">Tus perfiles o tu empresa · para conocerte antes de la reunión</span>
              <div class="lf__links" data-lf-links></div>
              <button class="lf__add mono" type="button" data-lf-add>+ Agregar otro link</button>
            </div>

            <label class="lf__f lf__f--wide"><span class="lf__l">¿Qué quieres lograr? <small>(una o dos líneas)</small></span><textarea name="goal" rows="2" maxlength="1500"></textarea></label>

            <fieldset class="lf__f"><legend class="lf__l">¿Cómo te contactamos?</legend>
              <div class="lf__chips">${['WhatsApp', 'Llamada', 'Correo'].map((v, i) => `<label><input type="radio" name="via" value="${v}"${i === 0 ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div>
            </fieldset>
            <fieldset class="lf__f"><legend class="lf__l">¿En qué horario?</legend>
              <div class="lf__chips">${['Mañana', 'Tarde', 'Noche'].map((v, i) => `<label><input type="radio" name="when" value="${v}"${i === 1 ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div>
            </fieldset>
          </div>

          <!-- trampa para robots: las personas no la ven -->
          <label class="lf__hp" aria-hidden="true">Empresa web<input name="empresa_web" tabindex="-1" autocomplete="off"></label>

          <label class="lf__ok">
            <input type="checkbox" name="consent" required>
            <span>Autorizo a RAKÜN a tratar mis datos para contactarme sobre este plan (Ley 1581 de 2012).</span>
          </label>

          <div class="lf__send">
            <p class="mono lf__msg" data-lf-msg aria-live="polite">Tus datos no se comparten con nadie.</p>
            <button class="lf__btn" type="submit" data-lf-submit>Quiero este plan <span aria-hidden="true">↗</span></button>
          </div>
        </form>

        <div class="lf__done" data-lf-done hidden>
          <span class="mono lf__stamp">✓ Solicitud recibida</span>
          <h2 class="lf__title">¡Listo, <em data-lf-first></em>!</h2>
          <p class="lf__lede">Te escribimos en menos de 24 h hábiles por el medio que elegiste.</p>
          <div class="lf__cal" data-lf-cal hidden>
            <p>Si prefieres no esperar, agenda de una vez una reunión de 15 minutos:</p>
            <a class="lf__btn" data-lf-cal-link target="_blank" rel="noopener">Agendar reunión <span aria-hidden="true">↗</span></a>
          </div>
          <button class="lf__close-done mono" type="button" data-lf-close>Volver a la página</button>
        </div>
      </div>
    </div>`;
  document.body.append(root);

  const links = $('[data-lf-links]', root);
  const addLink = (value = '') => {
    if (links.children.length >= MAX_LINKS) return;
    const row = document.createElement('div');
    row.className = 'lf__link';
    const hint = ['instagram.com/tuperfil', 'tiktok.com/@tuperfil', 'tuweb.com', 'youtube.com/@tucanal', 'linkedin.com/in/tunombre'][links.children.length] || 'Otro link';
    row.innerHTML = `<input name="link" inputmode="url" maxlength="200" placeholder="${hint}" aria-label="Link de perfil o empresa"><button type="button" aria-label="Quitar link">✕</button>`;
    $('input', row).value = value;
    $('button', row).addEventListener('click', () => { row.remove(); if (!links.children.length) addLink(); syncAdd(); });
    links.append(row);
    syncAdd();
    return row;
  };
  const syncAdd = () => { $('[data-lf-add]', root).hidden = links.children.length >= MAX_LINKS; };
  addLink();
  addLink();
  $('[data-lf-add]', root).addEventListener('click', () => $('input', addLink())?.focus());

  $$('[data-lf-close]', root).forEach((b) => b.addEventListener('click', close));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') trapFocus(e);
  });
  $('[data-lf-form]', root).addEventListener('submit', onSubmit);
}

function trapFocus(e) {
  const f = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), select, textarea', $('.lf__box', root)).filter((el) => el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

export function openLeadForm(plan) {
  if (!root) build();
  current = plan || { world: 'marca' };
  $('[data-lf-world]', root).textContent = WORLD_NAME[current.world] || '';
  $('[data-lf-plan]', root).textContent = current.plan || 'Cuéntanos qué necesitas';
  $('[data-lf-detail]', root).textContent = current.detail || '';
  $('[data-lf-price]', root).textContent = current.price || '';
  $('.lf__ticket', root).style.setProperty('--c', { marca: 'var(--yellow)', produccion: 'var(--blue)', web: 'var(--pink)' }[current.world] || 'var(--yellow)');
  $('[data-lf-form]', root).hidden = false;
  $('[data-lf-done]', root).hidden = true;
  $('[data-lf-msg]', root).textContent = 'Tus datos no se comparten con nadie.';
  $('[data-lf-msg]', root).classList.remove('is-error');
  lastFocus = document.activeElement;
  root.hidden = false;
  document.documentElement.classList.add('lf-open');
  requestAnimationFrame(() => $('input[name="name"]', root).focus());
}

function close() {
  if (!root || root.hidden) return;
  root.hidden = true;
  document.documentElement.classList.remove('lf-open');
  lastFocus?.focus?.();
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const msg = $('[data-lf-msg]', root);
  const btn = $('[data-lf-submit]', root);
  const fd = new FormData(form);
  if (fd.get('empresa_web')) return;                               // robot

  const req = ['name', 'email', 'phone', 'city'].map((n) => form.elements[n]).find((el) => !el.value.trim() || !el.checkValidity());
  if (req) { msg.textContent = `Falta: ${req.closest('.lf__f').querySelector('.lf__l').firstChild.textContent.trim()}.`; msg.classList.add('is-error'); req.focus(); return; }
  if (!form.elements.consent.checked) { msg.textContent = 'Necesitamos tu autorización para contactarte.'; msg.classList.add('is-error'); form.elements.consent.focus(); return; }

  const lead = {
    world: current.world,
    plan: current.plan,
    plan_detail: current.detail,
    price_label: current.price,
    name: fd.get('name').trim(),
    email: fd.get('email').trim(),
    phone: `${fd.get('code')} ${fd.get('phone').trim()}`,
    city: fd.get('city').trim(),
    occupation: fd.get('occupation').trim(),
    links: fd.getAll('link').map(safeUrl).filter(Boolean),
    goal: fd.get('goal').trim(),
    contact_via: fd.get('via'),
    contact_time: fd.get('when'),
  };

  btn.disabled = true;
  msg.classList.remove('is-error');
  msg.textContent = 'Enviando…';
  try {
    const res = await submitLead(lead);
    if (res.via === 'email') { msg.textContent = 'Se abrió tu correo con la solicitud lista: solo dale enviar.'; return; }
    form.reset();
    $('[data-lf-first]', root).textContent = lead.name.split(' ')[0];
    const cal = $('[data-lf-cal]', root);
    cal.hidden = !CALCOM_URL;
    if (CALCOM_URL) $('[data-lf-cal-link]', root).href = CALCOM_URL;
    form.hidden = true;
    $('[data-lf-done]', root).hidden = false;
    $('[data-lf-done] .lf__title', root).focus?.();
  } catch (err) {
    msg.textContent = errorText(err);
    msg.classList.add('is-error');
  } finally {
    btn.disabled = false;
  }
}

/* ---------- cualquier botón con data-lead abre el formulario ---------- */
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lead]');
  if (!a) return;
  let plan;
  try { plan = JSON.parse(a.dataset.lead); } catch { return; }
  e.preventDefault();
  e.stopPropagation();
  openLeadForm(plan);
}, true);
