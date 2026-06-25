/* ============================================================
   APP.JS — Controlador principal SPA Mobile
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.App = {};

(async function initApp() {

    /* ---- 1. Verificar sesión ---- */
    let session;
    try { session = await Auth.getSession(); } catch { session = null; }
    if (!session) { window.location.href = 'index.html'; return; }

    /* ---- 2. Cargar perfil ---- */
    const perfil = await Auth.getPerfil();

    /* ---- 3. Mostrar la app ---- */
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('appLayout').style.display = '';

    /* ---- 4. Info usuario en top bar ---- */
    _renderUserInfo(perfil);

    /* ---- 5. Tema ---- */
    _initTheme();

    /* ---- 6. Navegación inferior ---- */
    _initBottomNav();

    /* ---- 7. FAB ---- */
    _initFAB();

    /* ---- 8. Búsqueda global ---- */
    _initGlobalSearch();

    /* ---- 9. Avatar → pantalla de ajustes ---- */
    document.getElementById('userAvatar').addEventListener('click', () => {
        Router.navigate('settings');
    });

    /* ---- 10. Registrar rutas ---- */

    // Rutas principales (bottom nav visible)
    Router.on('dashboard', async () => {
        _setMainRoute('dashboard', 'Inicio');
        await DashboardModule.render(document.getElementById('mainContent'));
    });

    Router.on('patients', async (params) => {
        _setMainRoute('patients', 'Pacientes');
        await PatientsModule.render(document.getElementById('mainContent'), params);
    });

    Router.on('history', async () => {
        _setMainRoute('history', 'Historial');
        await _renderHistory(document.getElementById('mainContent'));
    });

    Router.on('settings', async () => {
        _setMainRoute('settings', 'Configuración');
        await _renderSettings(document.getElementById('mainContent'));
    });

    // Rutas de sub-página (back button visible)
    Router.on('patient-detail', async (params) => {
        _setSubRoute('patient-detail', 'Ficha del Paciente');
        await PatientsModule.renderDetalle(document.getElementById('mainContent'), params);
    });

    Router.on('new-consultation', async (params) => {
        _setSubRoute('new-consultation', 'Nueva Consulta');
        await ClinicalModule.renderFormularioNuevo(document.getElementById('mainContent'), params);
    });

    Router.on('new-patient', async () => {
        _setSubRoute('new-patient', 'Nuevo Paciente');
        await PatientsModule.renderFormularioNuevo(document.getElementById('mainContent'));
    });

    Router.on('reports', async () => {
        _setSubRoute('reports', 'Reportes');
        await ReportsModule.render(document.getElementById('mainContent'));
    });

    /* ---- 11. Botón volver ---- */
    document.getElementById('backBtn').addEventListener('click', () => {
        const params = Router.getParams();
        if (params && params.from) {
            Router.navigate(params.from, params.fromParams ? JSON.parse(params.fromParams) : {});
        } else {
            const main = ['dashboard','patients','history','settings'];
            const cur  = Router.getRoute();
            // Inferir destino lógico
            if (cur === 'patient-detail') Router.navigate('patients');
            else if (cur === 'new-consultation') {
                if (params && params.pacienteId) Router.navigate('patient-detail', { id: params.pacienteId });
                else Router.navigate('patients');
            }
            else if (cur === 'new-patient') Router.navigate('patients');
            else if (cur === 'reports') Router.navigate('settings');
            else Router.navigate('dashboard');
        }
    });

    /* ---- 12. Escuchar cambios de sesión ---- */
    Auth.onAuthChange((event) => {
        if (event === 'SIGNED_OUT') window.location.href = 'index.html';
    });

    /* ---- 13. Iniciar router ---- */
    Router.init('dashboard');

})();

/* ============================================================
   HELPERS DE NAVEGACIÓN
   ============================================================ */

const _mainRoutes = ['dashboard', 'patients', 'history', 'settings'];

function _setMainRoute(routeKey, title) {
    App.closeFabMenu(); // [MEJORA] Cerrar speed dial al navegar
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('pageTitle').textContent = title;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.route === routeKey);
    });
    window.scrollTo(0, 0);
}

function _setSubRoute(routeKey, title) {
    App.closeFabMenu(); // [MEJORA] Cerrar speed dial al navegar
    document.getElementById('backBtn').style.display = '';
    document.getElementById('pageTitle').textContent = title;
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    window.scrollTo(0, 0);
}
function _renderUserInfo(perfil) {
    if (!perfil) return;
    const el = document.getElementById('userAvatar');
    if (el) el.textContent = Utils.iniciales(perfil.nombre_completo || 'U');
}

/* ============================================================
   TEMA
   ============================================================ */
function _initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    _applyThemeColor(saved);
    _updateThemeIcon(saved);

    document.getElementById('themeToggle').addEventListener('click', () => {
        const cur  = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        _applyThemeColor(next);
        _updateThemeIcon(next);
    });
}

function _updateThemeIcon(theme) {
    const sun  = document.getElementById('iconSunApp');
    const moon = document.getElementById('iconMoonApp');
    if (sun)  sun.style.display  = theme === 'dark'  ? 'none' : '';
    if (moon) moon.style.display = theme === 'light' ? 'none' : '';
}

function _applyThemeColor(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#1e293b' : '#1d4ed8';
}

/* ============================================================
   BOTTOM NAVIGATION
   ============================================================ */
function _initBottomNav() {
    document.querySelectorAll('.nav-btn[data-route]').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.dataset.route;
            if (_mainRoutes.includes(route)) Router.navigate(route);
        });
    });
}

/* ============================================================
   FAB — Speed Dial Menu contextual según ruta
   [MEJORA] Muestra opciones según la pantalla actual
   ============================================================ */
let _fabMenuOpen = false;

App.closeFabMenu = function() {
    if (!_fabMenuOpen) return;
    _fabMenuOpen = false;
    const fab  = document.getElementById('navFab');
    const menu = document.getElementById('fabMenu');
    const items = document.getElementById('fabMenuItems');
    if (fab)  { fab.classList.remove('menu-open'); fab.setAttribute('aria-expanded', 'false'); }
    if (menu) { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
    if (items) items.innerHTML = '';
};

function _initFAB() {
    const fab      = document.getElementById('navFab');
    const menu     = document.getElementById('fabMenu');
    const backdrop = document.getElementById('fabMenuBackdrop');
    const itemsEl  = document.getElementById('fabMenuItems');
    if (!fab) return;

    fab.addEventListener('click', () => {
        if (_fabMenuOpen) { App.closeFabMenu(); return; }

        const route  = Router.getRoute();
        const params = Router.getParams() || {};

        // [FIX] En formularios el FAB no hace nada
        if (route === 'new-consultation' || route === 'new-patient') return;

        // [MEJORA] Construir items según contexto
        const items = _buildFabItems(route, params);

        // Si solo hay un item, navegar directamente sin abrir menú
        if (items.length === 1) { items[0].action(); return; }

        // Abrir speed dial menu
        _fabMenuOpen = true;
        fab.classList.add('menu-open');
        fab.setAttribute('aria-expanded', 'true');
        menu.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');

        itemsEl.innerHTML = items.map((it, i) => `
            <button class="fab-menu-item" data-idx="${i}" style="animation-delay:${i * 0.05}s">
                <span class="fab-menu-item-icon" style="background:${it.bg};color:${it.color}">${it.icon}</span>
                <span>${it.label}</span>
            </button>`).join('');

        itemsEl.querySelectorAll('.fab-menu-item').forEach((el, i) => {
            el.addEventListener('click', () => { App.closeFabMenu(); items[i].action(); });
        });
    });

    if (backdrop) backdrop.addEventListener('click', App.closeFabMenu);

    // Cerrar al presionar Escape
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') App.closeFabMenu(); });
}

function _buildFabItems(route, params) {
    const icoConsulta = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
    const icoPaciente = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`;

    if (route === 'patient-detail' && params.id) {
        // [MEJORA] Desde ficha de paciente: solo "Nueva Consulta" para ese paciente
        return [{
            label: 'Nueva Consulta',
            color: 'var(--success)', bg: 'var(--success-light)', icon: icoConsulta,
            action: () => Router.navigate('new-consultation', { pacienteId: params.id })
        }];
    }
    if (route === 'patients') {
        // [MEJORA] Desde listado: solo "Nuevo Paciente"
        return [{
            label: 'Nuevo Paciente',
            color: 'var(--primary)', bg: 'var(--primary-light)', icon: icoPaciente,
            action: () => Router.navigate('new-patient')
        }];
    }
    // [MEJORA] Dashboard, historial u otros: las 2 acciones principales
    return [
        {
            label: 'Nueva Consulta',
            color: 'var(--success)', bg: 'var(--success-light)', icon: icoConsulta,
            action: () => Router.navigate('new-consultation')
        },
        {
            label: 'Nuevo Paciente',
            color: 'var(--primary)', bg: 'var(--primary-light)', icon: icoPaciente,
            action: () => Router.navigate('new-patient')
        }
    ];
}

/* ============================================================
   BÚSQUEDA GLOBAL
   ============================================================ */
function _initGlobalSearch() {
    const overlay = document.getElementById('searchOverlay');
    const input   = document.getElementById('globalSearchInput');
    const results = document.getElementById('globalSearchResults');

    document.getElementById('btnHeaderSearch').addEventListener('click', () => {
        overlay.style.display = '';
        setTimeout(() => { if (input) input.focus(); }, 100);
    });

    const doSearch = Utils.debounce(async (term) => {
        if (!term || term.length < 2) {
            results.innerHTML = `<p style="text-align:center;padding:1rem;font-size:0.875rem;color:var(--text-muted)">Escribe para buscar...</p>`;
            return;
        }

        results.innerHTML = `<div class="activity-item"><svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg> Buscando...</div>`;

        try {
            const { data } = await window.db.rpc('fn_buscar_pacientes', { p_termino: term, p_limite: 10 });

            if (!data || data.length === 0) {
                results.innerHTML = `
                    <div class="empty-state" style="padding:1.5rem">
                        <p>Sin resultados para "<strong>${term}</strong>"</p>
                    </div>`;
                return;
            }

            results.innerHTML = data.map(p => {
                const nombre = Utils.titleCase(p.nombres + ' ' + p.apellidos);
                return `
                    <div class="activity-item" onclick="App.selectSearchResult('${p.id}')">
                        <div class="activity-avatar">${Utils.iniciales(nombre)}</div>
                        <div class="activity-info">
                            <div class="activity-name">${nombre}</div>
                            <div class="activity-meta">DNI: ${p.dni} · ${p.edad ?? '—'} años · ${p.celular || 'Sin celular'}</div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>`;
            }).join('');
        } catch (err) {
            console.error('[Search]', err);
        }
    }, 300);

    if (input) {
        input.addEventListener('input', (e) => doSearch(e.target.value.trim()));
        input.addEventListener('keydown', (e) => { if (e.key === 'Escape') App.closeSearch(); });
    }
}

App.closeSearch = function() {
    const overlay = document.getElementById('searchOverlay');
    const input   = document.getElementById('globalSearchInput');
    const results = document.getElementById('globalSearchResults');
    if (overlay) overlay.style.display = 'none';
    if (input)   input.value = '';
    if (results) results.innerHTML = '';
};

App.selectSearchResult = function(patientId) {
    App.closeSearch();
    Router.navigate('patient-detail', { id: patientId });
};

/* ============================================================
   PANTALLA: HISTORIAL RECIENTE
   ============================================================ */
async function _renderHistory(container) {
    container.innerHTML = `
        <div class="search-container">
            <div class="search-wrapper" style="position:relative;margin-bottom:1rem">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input id="histSearch" class="search-input" type="search" placeholder="Buscar en historial...">
            </div>
        </div>
        <div class="card" style="margin:0 var(--content-px);border-radius:var(--r-lg)">
            <div id="histList" class="activity-list">
                <div class="empty-state" style="padding:2rem">
                    <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                </div>
            </div>
        </div>`;

    await _loadHistorial();

    const searchFn = Utils.debounce(async (e) => {
        const term = e.target.value.trim();
        await _loadHistorial(term);
    }, 350);
    document.getElementById('histSearch').addEventListener('input', searchFn);
}

async function _loadHistorial(termino = '') {
    const el = document.getElementById('histList');
    if (!el) return;

    try {
        let query = window.db.from('v_historias').select('id, pac_nombre, pac_dni, motivo_consulta, fecha_consulta, paciente_id, optometra_nombre')
            .order('fecha_consulta', { ascending: false }).limit(40);

        if (termino) {
            query = query.or(`pac_nombre.ilike.%${termino}%, pac_dni.ilike.%${termino}%, motivo_consulta.ilike.%${termino}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            el.innerHTML = `<div class="empty-state" style="padding:2rem"><h3>Sin consultas</h3><p>No se encontraron registros.</p></div>`;
            return;
        }

        el.innerHTML = data.map(h => {
            const nombre = Utils.titleCase(h.pac_nombre || '');
            return `
            <div class="activity-item" onclick="Router.navigate('patient-detail',{id:'${h.paciente_id}',tab:'historias'})">
                <div class="activity-avatar" style="background:var(--success-light);color:var(--success)">${Utils.iniciales(nombre)}</div>
                <div class="activity-info">
                    <div class="activity-name">${nombre}</div>
                    <div class="activity-meta">${Utils.truncate(h.motivo_consulta, 45)}</div>
                </div>
                <div class="activity-time">${Utils.formatDate(h.fecha_consulta)}</div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('[History]', err);
        el.innerHTML = `<div class="alert alert-error" style="margin:1rem">Error al cargar el historial.</div>`;
    }
}

/* ============================================================
   PANTALLA: CONFIGURACIÓN / AJUSTES
   ============================================================ */
async function _renderSettings(container) {
    const perfil = await Auth.getPerfil(true);
    const nombre  = perfil ? perfil.nombre_completo : 'Usuario';
    const rol     = perfil ? Utils.rolLabel(perfil.rol) : '';

    container.innerHTML = `
        <!-- Perfil del usuario -->
        <div style="background:var(--top-bar-bg);padding:1.5rem var(--content-px) 1.75rem;margin-bottom:0.875rem">
            <div style="display:flex;align-items:center;gap:1rem">
                <div class="patient-profile-avatar" style="width:3.5rem;height:3.5rem;font-size:1.25rem">${Utils.iniciales(nombre)}</div>
                <div>
                    <div style="font-size:1.125rem;font-weight:800;color:white;line-height:1.2">${nombre}</div>
                    <div style="font-size:0.875rem;color:rgba(255,255,255,0.7);margin-top:0.25rem">${rol}</div>
                </div>
            </div>
        </div>

        <!-- Sección: Cuenta -->
        <div class="section-label">Mi Cuenta</div>
        <div class="card" style="margin:0 var(--content-px);border-radius:var(--r-lg);margin-bottom:0.875rem">
            <div class="settings-list">
                <div class="settings-item" onclick="App.editarPerfil()">
                    <div class="settings-item-icon" style="background:var(--primary-light);color:var(--primary)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div class="settings-item-info">
                        <h3>Editar Perfil</h3>
                        <p>Nombre y teléfono de contacto</p>
                    </div>
                    <svg class="settings-item-action" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                <div class="settings-item" onclick="App.cambiarPassword()">
                    <div class="settings-item-icon" style="background:var(--warning-light);color:var(--warning)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div class="settings-item-info">
                        <h3>Cambiar Contraseña</h3>
                        <p>Actualiza tu contraseña de acceso</p>
                    </div>
                    <svg class="settings-item-action" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>
        </div>

        <!-- Sección: Sistema -->
        <div class="section-label">Sistema</div>
        <div class="card" style="margin:0 var(--content-px);border-radius:var(--r-lg);margin-bottom:0.875rem">
            <div class="settings-list">
                <div class="settings-item" onclick="Router.navigate('reports')">
                    <div class="settings-item-icon" style="background:var(--success-light);color:var(--success)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <div class="settings-item-info">
                        <h3>Reportes y PDF</h3>
                        <p>Exportar estadísticas y fichas</p>
                    </div>
                    <svg class="settings-item-action" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>

                <div class="settings-item">
                    <div class="settings-item-icon" style="background:var(--bg-surface-2);color:var(--text-secondary)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    </div>
                    <div class="settings-item-info">
                        <h3>Modo Oscuro</h3>
                        <p>Cambiar apariencia visual</p>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="darkModeToggle" ${document.documentElement.getAttribute('data-theme') === 'dark' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                ${Auth.esAdmin() ? `
                <div class="settings-item" onclick="App.gestionUsuarios()">
                    <div class="settings-item-icon" style="background:var(--primary-light);color:var(--primary)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="settings-item-info">
                        <h3>Gestión de Usuarios</h3>
                        <p>Administrar accesos al sistema</p>
                    </div>
                    <svg class="settings-item-action" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>` : ''}
            </div>
        </div>

        <!-- Cerrar sesión -->
        <div style="padding:0 var(--content-px)">
            <button class="btn btn-danger btn-full btn-lg" onclick="App.confirmarLogout()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Cerrar Sesión
            </button>
        </div>

        <div style="text-align:center;padding:1.5rem;font-size:0.75rem;color:var(--text-muted)">
            Consultorio Robert Goicochea · v1.0.0<br>Sistema de Gestión Clínica Optométrica
        </div>
    `;

    // Toggle de modo oscuro
    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
        const theme = e.target.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        _applyThemeColor(theme);
        _updateThemeIcon(theme);
    });
}

/* ============================================================
   ACCIONES DESDE AJUSTES
   ============================================================ */
App.confirmarLogout = async function() {
    const ok = await Modal.confirm({
        title: 'Cerrar Sesión',
        message: '¿Deseas cerrar tu sesión en el sistema?',
        confirmText: 'Sí, salir',
        cancelText: 'Cancelar',
    });
    if (ok) await Auth.logout();
};

App.editarPerfil = async function() {
    const perfil = await Auth.getPerfil();
    const m = Modal.open({
        title: 'Editar Perfil',
        size: 'md',
        body: `
            <form id="profileForm" novalidate>
                <div class="form-section">
                    <div class="form-section-body">
                        <div class="form-group">
                            <label class="form-label">Nombre completo</label>
                            <input id="pNombre" class="form-input" value="${perfil ? perfil.nombre_completo : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input id="pTel" class="form-input" type="tel" value="${perfil && perfil.telefono ? perfil.telefono : ''}">
                        </div>
                    </div>
                </div>
            </form>`,
        footer: `
            <button class="btn btn-primary btn-full btn-lg" id="btnSavePerfil">Guardar Cambios</button>
            <button class="btn btn-ghost btn-full" id="btnCancelPerfil">Cancelar</button>`,
    });
    setTimeout(() => {
        document.getElementById('btnCancelPerfil').onclick = () => Modal.close(m.id);
        document.getElementById('btnSavePerfil').onclick = async () => {
            const nombre = document.getElementById('pNombre').value.trim();
            const tel    = document.getElementById('pTel').value.trim();
            if (!nombre) { Notify.warning('Nombre requerido', ''); return; }
            try {
                await Auth.actualizarPerfil({ nombre_completo: nombre, telefono: tel || null });
                _renderUserInfo(await Auth.getPerfil(true));
                Notify.success('Perfil actualizado', '');
                Modal.close(m.id);
                // Recargar ajustes
                await _renderSettings(document.getElementById('mainContent'));
            } catch (err) { Notify.error('Error', err.message); }
        };
    }, 50);
};

App.cambiarPassword = function() {
    const m = Modal.open({
        title: 'Cambiar Contraseña',
        size: 'md',
        body: `
            <div class="form-section">
                <div class="form-section-body">
                    <div class="form-group">
                        <label class="form-label">Nueva contraseña</label>
                        <input type="password" id="pwd1" class="form-input" placeholder="Mínimo 6 caracteres">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirmar contraseña</label>
                        <input type="password" id="pwd2" class="form-input" placeholder="Repite la contraseña">
                    </div>
                </div>
            </div>`,
        footer: `
            <button class="btn btn-primary btn-full btn-lg" id="btnSavePwd">Cambiar Contraseña</button>
            <button class="btn btn-ghost btn-full" id="btnCancelPwd">Cancelar</button>`,
    });
    setTimeout(() => {
        document.getElementById('btnCancelPwd').onclick = () => Modal.close(m.id);
        document.getElementById('btnSavePwd').onclick = async () => {
            const p1 = document.getElementById('pwd1').value;
            const p2 = document.getElementById('pwd2').value;
            if (!p1 || p1.length < 6) { Notify.warning('Contraseña muy corta', 'Mínimo 6 caracteres.'); return; }
            if (p1 !== p2)            { Notify.warning('No coinciden', 'Las contraseñas no coinciden.'); return; }
            try {
                await Auth.cambiarPassword(p1);
                Notify.success('Contraseña actualizada', '');
                Modal.close(m.id);
            } catch (err) { Notify.error('Error', err.message); }
        };
    }, 50);
};

App.gestionUsuarios = async function() {
    const usuarios = await Auth.listarUsuarios();

    /* FIX TDZ: pre-definir el ID ANTES de pasarlo al template literal.
       El error "Cannot access 'm' before initialization" ocurría porque
       m.id se evaluaba dentro del argumento de Modal.open() mientras
       'const m' aún estaba en la Temporal Dead Zone (no asignado). */
    const MODAL_ID = 'modal-gestion-usuarios';

    const m = Modal.open({
        id:    MODAL_ID,
        title: 'Usuarios del Sistema',
        size:  'lg',
        body: `
            <div class="activity-list">
                ${usuarios.map(u => `
                    <div class="activity-item">
                        <div class="activity-avatar"
                             style="background:var(--primary-light);color:var(--primary);font-weight:800">
                            ${Utils.iniciales(u.nombre_completo)}
                        </div>
                        <div class="activity-info">
                            <div class="activity-name">${u.nombre_completo}</div>
                            <div class="activity-meta">${Utils.rolLabel(u.rol)} &middot; ${u.activo ? 'Activo' : 'Inactivo'}</div>
                        </div>
                        <button class="btn btn-xs ${u.activo ? 'btn-danger' : 'btn-secondary'}"
                            onclick="App.toggleUsuario('${u.id}', ${!u.activo}, '${u.nombre_completo}', '${MODAL_ID}')">
                            ${u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="alert alert-info" style="margin-top:1rem;font-size:0.8125rem">
                Para crear nuevos usuarios ve a
                <strong>Supabase Dashboard → Authentication → Users → Invite User</strong>.
            </div>`,
        footer: `<button class="btn btn-secondary btn-full btn-lg" id="btnCloseUsers">Cerrar</button>`,
    });

    setTimeout(() => {
        const closeBtn = document.getElementById('btnCloseUsers');
        if (closeBtn) closeBtn.onclick = () => Modal.close(MODAL_ID);
    }, 50);
};

App.toggleUsuario = async function(userId, newStatus, nombre, modalId) {
    const ok = await Modal.confirm({
        title: `${newStatus ? 'Activar' : 'Desactivar'} Usuario`,
        message: `¿Confirmas ${newStatus ? 'activar' : 'desactivar'} el acceso de ${nombre}?`,
        confirmText: 'Confirmar',
        danger: !newStatus,
    });
    if (!ok) return;
    try {
        await Auth.toggleUsuario(userId, newStatus);
        Notify.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`, '');
        Modal.close(modalId);
        App.gestionUsuarios();
    } catch (err) { Notify.error('Error', err.message); }
};
// [FIX] _applyThemeColor ya definida arriba (línea ~169) — duplicado eliminado
