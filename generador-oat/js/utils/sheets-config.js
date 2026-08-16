// ==============================================
// SHEETS-CONFIG.JS -
// ==============================================

// ✅ URL DE TU WEB APP (la que funciona)
const URL_CONFIG = 'https://script.google.com/macros/s/AKfycbw2EDniBvhDtEx1o4Gz52L4oTGXdhosVyfD7zbV5sYrfUTKy4pd6CtiArh1E1_ggIGL/exec';

/**
 * Carga la configuración desde Google Apps Script usando JSONP
 * @returns {Promise<Object>} - Configuración completa
 */
export function cargarConfiguracionCompleta() {
    return new Promise((resolve) => {
        const callbackName = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const script = document.createElement('script');
        const url = URL_CONFIG + '?callback=' + callbackName;
        
        console.log('🔄 Cargando configuración desde Apps Script...');
        console.log('📡 URL:', url);
        
        // ✅ Aumentar timeout a 15 segundos (Apps Script puede ser lento)
        const timeoutId = setTimeout(() => {
            // ✅ Limpiar solo si la función aún existe
            if (window[callbackName]) {
                delete window[callbackName];
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            console.warn('⚠️ Timeout al cargar configuración, usando fallback');
            resolve(null);
        }, 15000);
        
        // ✅ Definir el callback ANTES de cargar el script
        window[callbackName] = function(data) {
            // ✅ Limpiar timeout y elementos
            clearTimeout(timeoutId);
            
            // ✅ Eliminar el callback para evitar ejecución duplicada
            if (window[callbackName]) {
                delete window[callbackName];
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            
            console.log('✅ Configuración cargada desde Google Apps Script');
            console.log('📊 Datos recibidos:', Object.keys(data));
            resolve(data);
        };
        
        // ✅ Manejar errores de carga
        script.onerror = function() {
            clearTimeout(timeoutId);
            if (window[callbackName]) {
                delete window[callbackName];
            }
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            console.warn('⚠️ Error al cargar configuración, usando fallback');
            resolve(null);
        };
        
        // ✅ Agregar el script al DOM
        script.src = url;
        document.body.appendChild(script);
    });
}

/**
 * Configuración por defecto (fallback)
 */
function obtenerConfiguracionFallback() {
    console.log('📋 Usando configuración fallback local');
    return {
        tiposOperacion: [
            { tipoOperacionId: 'OP-001', codigo: 'REGISTRO', nombre: 'REGISTRO', modeloId: 'MOD-REG' }
        ],
        modelos: [],
        tareasGenerales: [],
        subtareasGenerales: [],
        tareasEscudrilla: [],
        subtareasEscudrilla: [],
        tareasConductor: [],
        documentos: [],
        anexos: [],
        instrucciones: [],
        textosSituacion: [],
        textosMision: [],
        textosConcepto: [],
        literalesEspeciales: [],
        tablas: [],
        tablaColumnas: []
    };
}

/**
 * Filtra elementos por tipo de operación
 */
export function filtrarPorTipoOperacion(items, tipoOperacionId, campoId = 'tipoOperacionId') {
    if (!items || !tipoOperacionId) return [];
    return items.filter(item => item[campoId] === tipoOperacionId);
}