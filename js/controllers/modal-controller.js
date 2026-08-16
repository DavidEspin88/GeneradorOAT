// ==============================================
// CONTROLADOR DE MODAL - HTML2PDF CORREGIDO
// ==============================================

export class ModalController {
    constructor(modalElement, documentoContainer) {
        this.modal = modalElement;
        this.documentoContainer = documentoContainer;
        this.btnCerrar = document.getElementById('btnCerrarModal');
        this.btnImprimir = document.getElementById('btnImprimirModal');
        this.btnDescargarWord = document.getElementById('btnDescargarWord');
        
        this.numeroOrden = '';
        this.fechaSeleccionada = null;
        this.isGenerating = false;

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

        if (this.btnImprimir) {
            this.btnImprimir.addEventListener('click', () => {
                window.print();
            });
        }

        if (this.btnDescargarWord) {
            this.btnDescargarWord.addEventListener('click', () => {
                this.descargarPDF();
            });
        }
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

    _generarNombreArchivo(extension = 'pdf') {
        const fecha = this.fechaSeleccionada || new Date();
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = fecha.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
        const anio = fecha.getFullYear();
        const numero = this.numeroOrden || '0000';
        return `${numero} ${dia} ${mes} ${anio}.${extension}`;
    }

    /**
     * Botón "Descargar PDF" del modal visible: usa el contenedor del
     * modal (this.documentoContainer), que es lo que el usuario ve en
     * pantalla en ese momento.
     */
    descargarPDF() {
        if (this.isGenerating) return;
        this.isGenerating = true;

        if (this.btnDescargarWord) {
            this.btnDescargarWord.disabled = true;
            this.btnDescargarWord.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando PDF...';
        }

        const contenidoElement = this.documentoContainer;

        if (!contenidoElement || contenidoElement.innerHTML.trim() === '') {
            alert('No hay contenido para descargar.');
            this._restaurarBoton();
            return;
        }

        if (this.modal) {
            this.modal.style.display = 'block';
        }

        this._generarPDFDesdeElemento(contenidoElement, this._generarNombreArchivo('pdf'))
            .then(() => {
                console.log('✅ PDF descargado correctamente');
            })
            .catch((error) => {
                console.error('❌ Error al generar PDF:', error);
                alert('Error al generar el PDF: ' + error.message);
            })
            .finally(() => {
                this._restaurarBoton();
            });
    }

    /**
     * ✅ Descarga el PDF de un documento SIN mostrar el modal visible.
     * Pensado para la generación en lote desde los checkboxes de la
     * tabla: crea un contenedor temporal fuera de pantalla con el HTML
     * ya generado (bloquesHtml), genera el PDF a partir de él, y lo
     * elimina al terminar. No toca el modal que el usuario pueda tener
     * abierto en ese momento.
     *
     * @param {Array<string>} bloquesHtml - Bloques HTML del documento
     * @param {string} numeroOrden - Para el nombre del archivo
     * @param {Date} fecha - Para el nombre del archivo
     * @returns {Promise<void>}
     */
    async descargarPDFSilencioso(bloquesHtml, numeroOrden, fecha) {
        const nombreArchivo = (() => {
            const f = fecha || new Date();
            const dia = String(f.getDate()).padStart(2, '0');
            const mes = f.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
            const anio = f.getFullYear();
            const numero = numeroOrden || '0000';
            return `${numero} ${dia} ${mes} ${anio}.pdf`;
        })();

        const contenedorTemporal = document.createElement('div');
        // Fuera de pantalla, pero renderizado (html2canvas necesita que el
        // elemento tenga layout real; display:none no sirve).
        contenedorTemporal.style.position = 'fixed';
        contenedorTemporal.style.top = '0';
        contenedorTemporal.style.left = '-9999px';
        contenedorTemporal.style.width = `${210 * 3.779527559}px`; // ancho A4 en px
        contenedorTemporal.innerHTML = bloquesHtml.join('');
        document.body.appendChild(contenedorTemporal);

        try {
            await this._generarPDFDesdeElemento(contenedorTemporal, nombreArchivo);
        } finally {
            document.body.removeChild(contenedorTemporal);
        }
    }

    /**
     * ✅ Lógica compartida de generación de PDF con html2pdf.js, usada
     * tanto por el botón visible del modal como por la descarga
     * silenciosa en lote.
     * @param {HTMLElement} contenidoElement
     * @param {string} nombreArchivo
     * @returns {Promise<void>}
     */
    _generarPDFDesdeElemento(contenidoElement, nombreArchivo) {
        if (typeof html2pdf === 'undefined') {
            return Promise.reject(new Error('La librería html2pdf.js no está cargada.'));
        }

        const pages = contenidoElement.querySelectorAll('.page, .page-adicional');
        const totalPages = pages.length > 0 ? pages.length : 1;

        const opt = {
            margin: [2.19, 2.01, 2, 2.05],
            filename: nombreArchivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                scrollY: 0,
                scrollX: 0,
                width: 210 * 3.779527559,
                height: 297 * 3.779527559 * totalPages,
                windowWidth: 210 * 3.779527559,
                windowHeight: 297 * 3.779527559 * totalPages,
                logging: true,
                backgroundColor: '#ffffff',
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait',
            },
            pagebreak: {
                mode: ['css', 'legacy'],
                after: '.page-adicional',
            },
        };

        return html2pdf().set(opt).from(contenidoElement).save();
    }

    _restaurarBoton() {
        this.isGenerating = false;
        if (this.btnDescargarWord) {
            this.btnDescargarWord.disabled = false;
            this.btnDescargarWord.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Descargar PDF';
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