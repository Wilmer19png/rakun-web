/* RAKÜN · listas compartidas por el gestor y el portal */

// Etapas de cada tipo de proyecto (el cliente las ve en su portal)
export const STAGES = {
  marca: ['Estrategia', 'Guiones', 'Grabación', 'Edición', 'Revisión', 'Publicación'],
  produccion: ['Preproducción', 'Rodaje', 'Postproducción'],
  web: ['Brief', 'Wireframe', 'Diseño', 'Desarrollo', 'Pruebas', 'Lanzamiento'],
};

export const WORLD_NAME = { marca: 'Marca personal', produccion: 'Producción', web: 'Web y apps' };
export const WORLD_COLOR = { marca: 'var(--yellow)', produccion: 'var(--blue)', web: 'var(--pink)' };

// Redes donde se publica una pieza: clave corta, nombre, color de la etiqueta
export const NETWORKS = [
  ['IG', 'Instagram', '#E1306C'], ['FB', 'Facebook', '#1877F2'], ['TT', 'TikTok', '#010221'], ['YT', 'YouTube', '#FF0000'],
  ['IN', 'LinkedIn', '#0A66C2'], ['X', 'X', '#3C3A5C'], ['PI', 'Pinterest', '#BD081C'], ['TH', 'Threads', '#1B1A35'],
];
export const netInfo = (k) => NETWORKS.find((n) => n[0] === k) || [k, k, '#3C3A5C'];

export const FORMATS = {
  reel: ['Reel', '#FF2C68'], carrusel: ['Carrusel', '#2BCDFF'], historias: ['Historias', '#FFF02B'],
  anuncio: ['Anuncio', '#8B6CF0'], video_largo: ['Video largo', '#3C3A5C'], post: ['Post', '#C3C0DD'],
};

// Estados de una pieza: [clave, nombre, color, ¿lo ve el cliente?]
export const POST_STATUS = [
  ['borrador', 'Borrador', '#C3C0DD', false],
  ['lista', 'Lista · sin enviar', '#FFF02B', false],
  ['por_aprobar', 'Por aprobar', '#FF2C68', true],
  ['cambios', 'Cambios pedidos', '#FF8A3D', true],
  ['aprobada', 'Aprobada', '#3C8C6E', true],
  ['programada', 'Programada', '#1B1A35', true],
  ['publicada', 'Publicada', '#1B1A35', true],
];
export const statusInfo = (k) => POST_STATUS.find((s) => s[0] === k) || POST_STATUS[0];

/* ---------- calendario ---------- */
export const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const monthLabel = (d) => d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Celdas del mes empezando en lunes: [{ date: Date | null }] (35 o 42) */
export function monthCells(start) {
  const lead = (start.getDay() + 6) % 7;
  const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const n = i - lead + 1;
    return { date: n >= 1 && n <= days ? new Date(start.getFullYear(), start.getMonth(), n) : null };
  });
}
