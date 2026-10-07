/* ==========================================================================
   RAKÜN — planes.js
   Planes de marca personal. Datos de Tarifas_RAKUN_2026.xlsx (hojas de cara
   al cliente: Creadores, Salud, Planes mensuales, extras y condiciones).
   Precios en COP antes de IVA. Para cambiar un precio, edita DATA.
   ========================================================================== */

import { RakunEye } from '../eye.js';
import { initFormats, setFormatsProfile } from './formatos.js';
import { $, $$, reduced, fine, initClock, initCursor, initHeader, closeMenu, initMegaMenu } from '../common.js';

// TODO: número real de WhatsApp en formato internacional, sin "+" ni espacios (ej. '573001234567').
const WHATSAPP = '';

const SESSION_PRICE = 649000;            // sesión de grabación (hasta 3 h) · Creadores - Costeo C32

const DATA = {
  creador: {
    head: {
      kicker: 'Planes mensuales · Instagram, TikTok y Facebook',
      title: 'Para creadores que quieren <em>despegar.</em>',
      lede: 'Elige tu línea: FLUJO (mucho contenido) o IMPACTO (contenido elaborado). Todo se publica también en Facebook sin costo extra.',
    },
    color: 'var(--yellow)',
    lines: {
      flujo: [
        { tag: 'FLUJO', name: 'Inicio', ideal: 'Empezar a publicar con constancia.', ed: 649000, tri: 589000, sessions: 1,
          rows: [['Reels / TikToks', '12 al mes (3 por semana)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '—'], ['Ideas y guiones', 'Calendario de ideas del mes'], ['Publicación', 'La haces tú (te entregamos copys)'], ['Comunidad', '—'], ['Seguimiento', 'Reporte mensual de vistas y seguidores']] },
        { tag: 'FLUJO', name: 'Ritmo', hot: true, ideal: 'Crecer rápido con 5 reels por semana.', ed: 1290000, tri: 1190000, sessions: 1,
          rows: [['Reels / TikToks', '20 al mes (5 por semana)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '4'], ['Ideas y guiones', 'Ideas + guiones basados en tendencias'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', '—'], ['Seguimiento', 'Reporte + ajustes al perfil']] },
        { tag: 'FLUJO', name: 'Diario', ideal: 'Volverte un referente: 1 reel diario.', ed: 2490000, tri: 2290000, sessions: 2,
          rows: [['Reels / TikToks', '30 al mes (1 diario)'], ['Edición', 'Rápida: cortes, subtítulos, ganchos y tendencias'], ['Carruseles', '8'], ['Ideas y guiones', 'Ideas + guiones + estrategia por formato'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', 'Respondemos comentarios y mensajes'], ['Seguimiento', 'Reporte + reunión mensual']] },
      ],
      impacto: [
        { tag: 'IMPACTO', name: 'Inicio', ideal: 'Empezar con piezas que se ven de otro nivel.', ed: 1090000, tri: 979000, sessions: 1,
          rows: [['Reels / TikToks', '4 al mes (1 por semana)'], ['Edición', 'Elaborada: motion graphics, efectos de sonido y color'], ['Carruseles', '—'], ['Ideas y guiones', 'Calendario de ideas del mes'], ['Publicación', 'La haces tú (te entregamos copys)'], ['Comunidad', '—'], ['Seguimiento', 'Reporte mensual de vistas y seguidores']] },
        { tag: 'IMPACTO', name: 'Pro', hot: true, ideal: 'Construir una marca personal fuerte.', ed: 2290000, tri: 2090000, sessions: 1,
          rows: [['Reels / TikToks', '8 al mes (2 por semana)'], ['Edición', 'Elaborada: motion graphics, efectos de sonido y color'], ['Carruseles', '2 animados'], ['Ideas y guiones', 'Ideas + guiones'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', '—'], ['Seguimiento', 'Reporte + ajustes al perfil']] },
        { tag: 'IMPACTO', name: 'Élite', ideal: 'Creadores que van por marcas y colaboraciones.', ed: 4890000, tri: 4390000, sessions: 2,
          rows: [['Reels / TikToks', '12 al mes (3 por semana)'], ['Edición', 'Elaborada + 2 reels 100% animados'], ['Carruseles', '4 animados'], ['Ideas y guiones', 'Ideas + guiones + estrategia de marca personal'], ['Publicación', 'La hacemos nosotros'], ['Comunidad', 'Respondemos comentarios y mensajes'], ['Seguimiento', 'Reporte + reunión mensual']] },
      ],
    },
    extras: [
      ['Impulso de alcance (pauta)', 'Mensual', 489000, 'Ponemos pauta a tus mejores reels para llegar a más gente. La inversión en pauta va aparte (desde $300.000 / mes).'],
      ['Kit visual de marca', 'Único', 890000, 'Plantillas de motion, tipografías, colores, portadas y subtítulos con tu estilo.'],
      ['Media kit para marcas', 'Único', 389000, 'Tus números, audiencia y tarifas en un documento profesional para enviar a marcas.'],
      ['Optimización de perfil', 'Único', 189000, 'Bio, foto, historias destacadas, link en bio y portadas.'],
      ['Sesión de fotos lifestyle', 'Por sesión', 589000, 'Fotos profesionales para perfil, portadas y contenido.'],
      ['Reel rápido adicional', 'Por video', 59900, 'Un reel extra de edición rápida.'],
      ['Reel elaborado adicional', 'Por video', 219000, 'Un reel extra con motion y diseño sonoro.'],
      ['Entrega exprés (24 h)', 'Por video', '+30%', 'Para tendencias que hay que subir ya.'],
      ['Sesión de grabación adicional', 'Por sesión', 649000, 'Hasta 3 h con equipo profesional.'],
    ],
  },

  medico: {
    head: {
      kicker: 'Planes mensuales · médicos, odontólogos, veterinarios, estéticas',
      title: 'Para llenar tu <em>agenda.</em>',
      lede: 'Grabamos en tu consultorio, editamos y movemos tu pauta. La inversión en pauta la pagas directamente a Meta.',
    },
    color: 'var(--blue)',
    plans: [
      { tag: 'Salud', name: 'Presencia', ideal: 'Consultorios que quieren empezar a recibir pacientes desde redes.', price: 3290000, ads: 1000000,
        rows: [['Grabación', '1 sesión al mes (hasta 3 horas)'], ['Videos cortos', '8 con subtítulos y gancho inicial'], ['Anuncios', 'Usamos tus mejores videos como anuncio'], ['Video largo', '—'], ['Carruseles', '4 educativos'], ['Guiones', 'Los escribimos: tú solo llegas y hablas'], ['Pauta en Meta', '1 campaña para recibir mensajes por WhatsApp'], ['Pacientes', 'Los mensajes llegan directo a tu WhatsApp'], ['Resultados', 'Reporte mensual: mensajes y costo por paciente potencial']] },
      { tag: 'Salud', name: 'Agenda llena', hot: true, ideal: 'Profesionales con consulta que quieren llenar la agenda de forma constante.', price: 5490000, ads: 2000000,
        rows: [['Grabación', '1 jornada al mes (hasta 5 h) con asistente de producción'], ['Videos cortos', '10 (7 Pro + 3 Premium, con testimonios de pacientes)'], ['Anuncios', '2 diseñados para vender, con varias versiones del gancho'], ['Video largo', '—'], ['Carruseles', '6 educativos'], ['Guiones', 'Incluidos'], ['Pauta en Meta', 'Hasta 3 campañas: pacientes nuevos + volver a impactar'], ['Pacientes', 'WhatsApp con respuestas automáticas, formulario de citas y etiquetas'], ['Resultados', 'Reporte + reunión mensual de resultados']] },
      { tag: 'Salud', name: 'Autoridad', ideal: 'Clínicas y especialistas que quieren ser el referente de su ciudad.', price: 10490000, ads: 4000000,
        rows: [['Grabación', '2 sesiones al mes con asistente de producción'], ['Videos cortos', '20 (12 Pro + 8 Premium)'], ['Anuncios', '4 con varias versiones del gancho'], ['Video largo', '1 al mes: YouTube, web o sala de espera'], ['Carruseles', '8 educativos'], ['Guiones', 'Incluidos'], ['Pauta en Meta', 'Campañas ilimitadas en todo el recorrido del paciente'], ['Pacientes', 'Todo lo anterior + seguimiento de cada paciente hasta que agenda'], ['Resultados', 'Reunión cada 15 días y entregas prioritarias en 48 h']] },
    ],
    gear: [
      ['Cámara Sony A7 IV', 'Tu consulta se ve como una clínica de primer nivel, no como un video de celular.'],
      ['Lente 50 mm', 'Fondo desenfocado y aspecto de cine: tú eres el protagonista.'],
      ['Lente zoom profesional', 'Mostramos consultorio, equipos y procedimientos sin interrumpir la consulta.'],
      ['Luces Godox de 300 W', 'Piel uniforme, sin sombras ni brillos, aunque tu consultorio sea oscuro.'],
      ['Estabilizador (gimbal)', 'Recorridos suaves por tu clínica, tipo comercial de televisión.'],
      ['Micrófonos RØDE Wireless GO II', 'Se te entiende perfecto: el mal audio es la razón #1 por la que dejan de ver.'],
    ],
    extras: [
      ['Configuración inicial', 'Único', 990000, 'Cuentas de Meta, píxel, WhatsApp Business, estrategia y guiones del primer mes.'],
      ['Video testimonio de paciente', 'Por video', 349000, 'Un paciente real contando su experiencia, con consentimiento firmado.'],
      ['Video institucional / tour', 'Por proyecto', 1490000, '1-2 min mostrando instalaciones, equipo y forma de atender.'],
      ['Sesión de fotos profesional', 'Por sesión', 689000, 'Retratos tuyos, de tu equipo y del consultorio (20 fotos editadas).'],
      ['Perfil de Google + reseñas', 'Único', 690000, 'Optimizamos tu ficha de Google Maps y montamos un sistema para pedir reseñas.'],
      ['Página para agendar citas', 'Único + hosting', 1890000, 'Servicios, testimonios y botón de WhatsApp o formulario.'],
      ['Automatización de WhatsApp', 'Único', 890000, 'Respuestas automáticas, catálogo, etiquetas y mensajes de seguimiento.'],
      ['Entrenamiento a recepción', 'Único (2 h)', 590000, 'Guion y capacitación para que tu recepción convierta mensajes en citas.'],
      ['Video para sala de espera', 'Por proyecto', 789000, 'Loop de 3-5 min con servicios y consejos para tus pantallas.'],
      ['Media jornada de grabación', 'Por sesión', 649000, 'Hasta 4 h de grabación con el equipo completo.'],
      ['Jornada completa de grabación', 'Por día', 889000, 'Hasta 8 h de grabación con el equipo completo.'],
    ],
  },

  mentor: {
    head: {
      kicker: 'Planes mensuales de contenido',
      title: 'Para que tu programa <em>se venda solo.</em>',
      lede: 'Investigación, ideas, plan de contenidos, guiones, edición y publicación. Tú enseñas; nosotros hacemos que te miren.',
    },
    color: 'var(--pink)',
    plans: [
      { tag: 'Contenido', name: 'Despega', ideal: 'Publicar todos los días con un plan detrás.', price: 1490000,
        rows: [['Publicaciones', '30 al mes (1 diaria)'], ['Contenido', '15 videos con texto en pantalla\n5 reacciones o clips\n5 videos a cámara o clips\n5 carruseles'], ['Bonus', '—']] },
      { tag: 'Contenido', name: 'Acelera', hot: true, ideal: 'El mejor valor por publicación: crecer en serio.', price: 2890000,
        rows: [['Publicaciones', '90 al mes (3 diarias)'], ['Contenido', '60 videos con texto en pantalla\n10 reacciones o clips\n10 videos a cámara o clips\n10 carruseles'], ['Bonus', 'Pack de historias (stories) de venta']] },
      { tag: 'Contenido', name: 'Élite', ideal: 'Dominar tu nicho con presencia en todo momento.', price: 5890000,
        rows: [['Publicaciones', '150 al mes (5 diarias)'], ['Contenido', '120 videos con texto en pantalla\n20 reacciones o clips\n20 videos a cámara o clips\n20 carruseles'], ['Bonus', 'Pack de historias (stories) de venta']] },
    ],
    extras: [
      ['Sistema para conseguir clientes', 'Mensual', 1390000, 'El camino desde que te ven en redes hasta que te escriben o compran: formularios, WhatsApp, landing.'],
      ['Pauta en Facebook e Instagram', 'Mensual', 1390000, 'Creamos, administramos y optimizamos tus anuncios. La inversión en pauta va aparte.'],
      ['Asesoría estratégica 1 a 1', 'Mensual', 1390000, 'Reuniones para revisar resultados, ajustar la estrategia y darte feedback.'],
      ['Equipo comercial', 'Mensual + 15% de ventas', 1390000, 'Una persona agenda a los interesados (setter) y otra cierra la venta (closer).'],
      ['Jornada de grabación presencial', 'Desde / día', 889000, 'Vamos a tu oficina o locación con equipo profesional y grabamos el contenido del mes.'],
    ],
  },
};

/* ---------- utilidades ---------- */
const cop = (n) => (typeof n === 'number' ? `$${n.toLocaleString('es-CO')}` : n);
// en tipografía display el "$" de Knuckle Down parece una barra: va en la tipografía de texto
const copBig = (n) => (typeof n === 'number' ? `<span class="cur">$</span>${n.toLocaleString('es-CO')}` : n);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

/* ---------- estado ---------- */
const state = { profile: 'creador', line: 'flujo', mode: 'edicion', quarterly: false };

/* ---------- precio de cada tarjeta ---------- */
function priceOf(p) {
  if (state.profile !== 'creador') {
    return {
      label: state.profile === 'medico' ? 'Precio mensual · pauta aparte' : 'Precio mensual',
      price: p.price, was: null,
      note: state.profile === 'medico' ? `/ mes · antes de IVA · pauta sugerida desde ${cop(p.ads)} / mes, aparte*` : '/ mes · antes de IVA',
    };
  }
  const rec = state.mode === 'grabacion';
  const base = state.quarterly ? p.tri : p.ed;
  const price = base + (rec ? p.sessions * SESSION_PRICE : 0);
  const full = p.ed + (rec ? p.sessions * SESSION_PRICE : 0);
  const sess = `${p.sessions} ${p.sessions > 1 ? 'sesiones' : 'sesión'} de grabación`;
  return {
    label: rec ? 'Con grabación RAKÜN' : 'Solo edición · tú grabas',
    price,
    was: state.quarterly ? full : null,
    note: [
      '/ mes · antes de IVA',
      rec ? `incluye ${sess}` : null,
      state.quarterly ? 'pago trimestral anticipado' : null,
    ].filter(Boolean).join(' · '),
  };
}

function cardHTML(p, color) {
  const pr = priceOf(p);
  const subject = `Quiero el plan ${p.tag} ${p.name}`;
  return `
    <li class="plc${p.hot ? ' plc--hot' : ''}" style="--c: ${color}">
      ${p.hot ? '<span class="plc__badge mono">★ Más elegido</span>' : ''}
      <p class="mono plc__tag">${esc(p.tag)}</p>
      <h3 class="plc__name">${esc(p.name)}</h3>
      <p class="plc__ideal">${esc(p.ideal)}</p>
      <div class="plc__price-box">
        <p class="mono plc__label">${esc(pr.label)}</p>
        <p class="plc__price">${copBig(pr.price)}<small>COP</small></p>
        ${pr.was ? `<p class="plc__was">Antes ${cop(pr.was)} / mes</p>` : ''}
        <p class="plc__note">${esc(pr.note)}</p>
      </div>
      <dl class="plc__rows">
        ${p.rows.map(([k, v]) => `<div class="plc__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
      </dl>
      <a class="plc__cta" href="mailto:rakundesigns@gmail.com?subject=${encodeURIComponent(subject)}">Quiero este plan <svg class="ico" aria-hidden="true"><use href="#i-ne"/></svg></a>
    </li>`;
}

function specialHTML(profile) {
  if (profile === 'creador') {
    return `
      <div class="quiz">
        <div><p class="mono quiz__kicker">¿No sabes cuál elegir?</p><p class="quiz__title">Responde 6 preguntas y te decimos cuál.</p></div>
        <div>
          <ul class="quiz__qs mono">
            <li>¿Muchos reels o reels elaborados?</li><li>¿En qué etapa estás?</li><li>¿Cuánto quieres invertir?</li>
            <li>¿Quién graba?</li><li>¿Quieres pauta?</li><li>¿Qué es lo más importante?</li>
          </ul>
          <a class="quiz__cta" href="${waLink('Hola RAKÜN, quiero que me ayuden a elegir mi plan de creador.')}" target="_blank" rel="noopener" data-whatsapp-dyn>Encontrar mi plan →</a>
        </div>
      </div>`;
  }
  if (profile === 'medico') {
    return `
      <div class="gear-why">
        <p class="mono gear-why__kicker">¿Por qué cuesta lo que cuesta?</p>
        <p class="gear-why__title">Lo que llega a tu <em>consultorio.</em></p>
        <ul class="gear-why__grid">${DATA.medico.gear.map(([n, g]) => `<li><b>${esc(n)}</b><span>${esc(g)}</span></li>`).join('')}</ul>
        <p class="mono gear-why__note">* La inversión en pauta se paga directamente a Meta con la tarjeta del consultorio; con menos inversión llegan menos pacientes potenciales. Contenido ético y verificable: nunca prometemos curas ni resultados garantizados.</p>
      </div>`;
  }
  return `
    <div class="includes">
      <p class="mono includes__kicker">Todos los planes incluyen</p>
      <ul class="includes__chips mono">
        <li style="--c: var(--yellow)">Investigación y estrategia</li><li style="--c: var(--blue)">Ideas de contenido</li><li style="--c: var(--pink)">Plan de contenidos</li>
        <li style="--c: var(--yellow)">Guiones</li><li style="--c: var(--blue)">Edición</li><li style="--c: var(--pink)">Publicación</li>
      </ul>
      <p class="includes__text">Comprado por piezas sueltas te sale parecido o más barato, pero sin la estrategia, los guiones y la publicación: eso es lo que hace que funcione.</p>
    </div>`;
}

/* ---------- render ---------- */
const cards = $('[data-cards]');
let swapTimers = [];

function render(animate = true) {
  const d = DATA[state.profile];
  // encabezado
  $('[data-head-kicker]').textContent = d.head.kicker;
  $('[data-head-title]').innerHTML = d.head.title;
  $('[data-head-lede]').textContent = d.head.lede;
  // interruptores (solo creadores)
  $('[data-switches]').hidden = state.profile !== 'creador';
  $$('[data-line]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.line === state.line)));
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $('[data-quarterly]').setAttribute('aria-checked', String(state.quarterly));
  // tarjetas
  const plans = state.profile === 'creador' ? d.lines[state.line] : d.plans;
  cards.innerHTML = plans.map((p) => cardHTML(p, d.color)).join('');
  $('[data-special]').innerHTML = specialHTML(state.profile);
  // la carta
  $('[data-carta]').innerHTML = d.extras.map(([name, cobro, price, desc]) => `
    <li><span class="carta__name">${esc(name)}</span><span class="carta__price"><span class="mono">${esc(cobro)}</span><b>${copBig(price)}</b></span><span class="carta__desc">${esc(desc)}</span></li>`).join('');
  // las tarjetas entran a saltos, una tras otra
  swapTimers.forEach(clearTimeout);
  swapTimers = [];
  if (!animate || reduced) return;
  cards.classList.add('is-swapping');
  $$('.plc', cards).forEach((c, i) => swapTimers.push(setTimeout(() => c.classList.add('is-in'), 60 + i * 110)));
  swapTimers.push(setTimeout(() => cards.classList.remove('is-swapping'), 60 + 3 * 110 + 200));
}

function setProfile(p, focusTab = false) {
  if (!DATA[p]) return;
  state.profile = p;
  $$('[data-profile]').forEach((t) => {
    const on = t.dataset.profile === p;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focusTab) t.focus();
  });
  $('[data-panel]').setAttribute('aria-labelledby', `tab-${p}`);
  history.replaceState(null, '', `#${p}`);
  setFormatsProfile(p);
  render();
}

function initPlans() {
  // perfiles (pestañas con flechas del teclado)
  const tabs = $$('[data-profile]');
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => setProfile(t.dataset.profile));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      setProfile(next.dataset.profile, true);
    });
  });
  $$('[data-line]').forEach((b) => b.addEventListener('click', () => { state.line = b.dataset.line; render(); }));
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode; render(false); }));
  $('[data-quarterly]').addEventListener('click', () => { state.quarterly = !state.quarterly; render(false); });

  const fromHash = location.hash.slice(1);
  if (DATA[fromHash]) {
    setProfile(fromHash);
    requestAnimationFrame(() => $('#planes').scrollIntoView());   // llega desde otra página: directo a los planes
  } else render(false);
}

/* ==========================================================================
   Botón de emergencia: la mirilla
   ========================================================================== */
function initSos() {
  const box = $('[data-sos]');
  if (!box) return;
  const hatch = $('[data-sos-hatch]', box);
  const dialog = $('[data-sos-dialog]', box);
  let timers = [];
  let open = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  const show = () => {
    if (open) return;
    open = true;
    timers.forEach(clearTimeout);
    timers = [];
    hatch.setAttribute('aria-expanded', 'true');
    if (reduced) {
      box.style.setProperty('--slide', '-101%');
      dialog.hidden = false;
    } else {
      // la rejilla se corre en 3 cuadros, el ojo mira hacia arriba y sale el diálogo
      ['-34%', '-67%', '-101%'].forEach((v, k) => later(k * 90, () => box.style.setProperty('--slide', v)));
      later(300, () => { dialog.hidden = false; dialog.className = 'sos__dialog is-pop-0'; });
      later(390, () => { dialog.className = 'sos__dialog is-pop-1'; });
      later(480, () => { dialog.className = 'sos__dialog'; });
    }
    box.style.setProperty('--ix', '96px');
    box.style.setProperty('--iy', '52px');
  };
  const hide = () => {
    if (!open) return;
    open = false;
    timers.forEach(clearTimeout);
    timers = [];
    hatch.setAttribute('aria-expanded', 'false');
    dialog.hidden = true;
    box.style.setProperty('--slide', '0%');
    box.style.setProperty('--ix', '118px');
    box.style.setProperty('--iy', '76px');
  };

  if (fine) {
    box.addEventListener('pointerenter', show);
    box.addEventListener('pointerleave', hide);
  }
  hatch.addEventListener('click', () => (open ? hide() : show()));
  box.addEventListener('focusout', (e) => { if (!box.contains(e.relatedTarget)) hide(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); hatch.focus(); } });

  // cerrada, la mirilla "toca" cada ~5 s
  if (!reduced) {
    setInterval(() => {
      if (open) return;
      hatch.classList.remove('is-knocking');
      void hatch.offsetWidth;
      hatch.classList.add('is-knocking');
    }, 5000);
  }
}

/* ---------- Estrategia: "Ver más" despliega el detalle de cada pilar ---------- */
function initPillars() {
  $$('.pillar__more').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const label = btn.firstChild;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Ver menos' : 'Ver más';
      btn.closest('.pillar').classList.toggle('is-open', open);
      panel.hidden = !open;
    });
  });
}

/* ---------- WhatsApp: enlaces con mensaje ya escrito ---------- */
function initWhatsapp() {
  $$('[data-whatsapp]').forEach((a) => { a.href = waLink(a.dataset.whatsapp); a.target = '_blank'; a.rel = 'noopener'; });
}

/* ---------- smooth scroll + anclas ---------- */
let lenis = null;
function initLenis() {
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
function initAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    // los perfiles del menú (#creador, #medico, #mentor) cambian la pestaña
    if (DATA[id]) {
      e.preventDefault();
      closeMenu();
      setProfile(id);
      const target = $('#planes');
      if (lenis) lenis.scrollTo(target, { duration: 1 }); else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });
}

/* ==========================================================================
   Arranque
   ========================================================================== */
initClock();
initLenis();
initHeader(() => lenis);
initMegaMenu();
initCursor();
initAnchors();
initFormats((p) => setProfile(p));
initPlans();
initSos();
initPillars();
initWhatsapp();

const hdrEye = $('[data-eye="eye-hdr"]');
if (hdrEye) new RakunEye(hdrEye, { prefix: 'eye-hdr' }).followCursor();
