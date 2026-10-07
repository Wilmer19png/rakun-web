/* ==========================================================================
   RAKÜN · gestor · 05 Documentos
   Contratos, recibos, estrategias, guiones… como archivo privado (Supabase
   Storage, carpeta por cliente) o como link (Drive, Docs, Figma, Vimeo).
   ========================================================================== */
import { $, $$, esc, safeUrl } from './util.js';
import { errorText } from './supa.js';
import { DOC_CATS, DOC_STATUS, MAX_FILE, safeFileName, fileSize, openDocument } from './content.js';

const st = { client: '', cat: '' };

export async function viewDocuments(ctx) {
  const { sb, main, head, loading, fail, staff } = ctx;
  loading();
  const [{ data: docs, error }, { data: clients }, { data: projects }] = await Promise.all([
    sb.from('documents').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('clients').select('id, name').order('name'),
    sb.from('projects').select('id, name, client_id').order('created_at', { ascending: false }),
  ]);
  if (error) { main.innerHTML = ''; fail(error); return; }
  const clientName = Object.fromEntries((clients || []).map((c) => [c.id, c.name]));
  const projectName = Object.fromEntries((projects || []).map((p) => [p.id, p.name]));
  const who = Object.fromEntries(staff.map((s) => [s.id, s]));
  const list = docs.filter((d) => (!st.client || d.client_id === st.client) && (!st.cat || d.category === st.cat));

  main.innerHTML = head('07', 'Todo lo que se entrega queda registrado', 'Documentos', `
    <select class="gx__pick" data-client aria-label="Cliente"><option value="">Todos los clientes</option>${(clients || []).map((c) => `<option value="${c.id}"${st.client === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <button class="gx__btn gx__btn--dark" type="button" data-new>+ Subir documento</button>`) + `
    <div class="gx__subtabs">
      ${[['', 'Todo'], ...Object.entries(DOC_CATS)].map(([k, n]) => `<button type="button" class="gx__chip gx__chip--sm${st.cat === k ? ' is-on' : ''}" data-cat="${k}">${n} <span class="gx__count">${docs.filter((d) => (!st.client || d.client_id === st.client) && (!k || d.category === k)).length}</span></button>`).join('')}
    </div>
    <div class="gx__table">
      <div class="gx__tr gx__tr--h gx__tr--doc"><span>Tipo</span><span>Documento</span><span>Carpeta</span><span>Estado</span><span>Lo ve el cliente</span><span></span></div>
      ${list.map((d) => {

        const by = who[d.uploaded_by];
        return `<div class="gx__tr gx__tr--doc" data-id="${d.id}">
          <span><span class="mono gx__tag gx__tag--type">${d.kind === 'file' ? esc((d.file_name || '').split('.').pop().toUpperCase().slice(0, 4) || 'ARCH') : 'LINK'}</span></span>
          <span><b>${esc(d.title)}</b><br><small>${esc(clientName[d.client_id] || '—')}${d.project_id ? ` · ${esc(projectName[d.project_id] || '')}` : ''} · ${new Date(d.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}${d.file_size ? ` · ${fileSize(d.file_size)}` : ''}${by ? ` · subió ${esc(by.full_name.split(' ')[0])}` : d.category === 'material' ? ' · subió el cliente' : ''}</small></span>
          <span>${esc(DOC_CATS[d.category])}</span>
          <span><select data-status aria-label="Estado"><option value="">—</option>${DOC_STATUS.map(([k, n]) => `<option value="${k}"${d.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></span>
          <span><label class="gx__check"><input type="checkbox" data-visible${d.visible ? ' checked' : ''}><span>${d.visible ? 'Sí' : 'Solo equipo'}</span></label></span>
          <span class="gx__row-actions"><button class="gx__btn" type="button" data-open>Abrir ↗</button><button class="gx__mini" type="button" data-del aria-label="Eliminar">✕</button></span>
        </div>`;
      }).join('') || '<p class="gx__empty">No hay documentos aquí todavía.</p>'}
    </div>
    <p class="mono gx__saved" data-saved aria-live="polite"></p>`;

  const saved = $('[data-saved]', main);
  const rerender = () => viewDocuments(ctx);
  $('[data-client]', main).addEventListener('change', (e) => { st.client = e.target.value; rerender(); });
  $$('[data-cat]', main).forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.cat; rerender(); }));
  $('[data-new]', main).addEventListener('click', () => uploadForm(ctx, clients || [], projects || []));

  $$('[data-id]', main).forEach((row) => {
    const d = docs.find((x) => x.id === row.dataset.id);
    $('[data-status]', row).addEventListener('change', async (e) => {
      const { error: err } = await sb.from('documents').update({ status: e.target.value || null }).eq('id', d.id);
      saved.textContent = err ? errorText(err) : '✓ Estado guardado';
    });
    $('[data-visible]', row).addEventListener('change', async (e) => {
      const { error: err } = await sb.from('documents').update({ visible: e.target.checked }).eq('id', d.id);
      saved.textContent = err ? errorText(err) : '✓ Visibilidad guardada';
      e.target.nextElementSibling.textContent = e.target.checked ? 'Sí' : 'Solo equipo';
    });
    $('[data-open]', row).addEventListener('click', async () => {
      const w = window.open('', '_blank');
      if (w) w.opener = null;
      try { const url = await openDocument(sb, d); if (w) w.location = url; else location.href = url; } catch (err) { w?.close(); saved.textContent = errorText(err); }
    });
    $('[data-del]', row).addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${d.title}"? ${d.kind === 'file' ? 'El archivo se borra para siempre.' : ''}`)) return;
      if (d.kind === 'file') await sb.storage.from('documentos').remove([d.storage_path]);
      const { error: err } = await sb.from('documents').delete().eq('id', d.id);
      if (err) { saved.textContent = errorText(err); return; }
      rerender();
    });
  });
}

function uploadForm(ctx, clients, projects) {
  const { sb, me, openModal, closeModal } = ctx;
  if (!clients.length) {
    openModal('<p class="mono gx__kicker">Subir documento</p><h2 class="gx__modal-title">Primero un <em>cliente.</em></h2><p class="gx__p">Los documentos van en la carpeta de un cliente. Créalo en <b>Clientes</b>.</p>');
    return;
  }
  openModal(`
    <p class="mono gx__kicker">Subir documento</p>
    <h2 class="gx__modal-title">¿Qué <em>entregamos?</em></h2>
    <form class="gx__form" data-form novalidate>
      <label class="gx__f"><span>Cliente *</span><select name="client_id">${clients.map((c) => `<option value="${c.id}"${st.client === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="gx__f"><span>Proyecto</span><select name="project_id" data-projects></select></label>
      <div class="gx__row2">
        <label class="gx__f"><span>Carpeta *</span><select name="category">${Object.entries(DOC_CATS).map(([k, n]) => `<option value="${k}"${st.cat === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="gx__f"><span>Estado</span><select name="status"><option value="">—</option>${DOC_STATUS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
      </div>
      <label class="gx__f"><span>Nombre del documento *</span><input name="title" required maxlength="200" placeholder="Contrato de producción · comercial"></label>
      <div class="gx__seg" role="radiogroup" aria-label="Tipo">
        <label><input type="radio" name="kind" value="file" checked><span><b>Archivo</b><small>PDF, imagen o documento · máx. 25 MB · privado</small></span></label>
        <label><input type="radio" name="kind" value="link"><span><b>Link</b><small>Drive, Docs, Figma, Vimeo… no ocupa espacio</small></span></label>
      </div>
      <label class="gx__f" data-when="file"><span>Archivo</span><input name="file" type="file"></label>
      <label class="gx__f" data-when="link" hidden><span>Link</span><input name="url" inputmode="url" placeholder="https://drive.google.com/…"></label>
      <label class="gx__check gx__f"><input type="checkbox" name="visible" checked><span>Lo ve el cliente en su portal</span></label>
      <p class="mono gx__saved" data-msg aria-live="polite"></p>
      <button class="gx__btn gx__btn--hot" type="submit">Guardar documento →</button>
    </form>`);
  const f = $('[data-modal-box] [data-form]');
  const fillProjects = () => {
    const cid = f.elements.client_id.value;
    $('[data-projects]', f).innerHTML = '<option value="">Sin proyecto</option>' + projects.filter((p) => p.client_id === cid).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  };
  fillProjects();
  f.elements.client_id.addEventListener('change', fillProjects);
  $$('input[name="kind"]', f).forEach((r) => r.addEventListener('change', () => {
    const k = $('input[name="kind"]:checked', f).value;
    $$('[data-when]', f).forEach((el) => { el.hidden = el.dataset.when !== k; });
  }));
  f.elements.file.addEventListener('change', () => {
    const file = f.elements.file.files[0];
    if (file && !f.elements.title.value.trim()) f.elements.title.value = file.name.replace(/\.[^.]+$/, '');
  });

  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('[data-msg]', f);
    const btn = $('button[type="submit"]', f);
    const kind = $('input[name="kind"]:checked', f).value;
    const title = f.elements.title.value.trim();
    const clientId = f.elements.client_id.value;
    if (!title) { msg.textContent = 'Ponle un nombre al documento.'; return; }
    const row = {
      client_id: clientId, project_id: f.elements.project_id.value || null, category: f.elements.category.value,
      title, kind, status: f.elements.status.value || null, visible: f.elements.visible.checked, uploaded_by: me.id,
    };
    btn.disabled = true;
    try {
      if (kind === 'link') {
        const url = safeUrl(f.elements.url.value);
        if (!url) throw new Error('Pega un link válido (https://…).');
        row.url = url;
      } else {
        const file = f.elements.file.files[0];
        if (!file) throw new Error('Elige un archivo.');
        if (file.size > MAX_FILE) throw new Error('El archivo pesa más de 25 MB. Súbelo a Drive y guárdalo como link.');
        msg.textContent = 'Subiendo el archivo…';
        const path = `${clientId}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
        const { error: upErr } = await sb.storage.from('documentos').upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (upErr) throw upErr;
        Object.assign(row, { storage_path: path, file_name: file.name, file_size: file.size });
      }
      msg.textContent = 'Guardando…';
      const { error } = await sb.from('documents').insert(row);
      if (error) throw error;
      st.client = clientId;
      closeModal();
      viewDocuments(ctx);
    } catch (err) {
      msg.textContent = errorText(err);
      btn.disabled = false;
    }
  });
}

