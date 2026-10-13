/* ==========================================================================
   RAKÜN · cotizaciones: de dónde salen las líneas
   Redes: planes, cambios al plan, carta del club, librería.
   Web: planes de web, carta del club (página de citas…), sugeridos.
   Producción: tarifas base (se editan en el gestor 09 → Producción).
   Todo lee lo publicado en el gestor 09; si no hay nada, usa planes/data.js.
   ========================================================================== */
import { REDES, WEB, PIECES, priceInCarta, isRedes } from '../planes/data.js';
import { loadCatalog } from './catalog.js';

// Tarifas base de producción: [nombre, etapa, unidad, precio]. El precio en 0 se llena al cotizar.
export const BASE_RATES = {
  rates: [
    ['Guion o escaleta', 'Preproducción', 'proyecto', 0],
    ['Dirección de arte', 'Preproducción', 'proyecto', 0],
    ['Casting', 'Preproducción', 'proyecto', 0],
    ['Scouting de locaciones', 'Preproducción', 'día', 0],
    ['Director', 'Rodaje', 'día', 0],
    ['Director de fotografía', 'Rodaje', 'día', 0],
    ['Camarógrafo', 'Rodaje', 'día', 0],
    ['Sonidista', 'Rodaje', 'día', 0],
    ['Gaffer / luces', 'Rodaje', 'día', 0],
    ['Asistente de producción', 'Rodaje', 'día', 0],
    ['Maquillaje y vestuario', 'Rodaje', 'día', 0],
    ['Cámara cine + óptica', 'Equipos', 'día', 0],
    ['Kit de luces', 'Equipos', 'día', 0],
    ['Dron', 'Equipos', 'día', 0],
    ['Montaje', 'Postproducción', 'proyecto', 0],
    ['Colorización', 'Postproducción', 'proyecto', 0],
    ['Diseño sonoro y mezcla', 'Postproducción', 'proyecto', 0],
    ['Motion graphics', 'Postproducción', 'proyecto', 0],
    ['Música licenciada', 'Postproducción', 'tema', 0],
    ['Transporte', 'Logística', 'día', 0],
    ['Alimentación del equipo', 'Logística', 'día', 0],
    ['Alquiler de locación', 'Logística', 'día', 0],
  ],
};

// Datos que salen en el recibo (gestor 09 → Recibo).
export const BASE_RECIBO = {
  legal: 'RAKÜN Visual Design',
  nit: '',
  city: 'Manizales, Colombia',
  whatsapp: '',
  payInfo: 'Transferencia a la cuenta que te compartimos por WhatsApp. Envíanos el comprobante y lo registramos.',
  terms: 'Precios en pesos colombianos. Sin permanencia en Redes: cancelas avisando antes del siguiente ciclo de pago.',
};

const WEB_EXTRAS = [
  ['Página interna adicional', 'Una sección más del sitio, con su diseño.', 'página'],
  ['Hosting y dominio · 1 año', '', 'año'],
  ['Mantenimiento mensual', 'Actualizaciones, copias de seguridad y cambios pequeños.', 'mes'],
  ['Textos de la página (copywriting)', '', 'proyecto'],
  ['Fotos de producto o del equipo', '', 'sesión'],
];

export const PROD_TYPES = ['Videoclip', 'Comercial', 'Documental', 'Cortometraje', 'Video institucional', 'Evento', 'Podcast', 'Otro'];

const n = (v) => (typeof v === 'number' ? v : Number(String(v || '').replace(/\D/g, '')) || 0);

/** Carga todo lo publicado una vez y arma las listas para el selector de cada bloque. */
export async function loadSources() {
  const [m, w, p, r] = await Promise.all(['marca', 'web', 'produccion', 'recibo'].map(loadCatalog));
  const redes = isRedes(m) ? { ...REDES, ...m } : REDES;
  const web = w?.plans ? w : WEB;
  const prod = Array.isArray(p?.rates) ? p : BASE_RATES;
  const recibo = { ...BASE_RECIBO, ...(r || {}) };

  const carta = redes.carta.flatMap((g) => g.items.filter((it) => !it[4]).map(([name, unit, price, desc]) => ({
    group: g.name, name, detail: desc, unit: unit.replace(/^por /i, '').toLowerCase(), price: n(price), source: 'carta',
  })));
  const plans = redes.cats.flatMap((c) => c.plans.filter((pl) => !pl.hidden).flatMap((pl) => {
    const rows = (pl.rows || []).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(' · ');
    return [
      { group: c.name, name: `${c.name} · ${pl.name} · solo edición`, detail: rows, unit: 'mes', price: n(pl.ed), source: 'plan' },
      { group: c.name, name: `${c.name} · ${pl.name} · con grabación`, detail: `${rows} · ${pl.recText || 'grabación incluida'}`, unit: 'mes', price: n(pl.rec), source: 'plan' },
    ];
  }));
  const changes = Object.values(PIECES).map((pc) => {
    const c = priceInCarta(redes, pc.item);
    return c && { group: 'Piezas sueltas', name: `${pc.item} adicional`, detail: '', unit: c.unit.replace(/^por /i, '').toLowerCase(), price: n(c.price), source: 'cambio' };
  }).filter(Boolean);
  const library = redes.library.flatMap((g) => g.formats.map(([name, desc, piece]) => {
    const c = PIECES[piece] && priceInCarta(redes, PIECES[piece].item);
    return { group: g.title, name, detail: desc, unit: c ? c.unit.replace(/^por /i, '').toLowerCase() : 'video', price: c ? n(c.price) : 0, source: 'libreria' };
  }));
  const webPlans = web.plans.filter((pl) => !pl.hidden).map((pl) => ({
    group: 'Planes de web', name: pl.name, detail: (pl.list || []).join(' · '), unit: 'proyecto', price: n(pl.price), source: 'plan',
  }));
  const webExtras = WEB_EXTRAS.map(([name, detail, unit]) => ({ group: 'Sugeridos', name, detail, unit, price: 0, source: 'libre' }));
  const rates = prod.rates.map(([name, stage, unit, price]) => ({ group: stage, name, detail: '', unit, price: n(price), source: stage }));

  return {
    recibo,
    tabs: {
      marca: [['Planes', plans], ['Cambios al plan', changes], ['Carta del club', carta], ['Librería', library]],
      web: [['Planes de web', webPlans], ['Carta del club', carta], ['Sugeridos', webExtras]],
      produccion: [['Tarifas base', rates], ['Carta del club', carta]],
    },
  };
}

/* ---------- Plantillas de entregables al crear un proyecto ---------- */
// [título, tipo, días desde el inicio]
export const TEMPLATES = {
  marca: [
    ['Estrategia y parrilla del mes', 'estrategia', 5],
    ['Guiones del mes', 'guion', 9],
    ['Sesión de grabación', 'grabacion', 13],
    ['Ediciones del mes', 'edicion', 22],
    ['Publicación y reporte del mes', 'otro', 30],
  ],
  web: [
    ['Estructura y textos', 'estrategia', 6],
    ['Wireframe', 'diseno', 10],
    ['Diseño de la página', 'diseno', 16],
    ['Desarrollo', 'desarrollo', 28],
    ['Pruebas y lanzamiento', 'desarrollo', 35],
  ],
  produccion: [
    ['Guion', 'guion', 5],
    ['Preproducción (plan de rodaje)', 'estrategia', 12],
    ['Rodaje', 'grabacion', 20],
    ['Montaje', 'edicion', 30],
    ['Color y sonido', 'edicion', 36],
    ['Entrega final', 'otro', 40],
  ],
};

export const KINDS = {
  estrategia: 'Estrategia', guion: 'Guion', grabacion: 'Grabación', edicion: 'Edición',
  diseno: 'Diseño', desarrollo: 'Desarrollo', revision: 'Revisión', otro: 'Otro',
};
export const DSTATUS = [
  ['por_hacer', 'Por hacer', 'var(--mist)'], ['en_curso', 'En curso', 'var(--blue)'],
  ['en_revision', 'En revisión', 'var(--yellow)'], ['aprobado', 'Aprobado', 'var(--navy)'],
];
