/* ============================================================
   LOGIN.JS — Consultorio Robert Goicochea
   Usa window.db.auth (cliente Supabase inicializado en config.js)
   ============================================================ */

(async function initLogin() {

    /* ══════════════════════════════════════════════════════════
       DIAGNÓSTICO INICIAL — se imprime siempre en consola (F12)
    ══════════════════════════════════════════════════════════ */
    console.group('🔍 [Login] Diagnóstico de inicio');
    console.log('window.db             :', typeof window.db !== 'undefined' ? '✅ definido' : '❌ NO definido');
    console.log('window.db.auth        :', window.db?.auth ? '✅ disponible' : '❌ NO disponible');
    console.log('SUPABASE_URL          :', window.SUPABASE_URL  || '❌ vacío');
    console.log('ANON_KEY (primeros 20):', window.SUPABASE_ANON_KEY ? window.SUPABASE_ANON_KEY.slice(0, 20) + '…' : '❌ vacío');
    console.groupEnd();

    /* ══════════════════════════════════════════════════════════
       GUARD: Supabase debe estar listo
    ══════════════════════════════════════════════════════════ */
    if (!window.db || !window.db.auth) {
        _showAlert('❌ Supabase no está inicializado. Verifica config.js y recarga la página.');
        console.error('[Login] window.db o window.db.auth no están definidos.');
        return;
    }

    /* ══════════════════════════════════════════════════════════
       SESIÓN ACTIVA → redirigir sin mostrar el formulario
    ══════════════════════════════════════════════════════════ */
    try {
        const { data: sessionData, error: sessionError } = await window.db.auth.getSession();
        if (sessionError) {
            console.warn('[Login] Error al verificar sesión:', sessionError.message);
        } else if (sessionData?.session) {
            console.log('[Login] ✅ Sesión activa detectada → redirigiendo a app.html');
            window.location.href = 'app.html';
            return;
        } else {
            console.log('[Login] Sin sesión activa. Mostrando formulario.');
        }
    } catch (e) {
        console.warn('[Login] Excepción al verificar sesión:', e.message);
    }

    /* ══════════════════════════════════════════════════════════
       TOGGLE TEMA
    ══════════════════════════════════════════════════════════ */
    const themeToggle = document.getElementById('themeToggle');
    const iconSun     = document.getElementById('iconSun');
    const iconMoon    = document.getElementById('iconMoon');
    const savedTheme  = localStorage.getItem('theme') || 'light';

    document.documentElement.setAttribute('data-theme', 'light');
    _syncIconsTema(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const actual = document.documentElement.getAttribute('data-theme');
        const nuevo  = actual === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nuevo);
        localStorage.setItem('theme', nuevo);
        _syncIconsTema(nuevo);
    });

    function _syncIconsTema(t) {
        if (iconSun)  iconSun.style.display  = t === 'dark'  ? 'none' : '';
        if (iconMoon) iconMoon.style.display  = t === 'light' ? 'none' : '';
    }

    /* ══════════════════════════════════════════════════════════
       TOGGLE VER / OCULTAR CONTRASEÑA
    ══════════════════════════════════════════════════════════ */
    const inputPwd     = document.getElementById('password');
    const btnTogglePwd = document.getElementById('togglePwd');
    const eyeShow      = document.getElementById('eyeShow');
    const eyeHide      = document.getElementById('eyeHide');

    btnTogglePwd?.addEventListener('click', () => {
        if (!inputPwd) return;
        const t = inputPwd.type === 'password' ? 'text' : 'password';
        inputPwd.type = t;
        if (eyeShow) eyeShow.style.display = t === 'text'     ? 'none' : '';
        if (eyeHide) eyeHide.style.display = t === 'password' ? 'none' : '';
    });

    /* ══════════════════════════════════════════════════════════
       REFERENCIAS DOM
    ══════════════════════════════════════════════════════════ */
    const form       = document.getElementById('loginForm');
    const loginBtn   = document.getElementById('loginBtn');
    const btnText    = document.getElementById('btnText');
    const btnLoader  = document.getElementById('btnLoader');
    const inputEmail = document.getElementById('email');
    const emailErr   = document.getElementById('emailError');
    const pwdErr     = document.getElementById('passwordError');

    if (!form) {
        console.error('[Login] ❌ No se encontró #loginForm en el DOM.');
        return;
    }

    /* ══════════════════════════════════════════════════════════
       SUBMIT — flujo principal de autenticación
    ══════════════════════════════════════════════════════════ */
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        /* — Capturar y sanear credenciales — */
        const email    = (inputEmail?.value ?? '').trim().toLowerCase();
        const password = (inputPwd?.value   ?? '');

        /* — Log de diagnóstico de lo que se va a enviar — */
        console.group('📤 [Login] Intento de autenticación');
        console.log('Email enviado      :', email);
        console.log('Email length       :', email.length);
        console.log('Password length    :', password.length);
        console.log('Password vacío     :', password.length === 0);
        console.log('Tiene espacios     :', email !== email.trim());
        console.log('Tiene mayúsculas   :', email !== email.toLowerCase());
        console.groupEnd();

        /* — Limpiar UI — */
        _hideAlert();
        _clearErrors();

        /* — Validación básica del lado cliente — */
        let hayErrores = false;

        if (!email) {
            _fieldError(inputEmail, emailErr, 'Ingresa tu correo electrónico.');
            hayErrores = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            _fieldError(inputEmail, emailErr, 'Formato de correo no válido.');
            hayErrores = true;
        }

        if (!password) {
            _fieldError(inputPwd, pwdErr, 'Ingresa tu contraseña.');
            hayErrores = true;
        } else if (password.length < 6) {
            _fieldError(inputPwd, pwdErr, 'La contraseña debe tener al menos 6 caracteres.');
            hayErrores = true;
        }

        if (hayErrores) return;

        /* — Estado de carga — */
        _setLoading(true);

        try {
            /* ════════════════════════════════════════════════
               LLAMADA A SUPABASE AUTH
            ════════════════════════════════════════════════ */
            console.log('[Login] ⏳ Llamando a signInWithPassword...');

            const { data, error } = await window.db.auth.signInWithPassword({
                email:    email,
                password: password,
            });

            /* — Log completo de la respuesta — */
            console.group('📥 [Login] Respuesta de Supabase');
            console.log('error  :', error  ?? 'null (sin error)');
            console.log('data   :', data   ?? 'null');
            console.log('session:', data?.session ?? 'null');
            console.log('user   :', data?.user    ?? 'null');
            console.groupEnd();

            if (error) {
                console.error('[Login] ❌ AuthApiError:', error.status, error.message, error.code);
                throw error;
            }

            if (!data?.session) {
                throw new Error('Supabase no devolvió sesión. Revisa la consola.');
            }

            /* — Éxito — */
            console.log('[Login] ✅ Login exitoso:', data.user.email);
            window.location.href = 'app.html';

        } catch (err) {
            _setLoading(false);
            const msg = _mensajeError(err);
            _showAlert(msg);
            console.error('[Login] Error completo:', JSON.stringify(err, null, 2));
        }
    });

    /* Auto-foco */
    inputEmail?.focus();

    /* ══════════════════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════════════════ */

    function _setLoading(on) {
        if (loginBtn)  loginBtn.disabled       = on;
        if (btnText)   btnText.style.display   = on ? 'none' : '';
        if (btnLoader) btnLoader.style.display = on ? ''     : 'none';
    }

    function _fieldError(input, span, msg) {
        input?.classList.add('is-invalid');
        if (span) span.textContent = msg;
    }

    function _clearErrors() {
        [inputEmail, inputPwd].forEach(el => el?.classList.remove('is-invalid'));
        [emailErr,   pwdErr  ].forEach(el => { if (el) el.textContent = ''; });
    }

    function _showAlert(html) {
        const el = document.getElementById('loginAlert');
        if (el) { el.innerHTML = html; el.style.display = ''; }
    }

    function _hideAlert() {
        const el = document.getElementById('loginAlert');
        if (el) el.style.display = 'none';
    }

function _mensajeError(err) {
        const raw = [
            err?.message,
            err?.error_description,
            err?.msg,
            err?.code,
            typeof err === 'string' ? err : '',
        ].filter(Boolean).join(' ').toLowerCase();

        if (raw.includes('invalid login credentials') ||
            raw.includes('invalid_credentials')       ||
            raw.includes('invalid_grant')             ||
            raw.includes('email_not_found')           ||
            raw.includes('bad credentials')) {
            return `<strong>Correo o contraseña incorrectos.</strong> Verifica tus datos e intenta de nuevo.`;
        }

        /* ── Email sin confirmar ── */
        if (raw.includes('email not confirmed') ||
            raw.includes('not confirmed')       ||
            raw.includes('email_not_confirmed')) {
            return `
                <strong>Email no confirmado</strong><br>
                El usuario existe pero el email no fue confirmado.<br>
                Ve a <em>Supabase → Authentication → Users</em>,
                busca el usuario y haz clic en <strong>"Confirm email"</strong>.
            `;
        }

        /* ── Rate limit ── */
        if (raw.includes('too many requests') ||
            raw.includes('rate limit')        ||
            raw.includes('over_request_rate_limit')) {
            return 'Demasiados intentos fallidos. Espera 5 minutos e intenta de nuevo.';
        }

        /* ── Error de red ── */
        if (raw.includes('failed to fetch') ||
            raw.includes('networkerror')    ||
            raw.includes('network error')   ||
            raw.includes('load failed')) {
            return `
                <strong>Error de conexión</strong><br>
                Verifica tu internet y que SUPABASE_URL en config.js sea correcta.<br>
                URL actual: <code>${window.SUPABASE_URL}</code>
            `;
        }

        /* ── API Key inválida ── */
        if (raw.includes('invalid api key') ||
            raw.includes('apikey')          ||
            raw.includes('jwt expired')) {
            return 'API Key inválida. Verifica SUPABASE_ANON_KEY en config.js.';
        }

        /* ── Fallback: mostrar el error real ── */
        return `Error (${err?.status ?? '?'}): <strong>${err?.message ?? 'Desconocido'}</strong><br>
                <small>Revisa la consola (F12) para el detalle completo.</small>`;
    }

    function _safeEmail() {
        return (inputEmail?.value ?? '').trim().toLowerCase() || '(vacío)';
    }

})();
