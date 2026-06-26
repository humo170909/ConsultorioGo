/* ============================================================
   UTILS.JS — Utilidades y helpers globales
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.Utils = (function () {

    /* ---- FECHAS ---- */

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' });
    }

    function formatDatetime(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }) +
               ' ' + d.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
    }

    function formatDateLong(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    }

    function toInputDate(dateStr) {
        if (!dateStr) return '';
        return dateStr.slice(0, 10);
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function calcularEdad(fechaNac) {
        if (!fechaNac) return 0;
        const hoy = new Date();
        const nac = new Date(fechaNac + 'T00:00:00');
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return edad;
    }

    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const now  = Date.now();
        const past = new Date(dateStr).getTime();
        const diff = Math.floor((now - past) / 1000);
        if (diff < 60)   return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        const days = Math.floor(diff / 86400);
        if (days === 1) return 'ayer';
        if (days < 30)  return `hace ${days} días`;
        if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
        return `hace ${Math.floor(days / 365)} años`;
    }

    /* ---- TEXTO ---- */

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function titleCase(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }

    function iniciales(nombre) {
        if (!nombre) return '?';
        return nombre.split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0].toUpperCase())
            .join('');
    }

    function truncate(str, len = 60) {
        if (!str) return '';
        return str.length > len ? str.slice(0, len) + '...' : str;
    }

    /* ---- FORMATO ---- */

    function formatFileSize(bytes) {
        if (!bytes) return '—';
        const units = ['B','KB','MB','GB'];
        let i = 0;
        let size = bytes;
        while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
        return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
    }

    function sexoLabel(sexo) {
        const map = { M: 'Masculino', F: 'Femenino', otro: 'Otro' };
        return map[sexo] || sexo || '—';
    }

    function sexoBadge(sexo) {
        const cls = { M: 'badge-blue', F: 'badge-purple', otro: 'badge-gray' };
        return `<span class="badge ${cls[sexo] || 'badge-gray'}">${sexoLabel(sexo)}</span>`;
    }

    function rolLabel(rol) {
        const map = { administrador: 'Administrador', optometra: 'Optómetra' };
        return map[rol] || rol || '—';
    }

    function rolBadge(rol) {
        const cls = { administrador: 'badge-blue', optometra: 'badge-green' };
        return `<span class="badge ${cls[rol] || 'badge-gray'}">${rolLabel(rol)}</span>`;
    }

    /* ---- VALIDACIONES ---- */

    function validarDNI(dni) {
        return /^\d{8}$/.test(dni);
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validarCelular(cel) {
        return /^[0-9]{7,15}$/.test(cel.replace(/[\s\-+]/g, ''));
    }

    /* ---- DOM ---- */

    function qs(selector, root = document) {
        return root.querySelector(selector);
    }

    function qsa(selector, root = document) {
        return [...root.querySelectorAll(selector)];
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
            if (k === 'className') el.className = v;
            else if (k === 'innerHTML') el.innerHTML = v;
            else if (k === 'textContent') el.textContent = v;
            else el.setAttribute(k, v);
        });
        children.forEach(c => {
            if (typeof c === 'string') el.insertAdjacentHTML('beforeend', c);
            else if (c) el.appendChild(c);
        });
        return el;
    }

    function showEl(el)  { if (el) el.style.display = ''; }
    function hideEl(el)  { if (el) el.style.display = 'none'; }
    function toggleEl(el){ if (el) el.style.display = el.style.display === 'none' ? '' : 'none'; }

    /* ---- VALIDACIÓN DE FORMULARIOS ---- */

    function clearErrors(form) {
        form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    function setError(inputId, msg) {
        const input = document.getElementById(inputId);
        const err   = document.getElementById(inputId + 'Error');
        if (input) input.classList.add('is-invalid');
        if (err)   err.textContent = msg;
    }

    /* ---- DEBOUNCE ---- */

    function debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /* ---- ICONOS SVG ---- */

    const icons = {
        user: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        eye:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        file: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
        pdf:  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        warn:  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        image: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
        excel: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`,
    };

    /* ---- EXPORTAR ---- */
    return {
        formatDate, formatDatetime, formatDateLong, toInputDate, today,
        calcularEdad, timeAgo, capitalize, titleCase, iniciales, truncate,
        formatFileSize, sexoLabel, sexoBadge, rolLabel, rolBadge,
        validarDNI, validarEmail, validarCelular,
        qs, qsa, createElement, showEl, hideEl, toggleEl,
        clearErrors, setError, debounce, icons,
    };
})();
