/* ==========================================================================
   RAKÜN · ubicación con dos listas: departamento → ciudad
   Nadie escribe la ciudad a mano. "Fuera de Colombia" cambia la segunda
   lista por países. El valor ("Pereira, Risaralda" o "Ecuador") queda en un
   campo oculto con el `name` del formulario, así el resto del código no cambia.
   ========================================================================== */
import { COLOMBIA } from './colombia.js';

const ABROAD = 'Fuera de Colombia';
const COUNTRIES = ['Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Costa Rica', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos',
  'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 'República Dominicana', 'Uruguay', 'Venezuela', 'Otro país'];
const DEPS = new Map(COLOMBIA);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const opts = (list, first) => `<option value="">${first}</option>` + list.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');

/** "Pereira, Risaralda" → { dep: 'Risaralda', city: 'Pereira' }; "Ecuador" → { dep: ABROAD, city: 'Ecuador' } */
function parse(value) {
  const v = String(value || '').trim();
  if (!v) return null;
  const i = v.lastIndexOf(', ');
  if (i > 0 && DEPS.get(v.slice(i + 2))?.includes(v.slice(0, i))) return { dep: v.slice(i + 2), city: v.slice(0, i) };
  if (v === 'Bogotá' || v === 'Bogotá D.C.') return { dep: 'Bogotá D.C.', city: 'Bogotá' };
  if (COUNTRIES.includes(v)) return { dep: ABROAD, city: v };
  return null;
}

/**
 * Pone las dos listas dentro de `host`.
 * @param {HTMLElement} host
 * @param {{ name: string, value?: string, required?: boolean, selectClass?: string }} o
 * @returns {{ dep: HTMLSelectElement, city: HTMLSelectElement, input: HTMLInputElement }}
 */
export function mountLocation(host, { name, value = '', required = false, selectClass = '' }) {
  const req = required ? ' required' : '';
  host.innerHTML = `
    <select class="${selectClass}" data-loc-dep aria-label="Departamento"${req}>${opts([...DEPS.keys(), ABROAD], 'Departamento')}</select>
    <select class="${selectClass}" data-loc-city aria-label="Ciudad"${req} disabled>${opts([], 'Ciudad')}</select>
    <input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
  const dep = host.querySelector('[data-loc-dep]');
  const city = host.querySelector('[data-loc-city]');
  const input = host.querySelector('input[type="hidden"]');

  const fillCities = () => {
    const abroad = dep.value === ABROAD;
    city.innerHTML = opts(abroad ? COUNTRIES : DEPS.get(dep.value) || [], abroad ? 'País' : 'Ciudad');
    city.setAttribute('aria-label', abroad ? 'País' : 'Ciudad');
    city.disabled = !dep.value;
    // Bogotá D.C. solo tiene una ciudad: queda elegida sola
    if (DEPS.get(dep.value)?.length === 1) city.value = DEPS.get(dep.value)[0];
  };
  const sync = () => {
    if (!dep.value || !city.value) { input.value = ''; return; }
    input.value = dep.value === ABROAD ? city.value : `${city.value}, ${dep.value}`;
  };
  dep.addEventListener('change', () => { fillCities(); sync(); if (!city.disabled && !city.value) city.focus(); });
  city.addEventListener('change', sync);

  // valor guardado antes (al editar). Si era texto libre viejo, se conserva hasta que lo cambien.
  const start = parse(value);
  if (start) { dep.value = start.dep; fillCities(); city.value = start.city; sync(); }

  // al limpiar el formulario, las listas vuelven a empezar
  host.closest('form')?.addEventListener('reset', () => setTimeout(() => { dep.value = ''; fillCities(); input.value = ''; }));
  return { dep, city, input };
}
