// ==============================================
// MODELO DE OPERACIÓN
// ==============================================

import { extraerNumeroAccionTactica } from '../utils/string-utils.js';

/**
 * Agrupa operaciones por número de acción táctica
 */
export function agruparPorAccionTactica(datos) {
    const grupos = {};
    
    datos.forEach(fila => {
        const numAccion = extraerNumeroAccionTactica(fila.accionTactica);
        if (!numAccion) {
            const key = `SIN-${Math.random().toString(36).substr(2, 4)}`;
            if (!grupos[key]) {
                grupos[key] = { 
                    numero: null, 
                    operaciones: [], 
                    sectorOriginal: fila.sector || 'Sector no especificado'
                };
            }
            grupos[key].operaciones.push(fila);
            return;
        }
        
        if (!grupos[numAccion]) {
            grupos[numAccion] = { 
                numero: numAccion, 
                operaciones: [],
                sectorOriginal: fila.sector || 'Sector no especificado'
            };
        }
        grupos[numAccion].operaciones.push(fila);
    });
    
    return grupos;
}

/**
 * Combina información de operaciones del mismo grupo
 */
export function combinarOperaciones(operaciones) {
    if (!operaciones || operaciones.length === 0) return null;
    if (operaciones.length === 1) return operaciones[0];
    
    const sectores = operaciones.map(op => op.sector || 'Sector no especificado').filter(s => s);
    const sectoresUnicos = [...new Set(sectores)];
    
    let sectorCombinado = '';
    if (sectoresUnicos.length === 1) {
        sectorCombinado = sectoresUnicos[0];
    } else if (sectoresUnicos.length === 2) {
        sectorCombinado = `${sectoresUnicos[0]} y ${sectoresUnicos[1]}`;
    } else {
        const ultimo = sectoresUnicos[sectoresUnicos.length - 1];
        const anteriores = sectoresUnicos.slice(0, -1).join(', ');
        sectorCombinado = `${anteriores} y ${ultimo}`;
    }
    
    const horasInicio = operaciones.map(op => op.horaInicio).filter(h => h);
    const horasFinal = operaciones.map(op => op.horaFinal).filter(h => h);
    
    const horasInicioSorted = [...horasInicio].sort();
    const horasFinalSorted = [...horasFinal].sort();
    
    const horaInicioCombinada = horasInicioSorted.length > 0 ? horasInicioSorted[0] : '0000';
    const horaFinalCombinada = horasFinalSorted.length > 0 ? horasFinalSorted[horasFinalSorted.length - 1] : '2359';
    
    const tipos = operaciones.map(op => op.tipoOperacion).filter(t => t);
    const tipoCombinado = tipos.length > 0 ? tipos[0] : '';
    
    const acciones = operaciones.map(op => op.accion).filter(a => a);
    const accionCombinada = acciones.length > 0 ? acciones[0] : '';
    
    const provincias = operaciones.map(op => op.provincia).filter(p => p);
    const cantones = operaciones.map(op => op.canton).filter(c => c);
    const parroquias = operaciones.map(op => op.parroquia).filter(p => p);
    
    return {
        ...operaciones[0],
        sector: sectorCombinado,
        horaInicio: horaInicioCombinada,
        horaFinal: horaFinalCombinada,
        tipoOperacion: tipoCombinado,
        accion: accionCombinada,
        provincia: provincias.length > 0 ? provincias[0] : '',
        canton: cantones.length > 0 ? cantones[0] : '',
        parroquia: parroquias.length > 0 ? parroquias[0] : '',
        operacionesAgrupadas: operaciones,
        cantidadOperaciones: operaciones.length
    };
}

/**
 * Filtra operaciones por tipo
 */
export function filtrarPorTipoOperacion(operaciones, tipo) {
    if (!operaciones || operaciones.length === 0) return [];
    return operaciones.filter(op => {
        const tipoOp = String(op.tipoOperacion || '').toUpperCase().trim();
        return tipoOp === tipo.toUpperCase().trim();
    });
}
