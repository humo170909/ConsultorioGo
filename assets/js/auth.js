/* ============================================================
   AUTH.JS — Módulo de autenticación
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.Auth = (function () {

    let _session = null;
    let _perfil  = null;

    /* ---- Obtener sesión activa ---- */
    async function getSession() {
        const { data, error } = await window.db.auth.getSession();
        if (error) throw error;
        _session = data.session;
        return _session;
    }

    /* ---- Obtener usuario actual ---- */
    function getUser() {
        return _session ? _session.user : null;
    }

    /* ---- Obtener perfil del usuario ---- */
    async function getPerfil(force = false) {
        if (_perfil && !force) return _perfil;
        const user = getUser();
        if (!user) return null;

        const { data, error } = await window.db
            .from('perfiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('[Auth] Error al obtener perfil:', error);
            return null;
        }
        _perfil = data;
        return _perfil;
    }

    /* ---- Iniciar sesión ---- */
    async function login(email, password) {
        const { data, error } = await window.db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        _session = data.session;
        _perfil  = null;
        return data;
    }

    /* ---- Cerrar sesión ---- */
    async function logout() {
        await window.db.auth.signOut();
        _session = null;
        _perfil  = null;
        window.location.href = 'index.html';
    }

    /* ---- Verificar si es administrador ---- */
    function esAdmin() {
        return _perfil && _perfil.rol === 'administrador';
    }

    /* ---- Actualizar perfil ---- */
    async function actualizarPerfil(datos) {
        const user = getUser();
        if (!user) throw new Error('No hay sesión activa');

        const { data, error } = await window.db
            .from('perfiles')
            .update(datos)
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        _perfil = data;
        return data;
    }

    /* ---- Listar todos los usuarios (solo admin) ---- */
    async function listarUsuarios() {
        const { data, error } = await window.db
            .from('perfiles')
            .select('*')
            .order('nombre_completo');
        if (error) throw error;
        return data;
    }

    /* ---- Cambiar estado de usuario (solo admin) ---- */
    async function toggleUsuario(userId, activo) {
        const { error } = await window.db
            .from('perfiles')
            .update({ activo })
            .eq('id', userId);
        if (error) throw error;
    }

    /* ---- Cambiar contraseña ---- */
    async function cambiarPassword(nueva) {
        const { error } = await window.db.auth.updateUser({ password: nueva });
        if (error) throw error;
    }

    /* ---- Escuchar cambios de sesión ---- */
    function onAuthChange(callback) {
        return window.db.auth.onAuthStateChange((event, session) => {
            _session = session;
            if (event === 'SIGNED_OUT') { _perfil = null; }
            callback(event, session);
        });
    }

    return {
        getSession, getUser, getPerfil, login, logout,
        esAdmin, actualizarPerfil, listarUsuarios, toggleUsuario,
        cambiarPassword, onAuthChange,
    };
})();
