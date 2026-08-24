// ==============================================
// CONTROLADOR DE TABLA - CON FILTROS Y SELECCIÓN MÚLTIPLE
// ==============================================

import { sanitizarTexto, convertirHoraMilitar } from "../utils/string-utils.js";

export class TableController {
    constructor(tablaBody, contadorElement) {
        this.tablaBody = tablaBody;
        this.contadorElement = contadorElement;
        this.datos = [];
        this.onFilaSeleccionada = null;
        this.onVerOrden = null;
        this.onSeleccionCambiada = null;
        this.grupos = {};
        this.gruposOriginales = {};
        this.filaSeleccionada = null;
        this.filasMarcadas = new Set();
        this.filtros = {
            tipoOperacion: '',
            numeroAccion: '',
            canton: '',
            parroquia: '',
            sector: ''
        };
        this._onChkPrincipalChange = null;
    }

    // ==========================================================
    // MÉTODOS DE CONFIGURACIÓN DE CALLBACKS
    // ==========================================================

    setOnFilaSeleccionada(callback) {
        this.onFilaSeleccionada = callback;
    }

    setOnVerOrden(callback) {
        this.onVerOrden = callback;
    }

    setOnSeleccionCambiada(callback) {
        this.onSeleccionCambiada = callback;
    }

    // ==========================================================
    // MÉTODOS DE SELECCIÓN
    // ==========================================================

    getGruposSeleccionados() {
        return Array.from(this.filasMarcadas)
            .filter((key) => this.grupos[key])
            .map((key) => ({
                grupo: this.grupos[key],
                key,
                numAccion: this.grupos[key].numero || "SIN-NÚMERO",
            }));
    }

    _notificarSeleccionCambiada() {
        if (this.onSeleccionCambiada) {
            this.onSeleccionCambiada(this.filasMarcadas.size);
        }
        this._actualizarEstadoCheckboxPrincipal();
    }

    seleccionarTodas(marcar) {
        const keys = Object.keys(this.grupos);
        if (marcar) {
            keys.forEach((k) => this.filasMarcadas.add(k));
        } else {
            this.filasMarcadas.clear();
        }

        if (this.tablaBody) {
            this.tablaBody.querySelectorAll('.chk-seleccion-oat').forEach((chk) => {
                chk.checked = marcar;
            });
        }

        this._notificarSeleccionCambiada();
        this._actualizarEstadoCheckboxPrincipal();
    }

    _actualizarEstadoCheckboxPrincipal() {
        const chkPrincipal = document.getElementById('chkSeleccionarTodas');
        if (!chkPrincipal) return;

        const total = Object.keys(this.grupos).length;
        const seleccionados = this.filasMarcadas.size;

        if (seleccionados === 0) {
            chkPrincipal.checked = false;
            chkPrincipal.indeterminate = false;
        } else if (seleccionados === total) {
            chkPrincipal.checked = true;
            chkPrincipal.indeterminate = false;
        } else {
            chkPrincipal.checked = false;
            chkPrincipal.indeterminate = true;
        }
    }

    // ==========================================================
    // MÉTODOS DE FILTROS
    // ==========================================================

    setFiltros(filtros) {
      console.log('📥 setFiltros recibido:', filtros);
    this.filtros = { ...this.filtros, ...filtros };
    console.log('📥 Filtros actuales:', this.filtros);
    this._aplicarFiltros();
    }

_aplicarFiltros() {
    console.log('🔍 Aplicando filtros...');
    console.log('📊 gruposOriginales:', Object.keys(this.gruposOriginales).length);

    if (!this.gruposOriginales || Object.keys(this.gruposOriginales).length === 0) {
        console.warn('⚠️ No hay grupos originales para filtrar');
        return;
    }

    const filtroTipo = this.filtros.tipoOperacion?.toUpperCase().trim() || '';
    const filtroNumero = this.filtros.numeroAccion?.trim() || '';
    const filtroCanton = this.filtros.canton?.toUpperCase().trim() || '';
    const filtroParroquia = this.filtros.parroquia?.toUpperCase().trim() || '';
    const filtroSector = this.filtros.sector?.toUpperCase().trim() || '';

    // Si no hay filtros, mostrar todos
    if (!filtroTipo && !filtroNumero && !filtroCanton && !filtroParroquia && !filtroSector) {
        this.grupos = { ...this.gruposOriginales };
        this._renderizarGrupos();
        return;
    }

    // Filtrar grupos
    const gruposFiltrados = {};
    Object.keys(this.gruposOriginales).forEach((key) => {
        const grupo = this.gruposOriginales[key];
        const operaciones = grupo.operaciones || [];

        // Filtrar operaciones del grupo que coinciden con los filtros
        const operacionesFiltradas = operaciones.filter((op) => {
            // ✅ CORREGIDO: Convertir a string de forma segura
            const tipo = String(op.tipoOperacion || '').toUpperCase().trim();
            const numAccion = String(grupo.numero || '');
            const canton = String(op.canton || '').toUpperCase().trim();
            const parroquia = String(op.parroquia || '').toUpperCase().trim();
            const sector = String(op.sector || '').toUpperCase().trim();

            let coincide = true;

            if (filtroTipo) {
                coincide = coincide && tipo.includes(filtroTipo);
            }
            if (filtroNumero) {
                coincide = coincide && numAccion.includes(filtroNumero);
            }
            if (filtroCanton) {
                coincide = coincide && canton.includes(filtroCanton);
            }
            if (filtroParroquia) {
                coincide = coincide && parroquia.includes(filtroParroquia);
            }
            if (filtroSector) {
                coincide = coincide && sector.includes(filtroSector);
            }

            return coincide;
        });

        // Solo mantener el grupo si tiene operaciones que coinciden
        if (operacionesFiltradas.length > 0) {
            gruposFiltrados[key] = {
                ...grupo,
                operaciones: operacionesFiltradas
            };
        }
    });

    this.grupos = gruposFiltrados;
    this._renderizarGrupos();
}

    // ==========================================================
    // MÉTODOS DE RENDERIZADO
    // ==========================================================

    renderizar(grupos, onFilaSeleccionada) {
        if (onFilaSeleccionada) {
            this.onFilaSeleccionada = onFilaSeleccionada;
        }

        this.gruposOriginales = grupos;
        this.grupos = { ...grupos };
        this.filasMarcadas = new Set();
        this._notificarSeleccionCambiada();
        this._actualizarEstadoCheckboxPrincipal();
        this._renderizarGrupos();
    }

    _renderizarGrupos() {
        // Limpiar selección de checkboxes
        this.filasMarcadas = new Set();
        this._notificarSeleccionCambiada();
        this._actualizarEstadoCheckboxPrincipal();

        if (!this.tablaBody) return;

        this.tablaBody.innerHTML = '';

        const keys = Object.keys(this.grupos);
        if (keys.length === 0) {
            this.tablaBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align:center; color:#999; padding:20px;">
                        📭 No hay datos que coincidan con los filtros aplicados
                    </td>
                </tr>
            `;
            this._actualizarContador(0);
            this._actualizarContadorFiltros(0);
            return;
        }

        keys.forEach((key, index) => {
            const grupo = this.grupos[key];
            const primeraOp = grupo.operaciones[0];
            const numAccion = grupo.numero || "SIN-NÚMERO";

            const horarios = this._calcularHorariosConsolidados(grupo.operaciones);

            const sectores = grupo.operaciones.map(
                (op) => op.sector || "Sector no especificado"
            );
            const sectoresUnicos = [...new Set(sectores)];
            let sectoresTexto = sectoresUnicos.join(", ");
            if (sectoresUnicos.length > 1) {
                const ultimo = sectoresUnicos.pop();
                sectoresTexto = `${sectoresUnicos.join(", ")} y ${ultimo}`;
            }

            const tr = document.createElement("tr");
            tr.dataset.key = key;
            tr.dataset.index = index;
            tr.style.cursor = "pointer";
            tr.style.backgroundColor = index % 2 === 0 ? "#f8f9fa" : "white";

            const numAccionMostrar = sanitizarTexto(numAccion);

            const checkboxHtml = `
                <input type="checkbox"
                        class="chk-seleccion-oat"
                        data-key="${key}"
                        style="width:16px; height:16px; cursor:pointer;"
                        title="Marcar para generar documento en lote"
                >
            `;

            const botonVer = `
                <button class="btn-ver-orden" 
                        data-key="${key}"
                        data-numero="${numAccion}"
                        style="
                            background: none;
                            border: none;
                            cursor: pointer;
                            font-size: 16px;
                            padding: 2px 6px;
                            border-radius: 4px;
                            transition: all 0.2s ease;
                            color: #1a237e;
                            margin-left: 4px;
                        "
                        title="Vista previa de la Orden de Operaciones ${numAccion}"
                >
                    👁
                </button>
            `;

            const horaInicioMostrar = horarios.horaInicio || "-";
            const horaFinMostrar = horarios.horaFinal || "-";

            tr.innerHTML = `
                <td style="text-align: center;" class="celda-checkbox">${checkboxHtml}</td>
                <td style="font-weight: bold; text-align: center;">${index + 1}</td>
                <td>${horaInicioMostrar}</td>
                <td>${horaFinMostrar}</td>
                <td>${sanitizarTexto(primeraOp.provincia || "-")}</td>
                <td>${sanitizarTexto(primeraOp.canton || "-")}</td>
                <td>${sanitizarTexto(primeraOp.parroquia || "-")}</td>
                <td style="font-size: 10px;">${sanitizarTexto(sectoresTexto)}</td>
                <td>${sanitizarTexto(primeraOp.accion || "-")}</td>
                <td>${sanitizarTexto(primeraOp.tipoOperacion || "-")}</td>
                <td style="font-weight: bold; color: #1a237e; font-size: 10px; white-space: nowrap;">
                    ${numAccionMostrar}
                    ${botonVer}
                </td>
            `;

            // Evento de clic en la fila (selección simple / resaltado)
            tr.addEventListener("click", (e) => {
                if (e.target.closest(".btn-ver-orden")) return;
                if (e.target.closest(".chk-seleccion-oat")) return;

                this.tablaBody.querySelectorAll("tr").forEach((row) => {
                    row.classList.remove("fila-seleccionada");
                });
                tr.classList.add("fila-seleccionada");

                this.filaSeleccionada = key;

                if (this.onFilaSeleccionada) {
                    this.onFilaSeleccionada(grupo, key, numAccion);
                }
            });

            // Evento del checkbox de selección múltiple
            const checkbox = tr.querySelector(".chk-seleccion-oat");
            if (checkbox) {
                checkbox.addEventListener("click", (e) => {
                    e.stopPropagation();
                });
                checkbox.addEventListener("change", (e) => {
                    const key = checkbox.dataset.key;
                    if (checkbox.checked) {
                        this.filasMarcadas.add(key);
                    } else {
                        this.filasMarcadas.delete(key);
                    }
                    this._notificarSeleccionCambiada();
                });
            }

            // Evento para el botón 👁 (SOLO vista previa, no genera nada)
            const boton = tr.querySelector(".btn-ver-orden");
            if (boton) {
                boton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    const key = boton.dataset.key;
                    const numero = boton.dataset.numero;

                    if (this.onVerOrden) {
                        const grupo = this.grupos[key];
                        if (grupo) {
                            this.onVerOrden(grupo, numero);
                        }
                    }
                });

                boton.addEventListener("mouseenter", () => {
                    boton.style.backgroundColor = "#e3f2fd";
                    boton.style.transform = "scale(1.1)";
                });
                boton.addEventListener("mouseleave", () => {
                    boton.style.backgroundColor = "";
                    boton.style.transform = "scale(1)";
                });
            }

            this.tablaBody.appendChild(tr);
        });

        // Seleccionar primera fila por defecto
        const primeraFila = this.tablaBody.querySelector("tr");
        if (primeraFila) {
            const primerKey = keys[0];
            primeraFila.classList.add("fila-seleccionada");
            this.filaSeleccionada = primerKey;
        }

        // ✅ CORREGIDO: Conectar el checkbox principal del encabezado
        const chkPrincipal = document.getElementById("chkSeleccionarTodas");
        if (chkPrincipal) {
            // ✅ Eliminar evento anterior si existe
            if (this._onChkPrincipalChange) {
                chkPrincipal.removeEventListener("change", this._onChkPrincipalChange);
            }
            // ✅ Crear nuevo callback con bind correcto
            this._onChkPrincipalChange = (e) => {
                const marcar = e.target.checked;
                this.seleccionarTodas(marcar);
            };
            chkPrincipal.addEventListener("change", this._onChkPrincipalChange);
        }

        this._actualizarContador(keys.length);
        this._actualizarContadorFiltros(keys.length);
    }

    // ==========================================================
    // MÉTODOS DE ACTUALIZACIÓN DE CONTADORES
    // ==========================================================

    _actualizarContador(total) {
        if (this.contadorElement) {
            this.contadorElement.textContent = total;
        }
    }

    _actualizarContadorFiltros(total) {
        const contadorFiltros = document.getElementById('filtroResultados');
        if (contadorFiltros) {
            const totalOriginal = Object.keys(this.gruposOriginales || {}).length;
            if (total === totalOriginal) {
                contadorFiltros.innerHTML = `Mostrando <strong>${total}</strong> OATs`;
            } else {
                contadorFiltros.innerHTML = `Mostrando <strong>${total}</strong> de <strong>${totalOriginal}</strong> OATs <span style="color:#999; font-size:12px;">(filtro aplicado)</span>`;
            }
        }
    }

    // ==========================================================
    // MÉTODOS DE CÁLCULO DE HORARIOS
    // ==========================================================

    _calcularHorariosConsolidados(operaciones) {
        if (!operaciones || operaciones.length === 0) {
            return { horaInicio: "-", horaFinal: "-" };
        }

        // 1. Obtener hora de inicio (la más temprana)
        let horaInicio = null;
        const horasInicioValidas = operaciones
            .map((op) => op.horaInicio)
            .filter(
                (h) => h && h !== "-" && h !== "" && h !== "null" && h !== "undefined"
            );

        if (horasInicioValidas.length > 0) {
            const horasNormalizadas = horasInicioValidas.map((h) => {
                let hora = String(h).trim();
                if (!hora.includes(":")) {
                    hora = convertirHoraMilitar(hora) || hora;
                }
                return hora;
            });
            horasNormalizadas.sort();
            horaInicio = horasNormalizadas[0] || "-";
        } else {
            horaInicio = "-";
        }

        // 2. Verificar si existe "FIN OPERACIONES"
        const tieneFinOperaciones = operaciones.some((op) => {
            const hf = String(op.horaFinal || "")
                .toUpperCase()
                .trim();
            return hf === "FIN OPERACIONES";
        });

        if (tieneFinOperaciones) {
            return {
                horaInicio: horaInicio,
                horaFinal: "FIN OPERACIONES",
            };
        }

        // 3. Calcular la última hora real
        let horaFinal = null;
        const horasFinalValidas = operaciones
            .map((op) => op.horaFinal)
            .filter(
                (h) => h && h !== "-" && h !== "" && h !== "null" && h !== "undefined"
            );

        if (horasFinalValidas.length > 0) {
            const horasNormalizadas = horasFinalValidas.map((h) => {
                let hora = String(h).trim();
                if (!hora.includes(":")) {
                    hora = convertirHoraMilitar(hora) || hora;
                }
                return hora;
            });

            const fechaBase = new Date();
            let fechaFinalMax = null;

            operaciones.forEach((op) => {
                const hi = String(op.horaInicio || "").trim();
                const hf = String(op.horaFinal || "").trim();

                if (!hi || !hf || hi === "-" || hf === "-" || hi === "" || hf === "") return;
                if (hf.toUpperCase() === "FIN OPERACIONES") return;

                let hiFormateada = hi.includes(":")
                    ? hi
                    : convertirHoraMilitar(hi) || hi;
                let hfFormateada = hf.includes(":")
                    ? hf
                    : convertirHoraMilitar(hf) || hf;

                if (hiFormateada === hi && !hi.includes(":")) return;
                if (hfFormateada === hf && !hf.includes(":")) return;

                try {
                    const [hiHoras, hiMinutos] = hiFormateada.split(":").map(Number);
                    const [hfHoras, hfMinutos] = hfFormateada.split(":").map(Number);

                    if (
                        isNaN(hiHoras) ||
                        isNaN(hiMinutos) ||
                        isNaN(hfHoras) ||
                        isNaN(hfMinutos)
                    ) return;

                    const fechaInicio = new Date(fechaBase);
                    fechaInicio.setHours(hiHoras, hiMinutos, 0, 0);

                    const fechaFinal = new Date(fechaBase);
                    fechaFinal.setHours(hfHoras, hfMinutos, 0, 0);

                    if (fechaFinal < fechaInicio) {
                        fechaFinal.setDate(fechaFinal.getDate() + 1);
                    }

                    if (!fechaFinalMax || fechaFinal > fechaFinalMax) {
                        fechaFinalMax = fechaFinal;
                        horaFinal = hfFormateada;
                    }
                } catch (e) {
                    // Si hay error, usar el último valor válido
                }
            });

            if (!horaFinal && horasNormalizadas.length > 0) {
                horasNormalizadas.sort();
                horaFinal = horasNormalizadas[horasNormalizadas.length - 1];
            }
        }

        return {
            horaInicio: horaInicio || "-",
            horaFinal: horaFinal || "-",
        };
    }

    // ==========================================================
    // MÉTODOS DE OBTENCIÓN DE DATOS
    // ==========================================================

    getGrupoSeleccionado() {
        if (this.filaSeleccionada && this.grupos[this.filaSeleccionada]) {
            return this.grupos[this.filaSeleccionada];
        }
        return null;
    }

    getGruposOriginales() {
        return this.gruposOriginales;
    }

    getGruposFiltrados() {
        return this.grupos;
    }

    limpiarFiltros() {
        this.filtros = {
            tipoOperacion: '',
            numeroAccion: '',
            canton: '',
            parroquia: '',
            sector: ''
        };
        this.grupos = { ...this.gruposOriginales };
        this._renderizarGrupos();
    }
}