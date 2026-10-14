/* ==========================================================================
   RAKÜN · gestor · 08 Nuestro trabajo
   Los proyectos que se ven en la página: Inicio (franjas, reels, identidades,
   webs), «Todos los proyectos», la página de cada proyecto y el botón de la
   videoteca. Todo se guarda en la tabla works (supabase/fase6.sql) y los
   archivos en la carpeta pública «trabajo».
   - Las imágenes se achican a WebP antes de subir.
   - El PDF de un manual se convierte en una imagen por página, aquí mismo.
   ========================================================================== */
import { $, $$, esc, safeUrl } from './util.js';
import { errorText } from './supa.js';

const BUCKET = 'trabajo';
const KINDS = [
  ['video', 'Video horizontal', 'Videoclip, documental, comercial…', 'var(--blue)'],
  ['reel', 'Reel vertical', 'Hasta 3 videos verticales del mismo cliente.', 'var(--yellow)'],
  ['identidad', 'Identidad', 'Sube el PDF del manual y se arma la página.', 'var(--pink)'],
  ['web', 'Página web', 'Video de presentación y enlace del sitio.', 'var(--mist)'],
];
const KIND = Object.fromEntries(KINDS.map(([k, n, , c]) => [k, [n, c]]));
const VIDEO_CATS = [['videoclip', 'Videoclip'], ['corto', 'Cortometraje'], ['documental', 'Documental'], ['magazine', 'Magazine'], ['podcast', 'Podcast'], ['comercial', 'Comercial'], ['otro', 'Otro']];
const CAT_NAME = Object.fromEntries(VIDEO_CATS);
const DID = ['Dirección', 'Guion', 'Foto', 'Cámara', 'Sonido', 'Arte', 'Post', 'Color', 'Estrategia', 'Edición', 'Concepto', 'Logo', 'Manual', 'Diseño UI', 'Desarrollo'];
const MAX_VIDEO = 50 * 1024 * 1024;
const HEAVY_VIDEO = 8 * 1024 * 1024;

const ytId = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,20}$/.test(s) ? s : null;
};
const slugify = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'proyecto';
const mb = (n) => `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
const thumbOf = (w) => (/^assets\//.test(w.cover_url || '') ? w.cover_url : safeUrl(w.cover_url)) || (w.youtube_id ? `https://i.ytimg.com/vi/${w.youtube_id}/hqdefault.jpg` : '');

/* ---------- archivos ---------- */
function publicUrl(sb, path) { return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl; }
function pathOf(url) { const i = String(url || '').indexOf(`/object/public/${BUCKET}/`); return i < 0 ? null : decodeURIComponent(url.slice(i + BUCKET.length + 16)); }
async function removeFiles(sb, urls) {
  const paths = urls.map(pathOf).filter(Boolean);
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
}
async function put(sb, folder, blob, name) {
  const clean = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(-60);
  const path = `${folder}/${Date.now().toString(36)}-${clean}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || undefined, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return publicUrl(sb, path);
}
/** Los errores de subida más comunes, en palabras. */
function uploadError(err) {
  const m = String(err?.message || err || '');
  if (/bucket not found/i.test(m)) return 'No existe la carpeta «trabajo» en Supabase: corre supabase/fase6.sql.';
  if (/row-level security|unauthorized|403/i.test(m)) return 'Supabase no te dejó subirlo: cierra sesión, vuelve a entrar al gestor e inténtalo otra vez.';
  if (/exceeded|too large|413|payload/i.test(m)) return 'El archivo supera el límite de Supabase (50 MB).';
  if (/mime|not supported|415/i.test(m)) return 'Supabase no acepta este tipo de archivo. Expórtalo como MP4 (videos) o JPG/PNG (imágenes).';
  if (/fetch|network/i.test(m)) return 'Se cortó la conexión mientras subía. Revisa el internet e inténtalo de nuevo.';
  return `No se pudo subir: ${errorText(err)}`;
}
/** Imagen → WebP de máximo `max` px de ancho (los GIF se suben tal cual). */
async function shrink(file, max = 2000) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.85));
  return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }) : file;
}
/** PDF → una imagen WebP por página (con pdf.js, que se descarga solo aquí). */
async function pdfToImages(file, onPage) {
  const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: 1600 / base.width });
    const c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
    out.push(blob);
    onPage?.(i, doc.numPages, blob);
  }
  return out;
}

/* ==========================================================================
   La lista
   ========================================================================== */
export async function viewWork(ctx, opts = {}) {
  if (opts.edit) return editWork(ctx, opts.edit);
  const { sb, main, head, loading, fail } = ctx;
  loading();
  const { data, error } = await sb.from('works').select('*').order('sort').order('created_at', { ascending: false });
  if (error) {
    main.innerHTML = head('08', 'Lo que se ve en la página', 'Nuestro trabajo');
    fail(/works|relation|schema cache/i.test(error.message) ? new Error('Falta activar esta sección: en Supabase → SQL Editor, corre supabase/fase6.sql (ver LEEME).') : error);
    return;
  }
  const works = data;
  const filter = opts.kind || '';
  const list = works.filter((w) => !filter || w.kind === filter);
  const featured = works.filter((w) => w.kind === 'video' && w.featured && w.status === 'publicado').length;

  main.innerHTML = head('08', 'Lo que se ve en la página', 'Nuestro trabajo', '<button class="gx__btn gx__btn--hot" type="button" data-new>+ Agregar proyecto</button>') + `
    <div class="gx__wk-bar">
      ${[['', 'Todos'], ...KINDS.map(([k, n]) => [k, n])].map(([k, n]) => `<button class="gx__chip${filter === k ? ' is-on' : ''}" type="button" data-kind="${k}">${esc(n)} <span class="gx__count">${works.filter((w) => !k || w.kind === k).length}</span></button>`).join('')}
      <span class="gx__wk-star mono">★ En el Inicio: ${featured} de 4</span>
    </div>
    <div class="gx__table">
      <div class="gx__tr gx__tr--h gx__tr--wk"><span>Orden</span><span>Imagen</span><span>Proyecto</span><span>Tipo</span><span>Estado</span><span>Inicio</span><span>Videoteca</span><span></span></div>
      ${list.map((w) => `
        <div class="gx__tr gx__tr--wk" data-id="${w.id}">
          <span class="gx__wk-ord"><button class="gx__mini" type="button" data-move="-1" aria-label="Subir">↑</button><button class="gx__mini" type="button" data-move="1" aria-label="Bajar">↓</button></span>
          <span class="gx__wk-thumb${w.kind === 'reel' ? ' is-v' : ''}">${thumbOf(w) ? `<img src="${esc(thumbOf(w))}" alt="" loading="lazy">` : (w.palette?.length ? `<span class="gx__wk-tpal">${w.palette.slice(0, 3).map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span>` : '')}</span>
          <span><b>${esc(w.title)}</b><br><small>${esc([w.client, w.year, w.kind === 'video' ? CAT_NAME[w.category] : ''].filter(Boolean).join(' · '))}</small></span>
          <span><span class="mono gx__tag" style="background:${KIND[w.kind][1]}">${esc(KIND[w.kind][0])}</span></span>
          <span><button class="gx__chip gx__chip--sm${w.status === 'publicado' ? ' is-on' : ''}" type="button" data-pub>${w.status === 'publicado' ? '● Publicado' : '○ Borrador'}</button></span>
          <span>${w.kind === 'video' ? `<button class="gx__wk-fav${w.featured ? ' is-on' : ''}" type="button" data-fav aria-pressed="${w.featured}" aria-label="${w.featured ? 'Quitar del Inicio' : 'Poner en el Inicio'}">${w.featured ? '★' : '☆'}</button>` : '<small>No aplica</small>'}</span>
          <span>${w.kind === 'video' ? `<label class="gx__check"><input type="checkbox" data-vtk${w.in_videoteca ? ' checked' : ''}><span>${w.in_videoteca ? 'Sí' : 'No'}</span></label>` : '<small>No aplica</small>'}</span>
          <span class="gx__row-actions"><button class="gx__btn" type="button" data-edit>Editar</button>${w.status === 'publicado' ? `<a class="gx__btn" href="${w.kind === 'reel' ? 'trabajo.html#reel' : `proyecto.html?p=${encodeURIComponent(w.slug)}`}" target="_blank" rel="noopener">Ver ↗</a>` : ''}</span>
        </div>`).join('') || '<p class="gx__empty">Todavía no hay proyectos. Agrega el primero.</p>'}
    </div>
    <p class="mono gx__saved" data-saved aria-live="polite"></p>
    <p class="gx__p gx__wk-help">Lo publicado aparece solo en «Todos los proyectos». La ★ lo pone también en las franjas del Inicio (máximo 4 videos). «Videoteca» agrega el botón «Ver el proyecto completo» al casete de ese video en Producción.</p>`;

  const saved = $('[data-saved]', main);
  const update = async (id, patch, msg = '✓ Guardado') => {
    saved.textContent = 'Guardando…';
    const { error: e } = await sb.from('works').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    saved.textContent = e ? errorText(e) : msg;
    return !e;
  };
  $('[data-new]', main).addEventListener('click', () => ctx.go('trabajo', { edit: 'new' }));
  $$('[data-kind]', main).forEach((b) => b.addEventListener('click', () => viewWork(ctx, { kind: b.dataset.kind })));
  $$('[data-id]', main).forEach((row) => {
    const w = works.find((x) => x.id === row.dataset.id);
    $('[data-edit]', row).addEventListener('click', () => ctx.go('trabajo', { edit: w.id }));
    $('[data-pub]', row).addEventListener('click', async () => {
      if (await update(w.id, { status: w.status === 'publicado' ? 'borrador' : 'publicado' })) viewWork(ctx, opts);
    });
    $('[data-fav]', row)?.addEventListener('click', async () => {
      if (!w.featured && featured >= 4) { saved.textContent = 'Ya hay 4 en el Inicio: quita la ★ de otro primero.'; return; }
      if (await update(w.id, { featured: !w.featured })) viewWork(ctx, opts);
    });
    $('[data-vtk]', row)?.addEventListener('change', async (e) => {
      if (await update(w.id, { in_videoteca: e.target.checked })) e.target.nextElementSibling.textContent = e.target.checked ? 'Sí' : 'No';
    });
    $$('[data-move]', row).forEach((b) => b.addEventListener('click', async () => {
      const i = works.indexOf(w);
      const j = i + Number(b.dataset.move);
      if (j < 0 || j >= works.length) return;
      const order = works.slice();
      [order[i], order[j]] = [order[j], order[i]];
      saved.textContent = 'Guardando…';
      const changes = order.map((x, k) => (x.sort !== k + 1 ? sb.from('works').update({ sort: k + 1 }).eq('id', x.id) : null)).filter(Boolean);
      const res = await Promise.all(changes);
      const bad = res.find((r) => r.error);
      if (bad) { saved.textContent = errorText(bad.error); return; }
      viewWork(ctx, opts);
    }));
  });
}

/* ==========================================================================
   Agregar / editar
   ========================================================================== */
async function editWork(ctx, id) {
  const { sb, main, loading, fail, go } = ctx;
  loading();
  let w = {
    kind: 'video', category: 'videoclip', status: 'borrador', featured: false, in_videoteca: true,
    pieces: [], bts: [], pages: [], reels: [], palette: [],
  };
  if (id !== 'new') {
    const { data, error } = await sb.from('works').select('*').eq('id', id).single();
    if (error) { main.innerHTML = ''; fail(error); return; }
    w = { ...w, ...data };
  }
  const isNew = id === 'new';
  const folder = () => slugify(w.slug || $('[name="title"]', main)?.value || 'proyecto');
  const didSet = new Set(String(w.did || '').split('·').map((s) => s.trim()).filter(Boolean));

  const fileBox = (key, label, hint, accept) => `
    <div class="gx__f gx__up" data-up="${key}" data-accept="${accept}">
      <span>${label}</span>
      <div class="gx__drop" data-drop>${w[key] ? `<b>✓ ${/video/.test(accept) ? 'Video subido' : 'Imagen subida'}</b>` : '<span>Arrastra el archivo o toca para elegir</span>'}<small class="mono">${hint}</small><input type="file" accept="${accept}" aria-label="${esc(label)}"></div>
      ${w[key] ? `<span class="gx__up-cur">${/video/.test(accept) ? `<video src="${esc(w[key])}" muted playsinline preload="metadata"></video>` : `<img src="${esc(w[key])}" alt="">`}<button class="gx__mini" type="button" data-clear="${key}" aria-label="Quitar">✕</button></span>` : ''}
    </div>`;
  const gallery = (key, label, hint) => `
    <div class="gx__f gx__up" data-gal="${key}">
      <span>${label}</span>
      <div class="gx__drop" data-drop><span>Arrastra varias imágenes o toca para elegir</span><small class="mono">${hint}</small><input type="file" accept="image/*${key === 'bts' ? ',video/mp4,video/webm' : ''}" multiple aria-label="${esc(label)}"></div>
      <div class="gx__gal">${w[key].map((p, i) => `<figure>${/\.(mp4|webm)(\?|$)/i.test(p.url) ? `<video src="${esc(p.url)}" muted preload="metadata"></video>` : `<img src="${esc(p.url)}" alt="">`}<input value="${esc(p.label || '')}" placeholder="Nombre (opcional)" data-gal-label="${key}:${i}" aria-label="Nombre de la imagen ${i + 1}"><button class="gx__mini" type="button" data-gal-del="${key}:${i}" aria-label="Quitar">✕</button></figure>`).join('')}</div>
    </div>`;

  const draw = () => {
    const k = w.kind;
    main.innerHTML = `
      <header class="gx__head"><div><button class="mono gx__wk-back" type="button" data-back>← Nuestro trabajo</button><h1 class="gx__title">${isNew ? 'Agregar proyecto' : esc(w.title)}</h1></div>
        <div class="gx__actions">${!isNew && w.status === 'publicado' ? `<a class="gx__btn" href="proyecto.html?p=${encodeURIComponent(w.slug)}" target="_blank" rel="noopener">Ver en la página ↗</a>` : ''}</div></header>
      <form class="gx__wk-form" data-form novalidate>
        <fieldset class="gx__fs"><legend class="mono">1 · ¿Qué tipo de proyecto es?</legend>
          <div class="gx__wk-kinds">${KINDS.map(([key, n, d, c]) => `<label class="gx__wk-kind${k === key ? ' is-on' : ''}" style="--c:${c}"><input type="radio" name="kind" value="${key}"${k === key ? ' checked' : ''}><b>${esc(n)}</b><small>${esc(d)}</small></label>`).join('')}</div>
        </fieldset>

        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">2 · Datos</legend>
          <label class="gx__f gx__wk-wide"><span>Título *</span><input name="title" required maxlength="160" value="${esc(w.title || '')}"></label>
          ${k === 'video' ? `<label class="gx__f"><span>Categoría *</span><select name="category">${VIDEO_CATS.map(([v, n]) => `<option value="${v}"${w.category === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}
          <label class="gx__f"><span>${k === 'identidad' ? 'Marca' : k === 'reel' ? 'Perfil (ej. Veterinaria)' : 'Cliente'}</span><input name="client" maxlength="160" value="${esc(w.client || '')}"></label>
          ${k !== 'reel' ? `<label class="gx__f"><span>Año</span><input name="year" type="number" min="1990" max="2100" value="${esc(w.year || '')}"></label>` : ''}
          ${k !== 'reel' ? `<div class="gx__f gx__wk-wide"><span>Qué hicimos</span><div class="gx__wk-did">${DID.map((d) => `<label class="gx__chip gx__chip--sm${didSet.has(d) ? ' is-on' : ''}"><input type="checkbox" name="did" value="${d}"${didSet.has(d) ? ' checked' : ''}>${d}</label>`).join('')}</div></div>` : ''}
          <label class="gx__f gx__wk-wide"><span>Línea corta (la de la franja, las tarjetas y la entrada grande de la portada del proyecto)</span><input name="summary" maxlength="300" value="${esc(w.summary || '')}" placeholder="La crudeza urbana contada sin filtros."></label>
        </fieldset>

        ${k === 'video' ? `
        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">3 · Las escenas (videos de lado a lado)</legend>
          <p class="gx__p gx__wk-wide">La página del proyecto alterna escenas de lado a lado con los textos: escena 1 → «El proyecto» → escena 2 → «La experiencia» → escena 3 → la frase. Cada escena: 8–12 s, horizontal 16:9, sin sonido, MP4 de menos de 4 MB. La que falte, no aparece.</p>
          ${fileBox('frag_url', 'Escena 1 · fragmento principal (va debajo del título)', 'MP4 o WebM · 8–12 s · sin sonido · máx. 4 MB ideal', 'video/*')}
          ${fileBox('frag_v_url', 'Escena 1 · versión vertical para celular (opcional)', 'El mismo fragmento en 4:5 o 9:16', 'video/*')}
          ${fileBox('frag2_url', 'Escena 2 (después de «El proyecto»)', 'El momento más vistoso', 'video/*')}
          ${fileBox('frag3_url', 'Escena 3 (después de «La experiencia»)', 'Otro momento: detrás de cámaras, un plano clave…', 'video/*')}
          ${fileBox('cover_url', 'Foto fija (portada)', 'Si la dejas vacía se usa la miniatura de YouTube', 'image/*')}
          <label class="gx__f gx__wk-wide"><span>Video completo (enlace de YouTube)</span><input name="youtube" value="${esc(w.youtube_id ? `https://youtu.be/${w.youtube_id}` : '')}" placeholder="https://youtu.be/…"><small>Solo se carga si le dan play.</small></label>
        </fieldset>` : ''}

        ${k === 'reel' ? `
        <fieldset class="gx__fs"><legend class="mono">3 · Los reels (hasta 3)</legend>
          <div class="gx__wk-reels">${[0, 1, 2].map((i) => { const r = w.reels[i] || {}; return `
            <div class="gx__wk-reel">
              <p class="mono">Reel ${String(i + 1).padStart(2, '0')}</p>
              <label class="gx__f"><span>Enlace de YouTube (Shorts)</span><input name="reel_yt_${i}" value="${esc(r.yt ? `https://youtube.com/shorts/${r.yt}` : '')}" placeholder="https://youtube.com/shorts/…"></label>
              <label class="gx__f"><span>Nombre</span><input name="reel_label_${i}" value="${esc(r.label || `Reel ${String(i + 1).padStart(2, '0')}`)}"></label>
            </div>`; }).join('')}</div>
        </fieldset>` : ''}

        ${k === 'identidad' ? `
        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">3 · El manual</legend>
          <div class="gx__f gx__up gx__wk-wide" data-pdf>
            <span>PDF del manual de marca</span>
            <div class="gx__drop" data-drop><span>${w.pages.length ? `✓ ${w.pages.length} páginas listas · sube otro PDF para reemplazarlas` : 'Arrastra el PDF o toca para elegir'}</span><small class="mono">Cada página se convierte en imagen aquí mismo (puede tardar un minuto)</small><input type="file" accept="application/pdf" aria-label="PDF del manual"></div>
            <p class="mono gx__saved" data-pdf-msg aria-live="polite"></p>
            ${w.pages.length ? `<div class="gx__gal gx__gal--pages">${w.pages.slice(0, 8).map((p) => `<figure><img src="${esc(p)}" alt=""></figure>`).join('')}${w.pages.length > 8 ? `<figure class="gx__gal-more">+${w.pages.length - 8}</figure>` : ''}</div>` : ''}
          </div>
          ${fileBox('cover_url', 'Imagen para la tarjeta (opcional)', 'Si la dejas vacía se arma con el nombre y la paleta', 'image/*')}
          <div class="gx__f"><span>Paleta (hasta 4 colores)</span><div class="gx__wk-pal">${[0, 1, 2, 3].map((i) => `<input type="color" name="pal_${i}" value="${esc(w.palette[i] || '#ffffff')}" aria-label="Color ${i + 1}"><label class="gx__check"><input type="checkbox" name="pal_on_${i}"${w.palette[i] ? ' checked' : ''}><span>Usar</span></label>`).join('')}</div></div>
        </fieldset>` : ''}

        ${k === 'web' ? `
        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">3 · La página</legend>
          <label class="gx__f gx__wk-wide"><span>Enlace del sitio * (para «¿Seguro que quieres salir?»)</span><input name="site_url" type="url" value="${esc(w.site_url || '')}" placeholder="https://tutienda.com"></label>
          ${fileBox('frag_url', 'Video de presentación (archivo)', 'MP4 o WebM · o pon un enlace de YouTube abajo', 'video/*')}
          ${fileBox('cover_url', 'Captura del sitio *', 'Se ve en la ventana y en las tarjetas', 'image/*')}
          <label class="gx__f gx__wk-wide"><span>Video de presentación (enlace de YouTube, opcional)</span><input name="youtube" value="${esc(w.youtube_id ? `https://youtu.be/${w.youtube_id}` : '')}" placeholder="https://youtu.be/…"></label>
        </fieldset>` : ''}

        ${k !== 'reel' ? `
        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">4 · Textos</legend>
          <label class="gx__f gx__wk-wide"><span>Descripción («El proyecto»: texto centrado sobre rosado)</span><textarea name="description" rows="5">${esc(w.description || '')}</textarea></label>
          ${k === 'video' ? `
          <label class="gx__f"><span>La experiencia · título</span><input name="exp_title" maxlength="160" value="${esc(w.exp_title || '')}"></label>
          <label class="gx__f gx__wk-wide"><span>La experiencia · texto</span><textarea name="exp_text" rows="4">${esc(w.exp_text || '')}</textarea></label>
          <label class="gx__f gx__wk-wide"><span>Frase destacada (recuadro negro sobre rosado)</span><input name="quote" maxlength="400" value="${esc(w.quote || '')}"></label>
          <label class="gx__f"><span>Quién la dijo</span><input name="quote_by" maxlength="160" value="${esc(w.quote_by || '')}"></label>` : ''}
        </fieldset>` : ''}

        ${k === 'web' ? `
        <fieldset class="gx__fs gx__wk-grid"><legend class="mono">5 · Imágenes</legend>
          ${gallery('pieces', 'Piezas que salieron (posts, carruseles…)', 'JPG o PNG · se optimizan solas')}
        </fieldset>` : ''}

        <fieldset class="gx__fs gx__wk-where"><legend class="mono">${k === 'reel' ? '4' : '6'} · Dónde aparece</legend>
          <label class="gx__check"><input type="checkbox" name="publish"${w.status === 'publicado' ? ' checked' : ''}><span>Publicado (sale en «Todos los proyectos»)</span></label>
          ${k === 'video' ? `<label class="gx__check"><input type="checkbox" name="featured"${w.featured ? ' checked' : ''}><span>★ En las franjas del Inicio (máx. 4)</span></label>
          <label class="gx__check"><input type="checkbox" name="in_videoteca"${w.in_videoteca ? ' checked' : ''}><span>Botón en la videoteca de Producción</span></label>` : ''}
        </fieldset>

        <p class="mono gx__saved" data-msg aria-live="polite"></p>
        <div class="gx__wk-save">
          ${!isNew ? '<button class="gx__danger" type="button" data-del>Eliminar proyecto</button>' : ''}
          <button class="gx__btn gx__btn--dark" type="submit">Guardar</button>
        </div>
      </form>`;
    bind();
  };

  // lo que se escribe se guarda en w antes de redibujar (al cambiar de tipo o subir algo)
  const keep = () => {
    const f = $('[data-form]', main);
    if (!f) return;
    const fd = new FormData(f);
    ['title', 'client', 'summary', 'description', 'exp_title', 'exp_text', 'quote', 'quote_by', 'site_url'].forEach((n) => { if (fd.has(n)) w[n] = String(fd.get(n)); });
    if (fd.has('year')) w.year = fd.get('year') ? Number(fd.get('year')) : null;
    if (fd.has('category')) w.category = fd.get('category');
    if (fd.has('youtube')) { const y = ytId(fd.get('youtube')); if (y !== null) w.youtube_id = y || null; }
    if ($('[name="did"]', f)) { didSet.clear(); fd.getAll('did').forEach((d) => didSet.add(d)); }
    if (w.kind === 'reel') {
      w.reels = [0, 1, 2].map((i) => ({ yt: ytId(fd.get(`reel_yt_${i}`)) || '', label: String(fd.get(`reel_label_${i}`) || '').trim() }))
        .filter((r) => r.yt).map((r) => ({ ...r, poster: `https://i.ytimg.com/vi/${r.yt}/oardefault.jpg` }));
    }
    if (w.kind === 'identidad') w.palette = [0, 1, 2, 3].filter((i) => fd.get(`pal_on_${i}`)).map((i) => fd.get(`pal_${i}`));
    $$('[data-gal-label]', f).forEach((inp) => { const [key, i] = inp.dataset.galLabel.split(':'); if (w[key][i]) w[key][i].label = inp.value.trim(); });
    w.status = fd.get('publish') ? 'publicado' : 'borrador';
    if (fd.has('featured') || $('[name="featured"]', f)) w.featured = !!fd.get('featured');
    if ($('[name="in_videoteca"]', f)) w.in_videoteca = !!fd.get('in_videoteca');
  };

  const bind = () => {
    const f = $('[data-form]', main);
    const msg = $('[data-msg]', f);
    $('[data-back]', main).addEventListener('click', () => go('trabajo'));
    $$('input[name="kind"]', f).forEach((r) => r.addEventListener('change', () => {
      keep();
      w.kind = r.value;
      if (w.kind === 'video' && !VIDEO_CATS.some(([c]) => c === w.category)) w.category = 'videoclip';
      if (w.kind !== 'video') w.category = w.kind;
      draw();
    }));
    $$('.gx__wk-did input', f).forEach((c) => c.addEventListener('change', () => c.parentElement.classList.toggle('is-on', c.checked)));
    // arrastrar sobre las cajas
    $$('[data-drop]', f).forEach((d) => {
      const inp = $('input[type="file"]', d);
      d.addEventListener('dragover', (e) => { e.preventDefault(); d.classList.add('is-over'); });
      d.addEventListener('dragleave', () => d.classList.remove('is-over'));
      d.addEventListener('drop', (e) => { e.preventDefault(); d.classList.remove('is-over'); if (e.dataTransfer.files.length) { inp.files = e.dataTransfer.files; inp.dispatchEvent(new Event('change')); } });
    });
    // un archivo (fragmento, foto)
    $$('[data-up]', f).forEach((box) => {
      const key = box.dataset.up;
      $('input[type="file"]', box).addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        keep();
        const isVid = /^video\//.test(file.type) || /\.(mov|m4v|avi|mkv)$/i.test(file.name);
        // solo MP4 y WebM se ven en todos los navegadores; un .MOV se ve negro en Chrome y Android
        if (isVid && !/^video\/(mp4|webm)$/.test(file.type)) {
          const ext = (file.name.split('.').pop() || '').toUpperCase();
          msg.textContent = `Este video es ${ext}: así no se ve en todos los navegadores. Expórtalo como MP4 (H.264, sin audio) y súbelo de nuevo. En HandBrake: preset «Fast 1080p30», formato MP4.`;
          e.target.value = '';
          return;
        }
        if (isVid && file.size > MAX_VIDEO) { msg.textContent = `El video pesa ${mb(file.size)}: el máximo es 50 MB. Recórtalo a 8–12 s.`; return; }
        msg.textContent = `Subiendo ${file.name}…`;
        try {
          const blob = isVid ? file : await shrink(file);
          const old = w[key];
          w[key] = await put(sb, folder(), blob, blob.name || file.name);
          if (old) removeFiles(sb, [old]);
          msg.textContent = isVid && file.size > HEAVY_VIDEO ? `✓ Subido. Ojo: pesa ${mb(file.size)}; lo ideal es menos de 4 MB para que cargue rápido.` : '✓ Subido. Recuerda guardar.';
          draw();
        } catch (err) { msg.textContent = uploadError(err); }
      });
    });
    $$('[data-clear]', f).forEach((b) => b.addEventListener('click', () => { keep(); const old = w[b.dataset.clear]; w[b.dataset.clear] = null; if (old) removeFiles(sb, [old]); draw(); }));
    // varias imágenes (piezas, detrás de cámaras)
    $$('[data-gal]', f).forEach((box) => {
      const key = box.dataset.gal;
      $('input[type="file"]', box).addEventListener('change', async (e) => {
        const files = [...e.target.files];
        if (!files.length) return;
        keep();
        try {
          for (let i = 0; i < files.length; i += 1) {
            msg.textContent = `Subiendo ${i + 1} de ${files.length}…`;
            const file = files[i];
            if (/^video\//.test(file.type) && file.size > MAX_VIDEO) continue;
            const blob = /^video\//.test(file.type) ? file : await shrink(file, 1800);
            w[key].push({ url: await put(sb, folder(), blob, blob.name || file.name), label: '' });
          }
          msg.textContent = '✓ Subidas. Recuerda guardar.';
          draw();
        } catch (err) { msg.textContent = errorText(err); }
      });
    });
    $$('[data-gal-del]', f).forEach((b) => b.addEventListener('click', () => {
      keep();
      const [key, i] = b.dataset.galDel.split(':');
      const [gone] = w[key].splice(Number(i), 1);
      if (gone) removeFiles(sb, [gone.url]);
      draw();
    }));
    // el PDF del manual → páginas
    const pdfBox = $('[data-pdf]', f);
    pdfBox && $('input[type="file"]', pdfBox).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      keep();
      const pmsg = $('[data-pdf-msg]', pdfBox);
      try {
        pmsg.textContent = 'Leyendo el PDF…';
        const imgs = await pdfToImages(file, (i, n) => { pmsg.textContent = `Convirtiendo la página ${i} de ${n}…`; });
        const urls = [];
        for (let i = 0; i < imgs.length; i += 1) {
          pmsg.textContent = `Subiendo la página ${i + 1} de ${imgs.length}…`;
          urls.push(await put(sb, `${folder()}/manual`, imgs[i], `pagina-${String(i + 1).padStart(2, '0')}.webp`));
        }
        pmsg.textContent = 'Subiendo el PDF para descargar…';
        const pdf = await put(sb, folder(), file, file.name);
        removeFiles(sb, [...w.pages, w.pdf_url].filter(Boolean));
        w.pages = urls;
        w.pdf_url = pdf;
        msg.textContent = `✓ ${urls.length} páginas listas. Recuerda guardar.`;
        draw();
      } catch (err) { pmsg.textContent = `No se pudo leer el PDF: ${errorText(err)}`; }
    });

    $('[data-del]', f)?.addEventListener('click', async () => {
      if (!window.confirm(`¿Eliminar «${w.title}» y todos sus archivos? No se puede deshacer.`)) return;
      msg.textContent = 'Eliminando…';
      await removeFiles(sb, [w.cover_url, w.frag_url, w.frag_v_url, w.frag2_url, w.frag3_url, w.pdf_url, ...w.pages, ...w.pieces.map((p) => p.url), ...w.bts.map((p) => p.url)].filter(Boolean));
      const { error } = await sb.from('works').delete().eq('id', w.id);
      if (error) { msg.textContent = errorText(error); return; }
      go('trabajo');
    });

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      keep();
      const fd = new FormData(f);
      if (!w.title?.trim()) { msg.textContent = 'Ponle un título al proyecto.'; $('[name="title"]', f).focus(); return; }
      if (fd.has('youtube') && ytId(fd.get('youtube')) === null) { msg.textContent = 'Ese enlace de YouTube no se reconoce. Pega el enlace completo del video.'; return; }
      if (w.kind === 'web' && w.status === 'publicado' && !safeUrl(w.site_url)) { msg.textContent = 'Para publicar una página web falta el enlace del sitio (con https://).'; return; }
      if (w.kind === 'reel' && w.status === 'publicado' && !w.reels.length) { msg.textContent = 'Agrega al menos un reel para publicarlo.'; return; }
      if (w.featured && w.kind === 'video') {
        const { count } = await sb.from('works').select('id', { count: 'exact', head: true }).eq('featured', true).eq('kind', 'video').eq('status', 'publicado').neq('id', w.id || '00000000-0000-0000-0000-000000000000');
        if (count >= 4) { msg.textContent = 'Ya hay 4 videos con ★ en el Inicio: quita la ★ de otro primero (o desmarca esta).'; return; }
      }
      const row = {
        kind: w.kind, category: w.kind === 'video' ? w.category : w.kind, title: w.title.trim(),
        client: w.client?.trim() || null, year: w.kind === 'reel' ? null : (w.year || null),
        did: w.kind === 'reel' ? null : ([...didSet].join(' · ') || null), summary: w.summary?.trim() || null,
        description: w.description?.trim() || null, exp_title: w.exp_title?.trim() || null, exp_text: w.exp_text?.trim() || null,
        quote: w.quote?.trim() || null, quote_by: w.quote_by?.trim() || null,
        cover_url: w.cover_url || null, frag_url: w.frag_url || null, frag_v_url: w.frag_v_url || null, frag2_url: w.frag2_url || null,
        youtube_id: w.youtube_id || null, pieces: w.pieces, bts: w.bts, pages: w.pages, pdf_url: w.pdf_url || null,
        palette: w.palette, site_url: safeUrl(w.site_url) || null, reels: w.reels,
        status: w.status, featured: w.kind === 'video' && !!w.featured, in_videoteca: w.kind === 'video' && !!w.in_videoteca,
        updated_at: new Date().toISOString(),
      };
      // la escena 3 es de la fase 8: solo se manda si hay archivo (así no falla antes de correr fase8.sql)
      if (w.kind === 'video' && (w.frag3_url || 'frag3_url' in w)) row.frag3_url = w.frag3_url || null;
      msg.textContent = 'Guardando…';
      let error;
      if (isNew) {
        // dirección de la página: el título sin tildes; si ya existe, se le agrega un número
        const base = slugify(row.title);
        const { data: taken } = await sb.from('works').select('slug').like('slug', `${base}%`);
        const used = new Set((taken || []).map((x) => x.slug));
        let slug = base; let n = 2;
        while (used.has(slug)) { slug = `${base}-${n}`; n += 1; }
        const { data: first } = await sb.from('works').select('sort').order('sort').limit(1);
        ({ error } = await sb.from('works').insert({ ...row, slug, sort: (first?.[0]?.sort ?? 1) - 1 }));
      } else {
        ({ error } = await sb.from('works').update(row).eq('id', w.id));
      }
      if (error) { msg.textContent = /frag3_url/.test(error.message || "") ? "Para la escena 3 falta correr supabase/fase8.sql en Supabase." : errorText(error); return; }
      go('trabajo');
    });
  };

  draw();
}
