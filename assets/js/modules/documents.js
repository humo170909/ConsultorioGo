/* ============================================================
   DOCUMENTS.JS — Gestión de documentos clínicos (sin fotos de paciente)
   Solo PDF, imágenes médicas y documentos clínicos
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.DocumentsModule = (function () {

    async function render(container, pacienteId) {
        container.innerHTML = `
            <div style="padding:0.875rem var(--content-px) 0.5rem;display:flex;justify-content:space-between;align-items:center">
                <h3 style="font-size:var(--text-base);font-weight:700">Documentos Adjuntos</h3>
                <button class="btn btn-primary btn-sm" id="btnSubirDoc">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Subir Documento
                </button>
            </div>

            <!-- Zona de arrastrar / soltar -->
            <div class="upload-zone" id="uploadZone" style="margin:0 var(--content-px) 0.875rem">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p>Toca para seleccionar archivo</p>
                <p class="upload-hint">PDF · Imágenes (JPG, PNG) · Máx. 50 MB</p>
                <input type="file" id="fileInput" multiple
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style="display:none">
            </div>

            <!-- Progreso de carga -->
            <div id="uploadProgress" style="display:none;margin:0 var(--content-px) 0.875rem">
                <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
                <p id="progressText" style="font-size:var(--text-xs);color:var(--text-muted);margin-top:0.375rem">Subiendo...</p>
            </div>

            <!-- Lista de documentos -->
            <div class="card" id="docsList" style="margin:0 var(--content-px);border-radius:var(--r-lg);overflow:hidden">
                <div class="empty-state" style="padding:2rem">
                    <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                </div>
            </div>
        `;

        const zone      = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        zone.addEventListener('click',   () => fileInput.click());
        document.getElementById('btnSubirDoc').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => _handleFiles(e.target.files, pacienteId));

        // Drag & Drop (en tablets/desktop)
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            _handleFiles(e.dataTransfer.files, pacienteId);
        });

        await _loadDocs(pacienteId);
    }

    async function _loadDocs(pacienteId) {
        const el = document.getElementById('docsList');
        if (!el) return;

        const { data, error } = await window.db
            .from('documentos_adjuntos')
            .select('*')
            .eq('paciente_id', pacienteId)
            .order('created_at', { ascending: false });

        if (error) {
            el.innerHTML = `<div class="alert alert-error" style="margin:1rem">Error al cargar documentos.</div>`;
            return;
        }

        if (!data || data.length === 0) {
            el.innerHTML = `
                <div class="empty-state" style="padding:2.5rem 1rem">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <h3>Sin documentos</h3>
                    <p>Sube recetas, PDFs u otros documentos clínicos.</p>
                </div>`;
            return;
        }

        el.innerHTML = `
            <div style="padding:0.5rem 1rem;font-size:var(--text-xs);color:var(--text-muted);border-bottom:1px solid var(--border)">
                ${data.length} documento(s) adjunto(s)
            </div>
            ${data.map(d => _docItem(d, pacienteId)).join('')}`;
    }

    function _docItem(doc, pacienteId) {
        const isPDF  = doc.tipo_archivo === 'application/pdf';
        const isImg  = doc.tipo_archivo && doc.tipo_archivo.startsWith('image/');

        const iconColor = isPDF ? '#dc2626' : '#3b82f6';
        const iconSVG   = isPDF
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

        return `
        <div class="doc-item">
            <div class="doc-icon-wrap">
                ${iconSVG}
            </div>
            <div class="doc-info">
                <div class="doc-name">${Utils.truncate(doc.nombre_archivo, 28)}</div>
                <div class="doc-meta">${Utils.formatDate(doc.created_at)} · ${Utils.formatFileSize(doc.tamano_bytes)}</div>
                ${doc.descripcion ? `<div class="doc-meta" style="color:var(--text-secondary)">${Utils.truncate(doc.descripcion, 30)}</div>` : ''}
            </div>
            <div class="doc-actions">
                <a href="${doc.url_storage}" target="_blank" rel="noopener noreferrer"
                    class="btn btn-xs btn-outline" title="Ver">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </a>
                <a href="${doc.url_storage}" download="${doc.nombre_archivo}"
                    class="btn btn-xs btn-secondary" title="Descargar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>
                <button class="btn btn-xs btn-ghost" title="Eliminar"
                    onclick="DocumentsModule.eliminarDoc('${doc.id}','${pacienteId}','${doc.url_storage}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
            </div>
        </div>`;
    }

    async function _handleFiles(files, pacienteId) {
        if (!files || files.length === 0) return;

        const progress     = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        progress.style.display = 'block';
        let errores = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const pct  = Math.round((i / files.length) * 100);
            progressFill.style.width = pct + '%';
            progressText.textContent = `Subiendo ${i + 1}/${files.length}: ${Utils.truncate(file.name, 30)}`;

            if (file.size > (window.APP ? window.APP.storage.maxDocSize : 52428800)) {
                Notify.warning('Archivo muy grande', `"${file.name}" supera el límite de 50 MB.`);
                errores++;
                continue;
            }

            // Verificar tipo permitido
            const tiposPermitidos = ['application/pdf','image/jpeg','image/png','image/webp'];
            if (!tiposPermitidos.includes(file.type)) {
                Notify.warning('Tipo no permitido', `Solo se permiten PDF e imágenes JPG/PNG/WEBP.`);
                errores++;
                continue;
            }

            try {
                await _subirArchivo(file, pacienteId);
            } catch (err) {
                Notify.error('Error al subir', Utils.truncate(file.name, 20) + ': ' + (err.message || 'Error'));
                errores++;
            }
        }

        progressFill.style.width = '100%';
        progressText.textContent = 'Completado';

        setTimeout(() => {
            progress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 1200);

        const ok = files.length - errores;
        if (ok > 0) Notify.success('Documentos subidos', `${ok} archivo(s) guardado(s) correctamente.`);

        // Limpiar input
        document.getElementById('fileInput').value = '';

        await _loadDocs(pacienteId);
    }

    async function _subirArchivo(file, pacienteId) {
        const timestamp = Date.now();
        const nombre    = file.name.replace(/[^a-z0-9.\-_]/gi, '_');
        const path      = `${pacienteId}/${timestamp}_${nombre}`;

        const { error: upErr } = await window.db.storage
            .from(window.APP ? window.APP.storage.bucketDocs : 'documentos-clinicos')
            .upload(path, file, { cacheControl: '3600', upsert: false });

        if (upErr) throw upErr;

        const { data: urlData } = window.db.storage
            .from(window.APP ? window.APP.storage.bucketDocs : 'documentos-clinicos')
            .getPublicUrl(path);

        const user = Auth.getUser();
        const { error: dbErr } = await window.db.from('documentos_adjuntos').insert({
            paciente_id:    pacienteId,
            nombre_archivo: file.name,
            tipo_archivo:   file.type,
            url_storage:    urlData.publicUrl,
            tamano_bytes:   file.size,
            subido_por:     user ? user.id : null,
        });

        if (dbErr) throw dbErr;
    }

    async function eliminarDoc(docId, pacienteId, urlStorage) {
        const ok = await Modal.confirm({
            title: 'Eliminar Documento',
            message: '¿Confirmas eliminar este documento? La acción no se puede deshacer.',
            confirmText: 'Eliminar',
            danger: true,
        });
        if (!ok) return;

        try {
            // Intentar eliminar del storage
            const bucket = window.APP ? window.APP.storage.bucketDocs : 'documentos-clinicos';
            const match  = urlStorage.match(new RegExp(bucket + '/(.+)$'));
            if (match) await window.db.storage.from(bucket).remove([match[1]]);

            const { error } = await window.db.from('documentos_adjuntos').delete().eq('id', docId);
            if (error) throw error;

            Notify.success('Documento eliminado', '');
            await _loadDocs(pacienteId);
        } catch (err) {
            Notify.error('Error al eliminar', err.message);
        }
    }

    return { render, eliminarDoc };
})();
