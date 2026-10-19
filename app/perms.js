/* ==========================================================================
   RAKÜN · permisos del gestor (la misma regla que public.can en la fase 10)
   profiles.perms = { <sección>: 'ver' | 'editar', dinero: 'ver' }
   · admin: todo · perms vacío (null): todo, como antes · si no, solo lo marcado
   ========================================================================== */
export const SECTIONS = [
  ['pendientes', '00', 'Mis pendientes'], ['solicitudes', '01', 'Solicitudes'], ['clientes', '02', 'Clientes'],
  ['proyectos', '03', 'Proyectos'], ['parrillas', '04', 'Parrillas'], ['grabaciones', '05', 'Grabaciones'],
  ['reuniones', '06', 'Reuniones'], ['documentos', '07', 'Documentos'], ['trabajo', '08', 'Nuestro trabajo'],
  ['planes', '09', 'Planes y precios'], ['equipo', '10', 'Equipo'], ['metricas', '11', 'Métricas'], ['tarifario', '12', 'Tarifario'],
];

// roles listos (el admin los ajusta persona por persona)
const E = 'editar'; const V = 'ver';
export const PRESETS = {
  todo: { name: 'Todo (como admin, sin cambiar permisos)', perms: null },
  directora: { name: 'Directora', perms: { pendientes: E, proyectos: E, parrillas: E, grabaciones: E, reuniones: E, documentos: E, equipo: V } },
  manager: { name: 'Manager comercial', perms: { pendientes: E, solicitudes: E, clientes: E, proyectos: E, metricas: V, tarifario: V, equipo: V, dinero: V } },
  editor: { name: 'Editor/a', perms: { pendientes: E, equipo: V } },
  camara: { name: 'Cámara', perms: { pendientes: E, grabaciones: V, equipo: V } },
};

export function can(me, section, edit = false) {
  if (!me) return false;
  if (me.role === 'admin') return true;
  if (me.role !== 'equipo') return false;
  if (section === 'pendientes') return true;               // cada quien siempre ve lo suyo
  if (!me.perms) return true;
  const p = me.perms[section];
  return edit ? p === 'editar' : p === 'ver' || p === 'editar';
}
export const seesMoney = (me) => me?.role === 'admin' || (me?.role === 'equipo' && (!me.perms || me.perms.dinero === 'ver'));

/** El rol listo que coincide con estos permisos (o 'personalizado'). */
export function presetOf(perms) {
  const key = (p) => JSON.stringify(Object.entries(p || {}).sort());
  return Object.entries(PRESETS).find(([, v]) => (v.perms === null ? perms == null : key(v.perms) === key(perms)))?.[0] || 'personalizado';
}
