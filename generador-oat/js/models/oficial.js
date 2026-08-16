// ==============================================
// MODELO DE OFICIAL
// ==============================================

import { OficialesSuperiores, funcionesDetalladas } from '../core/constants.js';

/**
 * Obtiene el grado de un oficial por su nombre
 */
export function getGradoByNombre(nombre) {
    const oficial = OficialesSuperiores.find(o => o.nombre === nombre);
    return oficial ? oficial.grado : '';
}

/**
 * Obtiene el nombre de una función por su ID
 */
export function getFuncionById(id) {
    const func = funcionesDetalladas.find(f => f.id === id);
    return func ? func.nombre : '';
}

/**
 * Obtiene todos los oficiales
 */
export function getOficiales() {
    return OficialesSuperiores;
}

/**
 * Obtiene todas las funciones
 */
export function getFunciones() {
    return funcionesDetalladas;
}