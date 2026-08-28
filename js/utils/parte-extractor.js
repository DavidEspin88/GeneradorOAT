// ==============================================
// PARTE-EXTRACTOR.JS
// Lógica de extracción de campos para el módulo "Parte al Instante"
// ==============================================

export class ParteExtractor {
    constructor() {
        // Lista de nombres de campo conocidos que sirven de frontera
        this.CAMPOS_CONOCIDOS = [
            'QUÉ\\/CÓ?MO',
            'CÓ?MO',
            'QUIÉ?N',
            'CUANDO',
            'CUÁ?NDO',
            'DÓ?NDE',
            'ACCIONES TOMADAS',
            'GDOS?\\/GAO AFECTADO',
            'GDO\\/GAO'
        ];
    }
    
    /**
     * Obtiene el Grupo Fecha-Hora militar (GFH)
     * Ejemplo: 032330AGO26
     * @returns {string}
     */
    obtenerGFH() {
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const horas = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const mes = meses[ahora.getMonth()];
        const anio = String(ahora.getFullYear()).slice(-2);
        
        return dia + horas + minutos + mes + anio;
    }
    
    /**
     * Extrae el contenido de un campo tipo "*CAMPO:* texto..." o "CAMPO: texto..."
     * deteniéndose en el siguiente campo conocido.
     * @param {string} texto - Texto completo
     * @param {string} nombreCampo - Patrón regex del nombre del campo
     * @param {Array} camposSiguientes - Lista opcional de campos frontera
     * @returns {string}
     */
    extraerCampo(texto, nombreCampo, camposSiguientes) {
        if (!texto) return 'N/A';
        
        const fronteras = camposSiguientes || this.CAMPOS_CONOCIDOS;
        
        const patronFronteras = fronteras
            .map((c) => '\\*?' + c + '\\*?\\s*:')
            .join('|');
        
        const regexStr = '\\*?(?:' + nombreCampo + ')\\*?\\s*:\\*?\\s*([\\s\\S]*?)(?=' + patronFronteras + '|___|$)';
        const regex = new RegExp(regexStr, 'i');
        const match = texto.match(regex);
        
        if (!match || typeof match[1] === 'undefined') return 'N/A';
        
        let valor = match[1].trim();
        valor = valor.replace(/^\*+|\*+$/g, '').trim();
        
        return valor || 'N/A';
    }
    
    /**
     * Extrae el campo CÓMO / QUÉ-CÓMO
     * @param {string} texto
     * @returns {Object} { comoFull, comoCortado }
     */
    extraerComo(texto) {
        const fronterasSinResultado = this.CAMPOS_CONOCIDOS.filter((campo) => {
            return !campo.includes('RESULTADO');
        });
        
        let comoFull = this.extraerCampo(texto, '(?:QUÉ\\/)?CÓ?MO', fronterasSinResultado);
        
        if (comoFull !== 'N/A') {
            const matchFrase = comoFull.match(/([\s\S]*?RESULTADO\s*:?)/i);
            if (matchFrase) {
                comoFull = matchFrase[1].trim();
            }
        }
        
        let comoCortado = comoFull;
        if (comoFull !== 'N/A') {
            const matchCortado = comoFull.match(/(DANDO CUMPLIMIENTO[\s\S]*?)(?=\s*,?\s*SE EJECUTÓ)/i);
            if (matchCortado) {
                comoCortado = matchCortado[1].trim();
            } else {
                const indexPrimeraComa = comoFull.indexOf(',');
                if (indexPrimeraComa !== -1) {
                    const desdeComa = comoFull.substring(indexPrimeraComa + 1).trim();
                    const corteEjecuto = desdeComa.split(/,\s*SE EJECUTÓ/i)[0];
                    comoCortado = corteEjecuto.trim();
                }
            }
        }
        
        return { comoFull, comoCortado };
    }
    
    /**
     * Extrae las líneas de RESULTADO que comienzan con "-"
     * @param {string} texto
     * @returns {string}
     */
    extraerResultados(texto) {
        if (!texto) return 'N/A';
        
        const bloqueResultadosMatch = texto.match(
            /\*?RESULTADO:?\*?\s*([\s\S]*?)(?=\*?CUANDO:|\*?CUÁ?NDO:\*?|$)/i
        );
        
        if (!bloqueResultadosMatch || !bloqueResultadosMatch[1]) return 'N/A';
        
        const lineasConGuion = bloqueResultadosMatch[1]
            .split('\n')
            .map((linea) => linea.trim())
            .filter((linea) => linea.indexOf('-') === 0);
        
        return lineasConGuion.length > 0 ? lineasConGuion.join('<br>') : 'N/A';
    }
    
    /**
     * Extrae QUIÉN y genera la FUENTE
     * @param {string} texto
     * @returns {Object} { quien, fuente }
     */
    extraerQuien(texto) {
        const quien = this.extraerCampo(texto, 'QUIÉ?N');
        const fuente = quien !== 'N/A'
            ? quien.replace(/^(EL|LA|LOS|LAS)\s+/i, '').trim()
            : 'N/A';
        
        return { quien, fuente };
    }
    
    /**
     * Extrae provincia, cantón, sector y coordenadas del campo DÓNDE
     * @param {string} texto
     * @returns {Object} { provincia, canton, sector, coordenadas }
     */
    extraerDonde(texto) {
        const dondeTexto = this.extraerCampo(texto, 'DÓ?NDE');
        const textoBuscar = dondeTexto !== 'N/A' ? dondeTexto : '';
        
        const provinciaMatch = textoBuscar.match(/PROVINCIA\s+(?:DE\s+)?([^,\n]+)/i);
        const cantonMatch = textoBuscar.match(/CANTÓ?N\s+([^,\n]+?)(?=\s+SECTOR|\s*,|$)/i);
        const sectorMatch = textoBuscar.match(/SECTOR\s+([^,\n]+?)(?=\s+COORDENADAS|\s*,|$)/i);
        const coordMatch = textoBuscar.match(/COORDENADAS:\s*([^\n]+)/i);
        
        return {
            provincia: provinciaMatch ? provinciaMatch[1].trim() : 'N/A',
            canton: cantonMatch ? cantonMatch[1].trim() : 'N/A',
            sector: sectorMatch ? sectorMatch[1].trim() : 'N/A',
            coordenadas: coordMatch ? coordMatch[1].trim() : 'N/A'
        };
    }
    
    /**
     * ✅ Extrae el campo APREHENDIDOS del texto. A diferencia de los
     * demás campos, este vive DENTRO del bloque de RESULTADO (después
     * de las líneas con guion, antes de CUANDO), no en su propia
     * sección delimitada por los CAMPOS_CONOCIDOS habituales.
     * Si el campo no aparece en el texto, o aparece explícitamente
     * como "NINGUNO", devuelve 'NINGUNO' en ambos casos (nunca 'N/A').
     * @param {string} texto
     * @returns {string}
     */
    extraerAprehendidos(texto) {
        if (!texto) return 'NINGUNO';

        const match = texto.match(
            /\*?APREHENDIDOS\*?\s*:\*?\s*([\s\S]*?)(?=\*?CUANDO\s*:|\*?CU[AÁ]NDO\s*:|$)/i
        );

        if (!match || typeof match[1] === 'undefined') return 'NINGUNO';

        let valor = match[1].trim();
        valor = valor.replace(/^\*+|\*+$/g, '').trim();

        if (!valor || valor.toUpperCase() === 'NINGUNO') return 'NINGUNO';

        return valor;
    }

    /**
     * Extrae todos los campos en un solo objeto
     * @param {string} texto
     * @returns {Object}
     */
    extraerTodos(texto) {
        const comoInfo = this.extraerComo(texto);
        const quienInfo = this.extraerQuien(texto);
        const dondeInfo = this.extraerDonde(texto);
        
        let acciones = this.extraerCampo(texto, 'ACCIONES TOMADAS', [
            'GDOS?\\/GAO AFECTADO',
            'GDO\\/GAO',
            'FUENTE'
        ]);
        
        if (acciones !== 'N/A') {
    acciones = acciones
        .replace(/\*?GDOS?\/GAO\*?\s*AFECTADO\*?\s*:?\s*(NINGUNO|[^\n]*)/gi, '')
        .replace(/\*?GDO\/GAO\*?\s*AFECTADO\*?\s*:?\s*(NINGUNO|[^\n]*)/gi, '')
        .replace(/\*?GDOS?\/GAO\s*AFECTADO\*?\s*:?\s*(NINGUNO|[^\n]*)/gi, '')
        .trim();

    acciones = acciones.replace(/\*GDOS\/GAO\* AFECTADO NINGUNO/gi, '').trim();
    acciones = acciones.replace(/GDOS\/GAO AFECTADO NINGUNO/gi, '').trim();
        }
        
        return {
            comoFull: comoInfo.comoFull,
            comoCortado: comoInfo.comoCortado,
            resultados: this.extraerResultados(texto),
            aprehendidos: this.extraerAprehendidos(texto),
            quien: quienInfo.quien,
            fuente: quienInfo.fuente,
            cuando: this.extraerCampo(texto, 'CUANDO|CUÁ?NDO'),
            provincia: dondeInfo.provincia,
            canton: dondeInfo.canton,
            sector: dondeInfo.sector,
            coordenadas: dondeInfo.coordenadas,
            acciones: acciones || 'N/A'
        };
    }
}