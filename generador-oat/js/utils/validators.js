// ==============================================
// VALIDADORES
// ==============================================

/**
 * Valida que el archivo sea un Excel válido
 * @param {File} archivo - Archivo a validar
 * @returns {Object} - { valido: boolean, mensaje: string }
 */
export function validarArchivoExcel(archivo) {
    if (!archivo) {
        return { valido: false, mensaje: 'No se seleccionó ningún archivo' };
    }

    const extensionesValidas = ['.xlsx', '.xls'];
    const nombre = archivo.name.toLowerCase();
    const esValido = extensionesValidas.some(ext => nombre.endsWith(ext));
    
    if (!esValido) {
        return { valido: false, mensaje: 'El archivo debe ser .xlsx o .xls' };
    }

    const tamañoMaximo = 10 * 1024 * 1024;
    if (archivo.size > tamañoMaximo) {
        return { valido: false, mensaje: 'El archivo no debe superar los 10MB' };
    }

    if (archivo.size === 0) {
        return { valido: false, mensaje: 'El archivo está vacío' };
    }

    return { valido: true, mensaje: 'Archivo válido' };
}

/**
 * Valida que ambos oficiales estén seleccionados
 * @param {string} comandante - Nombre del comandante
 * @param {string} oficial - Nombre del oficial
 * @returns {Object} - { valido: boolean, mensaje: string }
 */
export function validarSeleccionOficiales(comandante, oficial) {
    if (!comandante || comandante === '') {
        return { valido: false, mensaje: 'Debe seleccionar un Comandante' };
    }
    if (!oficial || oficial === '') {
        return { valido: false, mensaje: 'Debe seleccionar un Oficial A3' };
    }
    return { valido: true, mensaje: 'Selección válida' };
}

/**
 * Valida que haya un grupo seleccionado
 * @param {Object} grupo - Grupo seleccionado
 * @returns {Object} - { valido: boolean, mensaje: string }
 */
export function validarGrupoSeleccionado(grupo) {
    if (!grupo || !grupo.operaciones || grupo.operaciones.length === 0) {
        return { valido: false, mensaje: 'Selecciona un grupo de la tabla' };
    }
    return { valido: true, mensaje: 'Grupo válido' };
}