/* ==========================================================================
   RAKÜN · buscador de lugares para las grabaciones
   Usa Photon (photon.komoot.io), un buscador gratuito basado en OpenStreetMap:
   no necesita clave ni tarjeta. Encuentra muy bien lugares con nombre
   (clínicas, estudios, edificios, barrios); la dirección se puede ajustar a mano.
   ========================================================================== */
import { $, $$, esc } from './util.js';

const API = 'https://photon.komoot.io/api/';
const NEAR = { lat: 5.5, lon: -74.5 };          // centro de Colombia: prioriza resultados de aquí

const mapLink = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** Convierte un resultado de Photon en { name, address } legibles */
function toPlace(f) {
  const p = f.properties || {};
  const street = [p.street, p.housenumber].filter(Boolean).join(' ');
  const zone = [p.locality || p.district, p.city || p.county, p.state].filter(Boolean);
  const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const unique = [];
  [street, ...zone].filter(Boolean).forEach((s) => {
    if (unique.some((u) => fold(u) === fold(s))) return;
    // "Bogotá" + "Bogotá, Distrito Capital" → solo la segunda
    const i = unique.findIndex((u) => fold(s).startsWith(fold(u) + ','));
    if (i >= 0) unique[i] = s; else unique.push(s);
  });
  return { name: p.name || street || p.city || '', address: unique.join(', ') + (p.country && p.country !== 'Colombia' ? `, ${p.country}` : '') };
}

async function search(q, signal) {
  const url = `${API}?q=${encodeURIComponent(q)}&limit=8&lang=default&lat=${NEAR.lat}&lon=${NEAR.lon}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  // primero lo de Colombia; sin repetidos
  const feats = (data.features || []).sort((a, b) => (a.properties?.countrycode === 'CO' ? 0 : 1) - (b.properties?.countrycode === 'CO' ? 0 : 1));
  const seen = new Set();
  return feats.map(toPlace).filter((p) => {
    const k = `${p.name}|${p.address}`.toLowerCase();
    if (!(p.name || p.address) || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);
}

/**
 * Conecta los campos "Lugar" y "Dirección" de un formulario.
 * @param {HTMLInputElement} nameInput   campo del nombre del lugar
 * @param {HTMLInputElement} addrInput   campo de la dirección
 * @param {{name:string,address:string}[]} previous lugares usados antes
 */
export function attachPlacePicker(nameInput, addrInput, previous = []) {
  const wrap = document.createElement('div');
  wrap.className = 'pl-pick';
  wrap.innerHTML = `
    ${previous.length ? `<p class="mono pl-pick__k">Lugares anteriores</p><div class="pl-pick__prev">${previous.slice(0, 8).map((p, i) => `<button type="button" class="pl-pick__chip" data-prev="${i}" title="${esc(p.address || '')}">${esc(p.name || p.address)}</button>`).join('')}</div>` : ''}
    <ul class="pl-pick__list" role="listbox" hidden></ul>
    <a class="pl-pick__map mono" target="_blank" rel="noopener" hidden>Ver en el mapa ↗</a>`;
  addrInput.closest('.gx__f').after(wrap);
  const list = $('.pl-pick__list', wrap);
  const map = $('.pl-pick__map', wrap);
  let ctrl = null, timer = null, items = [], active = -1;

  const syncMap = () => {
    const q = [nameInput.value, addrInput.value].map((v) => v.trim()).filter(Boolean).join(', ');
    map.hidden = !q;
    if (q) map.href = mapLink(q);
  };
  const choose = (p) => {
    if (p.name) nameInput.value = p.name;
    addrInput.value = p.address || addrInput.value;
    list.hidden = true;
    items = [];
    syncMap();
  };
  const paint = () => {
    list.innerHTML = items.map((p, i) => `<li role="option" aria-selected="${i === active}" data-i="${i}"><b>${esc(p.name)}</b><span>${esc(p.address)}</span></li>`).join('')
      + '<li class="pl-pick__credit" aria-hidden="true">Datos © OpenStreetMap</li>';
    list.hidden = !items.length;
    $$('[data-i]', list).forEach((li) => li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(items[Number(li.dataset.i)]); }));
  };

  const lookup = (q) => {
    clearTimeout(timer);
    if (q.trim().length < 4) { items = []; paint(); return; }
    timer = setTimeout(async () => {
      ctrl?.abort();
      ctrl = new AbortController();
      try { items = await search(q, ctrl.signal); active = -1; paint(); } catch { /* sin conexión: se escribe a mano */ }
    }, 350);
  };
  [nameInput, addrInput].forEach((input) => {
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', () => { lookup([nameInput.value, addrInput.value].filter(Boolean).join(' ')); syncMap(); });
    input.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        paint();
      } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(items[active]); }
      else if (e.key === 'Escape') { e.stopPropagation(); list.hidden = true; }
    });
    input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 150));
  });
  $$('[data-prev]', wrap).forEach((b) => b.addEventListener('click', () => {
    const p = previous[Number(b.dataset.prev)];
    nameInput.value = p.name || '';
    addrInput.value = p.address || '';
    syncMap();
  }));
  syncMap();
}
