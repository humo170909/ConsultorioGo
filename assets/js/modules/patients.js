/* ============================================================
   PATIENTS.JS — CRUD Mobile · Sin fotografías
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.PatientsModule = (function () {

    /* ============================================================
       LISTADO DE PACIENTES (tarjetas Android)
       ============================================================ */
    async function render(container, params = {}) {
        container.innerHTML = `
            <!-- Buscador sticky -->
            <div class="search-container" style="position:sticky;top:0;background:var(--bg-body);z-index:9;padding-bottom:1rem">
                <div class="search-wrapper" style="position:relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="patientSearch" class="search-input" type="search" placeholder="Buscar por nombre, DNI o celular...">
                    <button id="clearSearch" class="search-clear" style="display:none" aria-label="Limpiar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>

            <!-- Lista de pacientes
                 .patients-grid aplica responsive:
                 · Mobile: 1 columna (flex column)
                 · Tablet (768+): 2 columnas (grid 1fr 1fr)
                 · Desktop (1024+): 1 columna horizontal
                 · Wide (1280+): 2 columnas verticales
            -->
            <div id="patientsList" class="patients-grid" style="padding:0 var(--px)">
                ${_skeletonCards(4)}
            </div>

            <!-- Paginación -->
            <div id="patientPagination" style="padding:1rem var(--px);display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap"></div>
        `;

        // Búsqueda con debounce
        const searchInput = document.getElementById('patientSearch');
        const clearBtn    = document.getElementById('clearSearch');

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            clearBtn.style.display = val ? '' : 'none';
            _debouncedSearch(val);
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            _loadPatients(0, '');
        });

        if (params.search) {
            searchInput.value = params.search;
            clearBtn.style.display = '';
        }

        await _loadPatients(0, params.search || '');
    }

    let _page = 0;
    let _search = '';
    const PER_PAGE = 15;

    const _debouncedSearch = Utils.debounce((term) => {
        _loadPatients(0, term.trim());
    }, 350);

    async function _loadPatients(page = 0, search = '') {
        _page   = page;
        _search = search;

        const list = document.getElementById('patientsList');
        if (!list) return;

        try {
            let data, total;

            if (search) {
                // BUG FIX: error de RPC era ignorado; ahora se captura y propaga
                const { data: rpc, error: rpcError } = await window.db.rpc('fn_buscar_pacientes', {
                    p_termino: search, p_limite: PER_PAGE, p_offset: page * PER_PAGE,
                });
                if (rpcError) throw rpcError;
                data  = rpc || [];
                total = data.length;
            } else {
                const { count } = await window.db.from('v_pacientes').select('*', { count: 'exact', head: true }).eq('activo', true);
                total = count || 0;

                const { data: rows, error } = await window.db
                    .from('v_pacientes')
                    .select('id,dni,nombres,apellidos,nombre_completo,edad,sexo,celular,correo,total_consultas,ultima_consulta')
                    .eq('activo', true)
                    .order('apellidos', { ascending: true })
                    .range(page * PER_PAGE, (page + 1) * PER_PAGE - 1);
                if (error) throw error;
                data = rows || [];
            }


            if (data.length === 0) {
                list.innerHTML = `
                    <div class="empty-state" style="padding:3rem 1rem;background:var(--bg-surface);border-radius:var(--r-lg)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        <h3>${search ? 'Sin resultados' : 'Sin pacientes'}</h3>
                        <p>${search ? `No se encontró "${search}"` : 'Registra el primer paciente'}</p>
                        ${!search ? `<button class="btn btn-primary" onclick="Router.navigate('new-patient')" style="margin-top:1rem">Registrar Paciente</button>` : ''}
                    </div>`;
                document.getElementById('patientPagination').innerHTML = '';
                return;
            }

            list.innerHTML = data.map(p => _patientCard(p)).join('');
            _renderPagination(total, page);

        } catch (err) {
            console.error('[Patients]', err);
            Notify.error('Error', 'No se pudo cargar la lista de pacientes.');
            list.innerHTML = `<div class="alert alert-error">Error al cargar los datos.</div>`;
        }
    }

    /* ============================================================
       TARJETA DE PACIENTE — Diseño rediseñado
       Auditoría aplicada:
       · Avatar + nombre correctamente alineados
       · Todos los datos clínicos visibles
       · 4 botones de acción con icono + etiqueta
       · Sin espacios vacíos excesivos
       · Touch targets de 56px (Material Design)
       ============================================================ */
    function _patientCard(p) {
        const nombre    = Utils.titleCase((p.nombres || '') + ' ' + (p.apellidos || ''));
        const iniciales = Utils.iniciales(nombre);
        const tieneConsultas = (p.total_consultas || 0) > 0;

        const sexoBadge = p.sexo === 'M'
            ? `<span class="badge badge-blue" style="font-size:0.6rem;padding:0.15rem 0.5rem">M</span>`
            : p.sexo === 'F'
            ? `<span class="badge badge-purple" style="font-size:0.6rem;padding:0.15rem 0.5rem">F</span>`
            : `<span class="badge badge-gray" style="font-size:0.6rem;padding:0.15rem 0.5rem">—</span>`;

        return `
        <div class="patient-card">

            <!-- ── ZONA DE INFO (clic → ficha completa) ── -->
            <div class="pc-body" onclick="Router.navigate('patient-detail',{id:'${p.id}'})">

                <!-- Fila: avatar + nombre + datos -->
                <div class="pc-header">
                    <div class="patient-avatar ${tieneConsultas ? '' : 'no-consultas'}">${iniciales}</div>
                    <div class="pc-info">
                        <div class="pc-name">${nombre}</div>
                        <div class="pc-meta">
                            <span class="pc-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 8a4 4 0 0 0-8 0v8h8V8z"/></svg>
                                ${p.dni}
                            </span>
                            <span class="pc-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                ${p.edad ?? '—'} años
                            </span>
                            ${p.celular ? `
                            <span class="pc-meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                ${p.celular}
                            </span>` : ''}
                            ${sexoBadge}
                        </div>
                    </div>
                </div>

                <!-- Fila de estadísticas -->
                <div class="pc-stats">
                    <div class="pc-stat">
                        <span class="pc-stat-label">Consultas</span>
                        <span class="pc-stat-value accent">${p.total_consultas || 0}</span>
                    </div>
                    <div class="pc-stat">
                        <span class="pc-stat-label">Última Consulta</span>
                        <span class="pc-stat-value">${tieneConsultas ? Utils.formatDate(p.ultima_consulta) : '—'}</span>
                    </div>
                </div>
            </div>

            <!-- ── BARRA DE ACCIONES (4 botones, detienen propagación) ── -->
            <div class="pc-actions" onclick="event.stopPropagation()">

                <!-- 1. Historial clínico -->
                <button class="pc-btn hist"
                    title="Historial Clínico"
                    onclick="Router.navigate('patient-detail',{id:'${p.id}',tab:'historias'})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Historial
                </button>

                <!-- 2. Examen Visual -->
                <button class="pc-btn exam"
                    title="Registrar Examen Visual"
                    onclick="PatientsModule.abrirExamenRapido('${p.id}','${nombre.replace(/'/g, "\\'")}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="2"/>
                        <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7z"/>
                    </svg>
                    Examen
                </button>

                <!-- 3. Nueva Consulta -->
                <button class="pc-btn consult"
                    title="Nueva Consulta"
                    onclick="ClinicalModule.abrirFormularioHistoria('${p.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9"  y1="15" x2="15" y2="15"/>
                    </svg>
                    Consulta
                </button>

                <!-- 4. Editar datos -->
                <button class="pc-btn edit"
                    title="Editar Paciente"
                    onclick="PatientsModule.abrirFormulario('${p.id}')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                </button>

            </div>
        </div>`;
    }

    /* ============================================================
       EXAMEN VISUAL RÁPIDO DESDE LA TARJETA
       Flujo:
       1. Sin consultas    → ofrece crear consulta primero
       2. 1 consulta       → abre examen directo
       3. Varias consultas → selector para elegir a cuál vincular
       ============================================================ */
    async function abrirExamenRapido(pacienteId, nombrePaciente) {
        const { data: historias, error } = await window.db
            .from('historias_clinicas')
            .select('id, fecha_consulta, motivo_consulta')
            .eq('paciente_id', pacienteId)
            .order('fecha_consulta', { ascending: false })
            .limit(10);

        if (error) { Notify.error('Error', error.message); return; }

        /* Sin consultas → pedir crear una primero */
        if (!historias || historias.length === 0) {
            const ok = await Modal.confirm({
                title: 'Sin consultas registradas',
                message: `<strong>${nombrePaciente}</strong> no tiene consultas aún.<br>
                          El examen visual debe vincularse a una consulta.<br>
                          ¿Deseas registrar una consulta ahora?`,
                confirmText: 'Crear Consulta',
                cancelText:  'Cancelar',
            });
            if (ok) ClinicalModule.abrirFormularioHistoria(pacienteId);
            return;
        }

        /* Una sola consulta → abrir examen directamente */
        if (historias.length === 1) {
            await ClinicalModule.abrirFormularioExamen(historias[0].id);
            return;
        }

        /* Varias consultas → mostrar selector */
        const SEL_ID = 'modal-exam-selector';
        Modal.open({
            id:    SEL_ID,
            title: 'Seleccionar Consulta',
            body: `
                <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;padding:0 0.25rem">
                    Elige la consulta a la que deseas vincular el examen visual de
                    <strong>${nombrePaciente}</strong>:
                </p>
                <div class="activity-list">
                    ${historias.map(h => `
                        <div class="activity-item"
                             onclick="Modal.close('${SEL_ID}');ClinicalModule.abrirFormularioExamen('${h.id}')">
                            <div class="activity-avatar" style="background:var(--primary-light);color:var(--primary)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7z"/></svg>
                            </div>
                            <div class="activity-info">
                                <div class="activity-name">${Utils.formatDateLong(h.fecha_consulta)}</div>
                                <div class="activity-meta">${Utils.truncate(h.motivo_consulta, 50)}</div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    `).join('')}
                </div>
            `,
            footer: `<button class="btn btn-ghost btn-full" onclick="Modal.close('${SEL_ID}')">Cancelar</button>`,
        });
    }

    function _renderPagination(total, page) {
        const el = document.getElementById('patientPagination');
        if (!el || total <= PER_PAGE) { if (el) el.innerHTML = ''; return; }
        const pages = Math.ceil(total / PER_PAGE);
        let html = '';
        // Mostrar máx 5 páginas
        const start = Math.max(0, page - 2);
        const end   = Math.min(pages, start + 5);
        if (page > 0) html += `<button class="btn btn-secondary btn-sm" onclick="PatientsModule._goPage(${page-1})">‹ Ant.</button>`;
        for (let i = start; i < end; i++) {
            html += `<button class="btn btn-sm ${i === page ? 'btn-primary' : 'btn-secondary'}" onclick="PatientsModule._goPage(${i})">${i+1}</button>`;
        }
        if (page < pages - 1) html += `<button class="btn btn-secondary btn-sm" onclick="PatientsModule._goPage(${page+1})">Sig. ›</button>`;
        el.innerHTML = html;
    }

    function _goPage(p) { _loadPatients(p, _search); }

    /* ============================================================
       FORMULARIO NUEVO PACIENTE (pantalla completa móvil)
       ============================================================ */
    async function renderFormularioNuevo(container) {
        container.innerHTML = _buildForm(null);
        _bindForm(null);
    }

    async function abrirFormulario(pacienteId = null) {
        let paciente = null;
        if (pacienteId) {
            const { data } = await window.db.from('pacientes').select('*').eq('id', pacienteId).single();
            paciente = data;
        }
        const isEdit = !!paciente;

        const m = Modal.open({
            title: isEdit ? 'Editar Paciente' : 'Nuevo Paciente',
            body:  _buildForm(paciente, true),
            footer: `
                <button class="btn btn-primary btn-full btn-lg" id="btnSavePac">
                    ${isEdit ? 'Guardar Cambios' : 'Registrar Paciente'}
                </button>
                <button class="btn btn-ghost btn-full" id="btnCancelPac">Cancelar</button>`,
        });

        setTimeout(() => {
            document.getElementById('btnCancelPac').onclick = () => Modal.close(m.id);
            _bindForm(paciente, m.id);
        }, 50);
    }

    /* ============================================================
       CONSTRUCCIÓN DEL FORMULARIO DE PACIENTE
       [MEJORA] fEdad es ahora un input editable con sincronización
       bidireccional: Fecha → Edad y Edad → Fecha.
       Secciones: Identificación · Datos Personales · Datos Complementarios
       ============================================================ */
    function _buildForm(p = null, inModal = false) {
        const v = (f) => p && p[f] !== null && p[f] !== undefined ? p[f] : '';

        // [MEJORA] Calcular edad inicial desde la fecha de nacimiento al editar
        const edadInicial = (p && p.fecha_nacimiento)
            ? Utils.calcularEdad(p.fecha_nacimiento)
            : '';

        return `
        <form id="patientForm" novalidate style="${inModal ? '' : 'padding:var(--content-pt,0) 0'}">

            <!-- ── SECCIÓN 1: IDENTIFICACIÓN ── -->
            <div class="form-section">
                <div class="form-section-title">Identificación</div>
                <div class="form-section-body">

                    <div class="form-group">
                        <label class="form-label">DNI <span class="req">*</span></label>
                        <input id="fDni" class="form-input" type="tel" inputmode="numeric"
                            maxlength="8" value="${v('dni')}" placeholder="12345678"
                            autocomplete="off">
                        <span class="field-error" id="fDniError"></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Nombres <span class="req">*</span></label>
                        <input id="fNombres" class="form-input" type="text"
                            value="${v('nombres')}" placeholder="Ej: Juan Carlos"
                            autocapitalize="words" autocomplete="given-name">
                        <span class="field-error" id="fNombresError"></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Apellidos <span class="req">*</span></label>
                        <input id="fApellidos" class="form-input" type="text"
                            value="${v('apellidos')}" placeholder="Ej: García López"
                            autocapitalize="words" autocomplete="family-name">
                        <span class="field-error" id="fApellidosError"></span>
                    </div>

                </div>
            </div>

            <!-- ── SECCIÓN 2: DATOS PERSONALES ── -->
            <div class="form-section">
                <div class="form-section-title">Datos Personales</div>
                <div class="form-section-body">

                    <!-- [MEJORA] Grid Fecha ↔ Edad con sincronización bidireccional -->
                    <div class="form-grid-2">

                        <div class="form-group">
                            <label class="form-label">Fecha de Nac. <span class="req">*</span></label>
                            <input id="fFechaNac" class="form-input" type="date"
                                value="${v('fecha_nacimiento') ? Utils.toInputDate(v('fecha_nacimiento')) : ''}"
                                max="${Utils.today()}">
                            <span class="field-error" id="fFechaNacError"></span>
                        </div>

                        <div class="form-group">
                            <!-- [MEJORA] Edad editable: al escribir la edad se calcula la fecha aproximada -->
                            <label class="form-label">Edad</label>
                            <div style="position:relative;display:flex;align-items:center">
                                <input id="fEdad" class="form-input" type="number"
                                    inputmode="numeric" min="0" max="120"
                                    value="${edadInicial}"
                                    placeholder="35"
                                    style="padding-right:2.75rem">
                                <span style="position:absolute;right:0.875rem;font-size:var(--tx-sm);
                                             color:var(--text-muted);pointer-events:none;user-select:none">
                                    años
                                </span>
                            </div>
                            <span class="field-error" id="fEdadError"></span>
                            <span class="form-hint" id="fEdadHint" style="display:none"></span>
                        </div>

                    </div>

                    <div class="form-group">
                        <label class="form-label">Sexo <span class="req">*</span></label>
                        <select id="fSexo" class="form-select">
                            <option value="">— Seleccionar —</option>
                            <option value="M"    ${v('sexo')==='M'    ? 'selected':''}>Masculino</option>
                            <option value="F"    ${v('sexo')==='F'    ? 'selected':''}>Femenino</option>
                            <option value="otro" ${v('sexo')==='otro' ? 'selected':''}>Otro</option>
                        </select>
                        <span class="field-error" id="fSexoError"></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Celular</label>
                        <input id="fCelular" class="form-input" type="tel" inputmode="tel"
                            value="${v('celular')}" placeholder="999 888 777"
                            autocomplete="tel">
                    </div>

                </div>
            </div>

            <!-- ── SECCIÓN 3: DATOS COMPLEMENTARIOS ── -->
            <div class="form-section">
                <div class="form-section-title">Datos Complementarios</div>
                <div class="form-section-body">

                    <div class="form-group">
                        <label class="form-label">Correo electrónico</label>
                        <input id="fCorreo" class="form-input" type="email" inputmode="email"
                            value="${v('correo')}" placeholder="correo@ejemplo.com"
                            autocomplete="email">
                        <span class="field-error" id="fCorreoError"></span>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Dirección</label>
                        <input id="fDireccion" class="form-input" type="text"
                            value="${v('direccion')}" placeholder="Av. Principal 123, Lima"
                            autocapitalize="words" autocomplete="street-address">
                    </div>

                    <div class="form-group">
                        <label class="form-label">Observaciones generales</label>
                        <textarea id="fObservaciones" class="form-textarea"
                            rows="3"
                            placeholder="Alergias, condiciones importantes, referencias...">${v('observaciones')}</textarea>
                    </div>

                </div>
            </div>

            ${!inModal ? `
            <div style="padding:0 var(--content-px,1rem)">
                <button type="button" class="btn btn-primary btn-full btn-lg" id="btnSavePac">
                    Registrar Paciente
                </button>
                <button type="button" class="btn btn-ghost btn-full" id="btnCancelPac"
                    onclick="Router.navigate('patients')" style="margin-top:0.5rem">
                    Cancelar
                </button>
            </div>
            ` : ''}

        </form>`;
    }

    /* ============================================================
       BINDFORM — Eventos del formulario de paciente
       [MEJORA] Sincronización bidireccional Fecha ↔ Edad:
         · Fecha de nac. → calcula y rellena Edad automáticamente
         · Edad → calcula y rellena Fecha de nac. aproximada
       [MEJORA] Validaciones en tiempo real con mensajes amigables
       ============================================================ */
    function _bindForm(paciente = null, modalId = null) {
        const fechaInput = document.getElementById('fFechaNac');
        const edadInput  = document.getElementById('fEdad');

        if (fechaInput && edadInput) {

            /* ── Helpers internos de cálculo ── */

            // Devuelve la edad en años completos a partir de una fecha (string YYYY-MM-DD)
            // Retorna null si la fecha es inválida o futura
            function _calcEdadDesde(fechaStr) {
                if (!fechaStr) return null;
                const hoy = new Date();
                const nac = new Date(fechaStr + 'T00:00:00');
                if (isNaN(nac.getTime()) || nac > hoy) return null;
                let edad = hoy.getFullYear() - nac.getFullYear();
                const m  = hoy.getMonth() - nac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
                return edad >= 0 ? edad : null;
            }

            // Calcula la fecha aproximada de nacimiento a partir de una edad en años.
            // Usa el día y mes actuales como referencia cuando no hay otra información.
            function _calcFechaDesde(edad) {
                if (edad === null || isNaN(edad) || edad < 0 || edad > 120) return '';
                const hoy  = new Date();
                const anio = hoy.getFullYear() - Math.floor(edad);
                const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
                const dia  = String(hoy.getDate()).padStart(2, '0');
                return `${anio}-${mes}-${dia}`;
            }

            /* ── Helpers de UI ── */

            function _setFechaError(msg) {
                const el  = document.getElementById('fFechaNac');
                const err = document.getElementById('fFechaNacError');
                if (el)  el.classList.add('is-invalid');
                if (err) err.textContent = msg;
            }
            function _clearFechaError() {
                const el  = document.getElementById('fFechaNac');
                const err = document.getElementById('fFechaNacError');
                if (el)  el.classList.remove('is-invalid');
                if (err) err.textContent = '';
            }
            function _setEdadError(msg) {
                const el  = document.getElementById('fEdad');
                const err = document.getElementById('fEdadError');
                if (el)  el.classList.add('is-invalid');
                if (err) err.textContent = msg;
            }
            function _clearEdadError() {
                const el   = document.getElementById('fEdad');
                const err  = document.getElementById('fEdadError');
                const hint = document.getElementById('fEdadHint');
                if (el)   el.classList.remove('is-invalid');
                if (err)  err.textContent = '';
                if (hint) { hint.textContent = ''; hint.style.display = 'none'; }
            }
            function _setEdadHint(msg) {
                const hint = document.getElementById('fEdadHint');
                if (hint) { hint.textContent = msg; hint.style.display = ''; }
            }

            /* ── Flag anti-ciclo: evita que un evento dispare al otro ── */
            let _syncLock = false;

            /* ── FLUJO A: Fecha de nacimiento → Edad ── */
            function _onFechaChange() {
                if (_syncLock) return;
                _syncLock = true;
                try {
                    const fecha = fechaInput.value;
                    _clearFechaError();
                    _clearEdadError();

                    if (!fecha) {
                        edadInput.value = '';
                        return;
                    }

                    const nac = new Date(fecha + 'T00:00:00');
                    const hoy = new Date();

                    // [VALIDACIÓN] Fecha futura
                    if (nac > hoy) {
                        _setFechaError('La fecha de nacimiento no puede ser futura.');
                        edadInput.value = '';
                        return;
                    }

                    const edad = _calcEdadDesde(fecha);
                    if (edad !== null) {
                        edadInput.value = edad;
                        if (edad === 0) _setEdadHint('Menor de 1 año');
                    }
                } finally {
                    _syncLock = false;
                }
            }

            /* ── FLUJO B: Edad → Fecha de nacimiento (aproximada) ── */
            function _onEdadInput() {
                if (_syncLock) return;
                _syncLock = true;
                try {
                    const raw = edadInput.value.trim();
                    _clearEdadError();

                    if (raw === '') return; // no borrar la fecha si el usuario limpia la edad

                    const edad = Number(raw);

                    // [VALIDACIÓN] No es número entero
                    if (!Number.isFinite(edad) || !Number.isInteger(edad)) {
                        _setEdadError('Ingresa un número entero.');
                        return;
                    }
                    // [VALIDACIÓN] Negativa
                    if (edad < 0) {
                        _setEdadError('La edad no puede ser negativa.');
                        return;
                    }
                    // [VALIDACIÓN] Límite superior
                    if (edad > 120) {
                        _setEdadError('La edad máxima permitida es 120 años.');
                        return;
                    }

                    // Calcular fecha aproximada y actualizar el campo
                    const fechaCalc = _calcFechaDesde(edad);
                    if (fechaCalc) {
                        fechaInput.value = fechaCalc;
                        _clearFechaError();
                        _setEdadHint(`Fecha estimada: ${Utils.formatDate(fechaCalc)}`);
                    }
                } finally {
                    _syncLock = false;
                }
            }

            // Registrar eventos en ambos campos
            fechaInput.addEventListener('input',  _onFechaChange);
            fechaInput.addEventListener('change', _onFechaChange); // date pickers nativos usan 'change'
            edadInput.addEventListener('input',   _onEdadInput);

            // Inicializar estado al cargar (modo edición)
            _onFechaChange();
        }

        /* ── Botón guardar ── */
        const saveBtn = document.getElementById('btnSavePac');
        if (saveBtn) saveBtn.addEventListener('click', () => _guardar(paciente, modalId));
    }

    async function _guardar(paciente = null, modalId = null) {
        // Leer todos los campos del formulario
        const dni       = (document.getElementById('fDni')?.value       || '').trim();
        const nombres   = (document.getElementById('fNombres')?.value   || '').trim();
        const apellidos = (document.getElementById('fApellidos')?.value || '').trim();
        const fechaNac  = (document.getElementById('fFechaNac')?.value  || '').trim();
        const edadRaw   = (document.getElementById('fEdad')?.value      || '').trim();
        const sexo      = document.getElementById('fSexo')?.value || '';
        const celular   = (document.getElementById('fCelular')?.value   || '').trim();
        const correo    = (document.getElementById('fCorreo')?.value    || '').trim();
        const direccion = (document.getElementById('fDireccion')?.value || '').trim();
        const obs       = (document.getElementById('fObservaciones')?.value || '').trim();

        // Limpiar todos los errores previos
        ['fDni','fNombres','fApellidos','fFechaNac','fEdad','fSexo','fCorreo'].forEach(id => {
            const el  = document.getElementById(id);
            const err = document.getElementById(id + 'Error');
            if (el)  el.classList.remove('is-invalid');
            if (err) err.textContent = '';
        });
        // Limpiar hint de edad
        const edadHint = document.getElementById('fEdadHint');
        if (edadHint) { edadHint.textContent = ''; edadHint.style.display = 'none'; }

        let valid = true;

        // ── VALIDACIONES ──────────────────────────────────────────
        // DNI: exactamente 8 dígitos
        if (!dni || !Utils.validarDNI(dni)) {
            Utils.setError('fDni', 'El DNI debe tener exactamente 8 dígitos numéricos.');
            valid = false;
        }

        // Nombre y apellidos: obligatorios
        if (!nombres)   { Utils.setError('fNombres',   'El nombre es obligatorio.');   valid = false; }
        if (!apellidos) { Utils.setError('fApellidos', 'El apellido es obligatorio.'); valid = false; }

        // Fecha de nacimiento: obligatoria y no futura
        if (!fechaNac) {
            Utils.setError('fFechaNac', 'La fecha de nacimiento es obligatoria.');
            valid = false;
        } else {
            const nac = new Date(fechaNac + 'T00:00:00');
            if (isNaN(nac.getTime())) {
                Utils.setError('fFechaNac', 'Fecha inválida. Usa el formato correcto.');
                valid = false;
            } else if (nac > new Date()) {
                Utils.setError('fFechaNac', 'La fecha de nacimiento no puede ser futura.');
                valid = false;
            }
        }

        // Edad: solo validar si fue ingresada manualmente (el campo puede estar vacío)
        if (edadRaw !== '') {
            const edadNum = Number(edadRaw);
            if (!Number.isFinite(edadNum) || !Number.isInteger(edadNum)) {
                Utils.setError('fEdad', 'Ingresa un número entero válido.');
                valid = false;
            } else if (edadNum < 0) {
                Utils.setError('fEdad', 'La edad no puede ser negativa.');
                valid = false;
            } else if (edadNum > 120) {
                Utils.setError('fEdad', 'La edad máxima permitida es 120 años.');
                valid = false;
            }
        }

        // Sexo: obligatorio
        if (!sexo) { Utils.setError('fSexo', 'Selecciona el sexo.'); valid = false; }

        // Correo: formato válido si se ingresó
        if (correo && !Utils.validarEmail(correo)) {
            Utils.setError('fCorreo', 'Ingresa un correo electrónico válido.');
            valid = false;
        }

        if (!valid) return;

        const btn = document.getElementById('btnSavePac');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

        try {
            const user = Auth.getUser();
            const payload = {
                dni, sexo,
                nombres:          nombres.toUpperCase(),
                apellidos:        apellidos.toUpperCase(),
                fecha_nacimiento: fechaNac,
                celular:          celular || null,
                correo:           correo  || null,
                direccion:        direccion || null,
                observaciones:    obs || null,
            };

            if (paciente) {
                const { error } = await window.db.from('pacientes').update(payload).eq('id', paciente.id);
                if (error) {
                    // BUG FIX: el error de DNI duplicado en UPDATE era ignorado (solo se manejaba en INSERT)
                    if (error.code === '23505') { Utils.setError('fDni', 'Ya existe un paciente con este DNI.'); }
                    else throw error;
                    if (btn) { btn.disabled = false; btn.textContent = 'Guardar Cambios'; }
                    return;
                }
                Notify.success('Paciente actualizado', 'Los datos se guardaron correctamente.');
                if (modalId) {
                    Modal.close(modalId);
                    // Refrescar ficha si estamos en ella
                    if (Router.getRoute() === 'patient-detail') {
                        await renderDetalle(document.getElementById('mainContent'), Router.getParams());
                    }
                }
            } else {
                payload.creado_por = user ? user.id : null;
                const { data: nuevo, error } = await window.db.from('pacientes').insert(payload).select().single();
                if (error) {
                    if (error.code === '23505') { Utils.setError('fDni', 'Ya existe un paciente con este DNI.'); }
                    else throw error;
                    if (btn) { btn.disabled = false; btn.textContent = 'Registrar Paciente'; }
                    return;
                }
                Notify.success('Paciente registrado', '¡El paciente fue registrado exitosamente!');

                /* ── Cerrar el formulario si estaba en modal ── */
                if (modalId) Modal.close(modalId);

                /* ── Ofrecer registrar consulta + medidas visuales inmediatamente ── */
                await _ofrecerConsulta(nuevo.id, nuevo.nombres + ' ' + nuevo.apellidos);
                return;
            }           // ← cierra el bloque else (abierto en línea 399)
        } catch (err) { // ← cierra el bloque try (abierto en línea 375)
            console.error('[Patients] Guardar:', err);
            Notify.error('Error al guardar', err.message || 'Intenta de nuevo.');
            if (btn) { btn.disabled = false; btn.textContent = paciente ? 'Guardar Cambios' : 'Registrar Paciente'; }
        }
    }

    /* ============================================================
       DIÁLOGO: OFRECER CONSULTA + MEDIDAS TRAS CREAR PACIENTE
       Permite al usuario ir directamente a registrar la primera
       consulta con examen visual sin pasos extra.
       ============================================================ */
    async function _ofrecerConsulta(pacienteId, nombrePaciente) {
        const MODAL_ID = 'modal-oferta-consulta';

        Modal.open({
            id:    MODAL_ID,
            title: '¿Registrar consulta?',
            body: `
                <div style="text-align:center;padding:0.5rem 0 1rem">
                    <!-- Ícono -->
                    <div style="width:56px;height:56px;border-radius:50%;background:var(--success-light);
                                color:var(--success);display:flex;align-items:center;justify-content:center;
                                margin:0 auto 1rem">
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24"
                             fill="none" stroke="currentColor" stroke-width="2.5"
                             stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <p style="font-size:0.9375rem;font-weight:700;color:var(--text-primary);margin-bottom:0.5rem">
                        Paciente registrado correctamente
                    </p>
                    <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.5">
                        <strong>${Utils.titleCase(nombrePaciente)}</strong><br>
                        ¿Deseas registrar ahora la primera consulta e ingresar las medidas visuales?
                    </p>
                </div>
            `,
            footer: `
                <button class="btn btn-primary btn-full btn-lg" id="btnIrConsulta">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2.5"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9"  y1="15" x2="15" y2="15"/>
                    </svg>
                    Sí, registrar consulta y medidas
                </button>
                <button class="btn btn-ghost btn-full" id="btnIrFicha">
                    Ver ficha del paciente
                </button>
            `,
        });

        setTimeout(() => {
            const btnConsulta = document.getElementById('btnIrConsulta');
            const btnFicha    = document.getElementById('btnIrFicha');

            if (btnConsulta) {
                btnConsulta.addEventListener('click', () => {
                    Modal.close(MODAL_ID);
                    /* conExamen='true' → el formulario de consulta abre
                       el examen visual expandido automáticamente */
                    Router.navigate('new-consultation', { pacienteId, conExamen: 'true' });
                });
            }

            if (btnFicha) {
                btnFicha.addEventListener('click', () => {
                    Modal.close(MODAL_ID);
                    Router.navigate('patient-detail', { id: pacienteId });
                });
            }
        }, 60);
    }

    /* ============================================================
       FICHA COMPLETA DEL PACIENTE
       ============================================================ */
    async function verDetalle(id, tabInicial = 'historias') {
        Router.navigate('patient-detail', { id, tab: tabInicial });
    }

    async function renderDetalle(container, params = {}) {
        const { id, tab = 'historias' } = params;
        if (!id) { Router.navigate('patients'); return; }

        container.innerHTML = `<div class="empty-state" style="padding:3rem"><svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></div>`;

        const { data: p, error } = await window.db.from('v_pacientes').select('*').eq('id', id).single();
        if (error || !p) { Notify.error('Paciente no encontrado', ''); Router.navigate('patients'); return; }

        const nombre = Utils.titleCase(p.nombres + ' ' + p.apellidos);

        // Actualizar título en top bar
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = nombre.split(' ').slice(0,2).join(' ');

        container.innerHTML = `
            <!-- Header del paciente -->
            <div class="patient-profile">
                <div class="patient-profile-avatar">${Utils.iniciales(nombre)}</div>
                <div class="patient-profile-name">${nombre}</div>
                <div class="patient-profile-meta">
                    <span class="patient-profile-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M16 8a4 4 0 0 0-8 0v8h8V8z"/></svg>
                        ${p.dni}
                    </span>
                    <span class="patient-profile-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${p.edad} años (${Utils.formatDate(p.fecha_nacimiento)})
                    </span>
                    ${p.celular ? `<span class="patient-profile-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72.12.12 0 0 0 .7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        ${p.celular}
                    </span>` : ''}
                    <span class="badge badge-gray" style="background:rgba(255,255,255,0.15);color:white;border:none">
                        ${Utils.sexoLabel(p.sexo)}
                    </span>
                    <span class="badge badge-gray" style="background:rgba(255,255,255,0.15);color:white;border:none">
                        ${p.total_consultas} consulta(s)
                    </span>
                </div>

                <!-- Acciones rápidas -->
                <div style="display:flex;gap:0.625rem;margin-top:1rem;flex-wrap:wrap">
                    <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                        onclick="ClinicalModule.abrirFormularioHistoria('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nueva Consulta
                    </button>
                    <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                        onclick="PatientsModule.abrirFormulario('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Editar
                    </button>
                    <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3)"
                        onclick="ReportsModule.imprimirFicha('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        PDF
                    </button>
                    <!-- [MEJORA] Botón eliminar paciente con confirmación profesional -->
                    <button class="btn btn-sm" style="background:rgba(220,38,38,0.75);color:white;border:1px solid rgba(220,38,38,0.5)"
                        onclick="PatientsModule.eliminar('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        Eliminar
                    </button>
                </div>
            </div>

            <!-- Tab bar -->
            <div class="tab-bar" id="patientTabBar">
                <button class="tab-item ${tab==='historias'?'active':''}" data-tab="historias">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Consultas
                    <span class="tab-badge">${p.total_consultas || 0}</span>
                </button>
                <button class="tab-item ${tab==='examenes'?'active':''}" data-tab="examenes">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Exámenes
                </button>
                <button class="tab-item ${tab==='info'?'active':''}" data-tab="info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Info
                </button>
                <button class="tab-item ${tab==='documentos'?'active':''}" data-tab="documentos">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Docs
                </button>
            </div>

            <!-- Contenido de la tab -->
            <div id="tabContent" style="padding-top:0.875rem"></div>
        `;

        // Activar tabs
        document.querySelectorAll('#patientTabBar .tab-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#patientTabBar .tab-item').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                _loadTab(btn.dataset.tab, id, p);
            });
        });

        await _loadTab(tab, id, p);
    }

    async function _loadTab(tab, pacienteId, paciente) {
        const content = document.getElementById('tabContent');
        if (!content) return;

        if (tab === 'historias') {
            await ClinicalModule.renderHistorias(content, pacienteId, paciente);
        } else if (tab === 'examenes') {
            await ClinicalModule.renderExamenes(content, pacienteId, paciente);
        } else if (tab === 'info') {
            _renderInfo(content, paciente);
        } else if (tab === 'documentos') {
            await DocumentsModule.render(content, pacienteId);
        }
    }

    function _renderInfo(container, p) {
        container.innerHTML = `
            <div class="form-section" style="margin:0 var(--content-px)">
                <div class="form-section-title">Información Personal</div>
                <div class="form-section-body" style="gap:0.875rem">
                    ${_infoField('DNI', p.dni)}
                    ${_infoField('Fecha de Nacimiento', Utils.formatDate(p.fecha_nacimiento))}
                    ${_infoField('Edad', (p.edad ?? '—') + ' años')}
                    ${_infoField('Sexo', Utils.sexoLabel(p.sexo))}
                    ${_infoField('Celular', p.celular || '—')}
                    ${_infoField('Correo', p.correo || '—')}
                    ${_infoField('Dirección', p.direccion || '—')}
                    ${p.observaciones ? _infoField('Observaciones', p.observaciones) : ''}
                    ${_infoField('Registrado', Utils.formatDatetime(p.created_at))}
                </div>
            </div>`;
    }

    function _infoField(label, value) {
        return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;padding:0.5rem 0;border-bottom:1px solid var(--border)">
            <span style="font-size:var(--text-sm);color:var(--text-muted);font-weight:600;flex-shrink:0;min-width:40%">${label}</span>
            <span style="font-size:var(--text-sm);color:var(--text-primary);font-weight:500;text-align:right">${value}</span>
        </div>`;
    }

    /* ============================================================
       ELIMINAR PACIENTE
       [MEJORA] Modal profesional con nombre, DNI y conteo de registros.
       [MEJORA] DELETE real (CASCADE elimina historias, exámenes y documentos).
       [MEJORA] Logs completos para diagnóstico.
       ============================================================ */
    async function eliminar(pacienteId) {
        console.log('[Patients] ▶ Iniciando flujo de eliminación. pacienteId:', pacienteId);

        if (!pacienteId) {
            console.error('[Patients] ERROR: pacienteId es null o undefined');
            Notify.error('Error', 'ID de paciente inválido.');
            return;
        }

        // [MEJORA] Obtener datos completos del paciente para el modal
        const { data: p, error: fetchErr } = await window.db
            .from('pacientes')
            .select('id, dni, nombres, apellidos')
            .eq('id', pacienteId)
            .single();

        if (fetchErr || !p) {
            console.error('[Patients] Error al obtener datos del paciente:', fetchErr);
            Notify.error('Error', 'No se pudieron obtener los datos del paciente.');
            return;
        }

        const nombre = Utils.titleCase(p.nombres + ' ' + p.apellidos);
        console.log('[Patients] Paciente a eliminar:', nombre, '| DNI:', p.dni);

        // [MEJORA] Contar registros relacionados para mostrar impacto al usuario
        const [{ count: nConsultas }, { count: nExamenes }] = await Promise.all([
            window.db.from('historias_clinicas').select('*', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
            window.db.from('examenes_visuales').select('*', { count: 'exact', head: true }).eq('paciente_id', pacienteId),
        ]);
        console.log('[Patients] Registros a eliminar → Consultas:', nConsultas, '| Exámenes:', nExamenes);

        // [MEJORA] Modal de confirmación profesional con desglose de datos
        const MODAL_ID = 'modal-eliminar-paciente';

        const confirmado = await new Promise((resolve) => {
            Modal.open({
                id:    MODAL_ID,
                title: 'Confirmar Eliminación',
                body: `
                    <div style="text-align:center;padding:0.25rem 0 1.25rem">
                        <div class="confirm-icon danger" style="margin:0 auto 1rem">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                        </div>
                        <p style="font-size:0.9375rem;font-weight:700;color:var(--text-primary)">
                            ¿Está seguro de eliminar este paciente?
                        </p>
                    </div>

                    <div class="form-section" style="margin-bottom:1rem">
                        <div class="form-section-body" style="gap:0;padding:0">
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border)">
                                <span style="font-size:var(--tx-sm);font-weight:600;color:var(--text-muted)">Nombre</span>
                                <span style="font-size:var(--tx-sm);font-weight:700;color:var(--text-primary)">${nombre}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border)">
                                <span style="font-size:var(--tx-sm);font-weight:600;color:var(--text-muted)">DNI</span>
                                <span style="font-size:var(--tx-sm);font-weight:700;color:var(--text-primary)">${p.dni}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;border-bottom:1px solid var(--border)">
                                <span style="font-size:var(--tx-sm);font-weight:600;color:var(--text-muted)">Consultas</span>
                                <span class="badge badge-red">${nConsultas ?? 0} a eliminar</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem">
                                <span style="font-size:var(--tx-sm);font-weight:600;color:var(--text-muted)">Exámenes Visuales</span>
                                <span class="badge badge-red">${nExamenes ?? 0} a eliminar</span>
                            </div>
                        </div>
                    </div>

                    <div class="alert alert-error" style="font-size:var(--tx-sm);align-items:flex-start">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span><strong>Esta acción no se puede deshacer.</strong> Se eliminarán permanentemente el paciente, todas sus consultas, exámenes visuales y documentos adjuntos.</span>
                    </div>`,
                footer: `
                    <button class="btn btn-danger btn-full btn-lg" id="btnConfEliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        Eliminar Definitivamente
                    </button>
                    <button class="btn btn-secondary btn-full" id="btnCancelEliminar">Cancelar</button>`,
            });

            setTimeout(() => {
                const btnOk     = document.getElementById('btnConfEliminar');
                const btnCancel = document.getElementById('btnCancelEliminar');
                if (btnOk)     btnOk.addEventListener('click',     () => { Modal.close(MODAL_ID); resolve(true); });
                if (btnCancel) btnCancel.addEventListener('click', () => { Modal.close(MODAL_ID); resolve(false); });
            }, 50);
        });

        if (!confirmado) {
            console.log('[Patients] Eliminación cancelada por el usuario.');
            return;
        }

        console.log('[Patients] ✅ Usuario confirmó eliminación. Ejecutando DELETE CASCADE...');

        try {
            // [MEJORA] DELETE real → ON DELETE CASCADE en historias_clinicas, examenes_visuales
            // y documentos_adjuntos limpia todos los registros relacionados automáticamente.
            const { error } = await window.db.from('pacientes').delete().eq('id', p.id);
            if (error) {
                console.error('[Patients] Error en DELETE pacientes:', error);
                throw error;
            }
            console.log('[Patients] ✅ Paciente y registros eliminados. ID:', p.id, '| Nombre:', nombre);
            Notify.success('Paciente eliminado', `${nombre} y todos sus registros fueron eliminados del sistema.`);
            Router.navigate('patients');
        } catch (err) {
            console.error('[Patients] Error fatal al eliminar paciente:', err);
            // [FIX] Distinguir error de permisos (RLS) vs. error técnico
            if (err.code === '42501' || (err.message && err.message.toLowerCase().includes('policy'))) {
                Notify.error('Sin permisos', 'Solo el administrador del sistema puede eliminar pacientes.');
            } else {
                Notify.error('Error al eliminar', err.message || 'Ocurrió un error inesperado. Intenta de nuevo.');
            }
        }
    }

    function _skeletonCards(n) {
        return Array(n).fill(`
            <div class="patient-card" style="pointer-events:none">
                <div class="patient-card-header">
                    <div class="skeleton" style="width:3rem;height:3rem;border-radius:50%;flex-shrink:0"></div>
                    <div style="flex:1">
                        <div class="skeleton" style="height:16px;width:65%;margin-bottom:8px"></div>
                        <div class="skeleton" style="height:12px;width:80%"></div>
                    </div>
                </div>
                <div class="skeleton" style="height:1px;margin:0.75rem 0"></div>
                <div style="display:flex;justify-content:space-between">
                    <div class="skeleton" style="height:12px;width:50%"></div>
                    <div class="skeleton" style="height:30px;width:80px;border-radius:8px"></div>
                </div>
            </div>
        `).join('');
    }

    return {
        render, renderDetalle, renderFormularioNuevo,
        abrirFormulario, abrirExamenRapido, verDetalle, eliminar,
        _goPage,
    };
})();
