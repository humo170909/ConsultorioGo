/* ============================================================
   ROUTER.JS — Enrutador SPA basado en hash
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.Router = (function () {

    const _routes = {};
    let   _current = null;
    let   _defaultRoute = 'dashboard';

    /* ---- Registrar una ruta ---- */
    function on(route, handler) {
        _routes[route] = handler;
    }

    /* ---- Navegar a una ruta ---- */
    function navigate(route, params = {}) {
        const hashValue = params && Object.keys(params).length
            ? route + '?' + new URLSearchParams(params).toString()
            : route;
        window.location.hash = '#/' + hashValue;
    }

    /* ---- Obtener ruta y params actuales ---- */
    function _parseHash() {
        const hash = window.location.hash.replace('#/', '').replace('#', '') || _defaultRoute;
        const [route, queryStr] = hash.split('?');
        const params = {};
        if (queryStr) {
            new URLSearchParams(queryStr).forEach((v, k) => { params[k] = v; });
        }
        return { route, params };
    }

    /* ---- Manejar cambio de ruta ---- */
    async function _handle() {
        const { route, params } = _parseHash();
        if (!_routes[route]) {
            navigate(_defaultRoute);
            return;
        }
        _current = { route, params };

        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.route === route);
        });

        // Actualizar título de página
        const titles = {
            dashboard:  'Dashboard',
            patients:   'Pacientes',
            'patient-detail': 'Ficha del Paciente',
            search:     'Búsqueda Avanzada',
            reports:    'Reportes',
            users:      'Usuarios',
            profile:    'Mi Perfil',
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[route] || 'Sistema Clínico';

        // Ejecutar handler de la ruta
        try {
            await _routes[route](params);
        } catch (err) {
            console.error('[Router] Error en ruta:', route, err);
        }
    }

    /* ---- Iniciar el router ---- */
    function init(defaultRoute = 'dashboard') {
        _defaultRoute = defaultRoute;
        window.addEventListener('hashchange', _handle);
        _handle(); // ejecutar ruta inicial
    }

    /* ---- Getters ---- */
    function getCurrent() { return _current; }
    function getRoute()   { return _current ? _current.route  : null; }
    function getParams()  { return _current ? _current.params : {}; }

    return { on, navigate, init, getCurrent, getRoute, getParams };
})();
