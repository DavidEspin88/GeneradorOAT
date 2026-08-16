// ==============================================
// DATOS DE UNIDADES RESPONSABLES
// ==============================================

export const unidadesResponsables = [
    { 
        id: 1,
        nombre: 'P.N',
        descripcion: 'Policía Nacional'
    },
    { 
        id: 2,
        nombre: 'GOEFA',
        descripcion: 'Grupo de Operaciones Especiales de la Fuerza Aérea'
    }
];

/**
 * Obtiene una unidad responsable por su nombre
 * @param {string} nombre - Nombre de la unidad
 * @returns {Object|null} - Unidad encontrada o null
 */
export function getUnidadByNombre(nombre) {
    return unidadesResponsables.find(u => u.nombre === nombre) || null;
}

/**
 * Obtiene la descripción de una unidad por su nombre
 * @param {string} nombre - Nombre de la unidad
 * @returns {string|null} - Descripción o null
 */
export function getDescripcionByUnidad(nombre) {
    const unidad = getUnidadByNombre(nombre);
    return unidad ? unidad.descripcion : null;
}

/**
 * Obtiene todas las unidades responsables
 * @returns {Array} - Lista de unidades
 */
export function getUnidadesResponsables() {
    return unidadesResponsables;
}