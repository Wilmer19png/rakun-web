/* ==========================================================================
   RAKÜN · la cotización que ve el cliente (cotizacion.html?c=…)
   No pide cuenta: el enlace secreto basta. Muestra la hoja, deja aceptarla y
   la descarga en PDF (imprime esta misma hoja en papel carta).
   ========================================================================== */
import { $, esc, waNumber } from './util.js';
import { getClient, isConfigured, errorText } from './supa.js';
import { loadCatalog } from './catalog.js';
import { totals, blockTotal, lineTotal, cop, partLabel, validUntil, WORLD_HEX, BILLING } from './quote-calc.js';
import { BASE_RECIBO } from './quote-sources.js';

const box = $('[data-quote]');
const token = new URLSearchParams(location.search).get('c') || '';
const date = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d).toLocaleDateString('es-CO', opts);
const money = (n) => `<span class="cq__cur">$</span>${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

function sorry(text) {
  box.innerHTML = `<div class="cq__sorry"><p class="cq__brand">RAKÜN</p><h1>${esc(text)}</h1><p>Si crees que es un error, escríbenos y te enviamos el enlace de nuevo.</p></div>`;
}

async function load() {
  if (!/^[0-9a-f-]{36}$/i.test(token)) { sorry('Este enlace de cotización no está completo.'); return; }
  if (!isConfigured()) { sorry('La página aún no está conectada.'); return; }
  try {
    const sb = await getClient();
    const [{ data, error }, rc] = await Promise.all([sb.rpc('quote_public', { t: token }), loadCatalog('recibo')]);
    if (error) throw error;
    if (!data) { sorry('No encontramos esta cotización.'); return; }
    render(sb, data, { ...BASE_RECIBO, ...(rc || {}) });
  } catch (err) { sorry(errorText(err)); }
}

function render(sb, q, rc) {
  const t = totals(q);
  const until = validUntil(q);
  const late = q.status === 'enviada' && until < new Date();
  const paid = Number(q.paid) || 0;
  const wa = waNumber(rc.whatsapp);
  const client = q.client || {};
  document.title = `${q.number} · ${q.title} — RAKÜN`;

  const lines = (b) => `
    <table class="cq__tbl">
      <thead><tr><th>Concepto</th><th class="r">Cant.</th><th class="r">Valor unitario</th><th class="r">Total</th></tr></thead>
      <tbody>${b.lines.map((l) => `
        <tr><td><span class="cq__name${l.source === 'plan' ? ' is-plan' : ''}">${esc(l.name)}</span>${l.detail ? `<small>${esc(l.detail)}</small>` : ''}</td>
          <td class="r">${esc(l.qty)}${l.unit ? ` <small class="cq__unit">${esc(l.unit)}</small>` : ''}</td><td class="r mono">${money(l.price)}</td><td class="r mono">${money(lineTotal(l))}</td></tr>`).join('')}
      </tbody>
    </table>`;

  // el bloque oscuro de arriba cambia según el estado
  let action = '';
  if (q.status === 'enviada' && !late) {
    action = `<div class="cq__go">
      <div><p class="mono cq__go-k">Para empezar · ${partLabel(0, t.parts.length).split(' · ')[0].toLowerCase()} ${t.parts[0].pct} %</p><p class="cq__go-n">${money(t.parts[0].amount)}</p><p class="cq__go-p">Acepta la cotización y te mostramos cómo pagarlo.</p></div>
      <div class="cq__go-btns"><button class="cq__btn cq__btn--hot" type="button" data-accept>Aceptar la cotización →</button>${wa ? `<a class="cq__btn cq__btn--line" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre la cotización ${q.number}.`)}" target="_blank" rel="noopener">Tengo una pregunta</a>` : ''}</div>
      <p class="mono cq__msg" data-msg aria-live="polite"></p>
    </div>`;
  } else if (q.status === 'enviada' && late) {
    action = `<div class="cq__go cq__go--muted"><div><p class="mono cq__go-k">Esta cotización venció el ${date(until)}</p><p class="cq__go-p">Escríbenos y te la actualizamos.</p></div>${wa ? `<a class="cq__btn cq__btn--hot" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, quiero actualizar la cotización ${q.number}.`)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ''}</div>`;
  } else if (q.status === 'aceptada') {
    action = `<div class="cq__go"><div><p class="mono cq__go-k">✓ Aceptada · ${partLabel(0, t.parts.length).split(' · ')[0].toLowerCase()} ${t.parts[0].pct} %</p><p class="cq__go-n">${money(Math.max(0, t.parts[0].amount - paid))}</p>
      <p class="cq__go-p cq__pay">${esc(rc.payInfo)}</p></div>
      ${wa ? `<div class="cq__go-btns"><a class="cq__btn cq__btn--hot" href="https://wa.me/${wa}?text=${encodeURIComponent(`Hola, ya acepté la cotización ${q.number}. Les envío el comprobante del pago.`)}" target="_blank" rel="noopener">Enviar el comprobante →</a></div>` : ''}</div>`;
  } else if (q.status === 'anticipo' || q.status === 'pagada') {
    action = `<div class="cq__go cq__go--ok"><div><p class="mono cq__go-k">${q.status === 'pagada' ? '✓ Pagada por completo' : '✓ Anticipo recibido'}</p><p class="cq__go-p">Pagado ${cop(paid)} de ${cop(t.total)}. ${q.status === 'pagada' ? 'Gracias por confiar en RAKÜN.' : 'Ya empezamos a trabajar en tu proyecto.'}</p></div><a class="cq__btn cq__btn--line" href="portal.html">Entrar a mi portal →</a></div>`;
  } else if (q.status === 'borrador') {
    action = '<div class="cq__go cq__go--muted"><div><p class="mono cq__go-k">Borrador · vista previa del equipo</p><p class="cq__go-p">El cliente aún no la ve. Envíala desde el gestor.</p></div></div>';
  } else if (q.status === 'rechazada') {
    action = '<div class="cq__go cq__go--muted"><div><p class="mono cq__go-k">Esta cotización ya no está activa</p></div></div>';
  }

  box.innerHTML = `
  <div class="cq__tools"><span class="mono">Cotización ${esc(q.number)}</span><button class="cq__btn cq__btn--line" type="button" data-print>Descargar PDF</button></div>
  <article class="cq__sheet">
    ${q.status === 'anticipo' || q.status === 'pagada' ? `<p class="cq__stamp">${q.status === 'pagada' ? 'Pagada' : 'Anticipo pagado'}</p>` : ''}
    <header class="cq__top">
      <div><p class="cq__brand">RAKÜN</p><p class="mono cq__legal">${esc([rc.legal, rc.nit && `NIT ${rc.nit}`, rc.city].filter(Boolean).join(' · '))}</p></div>
      <div class="cq__num"><p class="mono">Cotización</p><p class="cq__n">${esc(q.number)}</p><p class="mono">${date(q.sent_at || q.created_at, { day: 'numeric', month: 'short', year: 'numeric' })} · válida hasta el ${date(until, { day: 'numeric', month: 'short' })}</p></div>
    </header>
    <div class="cq__who">
      <div><p class="mono">Para</p><p><b>${esc(client.company || client.name || '')}</b>${client.company ? `<br>${esc(client.name)}` : ''}${client.email ? ` · ${esc(client.email)}` : ''}</p></div>
      <div><p class="mono">Proyecto</p><p>${esc(q.title)}${q.owner?.name ? `<br><span class="cq__soft">Te atiende: ${esc(q.owner.name)}</span>` : ''}</p></div>
    </div>
    ${action}
    ${q.blocks.filter((b) => b.lines.length).map((b) => `
    <section class="cq__blk">
      <h2 class="mono"><i style="background:${WORLD_HEX[b.world]}"></i>${esc(b.title)} · ${BILLING[b.world].toLowerCase()}<span>${money(blockTotal(b))}</span></h2>
      ${b.world === 'produccion' && b.meta ? `<p class="cq__meta">${esc([b.meta.tipo, b.meta.dias ? `${b.meta.dias} ${Number(b.meta.dias) === 1 ? 'día' : 'días'} de rodaje` : '', b.meta.duracion && `duración final ${b.meta.duracion}`, b.meta.ciudad].filter(Boolean).join(' · '))}</p>` : ''}
      ${lines(b)}
    </section>`).join('')}
    <div class="cq__end">
      <div>
        <p class="mono cq__soft">Plan de pagos</p>
        ${t.parts.map((p, i) => `<p class="cq__part"><span>${i + 1} · ${partLabel(i, t.parts.length)} · ${p.pct} %</span><span class="mono">${money(p.amount)}</span></p>`).join('')}
        ${t.monthly ? `<p class="cq__small">Desde el mes 2, Redes: ${cop(t.monthly)}${q.iva ? ' + IVA' : ''} por mes.</p>` : ''}
        ${q.note ? `<p class="cq__small cq__note">${esc(q.note)}</p>` : ''}
      </div>
      <div class="cq__totals">
        <p><span>Subtotal</span><span class="mono">${money(t.sum)}</span></p>
        ${t.discount ? `<p class="cq__disc"><span>Descuento</span><span class="mono">−${money(t.discount)}</span></p>` : ''}
        ${q.iva ? `<p><span>IVA 19 %</span><span class="mono">${money(t.iva)}</span></p>` : ''}
        <p class="cq__total"><span class="mono">Total</span><b>${money(t.total)}</b></p>
      </div>
    </div>
    ${rc.terms ? `<p class="cq__terms">${esc(rc.terms)}</p>` : ''}
    <footer class="cq__foot"><span class="mono">¿Dudas? Escríbenos antes de aceptar.</span>${wa ? `<a class="mono" href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}</footer>
  </article>`;

  $('[data-print]', box).addEventListener('click', () => window.print());
  $('[data-accept]', box)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const msg = $('[data-msg]', box);
    btn.disabled = true;
    msg.textContent = 'Aceptando…';
    const { data, error } = await sb.rpc('quote_accept', { t: token });
    if (error) { msg.textContent = errorText(error); btn.disabled = false; return; }
    // píxel de Meta: el cliente aceptó la cotización (valor = el anticipo)
    if (data === 'aceptada') window.rkTrack?.('SubmitApplication', { content_name: q.number, value: Math.round(t.parts[0].amount), currency: 'COP' });
    if (data !== 'aceptada') msg.textContent = data === 'vencida' ? 'Esta cotización ya venció. Escríbenos y te la actualizamos.' : `Esta cotización está ${data}.`;
    load();
  });
}

load();
