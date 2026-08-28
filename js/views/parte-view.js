// ==============================================
// PARTE-VIEW.JS
// Renderizado de modales
// ==============================================

export class ParteModals {
    constructor() {
        this.modalParte = document.getElementById('modal-parte');
        this.modalCmdte = document.getElementById('modal-cmdte');
        this.modalMilitar = document.getElementById('modalMilitar');
        this.cuerpoParte = document.getElementById('cuerpo-modal');
        this.cuerpoMilitar = document.getElementById('cuerpo-modal-militar');
        this._configurarCierre();
    }
    
    _configurarCierre() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cerrar-modal') ||
                e.target.classList.contains('cerrar-modal-cmdte') ||
                e.target.classList.contains('close-btn')) {
                e.stopPropagation();
                this.cerrarTodos();
            }
        });
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('parte-modal') ||
                e.target.classList.contains('modal')) {
                this.cerrarTodos();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarTodos();
            }
        });
    }
    
    mostrarParte(html) {
        if (this.cuerpoParte) {
            this.cuerpoParte.innerHTML = html;
        }
        if (this.modalParte) {
            this.modalParte.style.display = 'flex';
        }
        document.body.style.overflow = 'hidden';
    }
    
    mostrarCmdte() {
        if (this.modalCmdte) {
            this.modalCmdte.style.display = 'flex';
        }
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Muestra el Mensaje Militar con los datos del comandante
     * @param {Object} datos - Datos extraídos del texto
     * @param {Object} comandante - { nombre, grado, funcion, cargoCompleto }
     */
    mostrarMilitar(datos, comandante) {
        if (this.cuerpoMilitar) {
            // ✅ Usar cargoCompleto que incluye la función (Titular/Accidental)
            const cargoMostrar = comandante.cargoCompleto || 'COMANDANTE DEL GT AGUILA (GOMAI)';
            
            this.cuerpoMilitar.innerHTML = `
                <p><strong>DESCRIPCION DEL HECHO/RESULTADOS/NOVEDAD:</strong></p>
                <p>${datos.comoFull}</p>
                <hr>
                <p><strong>RESULTADOS:</strong></p>
                <p>${datos.resultados}</p>
                <hr>
                <p><strong>APREHENDIDOS:</strong> ${datos.aprehendidos}</p>
                <hr>
                <p><strong>QUIÉN:</strong> ${datos.quien}</p>
                <hr>
                <p><strong>QUÉ/CÓMO:</strong> ${datos.comoCortado}</p>
                <hr>
                <p><strong>CUANDO:</strong> ${datos.cuando}</p>
                <hr>
                <p><strong>DÓNDE:</strong></p>
                <p>PROVINCIA: ${datos.provincia}</p>
                <p>CANTÓN: ${datos.canton}</p>
                <p>SECTOR: ${datos.sector}</p>
                <p>COORDENADAS: ${datos.coordenadas}</p>
                <hr>
                <p><strong>ACCIONES TOMADAS:</strong> ${datos.acciones}</p>
                <hr>
                <p><span>FUENTE:</span> ${datos.fuente}</p>
                <hr>
                <p style="text-align: center; margin-top: 20px; font-weight: bold;">
                    ${comandante.nombre}<br>
                    ${comandante.grado}<br>
                    ${cargoMostrar}
                </p>
            `;
        }
        if (this.modalMilitar) {
            this.modalMilitar.style.display = 'flex';
        }
        document.body.style.overflow = 'hidden';
    }
    
    cerrarTodos() {
        const modales = [this.modalParte, this.modalCmdte, this.modalMilitar];
        modales.forEach((modal) => {
            if (modal) {
                modal.style.display = 'none';
            }
        });
        document.body.style.overflow = '';
    }
}