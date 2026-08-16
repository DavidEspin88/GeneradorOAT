// ==============================================
// MATRIZ-CONTROLLER.JS
// Maneja la interfaz de la Matriz de Cumplimiento: lee los filtros,
// llama a la lógica de cálculo (matriz-cumplimiento.js) y renderiza los
// resultados. No toca AppController, TableController ni la generación
// de documentos.
// ==============================================

import {
    filtrarOperacionesCumplidas,
    agruparPorCanton,
    agruparPorCantonYTipo,
    construirFechaFiltro,
    obtenerCategoriaResumen,
    agruparPorCantonYResumen,
    calcularTotalesResumen
} from '../utils/matriz-cumplimiento.js';

export class MatrizController {
    constructor() {
        this.registros = [];
        this.pestanasProcesadas = [];

        // ✅ Estado de paginación de la tabla de detalle (solo afecta la
        // visualización; this.cumplidasActuales conserva SIEMPRE el
        // conjunto completo calculado por filtrarOperacionesCumplidas()).
        this.cumplidasActuales = [];
        this.paginaActual = 1;
        this.registrosPorPagina = 8;

        // ✅ Paleta profesional fija (azul institucional, verde oliva y
        // tonos neutros complementarios) para las líneas del gráfico.
        // Se reutiliza cíclicamente si hay más tipos de operación que
        // colores definidos.
        this.paletaGrafico = [
            '#1a237e', // azul institucional
            '#5c6b3f', // verde oliva
            '#7a869e', // gris azulado
            '#8a5c3f', // terracota apagado
            '#4a6b8a', // azul acero
            '#8a7a3f', // ocre
            '#5c7a6b', // verde azulado
            '#6b5c8a', // violeta apagado
        ];

        this.elements = {
            fechaInicio: document.getElementById('matrizFechaInicio'),
            horaInicio: document.getElementById('matrizHoraInicio'),
            fechaFin: document.getElementById('matrizFechaFin'),
            horaFin: document.getElementById('matrizHoraFin'),
            btnCalcular: document.getElementById('btnCalcularMatriz'),
            resultados: document.getElementById('matrizResultados'),
            rangoAnalizado: document.getElementById('matrizRangoAnalizado'),
            pestanasProcesadas: document.getElementById('matrizPestanasProcesadas'),
            totalCumplidas: document.getElementById('matrizTotalCumplidas'),
            tablaCanton: document.getElementById('matrizTablaCanton'),
            tablaCantonTipo: document.getElementById('matrizTablaCantonTipo'),
            tablaDetalle: document.getElementById('matrizTablaDetalle'),
            // ✅ Nuevos: gráfico
            graficoCanvas: document.getElementById('matrizGraficoCumplimiento'),
            graficoVacio: document.getElementById('matrizGraficoVacio'),
            graficoTooltip: document.getElementById('matrizGraficoTooltip'),
            graficoLeyenda: document.getElementById('matrizGraficoLeyenda'),
            // ✅ Nuevos: paginación
            detalleInfo: document.getElementById('matrizDetalleInfo'),
            detallePaginacion: document.getElementById('matrizDetallePaginacion'),
            // ✅ Nueva tabla de resumen
            tablaResumen: document.getElementById('matrizTablaResumen'),
            graficoContenedor: document.getElementById('matrizGraficoContenedor'),
        };

        // Guarda los últimos datos usados para redibujar el gráfico al
        // cambiar el tamaño de la ventana (responsive), sin recalcular nada.
        this._ultimoGraficoDatos = null;

        this._configurarEventos();
    }

    /**
     * ✅ Recibe los registros ya cargados por AppController (con
     * fechaPestana agregada por excel-reader.js) y las pestañas
     * procesadas, sin volver a pedirle el Excel al usuario.
     */
    setDatos(registros, pestanasProcesadas) {
        this.registros = registros || [];
        this.pestanasProcesadas = pestanasProcesadas || [];
    }

    _configurarEventos() {
        if (this.elements.btnCalcular) {
            this.elements.btnCalcular.addEventListener('click', () => this.calcular());
        }

        // ✅ Redibuja el gráfico al cambiar el tamaño de la ventana
        // (responsive), usando los MISMOS datos ya calculados — no
        // vuelve a filtrar ni a agrupar nada.
        let debounceResize = null;
        window.addEventListener('resize', () => {
            clearTimeout(debounceResize);
            debounceResize = setTimeout(() => {
                if (this._ultimoGraficoDatos) {
                    this._dibujarGrafico(this._ultimoGraficoDatos);
                }
            }, 150);
        });

        // ✅ Tooltip del gráfico
        if (this.elements.graficoCanvas) {
            this.elements.graficoCanvas.addEventListener('mousemove', (e) => this._manejarHoverGrafico(e));
            this.elements.graficoCanvas.addEventListener('mouseleave', () => this._ocultarTooltipGrafico());
        }
    }

    calcular() {
        const fechaInicioFiltro = construirFechaFiltro(
            this.elements.fechaInicio?.value,
            this.elements.horaInicio?.value,
        );
        const fechaFinFiltro = construirFechaFiltro(
            this.elements.fechaFin?.value,
            this.elements.horaFin?.value,
        );

        if (!fechaInicioFiltro || !fechaFinFiltro) {
            alert('⚠️ Completa fecha y hora de inicio y de fin para calcular la matriz.');
            return;
        }

        if (fechaFinFiltro < fechaInicioFiltro) {
            alert('⚠️ La fecha/hora de fin no puede ser anterior a la de inicio.');
            return;
        }

        if (!this.registros || this.registros.length === 0) {
            alert('⚠️ No hay datos cargados. Carga un Excel desde el Dashboard primero.');
            return;
        }

        const cumplidas = filtrarOperacionesCumplidas(this.registros, fechaInicioFiltro, fechaFinFiltro);
        const porCanton = agruparPorCanton(cumplidas);
        const { matriz: porCantonYTipo, tipos } = agruparPorCantonYTipo(cumplidas);

        // ✅ NUEVO: Calcular los datos para la tabla de resumen
        const { matriz: matrizResumen, categorias: categoriasResumen } = agruparPorCantonYResumen(cumplidas);
        const { totalesPorCategoria, totalGeneral, totalesPorCanton } = calcularTotalesResumen(matrizResumen, categoriasResumen);

        // ✅ Punto 17: cualquier nueva consulta vuelve siempre a la página 1
        this.paginaActual = 1;
        this.cumplidasActuales = cumplidas;

        this._renderizarResultados(
            fechaInicioFiltro,
            fechaFinFiltro,
            cumplidas,
            porCanton,
            porCantonYTipo,
            tipos,
            matrizResumen,
            categoriasResumen,
            totalesPorCategoria,
            totalGeneral,
            totalesPorCanton
        );
    }

    _formatearFechaHora(fecha) {
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = fecha.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
        const anio = fecha.getFullYear();
        const hora = String(fecha.getHours()).padStart(2, '0');
        const min = String(fecha.getMinutes()).padStart(2, '0');
        return `${dia} ${mes} ${anio} ${hora}:${min}`;
    }

    _renderizarResultados(
        fechaInicioFiltro,
        fechaFinFiltro,
        cumplidas,
        porCanton,
        porCantonYTipo,
        tipos,
        matrizResumen,
        categoriasResumen,
        totalesPorCategoria,
        totalGeneral,
        totalesPorCanton
    ) {
        if (this.elements.resultados) {
            this.elements.resultados.style.display = '';
        }

        // --- Rango analizado ---
        if (this.elements.rangoAnalizado) {
            this.elements.rangoAnalizado.innerHTML = `
                <strong>${this._formatearFechaHora(fechaInicioFiltro)}</strong>
                <i class="fa-solid fa-arrow-down"></i>
                <strong>${this._formatearFechaHora(fechaFinFiltro)}</strong>
            `;
        }

        // --- Pestañas procesadas ---
        if (this.elements.pestanasProcesadas) {
            if (this.pestanasProcesadas.length > 0) {
                this.elements.pestanasProcesadas.innerHTML = this.pestanasProcesadas
                    .map((p) => `<span class="pestana-chip">✓ ${p.nombre}</span>`)
                    .join('');
            } else {
                this.elements.pestanasProcesadas.innerHTML = '<span class="pestana-chip pestana-chip-vacio">Sin información de pestañas</span>';
            }
        }

        // --- Total cumplidas ---
        if (this.elements.totalCumplidas) {
            this.elements.totalCumplidas.textContent = cumplidas.length;
        }

        // --- Por Cantón: barras proporcionales ---
        // ✅ Cambio puramente visual: sigue usando exactamente el mismo
        // objeto `porCanton` que ya calculaba agruparPorCanton() — solo
        // se añade el ancho de la barra (%) para representarlo, sin
        // tocar ningún conteo ni agrupación.
        if (this.elements.tablaCanton) {
            const cantones = Object.keys(porCanton).sort();
            const total = cantones.reduce((acc, c) => acc + porCanton[c], 0);
            const maximo = cantones.reduce((acc, c) => Math.max(acc, porCanton[c]), 0) || 1;

            const filas = cantones
                .map((c) => {
                    const valor = porCanton[c];
                    const porcentaje = Math.round((valor / maximo) * 100);
                    return `
                        <div class="matriz-barra-fila">
                            <span class="matriz-barra-label">${c}</span>
                            <div class="matriz-barra-pista">
                                <div class="matriz-barra-relleno" style="width:${porcentaje}%"></div>
                            </div>
                            <span class="matriz-barra-valor dato-mono">${valor}</span>
                        </div>
                    `;
                })
                .join('');

            this.elements.tablaCanton.innerHTML = `
                <div class="matriz-barras">
                    ${filas}
                    <div class="matriz-barra-fila matriz-barra-total">
                        <span class="matriz-barra-label">TOTAL</span>
                        <div class="matriz-barra-pista"></div>
                        <span class="matriz-barra-valor dato-mono">${total}</span>
                    </div>
                </div>
            `;
        }

        // --- Tabla cantón x tipo de operación ---
        if (this.elements.tablaCantonTipo) {
            const cantones = Object.keys(porCantonYTipo).sort();
            const encabezados = tipos.map((t) => `<th>${t}</th>`).join('');
            let filas = cantones
                .map((c) => {
                    const celdas = tipos.map((t) => `<td>${porCantonYTipo[c][t] || 0}</td>`).join('');
                    const totalFila = tipos.reduce((acc, t) => acc + (porCantonYTipo[c][t] || 0), 0);
                    return `<tr><td>${c}</td>${celdas}<td class="celda-total">${totalFila}</td></tr>`;
                })
                .join('');
            const totalesPorTipo = tipos.map((t) =>
                cantones.reduce((acc, c) => acc + (porCantonYTipo[c][t] || 0), 0),
            );
            const totalGeneralTabla = totalesPorTipo.reduce((a, b) => a + b, 0);
            const filaTotales = `<tr class="fila-total"><td>TOTAL</td>${totalesPorTipo
                .map((t) => `<td>${t}</td>`)
                .join('')}<td class="celda-total">${totalGeneralTabla}</td></tr>`;

            this.elements.tablaCantonTipo.innerHTML = `
                <table class="matriz-tabla">
                    <thead><tr><th>Cantón</th>${encabezados}<th>Total</th></tr></thead>
                    <tbody>${filas}${filaTotales}</tbody>
                </table>
            `;
        }

        // --- Gráfico de Cantón y Tipo de Operación ---
        // ✅ Consume exactamente porCantonYTipo/tipos ya calculados arriba
        // (agruparPorCantonYTipo) — no se recalcula nada.
        this._ultimoGraficoDatos = { porCantonYTipo, tipos, cantones: Object.keys(porCantonYTipo).sort() };
        this._dibujarGrafico(this._ultimoGraficoDatos);
        this._renderizarLeyendaGrafico(tipos);

        // --- Detalle (validación), paginado ---
        // ✅ this.cumplidasActuales ya se asignó en calcular() con el
        // mismo array `cumplidas` — la paginación solo cambia qué porción
        // se muestra, nunca los datos.
        this._renderizarPaginaDetalle();

        // ✅ NUEVO: Renderizar la tabla de resumen
        this._renderizarTablaResumen(matrizResumen, categoriasResumen, totalesPorCategoria, totalGeneral, totalesPorCanton);
    }

    // ==========================================================
    // ✅ NUEVO: TABLA DE RESUMEN DE OPERACIONES POR CANTÓN
    // ==========================================================

    /**
     * ✅ Renderiza la tabla de resumen de operaciones por cantón
     */
    _renderizarTablaResumen(matrizResumen, categoriasResumen, totalesPorCategoria, totalGeneral, totalesPorCanton) {
        if (!this.elements.tablaResumen) return;
        
        // Si no hay datos, mostrar mensaje
        const cantones = Object.keys(matrizResumen);
        if (cantones.length === 0 || categoriasResumen.length === 0) {
            this.elements.tablaResumen.innerHTML = `
                <div class="matriz-sin-datos" style="text-align:center; padding:30px; color: var(--dash-muted);">
                    Sin operaciones en el período seleccionado
                </div>
            `;
            return;
        }
        
        // Construir encabezados de la tabla
        let headersHtml = `
            <thead>
                <tr>
                    <th style="text-align:left; min-width:120px;">CANTÓN</th>
        `;
        
        categoriasResumen.forEach(cat => {
            headersHtml += `<th style="text-align:center;">${cat}</th>`;
        });
        
        headersHtml += `
                    <th style="text-align:center; background: var(--dash-olive-dark); color:#fff;">TOTAL</th>
                </tr>
            </thead>
        `;
        
        // Construir filas de datos
        let rowsHtml = '<tbody>';
        
        cantones.sort().forEach(canton => {
            rowsHtml += `<tr><td style="text-align:left; font-weight:600;">${canton}</td>`;
            
            categoriasResumen.forEach(cat => {
                const valor = matrizResumen[canton][cat] || 0;
                rowsHtml += `<td style="text-align:center;">${valor}</td>`;
            });
            
            const totalCanton = totalesPorCanton[canton] || 0;
            rowsHtml += `<td style="text-align:center; font-weight:700; background: var(--dash-olive-soft); color: var(--dash-olive-dark);">${totalCanton}</td>`;
            rowsHtml += '</tr>';
        });
        
        // Fila de totales
        rowsHtml += `
            <tr style="border-top: 2px solid var(--dash-line-strong); font-weight:700; background: var(--dash-paper);">
                <td style="text-align:left; font-weight:700;">TOTAL GENERAL</td>
        `;
        
        categoriasResumen.forEach(cat => {
            const total = totalesPorCategoria[cat] || 0;
            rowsHtml += `<td style="text-align:center;">${total}</td>`;
        });
        
        rowsHtml += `
                <td style="text-align:center; font-weight:700; background: var(--dash-olive-soft); color: var(--dash-olive-dark);">${totalGeneral}</td>
            </tr>
        `;
        
        rowsHtml += '</tbody>';
        
        // Construir tabla completa
        this.elements.tablaResumen.innerHTML = `
            <div style="overflow-x:auto;">
                <table class="matriz-tabla" style="min-width:100%;">
                    ${headersHtml}
                    ${rowsHtml}
                </table>
            </div>
        `;
    }

    // ==========================================================
    // ✅ GRÁFICO DE CANTÓN Y TIPO DE OPERACIÓN (Canvas, sin librerías)
    // ==========================================================

    /**
     * Dibuja el gráfico de líneas. Recibe exactamente los datos que ya
     * calculó agruparPorCantonYTipo() — no crea ninguna fuente de datos
     * paralela.
     * @param {{porCantonYTipo: Object, tipos: Array<string>, cantones: Array<string>}} datos
     */
    _dibujarGrafico(datos) {
        const canvas = this.elements.graficoCanvas;
        if (!canvas) return;

        const { porCantonYTipo, tipos, cantones } = datos;
        const ctx = canvas.getContext('2d');

        const contenedor = canvas.parentElement;
        const anchoCss = contenedor ? contenedor.clientWidth : 600;
        const altoCss = 260;

        // ✅ Estado "sin resultados": limpiar canvas y no dejar datos del
        // filtro anterior (punto 24 del prompt).
        if (!cantones || cantones.length === 0 || !tipos || tipos.length === 0) {
            canvas.style.width = anchoCss + 'px';
            canvas.style.height = altoCss + 'px';
            canvas.width = 0;
            canvas.height = 0;
            this._puntosGrafico = [];
            if (this.elements.graficoVacio) this.elements.graficoVacio.style.display = '';
            if (this.elements.graficoLeyenda) this.elements.graficoLeyenda.innerHTML = '';
            return;
        }
        if (this.elements.graficoVacio) this.elements.graficoVacio.style.display = 'none';

        // Redimensionar el canvas de forma nítida (devicePixelRatio),
        // sin deformar el dibujo.
        const dpr = window.devicePixelRatio || 1;
        canvas.style.width = anchoCss + 'px';
        canvas.style.height = altoCss + 'px';
        canvas.width = anchoCss * dpr;
        canvas.height = altoCss * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, anchoCss, altoCss);

        const PADDING_IZQ = 42;
        const PADDING_DER = 16;
        const PADDING_SUP = 16;
        const PADDING_INF = 34;
        const anchoUtil = anchoCss - PADDING_IZQ - PADDING_DER;
        const altoUtil = altoCss - PADDING_SUP - PADDING_INF;

        const maximo = Math.max(
            1,
            ...tipos.map((t) => Math.max(...cantones.map((c) => porCantonYTipo[c]?.[t] || 0))),
        );

        const pasoX = cantones.length > 1 ? anchoUtil / (cantones.length - 1) : 0;
        const puntoX = (i) => PADDING_IZQ + (cantones.length > 1 ? i * pasoX : anchoUtil / 2);
        const puntoY = (valor) => PADDING_SUP + altoUtil - (valor / maximo) * altoUtil;

        // Ejes (discretos, gris neutro)
        ctx.strokeStyle = '#e2e4e9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING_IZQ, PADDING_SUP);
        ctx.lineTo(PADDING_IZQ, PADDING_SUP + altoUtil);
        ctx.lineTo(PADDING_IZQ + anchoUtil, PADDING_SUP + altoUtil);
        ctx.stroke();

        // Marcas del eje Y (0, mitad, máximo)
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        [0, Math.round(maximo / 2), maximo].forEach((valor) => {
            const y = puntoY(valor);
            ctx.fillText(String(valor), PADDING_IZQ - 8, y);
        });

        // Etiquetas del eje X (cantones)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '11px Inter, sans-serif';
        cantones.forEach((canton, i) => {
            const x = puntoX(i);
            const etiqueta = canton.length > 10 ? canton.slice(0, 9) + '…' : canton;
            ctx.fillText(etiqueta, x, PADDING_SUP + altoUtil + 8);
        });

        // Guardar coordenadas para el tooltip (sin recalcular datos)
        this._puntosGrafico = [];

        // Una curva por tipo de operación
        tipos.forEach((tipo, indiceTipo) => {
            const color = this.paletaGrafico[indiceTipo % this.paletaGrafico.length];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            cantones.forEach((canton, i) => {
                const valor = porCantonYTipo[canton]?.[tipo] || 0;
                const x = puntoX(i);
                const y = puntoY(valor);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                this._puntosGrafico.push({ x, y, canton, tipo, valor, color });
            });
            ctx.stroke();

            // Puntos
            cantones.forEach((canton, i) => {
                const valor = porCantonYTipo[canton]?.[tipo] || 0;
                const x = puntoX(i);
                const y = puntoY(valor);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            });
        });
    }

    /**
     * Leyenda compacta: un chip de color por tipo de operación
     * (obtenidos dinámicamente, nunca escritos a mano).
     */
    _renderizarLeyendaGrafico(tipos) {
        if (!this.elements.graficoLeyenda) return;
        if (!tipos || tipos.length === 0) {
            this.elements.graficoLeyenda.innerHTML = '';
            return;
        }
        this.elements.graficoLeyenda.innerHTML = tipos
            .map((tipo, i) => {
                const color = this.paletaGrafico[i % this.paletaGrafico.length];
                return `
                    <span class="matriz-leyenda-item">
                        <span class="matriz-leyenda-color" style="background:${color}"></span>
                        ${tipo}
                    </span>
                `;
            })
            .join('');
    }

    /**
     * Tooltip discreto: busca el punto dibujado más cercano al cursor
     * (usando las coordenadas ya calculadas en _dibujarGrafico, sin
     * recalcular ningún dato) y muestra Cantón / Tipo / Cantidad.
     */
    _manejarHoverGrafico(evento) {
        const canvas = this.elements.graficoCanvas;
        const tooltip = this.elements.graficoTooltip;
        if (!canvas || !tooltip || !this._puntosGrafico || this._puntosGrafico.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mx = evento.clientX - rect.left;
        const my = evento.clientY - rect.top;

        let masCercano = null;
        let distanciaMin = 14; // radio de detección en px

        this._puntosGrafico.forEach((p) => {
            const d = Math.hypot(p.x - mx, p.y - my);
            if (d < distanciaMin) {
                distanciaMin = d;
                masCercano = p;
            }
        });

        if (!masCercano) {
            this._ocultarTooltipGrafico();
            return;
        }

        tooltip.innerHTML = `
            <strong>${masCercano.canton}</strong>
            <span>${masCercano.tipo}</span>
            <span class="dato-mono">${masCercano.valor} operaciones</span>
        `;
        tooltip.style.borderLeftColor = masCercano.color;
        tooltip.style.left = `${masCercano.x + 12}px`;
        tooltip.style.top = `${masCercano.y - 8}px`;
        tooltip.style.display = '';
    }

    _ocultarTooltipGrafico() {
        if (this.elements.graficoTooltip) {
            this.elements.graficoTooltip.style.display = 'none';
        }
    }

    // ==========================================================
    // ✅ PAGINACIÓN DE LA TABLA DE DETALLE (solo visualización)
    // ==========================================================

    /**
     * Renderiza únicamente la página actual de this.cumplidasActuales
     * (8 registros), sin filtrar, ordenar ni transformar los datos.
     */
    _renderizarPaginaDetalle() {
        if (!this.elements.tablaDetalle) return;

        const total = this.cumplidasActuales.length;
        const totalPaginas = Math.max(1, Math.ceil(total / this.registrosPorPagina));
        if (this.paginaActual > totalPaginas) this.paginaActual = totalPaginas;
        if (this.paginaActual < 1) this.paginaActual = 1;

        const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
        const fin = Math.min(inicio + this.registrosPorPagina, total);
        const paginaDatos = this.cumplidasActuales.slice(inicio, fin);

        const filas = paginaDatos
            .map((op) => {
                const fi = op.fechaHoraInicioReal;
                const ff = op.fechaHoraFinReal;
                return `
                    <tr>
                        <td>${String(fi.getDate()).padStart(2, '0')}/${String(fi.getMonth() + 1).padStart(2, '0')}/${fi.getFullYear()}</td>
                        <td>${String(fi.getHours()).padStart(2, '0')}:${String(fi.getMinutes()).padStart(2, '0')}</td>
                        <td>${String(ff.getDate()).padStart(2, '0')}/${String(ff.getMonth() + 1).padStart(2, '0')}/${ff.getFullYear()}</td>
                        <td>${String(ff.getHours()).padStart(2, '0')}:${String(ff.getMinutes()).padStart(2, '0')}</td>
                        <td>${op.canton || '-'}</td>
                        <td>${op.tipoOperacion || '-'}</td>
                        <td>${op.accionTactica || '-'}</td>
                    </tr>
                `;
            })
            .join('');

        this.elements.tablaDetalle.innerHTML = `
            <table class="matriz-tabla">
                <thead>
                    <tr>
                        <th>Fecha origen</th><th>Hora inicio</th>
                        <th>Fecha final</th><th>Hora final</th>
                        <th>Cantón</th><th>Tipo operación</th><th>Acción Táctica</th>
                    </tr>
                </thead>
                <tbody>${filas || '<tr><td colspan="7" class="matriz-sin-datos">Sin operaciones en el período seleccionado</td></tr>'}</tbody>
            </table>
        `;

        if (this.elements.detalleInfo) {
            this.elements.detalleInfo.textContent =
                total > 0
                    ? `Mostrando ${inicio + 1}–${fin} de ${total} registros`
                    : 'Sin operaciones en el período seleccionado';
        }

        this._renderizarControlesPaginacion(totalPaginas);
    }

    /**
     * Controles "‹ Anterior  1 2 3 ... N  Siguiente ›", con elipsis
     * cuando hay muchas páginas.
     */
    _renderizarControlesPaginacion(totalPaginas) {
        if (!this.elements.detallePaginacion) return;

        if (totalPaginas <= 1) {
            this.elements.detallePaginacion.innerHTML = '';
            return;
        }

        const actual = this.paginaActual;
        const paginas = this._calcularPaginasVisibles(actual, totalPaginas);

        const botonesPagina = paginas
            .map((p) =>
                p === '...'
                    ? `<span class="matriz-pag-elipsis">…</span>`
                    : `<button type="button" class="matriz-pag-btn ${p === actual ? 'matriz-pag-activa' : ''}" data-pagina="${p}">${p}</button>`,
            )
            .join('');

        this.elements.detallePaginacion.innerHTML = `
            <button type="button" class="matriz-pag-btn matriz-pag-nav" data-pagina="${actual - 1}" ${actual === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-angle-left"></i> Anterior
            </button>
            ${botonesPagina}
            <button type="button" class="matriz-pag-btn matriz-pag-nav" data-pagina="${actual + 1}" ${actual === totalPaginas ? 'disabled' : ''}>
                Siguiente <i class="fa-solid fa-angle-right"></i>
            </button>
        `;

        this.elements.detallePaginacion.querySelectorAll('[data-pagina]').forEach((boton) => {
            boton.addEventListener('click', () => {
                const pagina = parseInt(boton.dataset.pagina, 10);
                if (isNaN(pagina) || pagina < 1 || pagina > totalPaginas) return;
                this.paginaActual = pagina;
                this._renderizarPaginaDetalle();
            });
        });
    }

    /**
     * Calcula qué números de página mostrar, con "..." cuando hay
     * demasiadas (ej. 1 2 3 ... 12).
     */
    _calcularPaginasVisibles(actual, total) {
        const ventana = 1; // páginas vecinas a mostrar a cada lado de la actual
        const paginas = [];

        for (let p = 1; p <= total; p++) {
            const esExtremo = p === 1 || p === total;
            const esVecina = Math.abs(p - actual) <= ventana;
            if (esExtremo || esVecina) {
                paginas.push(p);
            } else if (paginas[paginas.length - 1] !== '...') {
                paginas.push('...');
            }
        }
        return paginas;
    }
}