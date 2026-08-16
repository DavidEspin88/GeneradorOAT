// ==============================================
// CONTROLADOR DE FECHA
// ==============================================

export class DateController {
    constructor() {
        this.inputFecha = document.getElementById('fechaMision');
        this.fechaFormateadaSpan = document.getElementById('fechaFormateada');
        this.btnHoy = document.getElementById('btnFechaHoy');
        this.btnManana = document.getElementById('btnFechaManana');

        this.fechaSeleccionada = new Date();
        this.onFechaChange = null;

        this._configurarEventos();
        this._establecerFechaPorDefecto();
    }

    _configurarEventos() {
        // Cambio manual de fecha
        if (this.inputFecha) {
            this.inputFecha.addEventListener('change', (e) => {
                const fecha = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(fecha.getTime())) {
                    this.fechaSeleccionada = fecha;
                    this._actualizarDisplay(fecha);
                    this._notificarCambio(fecha);
                }
            });
        }

        // Botón Hoy
        if (this.btnHoy) {
            this.btnHoy.addEventListener('click', () => {
                const hoy = new Date();
                this.fechaSeleccionada = hoy;
                this._actualizarInput(hoy);
                this._actualizarDisplay(hoy);
                this._notificarCambio(hoy);
            });
        }

        // Botón Mañana
        if (this.btnManana) {
            this.btnManana.addEventListener('click', () => {
                const manana = new Date();
                manana.setDate(manana.getDate() + 1);
                this.fechaSeleccionada = manana;
                this._actualizarInput(manana);
                this._actualizarDisplay(manana);
                this._notificarCambio(manana);
            });
        }
    }

    _establecerFechaPorDefecto() {
        const hoy = new Date();
        this.fechaSeleccionada = hoy;
        this._actualizarInput(hoy);
        this._actualizarDisplay(hoy);
    }

    _actualizarInput(fecha) {
        if (this.inputFecha) {
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0');
            const day = String(fecha.getDate()).padStart(2, '0');
            this.inputFecha.value = `${year}-${month}-${day}`;
        }
    }

    _actualizarDisplay(fecha) {
        if (this.fechaFormateadaSpan) {
            const dia = String(fecha.getDate()).padStart(2, '0');
            const mes = fecha.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
            const anio = String(fecha.getFullYear()).slice(-2);
            this.fechaFormateadaSpan.textContent = `📅 ${dia}-HHMM-${mes}-${anio}`;
            this.fechaFormateadaSpan.title = `Fecha seleccionada: ${fecha.toLocaleDateString('es-ES')}`;
        }
    }

    _notificarCambio(fecha) {
        if (this.onFechaChange) {
            this.onFechaChange(fecha);
        }
    }

    /**
     * Obtiene la fecha seleccionada
     * @returns {Date}
     */
    getFechaSeleccionada() {
        return this.fechaSeleccionada;
    }

    /**
     * Obtiene la fecha formateada para el documento
     * @param {string} horaInicio - Hora de inicio (HHMM)
     * @returns {string} - Fecha formateada DDHHMM-MES-AA
     */
/**
 * Obtiene la fecha formateada para el documento
 * @param {string} horaInicio - Hora de inicio (HHMM)
 * @returns {string} - Fecha formateada DDHHMM-MES-AA
 */
getFechaFormateada(horaInicio) {
    // ✅ Asegurar que fechaSeleccionada sea un Date válido
    let fecha = this.fechaSeleccionada;
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) {
        console.warn('⚠️ fechaSeleccionada inválida en getFechaFormateada, usando fecha actual');
        fecha = new Date();
        this.fechaSeleccionada = fecha;
    }
    
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = fecha.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    const anio = String(fecha.getFullYear()).slice(-2);

    let hora = String(horaInicio || '0030').trim();
    if (hora.includes(':')) {
        hora = hora.replace(':', '');
    }
    while (hora.length < 4) {
        hora = '0' + hora;
    }
    hora = hora.slice(0, 4);

    return `${dia}${hora}-${mes}-${anio}`;
}

    /**
     * Establece el callback para cambios de fecha
     */
    setOnDateChange(callback) {
        this.onFechaChange = callback;
    }
}

