// ==============================================
// OFICIALES SUPERIORES DEL GT ÁGUILA
// ==============================================

export const OficialesSuperiores = [
    { id: 1, nombre: "Johnny Minchala Redrován", grado: "Coronel EMT. Avc." },
    { id: 2, nombre: "Luis Clemente Sánchez Macías", grado: "Teniente Coronel EMT. Avc." },
    { id: 3, nombre: "Ronald Steward Ullauri Alvarado", grado: "Teniente Téc. Avc." },
    { id: 4, nombre: "José Calapaqui González", grado: "Teniente Téc. Avc." }
];

export const funcionesDetalladas = [
    { id: "cmdt_titular", nombre: 'COMANDANTE DEL GT AGUILA (GOMAI)', accidental: false },
    { id: "cmdt_accidental", nombre: 'COMANDANTE DEL GT AGUILA (GOMAI), Accidental', accidental: true },
    { id: "oficial_titular", nombre: 'OFICIAL A3 GT AGUILA (GOMAI)', accidental: false },
    { id: "oficial_accidental", nombre: 'OFICIAL A3 GT AGUILA (GOMAI), Accidental', accidental: true }
];

// Función auxiliar para obtener grado por nombre
export function getGradoByNombre(nombre) {
    const oficial = OficialesSuperiores.find(o => o.nombre === nombre);
    return oficial ? oficial.grado : '';
}

// Función auxiliar para obtener oficial por nombre
export function getOficialByNombre(nombre) {
    return OficialesSuperiores.find(o => o.nombre === nombre);
}

// Función auxiliar para obtener función por ID
export function getFuncionById(id) {
    return funcionesDetalladas.find(f => f.id === id);
}