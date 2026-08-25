// ==============================================
// CONTROLADOR DE MODAL - VISTA PREVIA DE DOCUMENTO
// ==============================================

export class ModalController {
    constructor(modalElement, documentoContainer) {
        this.modal = modalElement;
        this.documentoContainer = documentoContainer;
        this.btnCerrar = document.getElementById('btnCerrarModal');

        this.numeroOrden = '';
        this.fechaSeleccionada = null;

        this._configurarEventos();
    }

    _configurarEventos() {
        if (this.btnCerrar) {
            this.btnCerrar.addEventListener('click', () => this.cerrar());
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.cerrar();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && this.modal.style.display === 'block') {
                this.cerrar();
            }
        });

    }

    mostrar(fragment, numeroOrden, fecha) {
        this.numeroOrden = numeroOrden || '0000';
        this.fechaSeleccionada = fecha || new Date();

        if (this.documentoContainer) {
            this.documentoContainer.innerHTML = '';
            this.documentoContainer.appendChild(fragment);
        }

        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    cerrar() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    isOpen() {
        return this.modal && this.modal.style.display === 'block';
    }
}