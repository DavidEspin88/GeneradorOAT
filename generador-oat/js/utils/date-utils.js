// ==============================================
// UTILIDADES DE FECHAS - VERSIÓN CORREGIDA
// ==============================================

/**
 * Convierte hora militar (HHMM) a formato HH:MM
 * @param {string|number} hora - Hora en formato HHMM
 * @returns {string|null} - Hora en formato HH:MM o null
 */
export function convertirHoraMilitar(hora) {
    if (hora === null || hora === undefined) return null;
    let str = String(hora).trim();
    if (str === '') return null;
    if (/^\d{2}:\d{2}$/.test(str)) return str;
    if (typeof hora === 'number') {
        str = String(hora).padStart(4, '0');
    }
    if (str.length < 4) {
        str = str.padStart(4, '0');
    }
    if (/^\d{4}$/.test(str)) {
        return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
    }
    if (/^\d+$/.test(str) && str.length <= 4) {
        str = str.padStart(4, '0');
        return `${str.slice(0, 2)}:${str.slice(2, 4)}`;
    }
    return null;
}

/**
 * Convierte hora en formato HH:MM a HHMM (militar)
 * @param {string} hora - Hora en formato HH:MM
 * @returns {string} - Hora en formato HHMM
 */
export function convertirHoraAMilitar(hora) {
    if (!hora) return '0000';
    const str = String(hora).trim();
    if (/^\d{2}:\d{2}$/.test(str)) {
        return str.replace(':', '');
    }
    if (/^\d{4}$/.test(str)) {
        return str;
    }
    return '0000';
}

/**
 * Formatea fecha para el documento: DDHHMM-MES-AA
 * @param {Date} fecha - Fecha a formatear
 * @param {string|number} hora - Hora a incluir (HHMM o HH:MM)
 * @returns {string} - Fecha formateada
 */
export function generarFechaDocumento(fecha, hora) {
    // ✅ Validar que fecha sea un objeto Date válido
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
        console.warn('⚠️ fecha inválida en generarFechaDocumento, usando fecha actual');
        fecha = new Date();
    }
    
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    const anio = String(fecha.getFullYear()).slice(-2);
    
    let horaMilitar = String(hora || '0000');
    horaMilitar = horaMilitar.replace(':', '');
    while (horaMilitar.length < 4) {
        horaMilitar = '0' + horaMilitar;
    }
    if (horaMilitar.length > 4) {
        horaMilitar = horaMilitar.slice(0, 4);
    }
    
    return `${dia}${horaMilitar}-${mes}-${anio}`;
}

/**
 * Genera fecha y hora para el encabezado del documento
 * @returns {string} - Fecha y hora formateada
 */
export function generarFechaHoraEncabezado() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const mes = ahora.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    const anio = ahora.getFullYear();
    return `${dia}${hora}${minutos}-${mes}-${anio}`;
}

/**
 * Detecta si un horario cruza la medianoche
 * @param {string|number} horaInicio - Hora de inicio (HHMM o HH:MM)
 * @param {string|number} horaFinal - Hora de final (HHMM o HH:MM)
 * @returns {boolean} - True si cruza la medianoche
 */
export function cruzaMedianoche(horaInicio, horaFinal) {
    if (!horaInicio || !horaFinal) return false;
    
    let hi = String(horaInicio).replace(':', '').padStart(4, '0');
    let hf = String(horaFinal).replace(':', '').padStart(4, '0');
    
    if (!/^\d{4}$/.test(hi) || !/^\d{4}$/.test(hf)) return false;
    
    const numInicio = parseInt(hi.slice(0, 2)) * 60 + parseInt(hi.slice(2, 4));
    const numFinal = parseInt(hf.slice(0, 2)) * 60 + parseInt(hf.slice(2, 4));
    
    return numFinal <= numInicio;
}

/**
 * Calcula la fecha final considerando si cruza medianoche
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {string|number} horaInicio - Hora de inicio
 * @param {string|number} horaFinal - Hora de final
 * @returns {Date} - Fecha final (puede ser el día siguiente)
 */
export function calcularFechaFinal(fechaInicio, horaInicio, horaFinal) {
    const fechaFinal = new Date(fechaInicio);
    
    if (cruzaMedianoche(horaInicio, horaFinal)) {
        fechaFinal.setDate(fechaFinal.getDate() + 1);
    }
    
    return fechaFinal;
}

// ==============================================
// FUNCIONES AUXILIARES PARA CÁLCULO DE RANGOS
// ==============================================

/**
 * Verifica si un valor de hora es válido (no es "-", "", null, undefined, "FIN OPERACIONES")
 * @param {any} valor - Valor a verificar
 * @returns {boolean} - True si el valor es válido
 */
function esHoraValida(valor) {
    if (valor === null || valor === undefined) return false;
    const str = String(valor).trim();
    if (str === '' || str === '-' || str === 'FIN OPERACIONES' || str === 'FIN') return false;
    return true;
}

/**
 * Normaliza una hora a formato HH:MM
 * @param {string|number} hora - Hora a normalizar
 * @returns {string|null} - Hora en formato HH:MM o null
 */
function normalizarHora(hora) {
    if (!esHoraValida(hora)) return null;
    const h = convertirHoraMilitar(hora);
    return h || null;
}

/**
 * Crea un objeto Date combinando una fecha base y una hora
 * @param {Date} fechaBase - Fecha base
 * @param {string} hora - Hora en formato HH:MM
 * @param {number} diaOffset - Offset de días (0 o 1)
 * @returns {Date|null} - Fecha completa o null si es inválida
 */
function crearFechaCompleta(fechaBase, hora, diaOffset = 0) {
    if (!hora) return null;
    const [horas, minutos] = hora.split(':').map(Number);
    if (isNaN(horas) || isNaN(minutos)) return null;
    const fecha = new Date(fechaBase);
    fecha.setHours(horas, minutos, 0, 0);
    if (diaOffset > 0) {
        fecha.setDate(fecha.getDate() + diaOffset);
    }
    return fecha;
}

// ==============================================
// CÁLCULO DE RANGO DE OPERACIÓN (CORRECTO)
// ==============================================

/**
 * Calcula la hora de inicio y hora final de una operación agrupada
 * @param {Array} operaciones - Lista de operaciones del mismo grupo
 * @param {Date} fechaBase - Fecha base para el cálculo
 * @returns {Object} - { horaInicio, horaFinal, fechaInicio, fechaFinal }
 */
export function calcularRangoOperacion(operaciones, fechaBase) {
    // Validar entrada
    if (!operaciones || operaciones.length === 0) {
        return {
            horaInicio: '00:00',
            horaFinal: '00:00',
            fechaInicio: new Date(fechaBase),
            fechaFinal: new Date(fechaBase)
        };
    }

    // ==============================================
    // PASO 1: Filtrar horas válidas
    // ==============================================
    const registrosValidos = operaciones.filter(op => {
        const hi = esHoraValida(op.horaInicio);
        const hf = esHoraValida(op.horaFinal);
        return hi && hf;
    });

    if (registrosValidos.length === 0) {
        return {
            horaInicio: '00:00',
            horaFinal: '00:00',
            fechaInicio: new Date(fechaBase),
            fechaFinal: new Date(fechaBase)
        };
    }

    // ==============================================
    // PASO 2: Calcular hora de inicio (la más temprana)
    // ==============================================
    let horaInicioMin = null;
    let fechaInicioObj = null;

    registrosValidos.forEach(op => {
        const hi = normalizarHora(op.horaInicio);
        if (!hi) return;
        
        const fechaCompleta = crearFechaCompleta(fechaBase, hi, 0);
        if (!fechaCompleta) return;
        
        if (!horaInicioMin || fechaCompleta < fechaInicioObj) {
            horaInicioMin = hi;
            fechaInicioObj = fechaCompleta;
        }
    });

    // ==============================================
    // PASO 3: Calcular hora final (la más tardía, considerando cruce de medianoche)
    // ==============================================
    let horaFinalMax = null;
    let fechaFinalObj = null;

    registrosValidos.forEach(op => {
        const hi = normalizarHora(op.horaInicio);
        const hf = normalizarHora(op.horaFinal);
        if (!hi || !hf) return;
        
        // Determinar si cruza medianoche
        const cruza = cruzaMedianoche(hi, hf);
        const diaOffset = cruza ? 1 : 0;
        
        const fechaCompleta = crearFechaCompleta(fechaBase, hf, diaOffset);
        if (!fechaCompleta) return;
        
        if (!fechaFinalObj || fechaCompleta > fechaFinalObj) {
            horaFinalMax = hf;
            fechaFinalObj = fechaCompleta;
        }
    });

    // ==============================================
    // PASO 4: Retornar resultados
    // ==============================================
    if (!horaInicioMin) horaInicioMin = '00:00';
    if (!horaFinalMax) horaFinalMax = '00:00';
    if (!fechaInicioObj) fechaInicioObj = new Date(fechaBase);
    if (!fechaFinalObj) fechaFinalObj = new Date(fechaBase);

    // Asegurar que fechaFinal >= fechaInicio
    if (fechaFinalObj < fechaInicioObj) {
        fechaFinalObj.setDate(fechaFinalObj.getDate() + 1);
    }

    return {
        horaInicio: horaInicioMin,
        horaFinal: horaFinalMax,
        fechaInicio: fechaInicioObj,
        fechaFinal: fechaFinalObj
    };
}

// ==============================================
// CÁLCULO DE FECHAS PARA MISIÓN (CORREGIDO)
// ==============================================

/**
 * Calcula las fechas de inicio y fin para la sección MISIÓN.
 * ✅ AHORA USA calcularRangoOperacion() que ya funciona correctamente
 * 
 * @param {Array} operacionesAgrupadas - Lista de operaciones del grupo
 * @param {Date} fechaBase - Fecha base para el cálculo
 * @returns {Object} - { fechaInicioStr, fechaFinStr }
 */
export function calcularFechasMision(operacionesAgrupadas, fechaBase) {
    // ✅ Validar entrada
    if (!operacionesAgrupadas || operacionesAgrupadas.length === 0) {
        const fechaRef = fechaBase || new Date();
        return {
            fechaInicioStr: generarFechaDocumento(fechaRef, '0000'),
            fechaFinStr: generarFechaDocumento(fechaRef, '0000')
        };
    }

    // ✅ Verificar si existe FIN OPERACIONES
    const tieneFinOperaciones = operacionesAgrupadas.some(op => {
        const hf = String(op.horaFinal || '').trim().toUpperCase();
        return hf === 'FIN OPERACIONES' || hf === 'FIN';
    });

    // ✅ Si tiene FIN OPERACIONES, devolverlo como fecha fin
    if (tieneFinOperaciones) {
        const primeraOp = operacionesAgrupadas[0];
        const fechaPestana = primeraOp?.fechaPestana || fechaBase || new Date();
        const horaInicio = primeraOp?.horaInicio || '0000';
        const fechaInicioStr = generarFechaDocumento(fechaPestana, horaInicio);
        
        return {
            fechaInicioStr: fechaInicioStr,
            fechaFinStr: 'FIN OPERACIONES'
        };
    }

    // ✅ USAR calcularRangoOperacion() que YA funciona correctamente
    const rango = calcularRangoOperacion(operacionesAgrupadas, fechaBase || new Date());

    // ✅ Convertir horas a formato militar
    const horaInicioMilitar = rango.horaInicio.replace(':', '');
    const horaFinalMilitar = rango.horaFinal.replace(':', '');

    // ✅ Generar fechas formateadas
    const fechaInicioStr = generarFechaDocumento(rango.fechaInicio, horaInicioMilitar);
    const fechaFinStr = generarFechaDocumento(rango.fechaFinal, horaFinalMilitar);

    return {
        fechaInicioStr: fechaInicioStr,
        fechaFinStr: fechaFinStr
    };
}