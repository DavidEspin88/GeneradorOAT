// ==============================================
// LECTOR DE ARCHIVOS EXCEL
// ==============================================

import { validarArchivoExcel } from './validators.js';

// ✅ Mapa de meses en español abreviado, para interpretar nombres de
// pestaña como "02 JUL" → 2 de julio. Mismo formato de abreviatura que
// ya usa el proyecto en otros lados (toLocaleString('es-ES', {month:'short'})).
const MESES_ES = {
    ENE: 0, FEB: 1, MAR: 2, ABR: 3, MAY: 4, JUN: 5,
    JUL: 6, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

/**
 * ✅ Interpreta el nombre de una pestaña como "02 JUL" y devuelve la
 * fecha correspondiente (usando el año actual, ya que el nombre de la
 * pestaña no incluye año). Devuelve null si el nombre no tiene el
 * formato esperado (para poder ignorar pestañas que no representan un
 * día, como una posible pestaña de configuración).
 * @param {string} nombreHoja
 * @returns {Date|null}
 */
function parsearFechaPestana(nombreHoja) {
    const texto = String(nombreHoja || '').trim().toUpperCase();
    const match = texto.match(/(\d{1,2})\s*[-\s]?\s*([A-ZÁÉÍÓÚ]{3,})/);
    if (!match) return null;

    const dia = parseInt(match[1], 10);
    const mesTexto = match[2].slice(0, 3);
    const mes = MESES_ES[mesTexto];

    if (mes === undefined || isNaN(dia) || dia < 1 || dia > 31) return null;

    const anio = new Date().getFullYear();
    return new Date(anio, mes, dia);
}

export class ExcelReader {
    constructor() {
        this.mapeoColumnas = {
            horaInicio: 1,
            horaFinal: 2,
            provincia: 3,
            canton: 4,
            parroquia: 5,
            sector: 6,
            accion: 7,
            tipoOperacion: 8,
            accionTactica: 24
        };
        this.registros = [];
        // ✅ Info de las pestañas procesadas (para diagnóstico y para la
        // futura Matriz de Cumplimiento, que necesita saber qué pestañas
        // se leyeron).
        this.pestanasProcesadas = [];
    }

    async leerArchivo(archivo) {
        const validacion = validarArchivoExcel(archivo);
        if (!validacion.valido) {
            throw new Error(validacion.mensaje);
        }

        if (typeof XLSX === 'undefined') {
            throw new Error('La librería XLSX no está cargada');
        }

        try {
            const datosBinarios = await this._leerArchivoComoBinario(archivo);
            const libro = XLSX.read(datosBinarios, { type: "binary" });

            // ✅ Recorrer TODAS las pestañas del libro (antes solo se leía
            // libro.SheetNames[0], la primera). Cada pestaña se procesa con
            // exactamente la misma lógica de detección de encabezados y
            // extracción de filas que ya funcionaba para una sola hoja.
            this.registros = [];
            this.pestanasProcesadas = [];

            libro.SheetNames.forEach((nombreHoja) => {
                const hoja = libro.Sheets[nombreHoja];
                const datosBrutos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

                if (!datosBrutos || datosBrutos.length === 0) return;

                const filaEncabezados = this._detectarEncabezados(datosBrutos);
                const fechaPestana = parsearFechaPestana(nombreHoja);

                const registrosHoja = this._procesarDatosHoja(datosBrutos, filaEncabezados, fechaPestana, nombreHoja);

                if (registrosHoja.length > 0) {
                    this.registros.push(...registrosHoja);
                    this.pestanasProcesadas.push({
                        nombre: nombreHoja,
                        fecha: fechaPestana,
                        registros: registrosHoja.length,
                    });
                }
            });

            return this.registros;

        } catch (error) {
            throw new Error('Error al procesar el Excel: ' + error.message);
        }
    }

    _leerArchivoComoBinario(archivo) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = (e) => resolve(e.target.result);
            lector.onerror = () => reject(new Error('Error al leer el archivo'));
            lector.readAsBinaryString(archivo);
        });
    }

    _detectarEncabezados(datos) {
        for (let i = 0; i < datos.length; i++) {
            const fila = datos[i];
            if (!fila) continue;
            const tieneHorario = fila.some(c => c && String(c).toUpperCase().includes('HORARIO'));
            const tieneProvincia = fila.some(c => c && String(c).toUpperCase().includes('PROVINCIA'));
            if (tieneHorario || tieneProvincia) {
                return i;
            }
        }
        return 4;
    }

    /**
     * ✅ Misma lógica de extracción que antes (_procesarDatos), ahora
     * aplicada a UNA hoja a la vez y devolviendo el array de registros de
     * esa hoja en vez de asignarlos directamente a this.registros, para
     * poder acumularlos de varias pestañas sin perder ninguna.
     *
     * A cada registro se le agrega la propiedad `fechaPestana` (la fecha
     * interpretada del nombre de la pestaña, o null si no se pudo
     * determinar) — es una propiedad ADICIONAL, no reemplaza ni elimina
     * ninguna de las que ya se extraían.
     */
    _procesarDatosHoja(datos, filaEncabezados, fechaPestana, nombreHoja) {
        const registros = [];
        for (let i = filaEncabezados + 1; i < datos.length; i++) {
            const fila = datos[i];
            if (!fila || fila.length === 0) continue;

            const columnaA = fila[0];
            if (columnaA && String(columnaA).toUpperCase().trim() === 'FIN') break;

            const registro = {};
            for (const [campo, posicion] of Object.entries(this.mapeoColumnas)) {
                if (posicion < fila.length) {
                    const valor = fila[posicion];
                    if (valor !== undefined && valor !== null && valor !== '' && valor !== ' ') {
                        registro[campo] = valor;
                    }
                }
            }
            if (Object.keys(registro).length > 0) {
                // ✅ Propiedades adicionales (no reemplazan nada existente)
                registro.fechaPestana = fechaPestana;
                registro.nombrePestana = nombreHoja;
                registros.push(registro);
            }
        }
        return registros;
    }

    setMapeo(nuevoMapeo) {
        this.mapeoColumnas = { ...this.mapeoColumnas, ...nuevoMapeo };
    }

    getRegistros() {
        return this.registros;
    }

    /**
     * ✅ Devuelve la info de las pestañas que se procesaron en la última
     * lectura (nombre, fecha interpretada, cantidad de registros).
     */
    getPestanasProcesadas() {
        return this.pestanasProcesadas;
    }
}