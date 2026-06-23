/* ============================================================
   CONFIG.JS — Configuración de Supabase
   CONSULTORIO ROBERT GOICOCHEA

   INSTRUCCIONES DE CONFIGURACIÓN:
   1. Ir a https://supabase.com
   2. Crear un nuevo proyecto
   3. Ir a Project Settings > API
   4. Copiar "Project URL" en SUPABASE_URL
   5. Copiar "anon public" key en SUPABASE_ANON_KEY
   ============================================================ */

window.SUPABASE_URL     = 'https://sroxfkxoygaqrjfczirh.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb3hma3hveWdhcXJqZmN6aXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDY0NTksImV4cCI6MjA5NzQ4MjQ1OX0.niaH7cN5FZ8ottfj1hDDSAqiSRrpuQwyFbHLR5je5Yo';

/* ============================================================
   CONFIGURACIÓN GENERAL DE LA APLICACIÓN
   ============================================================ */
window.APP = {
    nombre:    'Consultorio Robert Goicochea',
    version:   '1.0.0',
    // URL base para redirección de auth (cambiar en producción)
    baseUrl:   window.location.origin + window.location.pathname.replace('app.html','').replace('index.html',''),

    // Opciones de Storage
    storage: {
        bucketDocs:   'documentos-clinicos',
        bucketFotos:  'fotos-pacientes',
        maxDocSize:   50 * 1024 * 1024,   // 50 MB
        maxFotoSize:  10 * 1024 * 1024,   // 10 MB
        tiposDoc:     ['application/pdf','image/jpeg','image/png','image/webp','image/gif'],
        tiposFoto:    ['image/jpeg','image/png','image/webp'],
    },

    // Paginación
    pagination: {
        perPage: 20,
    },
};

/* ============================================================
   INICIALIZAR CLIENTE SUPABASE
   ============================================================ */
;(function initSupabase() {
    try {
        if (!window.supabase) {
            console.error('[Config] La librería de Supabase no está cargada.');
            return;
        }
        if (window.SUPABASE_URL.includes('TU-PROYECTO')) {
            console.warn('[Config] ⚠️  Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js');
        }
        window.db = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken:  true,
                    persistSession:    true,
                    detectSessionInUrl: true,
                },
            }
        );
        console.log('[Config] Supabase inicializado correctamente.');
    } catch (err) {
        console.error('[Config] Error al inicializar Supabase:', err);
    }
})();
