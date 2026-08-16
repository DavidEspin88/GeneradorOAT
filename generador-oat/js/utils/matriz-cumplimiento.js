// ==============================================
// MATRIZ-CUMPLIMIENTO.JS
// Lógica de cálculo de la Matriz de Cumplimiento. Módulo independiente:
// NO se coloca dentro de document-generator.js ni de ningún archivo de
// generación de OAT. Reutiliza cruzaMedianoche() de utils/date-utils.js
// (la misma función que ya usa el resto del proyecto) — no se reimplementa
// la lógica de cruce de medianoche.
// ==============================================

import { cruzaMedianoche, convertirHoraMilitar } from '../utils/date-utils.js';

/**
 * Verifica si un valor de horaFinal representa "FIN OPERACIONES".
 * @param {any} valor
 * @returns {boolean}
 */
function esFinOperaciones(valor) {
    const v = String(valor || '').trim().toUpperCase();
    return v === 'FIN OPERACIONES' || v === 'FIN';
}

/**
 * Verifica si un valor de hora es utilizable para el cálculo de la matriz
 * (no vacío, no "-", y no "FIN OPERACIONES" — ver regla del punto 15:
 * FIN OPERACIONES no se contabiliza en esta sección).
 * @param {any} valor
 * @returns {boolean}
 */
function horaValidaParaMatriz(valor) {
    if (valor === null || valor === undefined) return false;
    const str = String(valor).trim();
    if (str === '' || str === '-' || esFinOperaciones(str)) return false;
    return true;
}

/**
 * ✅ Calcula fechaHoraInicioReal y fechaHoraFinReal de UN registro,
 * combinando la fecha de su pestaña (registro.fechaPestana, agregada por
 * excel-reader.js) con su horaInicio/horaFinal, y usando cruzaMedianoche()
 * (ya existente) para saber si el final cae al día siguiente.
 *
 * @param {Object} registro - Un registro individual (fila del Excel)
 * @returns {{fechaHoraInicioReal: Date, fechaHoraFinReal: Date}|null}
 *   null si el registro no tiene datos suficientes para calcularlo
 *   (sin fechaPestana, sin horaInicio/horaFinal válidos, o FIN OPERACIONES).
 */
export function calcularFechaHoraReal(registro) {
    if (!registro || !registro.fechaPestana) return null;
    if (!horaValidaParaMatriz(registro.horaInicio)) return null;
    if (!horaValidaParaMatriz(registro.horaFinal)) return null;

    const hi = convertirHoraMilitar(registro.horaInicio);
    const hf = convertirHoraMilitar(registro.horaFinal);
    if (!hi || !hf) return null;

    const [hiH, hiM] = hi.split(':').map(Number);
    const [hfH, hfM] = hf.split(':').map(Number);
    if (isNaN(hiH) || isNaN(hiM) || isNaN(hfH) || isNaN(hfM)) return null;

    const fechaHoraInicioReal = new Date(registro.fechaPestana);
    fechaHoraInicioReal.setHours(hiH, hiM, 0, 0);

    const fechaHoraFinReal = new Date(registro.fechaPestana);
    // ✅ Reutiliza cruzaMedianoche() ya existente en date-utils.js
    if (cruzaMedianoche(hi, hf)) {
        fechaHoraFinReal.setDate(fechaHoraFinReal.getDate() + 1);
    }
    fechaHoraFinReal.setHours(hfH, hfM, 0, 0);

    return { fechaHoraInicioReal, fechaHoraFinReal };
}

/**
 * ✅ Filtra las operaciones cuya fechaHoraFinReal cae dentro del rango
 * analizado (criterio del punto 16: se evalúa cuándo TERMINÓ realmente
 * la operación, no en qué pestaña estaba).
 *
 * Cada registro es una única fila del Excel, así que una operación que
 * cruza medianoche nunca se cuenta dos veces (punto 18): solo tiene un
 * fechaHoraFinReal, evaluado una sola vez.
 *
 * @param {Array} registros - Todos los registros cargados (con fechaPestana)
 * @param {Date} fechaHoraInicioFiltro
 * @param {Date} fechaHoraFinFiltro
 * @returns {Array} - Registros cumplidos, cada uno con fechaHoraInicioReal/fechaHoraFinReal agregados
 */
export function filtrarOperacionesCumplidas(registros, fechaHoraInicioFiltro, fechaHoraFinFiltro) {
    if (!registros || registros.length === 0) return [];

    const resultado = [];
    registros.forEach((registro) => {
        // Regla del punto 15: FIN OPERACIONES no se contabiliza en esta sección.
        if (esFinOperaciones(registro.horaFinal)) return;

        const fechas = calcularFechaHoraReal(registro);
        if (!fechas) return;

        const { fechaHoraInicioReal, fechaHoraFinReal } = fechas;

        if (fechaHoraFinReal >= fechaHoraInicioFiltro && fechaHoraFinReal <= fechaHoraFinFiltro) {
            resultado.push({
                ...registro,
                fechaHoraInicioReal,
                fechaHoraFinReal,
            });
        }
    });

    return resultado;
}

/**
 * Agrupa operaciones cumplidas por cantón, con conteo.
 * @param {Array} operacionesCumplidas
 * @returns {Object} - { [canton]: cantidad }
 */
export function agruparPorCanton(operacionesCumplidas) {
    const grupos = {};
    operacionesCumplidas.forEach((op) => {
        const canton = op.canton || 'No especificado';
        grupos[canton] = (grupos[canton] || 0) + 1;
    });
    return grupos;
}

/**
 * Agrupa operaciones cumplidas por cantón Y tipo de operación.
 * Los tipos se obtienen dinámicamente de los datos reales (no hay una
 * lista fija de tipos).
 * @param {Array} operacionesCumplidas
 * @returns {{matriz: Object, tipos: Array<string>}}
 */
export function agruparPorCantonYTipo(operacionesCumplidas) {
    const matriz = {};
    const tiposSet = new Set();

    operacionesCumplidas.forEach((op) => {
        const canton = op.canton || 'No especificado';
        const tipo = op.tipoOperacion || 'Otros';
        tiposSet.add(tipo);

        if (!matriz[canton]) matriz[canton] = {};
        matriz[canton][tipo] = (matriz[canton][tipo] || 0) + 1;
    });

    return { matriz, tipos: Array.from(tiposSet).sort() };
}

/**
 * ✅ Construye el objeto Date de un filtro a partir de un input type="date"
 * y un input type="time" del formulario.
 * @param {string} valorFecha - "YYYY-MM-DD"
 * @param {string} valorHora - "HH:MM"
 * @returns {Date|null}
 */
export function construirFechaFiltro(valorFecha, valorHora) {
    if (!valorFecha || !valorHora) return null;
    const [anio, mes, dia] = valorFecha.split('-').map(Number);
    const [hora, minuto] = valorHora.split(':').map(Number);
    if ([anio, mes, dia, hora, minuto].some((n) => isNaN(n))) return null;
    return new Date(anio, mes - 1, dia, hora, minuto, 0, 0);
}
/**
 * Obtiene la categoría de resumen para un tipo de operación.
 * Esta función SOLO se usa para la tabla de resumen, no modifica los datos originales.
 * @param {string} tipoOperacion - Tipo de operación original
 * @returns {string} - Categoría de resumen (CAMEX, ARS, o el nombre original)
 */
export function obtenerCategoriaResumen(tipoOperacion) {
    if (!tipoOperacion) return 'Otros';
    
    const tipo = String(tipoOperacion).trim().toUpperCase();
    
    // Normalizar para comparación (eliminar espacios múltiples)
    const normalizar = (t) => t.replace(/\s+/g, ' ').trim().toUpperCase();
    const tipoNormalizado = normalizar(tipo);
    
    // ✅ CAMEX: CAMEX COORD. P.N. + CAMEX EJES VIALES + RASTRILLAJE + RETEN MILITAR VIAS POLIDUCTO / CONTROL TANQUEROS
    const categoriasCAMEX = [
        'CAMEX COORD. P.N.',
        'CAMEX EJES VIALES',
        'RASTRILLAJE',
        'RETEN MILITAR VIAS POLIDUCTO / CONTROL TANQUEROS'
    ].map(normalizar);
    
    if (categoriasCAMEX.includes(tipoNormalizado)) {
        return 'CAMEX';
    }
    
    // ✅ ARS: APOYO MIN. AMBIENTE ENERGÍA (CELEC) + SEGURIDAD ARS (REPETIDORAS CCFFAA) + SEGURIDAD ARS (REPETIDORA CCFFAA)
    const categoriasARS = [
        'APOYO MIN. AMBIENTE ENERGÍA (CELEC)',
        'SEGURIDAD ARS (REPETIDORAS CCFFAA)',
        'SEGURIDAD ARS (REPETIDORA CCFFAA)'
    ].map(normalizar);
    
    if (categoriasARS.includes(tipoNormalizado)) {
        return 'ARS';
    }
    
    // Las demás operaciones mantienen su nombre original
    return tipoOperacion.trim();
}

/**
 * Agrupa operaciones cumplidas por cantón Y categoría de resumen.
 * Las categorías especiales (CAMEX, ARS) se consolidan.
 * @param {Array} operacionesCumplidas
 * @returns {{matriz: Object, categorias: Array<string>}}
 */
export function agruparPorCantonYResumen(operacionesCumplidas) {
    const matriz = {};
    const categoriasSet = new Set();
    
    operacionesCumplidas.forEach((op) => {
        const canton = op.canton || 'No especificado';
        const categoria = obtenerCategoriaResumen(op.tipoOperacion);
        categoriasSet.add(categoria);
        
        if (!matriz[canton]) matriz[canton] = {};
        matriz[canton][categoria] = (matriz[canton][categoria] || 0) + 1;
    });
    
    return { matriz, categorias: Array.from(categoriasSet).sort() };
}

/**
 * Calcula los totales por categoría y total general
 * @param {Object} matriz - Matriz de datos { canton: { categoria: count } }
 * @param {Array} categorias - Lista de categorías
 * @returns {Object} - { totalesPorCategoria: {}, totalGeneral: number, totalesPorCanton: {} }
 */
export function calcularTotalesResumen(matriz, categorias) {
    const totalesPorCategoria = {};
    const totalesPorCanton = {};
    let totalGeneral = 0;
    
    categorias.forEach(cat => totalesPorCategoria[cat] = 0);
    
    Object.keys(matriz).forEach(canton => {
        let totalCanton = 0;
        categorias.forEach(cat => {
            const valor = matriz[canton][cat] || 0;
            totalCanton += valor;
            totalesPorCategoria[cat] = (totalesPorCategoria[cat] || 0) + valor;
        });
        totalesPorCanton[canton] = totalCanton;
        totalGeneral += totalCanton;
    });
    
    return { totalesPorCategoria, totalGeneral, totalesPorCanton };
}