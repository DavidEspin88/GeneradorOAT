// ==============================================
// UTILIDADES DE STRINGS
// ==============================================

/**
 * Obtiene siglas de un nombre completo
 * @param {string} nombre - Nombre completo
 * @returns {string} - Siglas (máximo 4 caracteres)
 */
export function obtenerSiglas(nombre) {
    if (!nombre) return '';
    const palabras = nombre.trim().split(/\s+/);
    if (palabras.length === 1) return palabras[0].slice(0, 4).toUpperCase();
    let siglas = '';
    for (let i = 0; i < palabras.length && siglas.length < 4; i++) {
        const palabra = palabras[i].replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
        if (palabra.length > 0) siglas += palabra[0].toUpperCase();
    }
    while (siglas.length < 4) {
        siglas += siglas.charAt(siglas.length - 1) || 'R';
    }
    return siglas.slice(0, 4).toUpperCase();
}

/**
 * Formatea número de orden completo
 * @param {string|number} orden - Número de orden
 * @returns {string} - Número de orden formateado
 */
export function formatearNumeroOrden(orden) {
    return `FTCM-GTAGUILA-2026-${orden}-S`;
}

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} texto - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizarTexto(texto) {
    if (!texto) return '';
    const mapa = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(texto).replace(/[&<>"']/g, function(m) { return mapa[m]; });
}

/**
 * Extrae el número de acción táctica del campo acciónTactica
 * Ejemplo: "FTCM-1234-S" → "1234"
 * @param {string} texto - Texto de acción táctica
 * @returns {string|null} - Número extraído o null
 */
export function extraerNumeroAccionTactica(texto) {
    if (!texto) return null;
    const str = String(texto).trim();
    const match = str.match(/-(\d+)-S/i);
    if (match) {
        return match[1];
    }
    const match2 = str.match(/-(\d+)/);
    if (match2) {
        return match2[1];
    }
    return null;
}

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
// ==============================================
// UTILIDADES DE STRINGS
// ==============================================

// ... funciones existentes ...

/**
 * Limpia un sector eliminando URLs y contenido desde "https"
 * @param {string} sector - Texto del sector
 * @returns {string} - Sector limpio sin URLs
 */
export function limpiarSector(sector) {
    if (!sector) return 'Sector no especificado';
    
    let texto = String(sector).trim();
    
    // Si contiene "https", eliminar todo desde "https" hasta el final
    const indexHttps = texto.toLowerCase().indexOf('https');
    if (indexHttps !== -1) {
        texto = texto.substring(0, indexHttps).trim();
    }
    
    // Si contiene "http", eliminar todo desde "http" hasta el final
    const indexHttp = texto.toLowerCase().indexOf('http');
    if (indexHttp !== -1) {
        texto = texto.substring(0, indexHttp).trim();
    }
    
    // Si contiene "www.", eliminar todo desde "www." hasta el final
    const indexWww = texto.toLowerCase().indexOf('www.');
    if (indexWww !== -1) {
        texto = texto.substring(0, indexWww).trim();
    }
    
    // Eliminar caracteres especiales al final
    texto = texto.replace(/[,.;:]+$/, '').trim();
    
    return texto || 'Sector no especificado';
}