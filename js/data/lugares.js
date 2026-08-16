// ==============================================
// DATOS DE LUGARES PARA ORIGEN Y DESTINO
// ==============================================

export const lugares = [
    { 
        id: 1,
        lugar: 'Manta (Ala de Combate 23)', 
        coordenadas: '0°56\'58.0"S 80°41\'15.2"W'
    },
    { 
        id: 2,
        lugar: 'Jipijapa (La Cadena)', 
        coordenadas: '1°44\'23.0"S 80°21\'42.0"W'
    },
    { 
        id: 3,
        lugar: 'Portoviejo (CPL Manabí Nro. 4)', 
        coordenadas: '0°59\'45.0"S 80°25\'30.0"W'
    },
    { 
        id: 4,
        lugar: 'Manta (Puerto)', 
        coordenadas: '0°56\'58.0"S 80°41\'15.2"W'
    },
    { 
        id: 5,
        lugar: 'Montecristi', 
        coordenadas: '1°02\'45.0"S 80°39\'30.0"W'
    },
    { 
        id: 6,
        lugar: 'El Rodeo (CPL Manabí)', 
        coordenadas: '0°58\'30.0"S 80°30\'00.0"W'
    }
];

/**
 * Obtiene un lugar por su nombre
 * @param {string} nombre - Nombre del lugar
 * @returns {Object|null} - Lugar encontrado o null
 */
export function getLugarByNombre(nombre) {
    return lugares.find(l => l.lugar === nombre) || null;
}

/**
 * Obtiene las coordenadas de un lugar por su nombre
 * @param {string} nombre - Nombre del lugar
 * @returns {string|null} - Coordenadas o null
 */
export function getCoordenadasByLugar(nombre) {
    const lugar = getLugarByNombre(nombre);
    return lugar ? lugar.coordenadas : null;
}

/**
 * Obtiene todos los lugares para selects
 * @returns {Array} - Lista de lugares
 */
export function getLugares() {
    return lugares;
}