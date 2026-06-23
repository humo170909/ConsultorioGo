/* ============================================================
   NOTIFICATIONS.JS — Sistema de notificaciones Toast
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.Notify = (function () {

    function _iconSVG(type) {
        const svgs = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
            info:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        };
        return svgs[type] || svgs.info;
    }

    function show(type, title, message = '', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <span class="toast-icon ${type}">${_iconSVG(type)}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Cerrar">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => dismiss(toast));

        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => dismiss(toast), duration);
        }

        return toast;
    }

    function dismiss(toast) {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 400);
    }

    /* API pública */
    return {
        success: (title, msg, dur) => show('success', title, msg, dur),
        error:   (title, msg, dur) => show('error',   title, msg, dur || 6000),
        warning: (title, msg, dur) => show('warning', title, msg, dur),
        info:    (title, msg, dur) => show('info',    title, msg, dur),
    };
})();


/* ============================================================
   MODAL — Sistema de diálogos
   ============================================================ */
window.Modal = (function () {

    function open({ id = 'modal-' + Date.now(), title, body, size = 'md', footer, onClose } = {}) {
        const root = document.getElementById('modal-root');
        if (!root) return;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = id + '-overlay';

        overlay.innerHTML = `
            <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" id="${id}">
                <div class="modal-header">
                    <h2 class="modal-title" id="${id}-title">${title || ''}</h2>
                    <button class="modal-close" aria-label="Cerrar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body" id="${id}-body">
                    ${typeof body === 'string' ? body : ''}
                </div>
                ${footer ? `<div class="modal-footer" id="${id}-footer">${footer}</div>` : ''}
            </div>
        `;

        root.appendChild(overlay);

        // Insertar body si es elemento DOM
        if (body && typeof body !== 'string') {
            document.getElementById(id + '-body').appendChild(body);
        }

        // Cerrar
        const closeFn = () => close(id);
        overlay.querySelector('.modal-close').addEventListener('click', closeFn);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeFn(); });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { closeFn(); document.removeEventListener('keydown', escHandler); }
        });

        if (onClose) overlay._onClose = onClose;

        // Focus trap
        const firstFocusable = overlay.querySelector('button, input, select, textarea, a[href]');
        if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50);

        return { id, close: closeFn };
    }

    function close(id) {
        const overlay = document.getElementById(id + '-overlay');
        if (overlay) {
            if (overlay._onClose) overlay._onClose();
            overlay.remove();
        }
    }

    function confirm({ title = '¿Confirmar acción?', message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false, onConfirm } = {}) {
        return new Promise((resolve) => {
            const m = open({
                title,
                size: 'sm',
                body: `
                    <div style="text-align:center; padding:0.5rem 0">
                        <div class="confirm-dialog-icon${danger ? ' danger' : ''}">
                            ${danger
                                ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
                                : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                            }
                        </div>
                        <p style="font-size:0.9375rem; color:var(--text-secondary); margin-top:0.25rem;">${message || ''}</p>
                    </div>
                `,
                footer: `
                    <button class="btn btn-secondary" id="confirmCancel">${cancelText}</button>
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">${confirmText}</button>
                `,
            });

            setTimeout(() => {
                const okBtn = document.getElementById('confirmOk');
                const cancelBtn = document.getElementById('confirmCancel');
                if (okBtn) okBtn.addEventListener('click', () => {
                    close(m.id);
                    resolve(true);
                    if (onConfirm) onConfirm();
                });
                if (cancelBtn) cancelBtn.addEventListener('click', () => {
                    close(m.id);
                    resolve(false);
                });
            }, 0);
        });
    }

    return { open, close, confirm };
})();
