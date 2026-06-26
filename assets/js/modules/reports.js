/* ============================================================
   REPORTS.JS — Reportes y exportación
   CONSULTORIO ROBERT GOICOCHEA
   ============================================================ */

window.ReportsModule = (function () {

    async function render(container) {
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h2>Reportes</h2>
                    <p>Genera y exporta reportes clínicos</p>
                </div>
            </div>

            <!-- Tarjetas de reportes disponibles -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-bottom:2rem;padding:0 var(--px)">

                <!-- Listado de Pacientes → Excel (.xlsx) -->
                <div class="report-card">
                    <div class="report-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div class="report-info">
                        <h3>Listado de Pacientes</h3>
                        <p>Exporta el padrón completo en Excel (.xlsx) con todos los datos y un resumen estadístico.</p>
                        <div class="report-controls">
                            <button class="btn btn-outline btn-sm" onclick="ReportsModule.exportarListadoPacientes()">
                                ${Utils.icons.excel} Exportar Excel
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Estadísticas Mensuales → PDF -->
                <div class="report-card">
                    <div class="report-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <div class="report-info">
                        <h3>Estadísticas Mensuales</h3>
                        <p>Nuevos pacientes y consultas realizadas por mes.</p>
                        <div class="report-controls">
                            <select id="anioReporte" class="form-select">
                                ${_aniosOptions()}
                            </select>
                            <button class="btn btn-outline btn-sm" onclick="ReportsModule.exportarEstadisticas()">
                                ${Utils.icons.pdf} Exportar PDF
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Ficha Completa de Paciente → PDF -->
                <div class="report-card">
                    <div class="report-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <div class="report-info">
                        <h3>Ficha Completa de Paciente</h3>
                        <p>Exporta la historia clínica completa de un paciente.</p>
                        <div class="report-controls">
                            <input id="dniReportePaciente" class="form-input" placeholder="DNI del paciente">
                            <button class="btn btn-outline btn-sm" onclick="ReportsModule.buscarPacienteParaReporte()">
                                ${Utils.icons.pdf} Exportar
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Estadísticas visuales en pantalla -->
            <div class="card" style="margin:0 var(--px)">
                <div class="card-header">
                    <span class="card-title">Resumen del Año Actual</span>
                </div>
                <div class="card-body" style="padding:0">
                    <div id="statsTable">
                        <div style="padding:1.5rem;text-align:center;color:var(--text-muted)">Cargando estadísticas...</div>
                    </div>
                </div>
            </div>
        `;

        await _loadStatsTable();
    }

    /* BLOQUE 2: Rango de años 2020 → año actual + 1 (sin límite hardcoded).
       Se elige "actual + 1" para que el selector siga vigente sin tocar código.
       NOTA: fn_estadisticas_mensuales no tiene restricción de rango en SQL:
       usa EXTRACT(YEAR FROM ...) dinámicamente y generate_series(1,12), por lo que
       cualquier año devuelve los 12 meses con los datos que haya (0 si el año
       no tiene registros). No es necesario modificar el schema. */
    function _aniosOptions() {
        const currentYear = new Date().getFullYear();
        const inicio = 2020;
        const fin    = currentYear + 1;
        const opts   = [];
        for (let y = fin; y >= inicio; y--) {
            opts.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
        }
        return opts.join('');
    }

    async function _loadStatsTable() {
        const el = document.getElementById('statsTable');
        if (!el) return;

        const anio = new Date().getFullYear();
        const { data, error } = await window.db.rpc('fn_estadisticas_mensuales', { p_anio: anio });

        if (error || !data) {
            el.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">No se pudieron cargar las estadísticas.</p>';
            return;
        }

        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const maxConsultas = Math.max(...data.map(d => parseInt(d.consultas) || 0), 1);

        el.innerHTML = `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Mes</th>
                            <th>Pacientes Nuevos</th>
                            <th>Consultas</th>
                            <th style="min-width:140px">Actividad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map((row, i) => {
                            const pct = Math.round((parseInt(row.consultas) || 0) / maxConsultas * 100);
                            return `<tr>
                                <td><strong>${meses[i]}</strong></td>
                                <td>${row.pacientes_nuevos || 0}</td>
                                <td>${row.consultas || 0}</td>
                                <td>
                                    <div class="activity-bar">
                                        <div class="activity-bar-fill" style="width:${pct}%"></div>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /* ============================================================
       BLOQUE 1: Exportar Listado de Pacientes → Excel (.xlsx)
       Usa SheetJS (window.XLSX, cargado vía CDN en app.html).
       Hoja 1 "Pacientes": todos los campos de v_pacientes.
       Hoja 2 "Resumen": estadísticas actuales de v_estadisticas.
       ============================================================ */
    async function exportarListadoPacientes() {
        const btn = document.querySelector('[onclick="ReportsModule.exportarListadoPacientes()"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }

        try {
            if (!window.XLSX) {
                throw new Error('La librería SheetJS no está disponible. Recarga la página.');
            }

            // Todos los campos relevantes de v_pacientes (incluye campos calculados como edad y total_consultas)
            const { data, error } = await window.db
                .from('v_pacientes')
                .select('dni, nombres, apellidos, fecha_nacimiento, edad, sexo, celular, direccion, correo, observaciones, activo, created_at, total_consultas, ultima_consulta')
                .order('apellidos');

            if (error) throw error;

            if (!data || data.length === 0) {
                Notify.warning('Sin datos', 'No hay pacientes registrados para exportar.');
                return;
            }

            // Estadísticas para la hoja 2 (puede ser null si falla, no es crítico)
            const { data: stats } = await window.db.from('v_estadisticas').select('*').single();

            const wb = window.XLSX.utils.book_new();

            /* ---- Hoja 1: Listado completo ---- */
            const encabezados = [
                'DNI', 'Apellidos', 'Nombres', 'F. Nacimiento', 'Edad', 'Sexo',
                'Celular', 'Dirección', 'Correo', 'Observaciones', 'Estado',
                'F. Registro', 'Total Consultas', 'Última Consulta',
            ];

            const filas = data.map(p => [
                p.dni,
                p.apellidos,
                p.nombres,
                Utils.formatDate(p.fecha_nacimiento),
                p.edad != null ? p.edad + ' años' : '—',
                Utils.sexoLabel(p.sexo),
                p.celular    || '—',
                p.direccion  || '—',
                p.correo     || '—',
                p.observaciones || '—',
                p.activo ? 'Activo' : 'Inactivo',
                Utils.formatDate(p.created_at),
                p.total_consultas || 0,
                Utils.formatDate(p.ultima_consulta),
            ]);

            const ws1 = window.XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
            ws1['!cols'] = [
                { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 10 },
                { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 28 }, { wch: 35 },
                { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
            ];
            window.XLSX.utils.book_append_sheet(wb, ws1, 'Pacientes');

            /* ---- Hoja 2: Resumen de estadísticas ---- */
            const ahora = new Date().toLocaleDateString('es-PE');
            const resumenData = [
                ['Consultorio Robert Goicochea — Resumen del Sistema'],
                [],
                ['Exportado:', ahora],
                ['Pacientes en esta exportación:', data.length],
                [],
                ['ESTADÍSTICAS ACTUALES', ''],
                ['Total pacientes activos',  stats ? (stats.total_pacientes    || 0) : '—'],
                ['Pacientes nuevos este mes', stats ? (stats.pacientes_este_mes || 0) : '—'],
                ['Consultas este mes',        stats ? (stats.consultas_este_mes || 0) : '—'],
                ['Total de consultas',        stats ? (stats.total_consultas    || 0) : '—'],
            ];
            const ws2 = window.XLSX.utils.aoa_to_sheet(resumenData);
            ws2['!cols'] = [{ wch: 38 }, { wch: 20 }];
            window.XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

            window.XLSX.writeFile(wb, `listado-pacientes-${_dateStr()}.xlsx`);
            Notify.success('Excel generado', `Se exportaron ${data.length} pacientes correctamente.`);

        } catch (err) {
            console.error('[Reports] Error Excel:', err);
            Notify.error('Error al exportar', err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `${Utils.icons.excel} Exportar Excel`;
            }
        }
    }

    /* ============================================================
       EXPORTAR: Estadísticas Mensuales PDF (sin cambios)
       ============================================================ */
    async function exportarEstadisticas() {
        const anio = parseInt(document.getElementById('anioReporte')?.value) || new Date().getFullYear();

        try {
            const { data, error } = await window.db.rpc('fn_estadisticas_mensuales', { p_anio: anio });
            if (error) throw error;

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });

            _pdfHeader(doc, `Estadísticas Mensuales ${anio}`);

            const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            doc.autoTable({
                startY: 45,
                head: [['Mes', 'Pacientes Nuevos', 'Consultas Realizadas']],
                body: data.map((row, i) => [
                    meses[i],
                    row.pacientes_nuevos || 0,
                    row.consultas || 0,
                ]),
                foot: [[
                    'TOTAL',
                    data.reduce((s, r) => s + (parseInt(r.pacientes_nuevos) || 0), 0),
                    data.reduce((s, r) => s + (parseInt(r.consultas) || 0), 0),
                ]],
                styles:     { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 20, right: 20 },
            });

            _pdfFooter(doc);
            doc.save(`estadisticas-${anio}.pdf`);
            Notify.success('PDF generado', 'Las estadísticas mensuales fueron exportadas.');

        } catch (err) {
            Notify.error('Error al generar PDF', err.message);
        }
    }

    /* ============================================================
       BUSCAR PACIENTE PARA REPORTE (sin cambios)
       ============================================================ */
    async function buscarPacienteParaReporte() {
        const dni = document.getElementById('dniReportePaciente')?.value.trim();
        if (!dni) { Notify.warning('DNI requerido', 'Ingresa el DNI del paciente.'); return; }

        const { data, error } = await window.db
            .from('v_pacientes')
            .select('id, nombres, apellidos')
            .eq('dni', dni)
            .single();

        if (error || !data) {
            Notify.error('Paciente no encontrado', `No se encontró paciente con DNI ${dni}.`);
            return;
        }

        await imprimirFicha(data.id);
    }

    /* ============================================================
       EXPORTAR: Ficha Completa del Paciente PDF (sin cambios)
       ============================================================ */
    async function imprimirFicha(pacienteId) {
        try {
            const [pacRes, histRes, examRes] = await Promise.all([
                window.db.from('v_pacientes').select('*').eq('id', pacienteId).single(),
                window.db.from('historias_clinicas').select('*').eq('paciente_id', pacienteId).order('fecha_consulta', { ascending: false }),
                window.db.from('examenes_visuales').select('*').eq('paciente_id', pacienteId).order('fecha', { ascending: false }),
            ]);

            const p    = pacRes.data;
            const hist = histRes.data || [];
            const exam = examRes.data || [];

            if (!p) { Notify.error('Error', 'No se encontró el paciente.'); return; }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const nombre = Utils.titleCase(p.nombres + ' ' + p.apellidos);

            _pdfHeader(doc, `Ficha Clínica — ${nombre}`);

            let y = 45;
            const lineH = 6;
            const left  = 20;
            const right = 190;

            doc.setFontSize(11).setFont(undefined, 'bold');
            doc.setFillColor(241, 245, 249);
            doc.rect(left, y, right - left, 8, 'F');
            doc.text('DATOS DEL PACIENTE', left + 2, y + 5.5);
            y += 12;

            doc.setFontSize(9).setFont(undefined, 'normal');
            const datosPac = [
                ['DNI:', p.dni,           'Fecha de Nac.:', Utils.formatDate(p.fecha_nacimiento)],
                ['Edad:', (p.edad || '—') + ' años', 'Sexo:', Utils.sexoLabel(p.sexo)],
                ['Celular:', p.celular || '—', 'Correo:', p.correo || '—'],
                ['Dirección:', p.direccion || '—', '', ''],
            ];

            datosPac.forEach(row => {
                doc.setFont(undefined, 'bold');   doc.text(row[0], left, y);
                doc.setFont(undefined, 'normal'); doc.text(row[1], left + 22, y);
                if (row[2]) {
                    doc.setFont(undefined, 'bold');   doc.text(row[2], 110, y);
                    doc.setFont(undefined, 'normal'); doc.text(row[3], 132, y);
                }
                y += lineH;
            });

            if (p.observaciones) {
                doc.setFont(undefined, 'bold'); doc.text('Observaciones:', left, y);
                doc.setFont(undefined, 'normal');
                const lines = doc.splitTextToSize(p.observaciones, right - left - 35);
                doc.text(lines, left + 35, y);
                y += Math.max(lines.length * lineH, lineH);
            }

            y += 6;

            if (hist.length > 0) {
                doc.setFontSize(11).setFont(undefined, 'bold');
                doc.setFillColor(241, 245, 249);
                doc.rect(left, y, right - left, 8, 'F');
                doc.text(`HISTORIAS CLÍNICAS (${hist.length})`, left + 2, y + 5.5);
                y += 14;

                hist.forEach((h, idx) => {
                    if (y > 250) { doc.addPage(); y = 20; }

                    doc.setFontSize(9).setFont(undefined, 'bold');
                    doc.text(`Consulta ${idx + 1} — ${Utils.formatDate(h.fecha_consulta)}`, left, y);
                    y += lineH;

                    const campos = [
                        ['Motivo:', h.motivo_consulta],
                        ['Antecedentes:', h.antecedentes],
                        ['Diagnóstico:', h.diagnostico],
                        ['Tratamiento:', h.tratamiento],
                        ['Recomendaciones:', h.recomendaciones],
                    ];

                    doc.setFontSize(8.5);
                    campos.forEach(([lbl, val]) => {
                        if (!val) return;
                        if (y > 255) { doc.addPage(); y = 20; }
                        doc.setFont(undefined, 'bold');   doc.text(lbl, left + 2, y);
                        doc.setFont(undefined, 'normal');
                        const lines = doc.splitTextToSize(val, right - left - 35);
                        doc.text(lines, left + 35, y);
                        y += Math.max(lines.length * (lineH - 1), lineH - 1);
                    });

                    const exVis = exam.find(e => e.historia_id === h.id);
                    if (exVis) {
                        if (y > 230) { doc.addPage(); y = 20; }
                        doc.setFont(undefined, 'bold').setFontSize(8.5);
                        doc.text('Examen Visual:', left + 2, y); y += lineH - 1;

                        doc.setFont(undefined, 'normal').setFontSize(8);
                        doc.text(`OD: Esf ${_fmtNum(exVis.od_esfera)} | Cil ${_fmtNum(exVis.od_cilindro)} | Eje ${exVis.od_eje ?? '—'}° | AV ${exVis.od_agudeza_visual || '—'}`, left + 4, y); y += lineH - 1;
                        doc.text(`OI: Esf ${_fmtNum(exVis.oi_esfera)} | Cil ${_fmtNum(exVis.oi_cilindro)} | Eje ${exVis.oi_eje ?? '—'}° | AV ${exVis.oi_agudeza_visual || '—'}`, left + 4, y); y += lineH - 1;
                        if (exVis.distancia_pupilar) { doc.text(`DP: ${exVis.distancia_pupilar} mm`, left + 4, y); y += lineH - 1; }
                        if (exVis.diagnostico_visual) { doc.text(`Diagnóstico: ${exVis.diagnostico_visual}`, left + 4, y); y += lineH - 1; }
                    }

                    doc.setDrawColor(226, 232, 240);
                    doc.line(left, y + 2, right, y + 2);
                    y += 8;
                });
            }

            _pdfFooter(doc);
            doc.save(`ficha-${p.dni}-${_dateStr()}.pdf`);
            Notify.success('PDF generado', `La ficha de ${nombre} fue exportada.`);

        } catch (err) {
            console.error('[Reports] Error imprimirFicha:', err);
            Notify.error('Error al generar PDF', err.message);
        }
    }

    /* ---- Helpers PDF ---- */

    function _pdfHeader(doc, titulo) {
        doc.setFillColor(29, 78, 216);
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 32, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16).setFont(undefined, 'bold');
        doc.text('Consultorio Robert Goicochea', 14, 13);
        doc.setFontSize(10).setFont(undefined, 'normal');
        doc.text('Sistema de Gestión Clínica Optométrica', 14, 20);
        doc.setFontSize(12).setFont(undefined, 'bold');
        doc.text(titulo, 14, 28);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8).setFont(undefined, 'normal');
        const W = doc.internal.pageSize.getWidth();
        doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, W - 14, 28, { align: 'right' });
    }

    function _pdfFooter(doc) {
        const W  = doc.internal.pageSize.getWidth();
        const H  = doc.internal.pageSize.getHeight();
        const pg = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pg; i++) {
            doc.setPage(i);
            doc.setFontSize(7).setTextColor(148, 163, 184);
            doc.text('Consultorio Robert Goicochea — Documento confidencial', 14, H - 8);
            doc.text(`Página ${i} de ${pg}`, W - 14, H - 8, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.line(14, H - 12, W - 14, H - 12);
        }
    }

    function _dateStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function _fmtNum(n) {
        if (n === null || n === undefined) return '—';
        return (n >= 0 ? '+' : '') + parseFloat(n).toFixed(2);
    }

    return { render, exportarListadoPacientes, exportarEstadisticas, buscarPacienteParaReporte, imprimirFicha };
})();
