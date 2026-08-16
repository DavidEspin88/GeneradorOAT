// ==============================================
// CONTROLADOR DE MODAL DE DETALLE - CORREGIDO
// ==============================================

import { sanitizarTexto, convertirHoraMilitar } from '../utils/string-utils.js';

export class DetailModalController {
    constructor() {
        console.log('🔧 Inicializando DetailModalController...');
        this.modal = null;
        this.btnCerrar = null;
        this.tablaBody = null;
        this.titulo = null;
        this._crearModal();
        this._configurarEventos();
        console.log('✅ DetailModalController inicializado');
    }

    _crearModal() {
        const existingModal = document.getElementById('detailModal');
        if (existingModal) {
            existingModal.remove();
        }

        this.modal = document.createElement('div');
        this.modal.id = 'detailModal';
        this.modal.className = 'modal detail-modal';
        this.modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            overflow: auto;
            animation: fadeIn 0.3s ease;
        `;
        
        this.modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                margin: 30px auto;
                width: 95%;
                max-width: 1200px;
                border-radius: 12px;
                box-shadow: 0 10px 50px rgba(0,0,0,0.3);
                max-height: 90vh;
                display: flex;
                flex-direction: column;
            ">
                <div class="modal-header" style="
                    padding: 15px 25px;
                    border-bottom: 2px solid #1a237e;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 10px;
                    background: #f8f9fa;
                    border-radius: 12px 12px 0 0;
                    flex-shrink: 0;
                ">
                    <h2 id="detailModalTitle" style="
                        color: #1a237e;
                        font-size: 16pt;
                        margin: 0;
                    ">📋 Detalle de registros</h2>
                    <button id="btnCerrarDetailModal" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 600;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <i class="fa-solid fa-times"></i> Cerrar
                    </button>
                </div>
                <div class="modal-body" id="detailModalContent" style="
                    padding: 20px 25px;
                    overflow-y: auto;
                    flex: 1;
                    background: #f5f5f5;
                    border-radius: 0 0 12px 12px;
                ">
                    <div style="overflow-x: auto;">
                        <table style="
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 11pt;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        ">
                            <thead style="background: #1a237e; color: white;">
                                <tr>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Ord.</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Hora Inicio</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Hora Fin</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Provincia</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Cantón</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Parroquia</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Sector</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Acción</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Tipo Operación</th>
                                    <th style="padding: 10px 8px; text-align: left; white-space: nowrap;">Acción Táctica</th>
                                </tr>
                            </thead>
                            <tbody id="detailTableBody">
                                <tr>
                                    <td colspan="10" style="text-align:center; padding:20px; color:#999;">
                                        No hay registros para mostrar
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.btnCerrar = this.modal.querySelector('#btnCerrarDetailModal');
        this.tablaBody = this.modal.querySelector('#detailTableBody');
        this.titulo = this.modal.querySelector('#detailModalTitle');
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

    /**
     * Muestra el modal con los registros del grupo
     */
    mostrar(registros, numeroAccion, totalRegistros) {
        console.log('📋 DetailModalController.mostrar() llamado');
        console.log('📋 Registros recibidos:', registros);
        console.log('📋 Número de acción:', numeroAccion);
        console.log('📋 Total registros:', totalRegistros);

        if (!registros || registros.length === 0) {
            console.warn('⚠️ No hay registros para mostrar');
            alert('No hay registros para mostrar');
            return;
        }

        // Actualizar título
        if (this.titulo) {
            this.titulo.textContent = `📋 Registros agrupados - OAT ${numeroAccion || 'SIN NÚMERO'} (${totalRegistros || registros.length} registros)`;
        }

        // Renderizar tabla
        this._renderizarTabla(registros);

        // Mostrar modal
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            console.log('✅ Modal de detalle abierto');
        }
    }

     _renderizarTabla(registros) {
        if (!this.tablaBody) return;
        this.tablaBody.innerHTML = '';

        registros.forEach((fila, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #d0d0d0';
            tr.style.transition = 'background 0.2s ease';
            
            // ✅ Mostrar valores ORIGINALES sin consolidación
            const horaInicio = fila.horaInicio || '-';
            const horaFinal = fila.horaFinal || '-';

            tr.innerHTML = `
                <td style="padding: 8px; font-weight: bold; text-align: center;">${index + 1}</td>
                <td style="padding: 8px;">${sanitizarTexto(horaInicio)}</td>
                <td style="padding: 8px;">${sanitizarTexto(horaFinal)}</td>
                <td style="padding: 8px;">${sanitizarTexto(fila.provincia || '-')}</td>
                <td style="padding: 8px;">${sanitizarTexto(fila.canton || '-')}</td>
                <td style="padding: 8px;">${sanitizarTexto(fila.parroquia || '-')}</td>
                <td style="padding: 8px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sanitizarTexto(fila.sector || '-')}</td>
                <td style="padding: 8px;">${sanitizarTexto(fila.accion || '-')}</td>
                <td style="padding: 8px;">${sanitizarTexto(fila.tipoOperacion || '-')}</td>
                <td style="padding: 8px; font-weight: bold; color: #1a237e;">${sanitizarTexto(fila.accionTactica || '-')}</td>
            `;

            tr.addEventListener('mouseenter', () => {
                tr.style.backgroundColor = '#f5f5f5';
            });
            tr.addEventListener('mouseleave', () => {
                tr.style.backgroundColor = '';
            });

            this.tablaBody.appendChild(tr);
        });
    }


    cerrar() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
            console.log('🔒 Modal de detalle cerrado');
        }
    }

    isOpen() {
        return this.modal && this.modal.style.display === 'block';
    }
}