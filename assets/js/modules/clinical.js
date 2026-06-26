/* ============================================================
   CLINICAL.JS — Historia Clínica + Examen Visual Mobile
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.ClinicalModule = (function () {

    /* ============================================================
       PANTALLA: FORMULARIO DE NUEVA CONSULTA
       (Accedida desde FAB o directamente)
       ============================================================ */
    async function renderFormularioNuevo(container, params = {}) {
        const { pacienteId } = params;

        if (!pacienteId) {
            // Mostrar buscador para elegir paciente
            container.innerHTML = `
<div style="padding:1.5rem var(--content-px)">
    <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:1.25rem">
        Busca el paciente para registrar la consulta:
                    </p>
                    <div class="search-wrapper" style="position:relative;margin-bottom:1rem">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input id="patSearchForConsult" class="search-input" type="search" placeholder="Buscar paciente por nombre o DNI..." autofocus>
                    </div>
                    <div id="patSearchResults" class="card" style="display:none;border-radius:var(--r-lg);overflow:hidden"></div>
                </div>`;

            const input   = document.getElementById('patSearchForConsult');
            const results = document.getElementById('patSearchResults');

            const doSearch = Utils.debounce(async (term) => {
                if (!term || term.length < 2) { results.style.display = 'none'; return; }
                const { data } = await window.db.rpc('fn_buscar_pacientes', { p_termino: term, p_limite: 8 });
                if (!data || !data.length) {
                    results.innerHTML = `<div class="empty-state" style="padding:1.5rem"><p>Sin resultados.</p></div>`;
                    results.style.display = '';
                    return;
                }
                results.style.display = '';
                results.innerHTML = `<div class="activity-list">${data.map(p => `
                    <div class="activity-item" onclick="Router.navigate('new-consultation',{pacienteId:'${p.id}'})">
                        <div class="activity-avatar">${Utils.iniciales(p.nombres + ' ' + p.apellidos)}</div>
                        <div class="activity-info">
                            <div class="activity-name">${Utils.titleCase(p.nombres + ' ' + p.apellidos)}</div>
                            <div class="activity-meta">DNI: ${p.dni} · ${p.edad ?? '—'} años</div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                `).join('')}</div>`;
            }, 300);

            input.addEventListener('input', (e) => doSearch(e.target.value.trim()));
            return;
        }

        // Obtener datos del paciente
        const { data: pac } = await window.db.from('v_pacientes').select('*').eq('id', pacienteId).single();
        if (!pac) { Notify.error('Paciente no encontrado', ''); return; }

        const nombre = Utils.titleCase(pac.nombres + ' ' + pac.apellidos);

        // Actualizar top bar
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = 'Nueva Consulta';

        container.innerHTML = `
            <!-- Mini-perfil del paciente -->
            <div class="consult-hero">
                <div class="consult-hero-inner">
                    <div class="patient-avatar" style="background:rgba(255,255,255,0.2);color:white;border:2px solid rgba(255,255,255,0.3);flex-shrink:0">${Utils.iniciales(nombre)}</div>
                    <div>
                        <div style="font-size:var(--text-base);font-weight:800;color:white">${nombre}</div>
                        <div style="font-size:var(--text-xs);color:rgba(255,255,255,0.8)">DNI: ${pac.dni} · ${pac.edad} años</div>
                    </div>
                </div>
            </div>

            <form id="consultaForm" novalidate>
                <!-- Fecha y Motivo -->
                <div class="form-section" style="margin:0 var(--content-px) 0.875rem">
                    <div class="form-section-title">Datos de la Consulta</div>
                    <div class="form-section-body">
                        <div class="form-group">
                            <label class="form-label">Fecha de Consulta <span class="req">*</span></label>
                            <input id="cFecha" class="form-input" type="date" value="${Utils.today()}" max="${Utils.today()}">
                            <span class="field-error" id="cFechaError"></span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Motivo de Consulta <span class="req">*</span></label>
                            <input id="cMotivo" class="form-input" type="text"
                                placeholder="Ej: Disminución de agudeza visual" autocapitalize="sentences">
                            <span class="field-error" id="cMotivoError"></span>
                        </div>
                    </div>
                </div>

                <!-- Toggle: incluir examen visual -->
                <div style="padding:0 var(--content-px) 0.875rem">
                    <label id="labelIncluirExamen"
                           style="display:flex;align-items:center;gap:0.875rem;cursor:pointer;
                                  padding:1rem;background:var(--bg-surface);border-radius:var(--r-lg);
                                  box-shadow:var(--shadow-sm);border:1.5px solid var(--border);
                                  transition:border-color 0.15s">
                        <input type="checkbox" id="incluirExamen"
                               style="width:1.25rem;height:1.25rem;accent-color:var(--primary);flex-shrink:0">
                        <div>
                            <div style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">
                                📋 Incluir Examen Visual
                            </div>
                            <div style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.125rem">
                                Registrar medidas OD / OI · Esfera · Cilindro · Eje · AV
                            </div>
                        </div>
                    </label>
                </div>

                <!-- Formulario de examen visual -->
                <div id="examSection" style="display:none">
                    ${_buildExamForm()}
                </div>

                <!-- Botones de acción -->
                <div style="padding:0 var(--content-px) 1rem;display:flex;flex-direction:column;gap:0.625rem">
                    <button type="button" class="btn btn-primary btn-full btn-lg" id="btnSaveConsulta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2.5"
                             stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Registrar Consulta
                    </button>
                    <button type="button" class="btn btn-ghost btn-full"
                        onclick="Router.navigate('patient-detail',{id:'${pacienteId}'})">
                        Cancelar
                    </button>
                </div>
            </form>
        `;

        /* ── Toggle examen visual ── */
        const checkboxExamen = document.getElementById('incluirExamen');
        const examSection    = document.getElementById('examSection');
        const labelExamen    = document.getElementById('labelIncluirExamen');

        function _aplicarToggle(activo) {
            examSection.style.display = activo ? 'block' : 'none';
            checkboxExamen.checked    = activo;
            if (labelExamen) {
                labelExamen.style.borderColor = activo ? 'var(--primary)' : 'var(--border)';
            }
        }

        checkboxExamen.addEventListener('change', (e) => _aplicarToggle(e.target.checked));

        /* Si viene con conExamen='true' (desde _ofrecerConsulta), expandir automáticamente */
        if (params.conExamen === 'true' || params.conExamen === true) {
            _aplicarToggle(true);
            /* Scroll suave hasta el examen para que sea evidente */
            setTimeout(() => {
                examSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        }

        document.getElementById('btnSaveConsulta').addEventListener('click', () =>
            _guardarConsultaCompleta(pacienteId));
    }

    async function _guardarConsultaCompleta(pacienteId) {
        console.log('[Clinical] ▶ _guardarConsultaCompleta — pacienteId:', pacienteId);

        // [FIX] Validar que el pacienteId existe antes de proceder
        if (!pacienteId) {
            console.error('[Clinical] ERROR CRÍTICO: pacienteId es null o undefined');
            Notify.error('Error', 'No se pudo identificar al paciente. Recarga la página.');
            return;
        }

        const fecha  = document.getElementById('cFecha').value;
        const motivo = document.getElementById('cMotivo').value.trim();
        let valid = true;

        ['cFecha','cMotivo'].forEach(id => {
            const el  = document.getElementById(id);
            const err = document.getElementById(id + 'Error');
            if (el)  el.classList.remove('is-invalid');
            if (err) err.textContent = '';
        });

        if (!fecha)  { Utils.setError('cFecha', 'La fecha es obligatoria.'); valid = false; }
        if (!motivo) { Utils.setError('cMotivo', 'El motivo es obligatorio.'); valid = false; }
        if (!valid) {
            console.warn('[Clinical] Validación fallida — fecha:', fecha, '| motivo:', motivo);
            return;
        }

        const btn = document.getElementById('btnSaveConsulta');
        btn.disabled = true;
        btn.innerHTML = '<svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Guardando...';

        try {
            const user = Auth.getUser();
            console.log('[Clinical] Usuario autenticado:', user ? user.id : 'NULL — sin sesión');

            // Sección "Evaluación Clínica" eliminada del formulario —
            // esos campos se registran desde la ficha del paciente si son necesarios.
            const payload = {
                paciente_id:     pacienteId,
                fecha_consulta:  fecha,
                motivo_consulta: motivo,
                antecedentes:    document.getElementById('cAntecedentes')?.value?.trim()    || null,
                diagnostico:     document.getElementById('cDiagnostico')?.value?.trim()     || null,
                tratamiento:     document.getElementById('cTratamiento')?.value?.trim()     || null,
                recomendaciones: document.getElementById('cRecomendaciones')?.value?.trim() || null,
                observaciones:   document.getElementById('cObservaciones')?.value?.trim()   || null,
                optometra_id:    user ? user.id : null,
            };
            console.log('[Clinical] Payload historia_clinica:', JSON.stringify(payload));

            console.log('[Clinical] Insertando en historias_clinicas...');
            const { data: historia, error } = await window.db
                .from('historias_clinicas').insert(payload).select().single();

            if (error) {
                console.error('[Clinical] Error INSERT historias_clinicas:', error);
                console.error('[Clinical] Código:', error.code, '| Detalle:', error.details, '| Hint:', error.hint);
                throw error;
            }
            console.log('[Clinical] ✅ Historia clínica guardada. ID:', historia.id);

            // [MEJORA] Guardar examen visual si el checkbox está marcado
            const incluirExamen = document.getElementById('incluirExamen').checked;
            console.log('[Clinical] ¿Incluir examen visual?', incluirExamen);

            if (incluirExamen) {
                const examPayload = _collectExamData(historia.id, pacienteId, user);
                console.log('[Clinical] Payload examen_visual:', JSON.stringify(examPayload));

                // [FIX] Validar eje antes de enviar (constraint DB: 0–180°)
                if ((examPayload.od_eje !== null && (examPayload.od_eje < 0 || examPayload.od_eje > 180)) ||
                    (examPayload.oi_eje !== null && (examPayload.oi_eje < 0 || examPayload.oi_eje > 180))) {
                    console.warn('[Clinical] Eje fuera de rango 0-180°. OD:', examPayload.od_eje, '| OI:', examPayload.oi_eje);
                    Notify.warning('Consulta guardada — eje inválido',
                        'La consulta fue registrada, pero el eje debe estar entre 0 y 180°. Edita el examen visual desde la ficha del paciente.');
                    Router.navigate('patient-detail', { id: pacienteId, tab: 'historias' });
                    return;
                }

                console.log('[Clinical] Insertando en examenes_visuales...');
                const { error: examError } = await window.db.from('examenes_visuales').insert(examPayload);
                if (examError) {
                    // [FIX] Consulta ya guardada → informar estado parcial, no lanzar excepción
                    console.error('[Clinical] Error INSERT examenes_visuales:', examError);
                    console.error('[Clinical] Código:', examError.code, '| Detalle:', examError.details, '| Hint:', examError.hint);
                    console.error('[Clinical] Payload que causó el error:', JSON.stringify(examPayload));
                    Notify.warning('Consulta guardada — examen incompleto',
                        `La consulta fue registrada, pero el examen visual no se guardó: ${examError.message}`);
                    Router.navigate('patient-detail', { id: pacienteId, tab: 'historias' });
                    return;
                }
                console.log('[Clinical] ✅ Examen visual guardado correctamente.');
            }

            Notify.success('Consulta registrada', 'La historia clínica fue guardada exitosamente.');
            Router.navigate('patient-detail', { id: pacienteId, tab: 'historias' });

        } catch (err) {
            console.error('[Clinical] Error en _guardarConsultaCompleta:', err);
            console.error('[Clinical] Stack:', err.stack);
            Notify.error('Error al guardar', err.message);
            btn.disabled = false;
            btn.innerHTML = 'Registrar Consulta';
        }
    }

    /* ============================================================
       HISTORIAS CLÍNICAS — Timeline visual
       ============================================================ */
    async function renderHistorias(container, pacienteId, paciente) {
        const { data: historias, error } = await window.db
            .from('historias_clinicas')
            .select('*, perfiles(nombre_completo)')
            .eq('paciente_id', pacienteId)
            .order('fecha_consulta', { ascending: false });

        if (error) {
            container.innerHTML = `<div class="alert alert-error" style="margin:1rem">Error al cargar historias clínicas.</div>`;
            return;
        }

        const btnHtml = `
            <div style="padding:0.875rem var(--content-px) 0.5rem;display:flex;justify-content:flex-end">
                <button class="btn btn-primary btn-sm" onclick="ClinicalModule.abrirFormularioHistoria('${pacienteId}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nueva Consulta
                </button>
            </div>`;

        if (!historias || historias.length === 0) {
            container.innerHTML = btnHtml + `
                <div class="empty-state" style="padding:2.5rem 1rem;background:var(--bg-surface);border-radius:var(--r-lg);margin:0 var(--content-px)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <h3>Sin consultas</h3>
                    <p>Registra la primera consulta del paciente.</p>
                </div>`;
            return;
        }

        container.innerHTML = btnHtml + `<div class="timeline" style="padding-top:0.5rem">${historias.map(h => _timelineItem(h)).join('')}</div>`;

        // Abrir la primera automáticamente
        setTimeout(() => {
            const first = document.querySelector('.timeline-header');
            if (first) first.click();
        }, 100);
    }

    function _timelineItem(h) {
        return `
        <div class="timeline-item" id="ti-${h.id}">
            <div class="timeline-dot">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="timeline-content">
                <div class="timeline-header" onclick="_toggleTimeline('${h.id}')">
                    <div style="flex:1;min-width:0">
                        <div class="timeline-date">${Utils.formatDateLong(h.fecha_consulta)}</div>
                        <div class="timeline-motivo">${Utils.truncate(h.motivo_consulta, 55)}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.375rem;flex-shrink:0">
                        <button class="btn-icon-sm btn-secondary" title="Editar"
                            onclick="event.stopPropagation();ClinicalModule.abrirFormularioHistoria('${h.paciente_id}','${h.id}')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <svg id="chv-${h.id}" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transition:transform 0.2s;flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                </div>
                <div class="timeline-body" id="tb-${h.id}">
                    ${h.antecedentes    ? `<div class="timeline-field"><label>Antecedentes</label><p>${h.antecedentes}</p></div>` : ''}
                    ${h.diagnostico     ? `<div class="timeline-field"><label>Diagnóstico</label><p>${h.diagnostico}</p></div>` : ''}
                    ${h.tratamiento     ? `<div class="timeline-field"><label>Tratamiento</label><p>${h.tratamiento}</p></div>` : ''}
                    ${h.recomendaciones ? `<div class="timeline-field"><label>Recomendaciones</label><p>${h.recomendaciones}</p></div>` : ''}
                    ${h.observaciones   ? `<div class="timeline-field"><label>Observaciones</label><p>${h.observaciones}</p></div>` : ''}
                    ${h.perfiles ? `<div class="timeline-field"><label>Optómetra</label><p>${h.perfiles.nombre_completo}</p></div>` : ''}

                    <!-- Examen visual vinculado -->
                    <div id="examInline-${h.id}" style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid var(--border)">
                        <p style="font-size:var(--text-xs);color:var(--text-muted)">Cargando examen visual...</p>
                    </div>
                </div>
            </div>
        </div>`;
    }

    window._toggleTimeline = function(id) {
        const body  = document.getElementById('tb-' + id);
        const chv   = document.getElementById('chv-' + id);
        const isOpen = body.classList.contains('open');
        body.classList.toggle('open', !isOpen);
        if (chv) chv.style.transform = isOpen ? '' : 'rotate(180deg)';
        if (!isOpen) _loadExamenInline(id);
    };

    async function _loadExamenInline(historiaId) {
        const el = document.getElementById('examInline-' + historiaId);
        if (!el) return;

        const { data, error } = await window.db.from('examenes_visuales')
            .select('*').eq('historia_id', historiaId).maybeSingle();

        if (error || !data) {
            el.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:var(--text-xs);color:var(--text-muted)">Sin examen visual registrado.</span>
                    <button class="btn btn-xs btn-outline" onclick="ClinicalModule.abrirFormularioExamen('${historiaId}')">
                        + Examen
                    </button>
                </div>`;
            return;
        }

        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
                <span style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">Examen Visual — ${Utils.formatDate(data.fecha)}</span>
                <button class="btn btn-xs btn-ghost" onclick="ClinicalModule.abrirFormularioExamen('${historiaId}','${data.id}')">
                    Editar
                </button>
            </div>
            <div class="exam-result-card" style="margin:0;box-shadow:none;padding:0">
                <table class="exam-result-table">
                    <thead>
                        <tr>
                            <th style="text-align:left">Ojo</th>
                            <th>Esfera</th>
                            <th>Cilindro</th>
                            <th>Eje</th>
                            <th>AV</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="exam-row-label"><span class="eye-badge od" style="width:1.375rem;height:1.375rem;font-size:9px">OD</span></span></td>
                            <td>${_fmtMed(data.od_esfera)}</td>
                            <td>${_fmtMed(data.od_cilindro)}</td>
                            <td>${data.od_eje !== null ? data.od_eje + '°' : '—'}</td>
                            <td>${data.od_agudeza_visual || '—'}</td>
                        </tr>
                        <tr>
                            <td><span class="exam-row-label"><span class="eye-badge oi" style="width:1.375rem;height:1.375rem;font-size:9px">OI</span></span></td>
                            <td>${_fmtMed(data.oi_esfera)}</td>
                            <td>${_fmtMed(data.oi_cilindro)}</td>
                            <td>${data.oi_eje !== null ? data.oi_eje + '°' : '—'}</td>
                            <td>${data.oi_agudeza_visual || '—'}</td>
                        </tr>
                    </tbody>
                </table>
                ${data.distancia_pupilar || data.adicion || data.diagnostico_visual ? `
                <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem">
                    ${data.distancia_pupilar ? `<span style="font-size:var(--text-xs);font-weight:500">DP: ${data.distancia_pupilar} mm</span>` : ''}
                    ${data.adicion ? `<span style="font-size:var(--text-xs);font-weight:500">Add: ${_fmtMed(data.adicion)}</span>` : ''}
                    ${data.diagnostico_visual ? `<span style="font-size:var(--text-xs);color:var(--text-secondary)">${data.diagnostico_visual}</span>` : ''}
                </div>` : ''}
            </div>`;
    }

    function _fmtMed(n) {
        if (n === null || n === undefined) return '—';
        const v = parseFloat(n);
        return (v >= 0 ? '+' : '') + v.toFixed(2);
    }

    /* ============================================================
       MODAL: HISTORIA CLÍNICA
       ============================================================ */
    async function abrirFormularioHistoria(pacienteId, historiaId = null) {
        let h = null;
        if (historiaId) {
            const { data } = await window.db.from('historias_clinicas').select('*').eq('id', historiaId).single();
            h = data;
        }

        const isEdit = !!h;
        const m = Modal.open({
            title: isEdit ? 'Editar Consulta' : 'Nueva Consulta',
            body: `
                <form id="hForm" novalidate>
                    <div class="form-section" style="margin-bottom:0.75rem">
                        <div class="form-section-title">Datos Básicos</div>
                        <div class="form-section-body">
                            <div class="form-group">
                                <label class="form-label">Fecha <span class="req">*</span></label>
                                <input id="hFecha" class="form-input" type="date"
                                    value="${h ? Utils.toInputDate(h.fecha_consulta) : Utils.today()}" max="${Utils.today()}">
                                <span class="field-error" id="hFechaError"></span>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Motivo de Consulta <span class="req">*</span></label>
                                <input id="hMotivo" class="form-input" type="text"
                                    value="${h ? h.motivo_consulta : ''}"
                                    placeholder="Ej: Control visual, cefalea..." autocapitalize="sentences">
                                <span class="field-error" id="hMotivoError"></span>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <div class="form-section-title">Evaluación</div>
                        <div class="form-section-body">
                            <div class="form-group">
                                <label class="form-label">Antecedentes</label>
                                <textarea id="hAnt" class="form-textarea">${h ? (h.antecedentes||'') : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Diagnóstico</label>
                                <textarea id="hDiag" class="form-textarea">${h ? (h.diagnostico||'') : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tratamiento</label>
                                <textarea id="hTrat" class="form-textarea">${h ? (h.tratamiento||'') : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Recomendaciones</label>
                                <textarea id="hRec" class="form-textarea">${h ? (h.recomendaciones||'') : ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Observaciones</label>
                                <textarea id="hObs" class="form-textarea">${h ? (h.observaciones||'') : ''}</textarea>
                            </div>
                        </div>
                    </div>
                </form>`,
            footer: `
                <button class="btn btn-primary btn-full btn-lg" id="btnSaveH">
                    ${isEdit ? 'Guardar Cambios' : 'Registrar Consulta'}
                </button>
                <button class="btn btn-ghost btn-full" id="btnCancelH">Cancelar</button>`,
        });

        setTimeout(() => {
            document.getElementById('btnCancelH').onclick = () => Modal.close(m.id);
            document.getElementById('btnSaveH').onclick = () => _guardarHistoria(m.id, pacienteId, historiaId);
        }, 50);
    }

    async function _guardarHistoria(modalId, pacienteId, historiaId) {
        const fecha  = document.getElementById('hFecha').value;
        const motivo = document.getElementById('hMotivo').value.trim();
        let valid = true;
        if (!fecha)  { Utils.setError('hFecha',  'La fecha es obligatoria.'); valid = false; }
        if (!motivo) { Utils.setError('hMotivo', 'El motivo es obligatorio.'); valid = false; }
        if (!valid) return;

        const btn = document.getElementById('btnSaveH');
        btn.disabled = true; btn.textContent = 'Guardando...';

        try {
            const user = Auth.getUser();
            const payload = {
                paciente_id:     pacienteId,
                fecha_consulta:  fecha,
                motivo_consulta: motivo,
                antecedentes:    document.getElementById('hAnt').value.trim()  || null,
                diagnostico:     document.getElementById('hDiag').value.trim() || null,
                tratamiento:     document.getElementById('hTrat').value.trim() || null,
                recomendaciones: document.getElementById('hRec').value.trim()  || null,
                observaciones:   document.getElementById('hObs').value.trim()  || null,
                optometra_id:    user ? user.id : null,
            };

            if (historiaId) {
                const { error } = await window.db.from('historias_clinicas').update(payload).eq('id', historiaId);
                if (error) throw error;
                Notify.success('Consulta actualizada', '');
            } else {
                const { error } = await window.db.from('historias_clinicas').insert(payload);
                if (error) throw error;
                Notify.success('Consulta registrada', '');
            }

            Modal.close(modalId);
            const tabContent = document.getElementById('tabContent');
            if (tabContent) {
                const { data: p } = await window.db.from('v_pacientes').select('*').eq('id', pacienteId).single();
                await renderHistorias(tabContent, pacienteId, p);
            }
        } catch (err) {
            Notify.error('Error', err.message);
            btn.disabled = false; btn.textContent = 'Guardar';
        }
    }

    async function eliminarHistoria(historiaId, pacienteId) {
        const ok = await Modal.confirm({
            title: 'Eliminar Consulta',
            message: '¿Confirmas eliminar esta consulta y su examen visual?',
            confirmText: 'Eliminar', danger: true,
        });
        if (!ok) return;
        try {
            // BUG FIX: el error del delete no se verificaba; UI mostraba éxito aunque fallara
            const { error } = await window.db.from('historias_clinicas').delete().eq('id', historiaId);
            if (error) throw error;
            document.getElementById('ti-' + historiaId)?.remove();
            Notify.success('Consulta eliminada', '');
        } catch (err) { Notify.error('Error', err.message); }
    }

    /* ============================================================
       EXÁMENES VISUALES — Listado
       ============================================================ */
    async function renderExamenes(container, pacienteId) {
        const { data, error } = await window.db
            .from('examenes_visuales')
            .select('*, historias_clinicas(motivo_consulta, fecha_consulta)')
            .eq('paciente_id', pacienteId)
            .order('fecha', { ascending: false });

        if (error) { container.innerHTML = `<div class="alert alert-error" style="margin:1rem">Error al cargar exámenes.</div>`; return; }

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:2.5rem 1rem;background:var(--bg-surface);border-radius:var(--r-lg);margin:0 var(--content-px)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <h3>Sin exámenes visuales</h3>
                    <p>Los exámenes se crean desde una historia clínica.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div style="padding:0 var(--content-px);display:flex;flex-direction:column;gap:0.875rem">
                ${data.map(e => `
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">Examen Visual — ${Utils.formatDate(e.fecha)}</div>
                                ${e.historias_clinicas ? `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:0.25rem">${Utils.truncate(e.historias_clinicas.motivo_consulta, 50)}</div>` : ''}
                            </div>
                            <button class="btn btn-xs btn-ghost" onclick="ClinicalModule.abrirFormularioExamen('${e.historia_id}','${e.id}')">Editar</button>
                        </div>
                        <div class="card-body" style="padding:0.875rem">
                            <table class="exam-result-table">
                                <thead><tr><th style="text-align:left">Ojo</th><th>Esfera</th><th>Cilindro</th><th>Eje</th><th>AV</th></tr></thead>
                                <tbody>
                                    <tr>
                                        <td><span class="exam-row-label"><span class="eye-badge od" style="width:1.375rem;height:1.375rem;font-size:9px">OD</span></span></td>
                                        <td>${_fmtMed(e.od_esfera)}</td><td>${_fmtMed(e.od_cilindro)}</td>
                                        <td>${e.od_eje !== null ? e.od_eje + '°' : '—'}</td><td>${e.od_agudeza_visual || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td><span class="exam-row-label"><span class="eye-badge oi" style="width:1.375rem;height:1.375rem;font-size:9px">OI</span></span></td>
                                        <td>${_fmtMed(e.oi_esfera)}</td><td>${_fmtMed(e.oi_cilindro)}</td>
                                        <td>${e.oi_eje !== null ? e.oi_eje + '°' : '—'}</td><td>${e.oi_agudeza_visual || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                            ${e.distancia_pupilar || e.adicion || e.diagnostico_visual ? `
                            <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border);display:flex;flex-wrap:wrap;gap:0.75rem;font-size:var(--text-sm)">
                                ${e.distancia_pupilar ? `<span><strong>DP:</strong> ${e.distancia_pupilar} mm</span>` : ''}
                                ${e.adicion ? `<span><strong>Add:</strong> ${_fmtMed(e.adicion)}</span>` : ''}
                                ${e.diagnostico_visual ? `<span style="color:var(--text-secondary)">${e.diagnostico_visual}</span>` : ''}
                            </div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    /* ============================================================
       FORMULARIO DE EXAMEN VISUAL (Modal)
       ============================================================ */
    async function abrirFormularioExamen(historiaId, examenId = null) {
        console.log('[Clinical] ▶ abrirFormularioExamen — historiaId:', historiaId, '| examenId:', examenId);

        let e = null;
        if (examenId) {
            const { data, error: eErr } = await window.db.from('examenes_visuales').select('*').eq('id', examenId).single();
            if (eErr) console.error('[Clinical] Error al cargar examen existente:', eErr);
            e = data;
            console.log('[Clinical] Examen existente cargado:', e ? 'OK' : 'NULL');
        }

        // [FIX] Obtener paciente_id desde la historia clínica — crítico para el INSERT
        const { data: hist, error: histErr } = await window.db
            .from('historias_clinicas').select('paciente_id, fecha_consulta').eq('id', historiaId).single();
        if (histErr || !hist) {
            console.error('[Clinical] ERROR: No se pudo obtener la historia clínica:', histErr);
            console.error('[Clinical] historiaId usado:', historiaId);
            Notify.error('Error', 'No se pudo obtener la historia clínica vinculada al examen.');
            return;
        }
        console.log('[Clinical] Historia clínica cargada. paciente_id:', hist.paciente_id, '| fecha:', hist.fecha_consulta);

        const m = Modal.open({
            title: examenId ? 'Editar Examen Visual' : 'Nuevo Examen Visual',
            body: _buildExamForm(e, hist ? hist.fecha_consulta : null),
            footer: `
                <button class="btn btn-primary btn-full btn-lg" id="btnSaveExam">
                    ${examenId ? 'Guardar Cambios' : 'Registrar Examen'}
                </button>
                <button class="btn btn-ghost btn-full" id="btnCancelExam">Cancelar</button>`,
        });

        setTimeout(() => {
            document.getElementById('btnCancelExam').onclick = () => Modal.close(m.id);
            document.getElementById('btnSaveExam').onclick = () =>
                _guardarExamen(m.id, historiaId, hist ? hist.paciente_id : null, examenId);
            _initSteppers(document.getElementById(m.id + '-body'));
        }, 50);
    }

// [NUEVO] Conecta los botones +/- de los campos tipo "stepper"
function _initSteppers(scope) {
        scope.querySelectorAll('.stepper-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (!input) return;
                const step     = parseFloat(btn.dataset.step);
                const min      = input.dataset.min !== undefined ? parseFloat(input.dataset.min) : null;
                const max      = input.dataset.max !== undefined ? parseFloat(input.dataset.max) : null;
                const decimals = input.dataset.decimals !== undefined ? parseInt(input.dataset.decimals, 10) : 2;
                let current = parseFloat(input.value);
                if (isNaN(current)) current = 0;
                let next = Math.round((current + step) * 100) / 100;
                if (min !== null && next < min) next = min;
                if (max !== null && next > max) next = max;
                input.value = next.toFixed(decimals);
            });
        });
    }

    function _buildExamForm(e = null, fechaConsulta = null) {
        const v = (f) => e && e[f] !== null && e[f] !== undefined ? e[f] : '';
        return `
        <form id="examForm" novalidate>
            <div class="form-group" style="margin-bottom:1rem">
                <label class="form-label">Fecha del Examen</label>
                <input id="eFecha" class="form-input" type="date" style="max-width:180px"
                    value="${e ? Utils.toInputDate(e.fecha) : (fechaConsulta ? Utils.toInputDate(fechaConsulta) : Utils.today())}" max="${Utils.today()}">
            </div>

            <!-- Ojo Derecho -->
            <div class="eye-section od" style="margin-bottom:0.875rem">
                <div class="eye-section-header">
                    <span class="eye-badge od">OD</span>
                    <span class="eye-section-title">Ojo Derecho</span>
                </div>
                <div class="eye-section-body">
                    <div class="eye-field form-group">
                        <label class="form-label">Esfera</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOdEsf" data-step="-0.25">−</button>
                            <input id="eOdEsf" class="form-input stepper-input" type="text" inputmode="decimal" data-min="-30" data-max="30" value="${v('od_esfera')}" placeholder="+0.00">
                            <button type="button" class="stepper-btn" data-target="eOdEsf" data-step="0.25">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">Cilindro</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOdCil" data-step="-0.25">−</button>
                            <input id="eOdCil" class="form-input stepper-input" type="text" inputmode="decimal" data-min="-10" data-max="10" value="${v('od_cilindro')}" placeholder="0.00">
                            <button type="button" class="stepper-btn" data-target="eOdCil" data-step="0.25">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">Eje (°)</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOdEje" data-step="-1">−</button>
                            <input id="eOdEje" class="form-input stepper-input" type="text" inputmode="numeric" data-min="0" data-max="180" data-decimals="0" value="${v('od_eje')}" placeholder="0–180">
                            <button type="button" class="stepper-btn" data-target="eOdEje" data-step="1">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">AV</label>
                        <input id="eOdAv" class="form-input" type="text" inputmode="text" value="${v('od_agudeza_visual')}" placeholder="20/20">
                    </div>
                </div>
            </div>

            <!-- Ojo Izquierdo -->
            <div class="eye-section oi" style="margin-bottom:0.875rem">
                <div class="eye-section-header">
                    <span class="eye-badge oi">OI</span>
                    <span class="eye-section-title">Ojo Izquierdo</span>
                </div>
                <div class="eye-section-body">
                    <div class="eye-field form-group">
                        <label class="form-label">Esfera</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOiEsf" data-step="-0.25">−</button>
                            <input id="eOiEsf" class="form-input stepper-input" type="text" inputmode="decimal" data-min="-30" data-max="30" value="${v('oi_esfera')}" placeholder="+0.00">
                            <button type="button" class="stepper-btn" data-target="eOiEsf" data-step="0.25">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">Cilindro</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOiCil" data-step="-0.25">−</button>
                            <input id="eOiCil" class="form-input stepper-input" type="text" inputmode="decimal" data-min="-10" data-max="10" value="${v('oi_cilindro')}" placeholder="0.00">
                            <button type="button" class="stepper-btn" data-target="eOiCil" data-step="0.25">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">Eje (°)</label>
                        <div class="stepper">
                            <button type="button" class="stepper-btn" data-target="eOiEje" data-step="-1">−</button>
                            <input id="eOiEje" class="form-input stepper-input" type="text" inputmode="numeric" data-min="0" data-max="180" data-decimals="0" value="${v('oi_eje')}" placeholder="0–180">
                            <button type="button" class="stepper-btn" data-target="eOiEje" data-step="1">+</button>
                        </div>
                    </div>
                    <div class="eye-field form-group">
                        <label class="form-label">AV</label>
                        <input id="eOiAv" class="form-input" type="text" inputmode="text" value="${v('oi_agudeza_visual')}" placeholder="20/20">
                    </div>
                </div>
            </div>

            <!-- Adicionales -->
            <div class="form-section">
                <div class="form-section-title">Datos Adicionales</div>
                <div class="form-section-body">
                    <div class="form-grid-2">
                        <div class="form-group">
                            <label class="form-label">DP (mm)</label>
                            <div class="stepper">
                                <button type="button" class="stepper-btn" data-target="eDp" data-step="-0.5">−</button>
                                <input id="eDp" class="form-input stepper-input" type="text" inputmode="decimal" data-min="50" data-max="80" value="${v('distancia_pupilar')}" placeholder="64">
                                <button type="button" class="stepper-btn" data-target="eDp" data-step="0.5">+</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adición</label>
                            <div class="stepper">
                                <button type="button" class="stepper-btn" data-target="eAdd" data-step="-0.25">−</button>
                                <input id="eAdd" class="form-input stepper-input" type="text" inputmode="decimal" data-min="0" data-max="4" value="${v('adicion')}" placeholder="+1.50">
                                <button type="button" class="stepper-btn" data-target="eAdd" data-step="0.25">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Diagnóstico Visual</label>
                        <input id="eDiag" class="form-input" type="text" value="${v('diagnostico_visual')}" placeholder="Miopía leve, astigmatismo..." autocapitalize="sentences">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observaciones</label>
                        <textarea id="eObs" class="form-textarea">${v('observaciones')}</textarea>
                    </div>
                </div>
            </div>
        </form>`;
    }

    // [MEJORA] _collectExamData: lee todos los campos del formulario de examen visual
    // y construye el payload para INSERT/UPDATE en examenes_visuales
    function _collectExamData(historiaId, pacienteId, user) {
        // [FIX] Helpers robustos: devuelven null si el campo está vacío
        const pN = (id) => {
            const el = document.getElementById(id);
            if (!el) { console.warn('[Clinical] Campo no encontrado en DOM:', id); return null; }
            const v = el.value;
            return (v === '' || v === null || v === undefined) ? null : parseFloat(v);
        };
        const pI = (id) => {
            const el = document.getElementById(id);
            if (!el) { console.warn('[Clinical] Campo no encontrado en DOM:', id); return null; }
            const v = el.value;
            return (v === '' || v === null || v === undefined) ? null : parseInt(v, 10);
        };
        const pT = (id) => {
            const el = document.getElementById(id);
            if (!el) { console.warn('[Clinical] Campo no encontrado en DOM:', id); return null; }
            return el.value.trim() || null;
        };

        const fechaEl = document.getElementById('eFecha');
        const fecha   = (fechaEl && fechaEl.value) ? fechaEl.value : Utils.today();

        const data = {
            historia_id:       historiaId,
            paciente_id:       pacienteId,
            fecha,
            od_esfera:         pN('eOdEsf'),
            od_cilindro:       pN('eOdCil'),
            od_eje:            pI('eOdEje'),
            od_agudeza_visual: pT('eOdAv'),
            oi_esfera:         pN('eOiEsf'),
            oi_cilindro:       pN('eOiCil'),
            oi_eje:            pI('eOiEje'),
            oi_agudeza_visual: pT('eOiAv'),
            distancia_pupilar: pN('eDp'),
            adicion:           pN('eAdd'),
            diagnostico_visual: pT('eDiag'),
            observaciones:     pT('eObs'),
            optometra_id:      user ? user.id : null,
        };

        console.log('[Clinical] _collectExamData resultado:', JSON.stringify(data));
        return data;
    }

    async function _guardarExamen(modalId, historiaId, pacienteId, examenId) {
        console.log('[Clinical] ▶ _guardarExamen — historiaId:', historiaId,
                    '| pacienteId:', pacienteId, '| examenId (edición):', examenId);

        const btn = document.getElementById('btnSaveExam');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        // [FIX] Validar que pacienteId no sea null antes de intentar el INSERT
        if (!pacienteId) {
            console.error('[Clinical] ERROR CRÍTICO: pacienteId es null en _guardarExamen.');
            console.error('[Clinical] Causa probable: historias_clinicas no se cargó correctamente en abrirFormularioExamen.');
            Notify.error('Error', 'No se pudo identificar al paciente. Cierra y vuelve a abrir el formulario.');
            btn.disabled = false;
            btn.textContent = examenId ? 'Guardar Cambios' : 'Registrar Examen';
            return;
        }

        // [FIX] Validar que historiaId no sea null
        if (!historiaId) {
            console.error('[Clinical] ERROR CRÍTICO: historiaId es null en _guardarExamen.');
            Notify.error('Error', 'No se pudo identificar la consulta. Cierra y vuelve a abrir el formulario.');
            btn.disabled = false;
            btn.textContent = examenId ? 'Guardar Cambios' : 'Registrar Examen';
            return;
        }

        try {
            const user = Auth.getUser();
            console.log('[Clinical] Usuario autenticado:', user ? user.id : 'NULL');

            const payload = _collectExamData(historiaId, pacienteId, user);
            console.log('[Clinical] Payload examen_visual:', JSON.stringify(payload));

            // [FIX] Validación frontend del constraint DB: eje 0–180°
            if (payload.od_eje !== null && (payload.od_eje < 0 || payload.od_eje > 180)) {
                console.warn('[Clinical] Eje OD fuera de rango:', payload.od_eje);
                Notify.warning('Eje OD inválido', 'El eje del ojo derecho debe estar entre 0 y 180°.');
                btn.disabled = false;
                btn.textContent = examenId ? 'Guardar Cambios' : 'Registrar Examen';
                return;
            }
            if (payload.oi_eje !== null && (payload.oi_eje < 0 || payload.oi_eje > 180)) {
                console.warn('[Clinical] Eje OI fuera de rango:', payload.oi_eje);
                Notify.warning('Eje OI inválido', 'El eje del ojo izquierdo debe estar entre 0 y 180°.');
                btn.disabled = false;
                btn.textContent = examenId ? 'Guardar Cambios' : 'Registrar Examen';
                return;
            }

            if (examenId) {
                // [MEJORA] Para UPDATE excluimos FKs y timestamps inmutables
                const updatePayload = { ...payload };
                delete updatePayload.historia_id;
                delete updatePayload.paciente_id;
                console.log('[Clinical] UPDATE examen ID:', examenId, '| Payload:', JSON.stringify(updatePayload));
                const { error } = await window.db.from('examenes_visuales').update(updatePayload).eq('id', examenId);
                if (error) {
                    console.error('[Clinical] Error UPDATE examenes_visuales:', error);
                    console.error('[Clinical] Código:', error.code, '| Detalle:', error.details, '| Hint:', error.hint);
                    throw error;
                }
                console.log('[Clinical] ✅ Examen actualizado. ID:', examenId);
                Notify.success('Examen actualizado', 'Los datos del examen visual fueron guardados.');
            } else {
                console.log('[Clinical] INSERT nuevo examen visual...');
                const { data: nuevoExamen, error } = await window.db
                    .from('examenes_visuales').insert(payload).select().single();
                if (error) {
                    console.error('[Clinical] Error INSERT examenes_visuales:', error);
                    console.error('[Clinical] Código:', error.code, '| Detalle:', error.details, '| Hint:', error.hint);
                    console.error('[Clinical] Payload que falló:', JSON.stringify(payload));
                    throw error;
                }
                console.log('[Clinical] ✅ Examen visual creado. ID:', nuevoExamen?.id);
                Notify.success('Examen registrado', 'Los datos del examen visual fueron guardados correctamente.');
            }

            Modal.close(modalId);
            await _loadExamenInline(historiaId);

        } catch (err) {
            console.error('[Clinical] Error en _guardarExamen:', err);
            console.error('[Clinical] Stack:', err.stack);
            Notify.error('Error al guardar examen', err.message || 'Intenta de nuevo.');
            btn.disabled = false;
            btn.textContent = examenId ? 'Guardar Cambios' : 'Registrar Examen';
        }
    }

    return {
        renderHistorias, renderExamenes, renderFormularioNuevo,
        abrirFormularioHistoria, eliminarHistoria,
        abrirFormularioExamen,
    };
})();
