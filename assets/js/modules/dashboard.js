/* ============================================================
   DASHBOARD.JS — Panel principal Mobile-First
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.DashboardModule = (function () {

    async function render(container) {
        container.innerHTML = `
            <!-- Hero: saludo y fecha -->
            <div class="page-hero">
                <div class="page-hero-greeting" id="dashGreeting"></div>
                <div class="page-hero-date" id="dashDate"></div>
            </div>

            <!-- Estadísticas -->
            <div class="stats-grid" id="statsGrid">${_skeletonStats()}</div>

            <!-- Búsqueda rápida -->
            <div class="search-container">
                <div class="search-wrapper" style="position:relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input id="dashSearch" class="search-input" type="search" placeholder="Buscar paciente rápidamente...">
                    <div id="dashSearchResults" class="search-dropdown" style="display:none"></div>
                </div>
            </div>

            <!-- Últimas consultas -->
            <div class="section-label">Últimas Consultas</div>
            <div class="card" style="margin:0 var(--px) 0.875rem">
                <div id="recentList" class="activity-list">${_skeletonList(4)}</div>
                <div style="padding:0.75rem 1rem;border-top:1px solid var(--border)">
                    <button class="btn btn-ghost btn-full btn-sm" onclick="Router.navigate('history')">
                        Ver todo el historial →
                    </button>
                </div>
            </div>

            <!-- Accesos rápidos -->
            <div class="section-label">Accesos Rápidos</div>
            <!-- [MEJORA] quick-access-grid: 2-col móvil, 4-col desktop (definido en CSS) -->
            <div class="quick-access-grid">
                <button class="card" style="padding:1.125rem;text-align:center;cursor:pointer;border:none;width:100%"
                    onclick="Router.navigate('new-patient')">
                    <div style="width:2.5rem;height:2.5rem;background:var(--primary-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--primary);margin:0 auto 0.75rem;flex-shrink:0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    </div>
                    <div style="font-size:0.8125rem;font-weight:700;color:var(--text-primary)">Nuevo Paciente</div>
                    <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.2rem">Registrar</div>
                </button>

                <button class="card" style="padding:1.125rem;text-align:center;cursor:pointer;border:none;width:100%"
                    onclick="Router.navigate('new-consultation')">
                    <div style="width:2.5rem;height:2.5rem;background:var(--success-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--success);margin:0 auto 0.75rem;flex-shrink:0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    </div>
                    <div style="font-size:0.8125rem;font-weight:700;color:var(--text-primary)">Nueva Consulta</div>
                    <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.2rem">Registrar</div>
                </button>

                <button class="card" style="padding:1.125rem;text-align:center;cursor:pointer;border:none;width:100%"
                    onclick="Router.navigate('patients')">
                    <div style="width:2.5rem;height:2.5rem;background:var(--warning-light);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--warning);margin:0 auto 0.75rem;flex-shrink:0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <div style="font-size:0.8125rem;font-weight:700;color:var(--text-primary)">Buscar Paciente</div>
                    <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.2rem">Lista completa</div>
                </button>

                <button class="card" style="padding:1.125rem;text-align:center;cursor:pointer;border:none;width:100%"
                    onclick="Router.navigate('reports')">
                    <div style="width:2.5rem;height:2.5rem;background:#ede9fe;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#7c3aed;margin:0 auto 0.75rem;flex-shrink:0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <div style="font-size:0.8125rem;font-weight:700;color:var(--text-primary)">Reportes PDF</div>
                    <div style="font-size:0.6875rem;color:var(--text-muted);margin-top:0.2rem">Exportar</div>
                </button>
            </div>
        `;

        _renderGreeting();
        await Promise.all([_loadStats(), _loadRecentConsultas()]);
        _initDashSearch();
    }

    function _renderGreeting() {
        const hora = new Date().getHours();
        let saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const dia  = new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long' });
        const gEl  = document.getElementById('dashGreeting');
        const dEl  = document.getElementById('dashDate');
        if (gEl) gEl.textContent = saludo + ', Dr. Goicochea';
        if (dEl) dEl.textContent = Utils.capitalize(dia);
    }

    async function _loadStats() {
        try {
            const { data, error } = await window.db.from('v_estadisticas').select('*').single();
            if (error) throw error;

            const grid = document.getElementById('statsGrid');
            if (!grid) return;

            grid.innerHTML = `
                <div class="stat-chip blue">
                    <div class="stat-chip-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <div class="stat-chip-label">Total Pacientes</div>
                    <div class="stat-chip-value">${data.total_pacientes || 0}</div>
                </div>
                <div class="stat-chip green">
                    <div class="stat-chip-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    </div>
                    <div class="stat-chip-label">Nuevos este mes</div>
                    <div class="stat-chip-value">${data.pacientes_este_mes || 0}</div>
                </div>
                <div class="stat-chip orange">
                    <div class="stat-chip-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div class="stat-chip-label">Consultas del mes</div>
                    <div class="stat-chip-value">${data.consultas_este_mes || 0}</div>
                </div>
                <div class="stat-chip purple">
                    <div class="stat-chip-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <div class="stat-chip-label">Total consultas</div>
                    <div class="stat-chip-value">${data.total_consultas || 0}</div>
                </div>
            `;
        } catch (err) {
            console.error('[Dashboard] Stats error:', err);
        }
    }

    async function _loadRecentConsultas() {
        try {
            const { data, error } = await window.db
                .from('v_historias')
                .select('id, pac_nombre, pac_dni, motivo_consulta, fecha_consulta, paciente_id')
                .order('fecha_consulta', { ascending: false })
                .limit(5);
            if (error) throw error;

            const el = document.getElementById('recentList');
            if (!el) return;

            if (!data || data.length === 0) {
                el.innerHTML = `<div class="empty-state" style="padding:1.5rem"><p>Sin consultas registradas.</p></div>`;
                return;
            }

            el.innerHTML = data.map(h => {
                const nombre = Utils.titleCase(h.pac_nombre || '');
                return `
                <div class="activity-item" onclick="Router.navigate('patient-detail',{id:'${h.paciente_id}',tab:'historias'})">
                    <div class="activity-avatar">${Utils.iniciales(nombre)}</div>
                    <div class="activity-info">
                        <div class="activity-name">${nombre}</div>
                        <div class="activity-meta">${Utils.truncate(h.motivo_consulta, 42)}</div>
                    </div>
                    <div class="activity-time">${Utils.formatDate(h.fecha_consulta)}</div>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('[Dashboard] Recent error:', err);
        }
    }

    function _initDashSearch() {
        const input    = document.getElementById('dashSearch');
        const dropdown = document.getElementById('dashSearchResults');
        if (!input || !dropdown) return;

        const search = Utils.debounce(async (term) => {
            if (!term || term.length < 2) { dropdown.style.display = 'none'; return; }
            try {
                const { data } = await window.db.rpc('fn_buscar_pacientes', { p_termino: term, p_limite: 6 });
                if (!data || data.length === 0) {
                    dropdown.innerHTML = `<div class="activity-item"><div class="activity-info"><div class="activity-name" style="color:var(--text-muted)">Sin resultados para "${term}"</div></div></div>`;
                    dropdown.style.display = 'block';
                    return;
                }
                dropdown.style.display = 'block';
                dropdown.innerHTML = data.map(p => {
                    const nombre = Utils.titleCase(p.nombres + ' ' + p.apellidos);
                    return `
                    <div class="activity-item" onclick="_dashSelectPatient('${p.id}')">
                        <div class="activity-avatar">${Utils.iniciales(nombre)}</div>
                        <div class="activity-info">
                            <div class="activity-name">${nombre}</div>
                            <div class="activity-meta">DNI: ${p.dni} · ${p.edad ?? '—'} años</div>
                        </div>
                    </div>`;
                }).join('');
            } catch {}
        }, 300);

        input.addEventListener('input', (e) => search(e.target.value.trim()));
        input.addEventListener('blur', () => setTimeout(() => { dropdown.style.display = 'none'; }, 200));
        input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { dropdown.style.display = 'none'; input.value = ''; } });
    }

    window._dashSelectPatient = function(id) {
        const input = document.getElementById('dashSearch');
        const dropdown = document.getElementById('dashSearchResults');
        if (input) input.value = '';
        if (dropdown) dropdown.style.display = 'none';
        Router.navigate('patient-detail', { id });
    };

    function _skeletonStats() {
        return Array(4).fill(`
            <div class="stat-chip" style="border:1px solid var(--border)">
                <div class="skeleton" style="width:36px;height:36px;border-radius:8px;margin-bottom:0.75rem"></div>
                <div class="skeleton" style="height:10px;width:70%;margin-bottom:0.5rem"></div>
                <div class="skeleton" style="height:28px;width:45%"></div>
            </div>
        `).join('');
    }

    function _skeletonList(n) {
        return Array(n).fill(`
            <div class="activity-item" style="pointer-events:none">
                <div class="activity-avatar skeleton"></div>
                <div class="activity-info">
                    <div class="skeleton" style="height:14px;width:55%;margin-bottom:6px"></div>
                    <div class="skeleton" style="height:11px;width:80%"></div>
                </div>
                <div class="skeleton" style="height:11px;width:45px"></div>
            </div>
        `).join('');
    }

    return { render };
})();
