// ==============================================
// CONTROLADOR DE TABLA - CON LÓGICA FIN OPERACIONES
// Y SELECCIÓN MÚLTIPLE POR CHECKBOX
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
    this.filaSeleccionada = null;
    // ✅ Set de keys marcadas con checkbox (selección múltiple,
    // independiente de this.filaSeleccionada que es la fila
    // resaltada por click simple)
    this.filasMarcadas = new Set();
  }

  setOnFilaSeleccionada(callback) {
    this.onFilaSeleccionada = callback;
  }

  setOnVerOrden(callback) {
    this.onVerOrden = callback;
  }

  /**
   * ✅ Se llama cada vez que cambia la cantidad de filas marcadas con
   * checkbox. Recibe la cantidad actual de filas marcadas.
   */
  setOnSeleccionCambiada(callback) {
    this.onSeleccionCambiada = callback;
  }

  /**
   * ✅ Devuelve los grupos actualmente marcados con checkbox.
   * @returns {Array<{grupo: Object, key: string, numAccion: string}>}
   */
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
    // ✅ Actualizar estado del checkbox principal
    this._actualizarEstadoCheckboxPrincipal();
}

  /**
   * Renderiza los datos agrupados en la tabla
   */
  renderizar(grupos, onFilaSeleccionada) {
    if (onFilaSeleccionada) {
      this.onFilaSeleccionada = onFilaSeleccionada;
    }

    this.grupos = grupos;
    // ✅ Nueva carga de datos: se limpia la selección de checkboxes anterior
    this.filasMarcadas = new Set();
    this._notificarSeleccionCambiada();
    this._actualizarEstadoCheckboxPrincipal();

    if (!this.tablaBody) return;

    this.tablaBody.innerHTML = "";

    const keys = Object.keys(grupos);
    if (keys.length === 0) {
      this.tablaBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align:center; color:#999; padding:20px;">
                        📭 No hay datos para mostrar
                    </td>
                </tr>
            `;
      this._actualizarContador(0);
      return;
    }

    keys.forEach((key, index) => {
      const grupo = grupos[key];
      const primeraOp = grupo.operaciones[0];
      const numAccion = grupo.numero || "SIN-NÚMERO";

      // ✅ Calcular horarios consolidados con prioridad FIN OPERACIONES
      const horarios = this._calcularHorariosConsolidados(grupo.operaciones);

      // Combinar sectores
      const sectores = grupo.operaciones.map(
        (op) => op.sector || "Sector no especificado",
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

      // ✅ Mostrar hora consolidada en la tabla
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

      // ✅ Evento de clic en la fila (selección simple / resaltado)
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

      // ✅ Evento del checkbox de selección múltiple
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
          // 🔍 DIAGNÓSTICO TEMPORAL: confirma en la consola del navegador
          // qué keys quedan marcadas cada vez que cambia un checkbox.
          console.log(
            "☑️ [DIAGNÓSTICO] filasMarcadas ahora:",
            Array.from(this.filasMarcadas),
          );
          this._notificarSeleccionCambiada();
        });
      }

      // ✅ Evento para el botón 👁 (SOLO vista previa, no genera nada)
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
    // ✅ Conectar el checkbox principal del encabezado
    const chkPrincipal = document.getElementById("chkSeleccionarTodas");
    if (chkPrincipal) {
      // Remover event listener previo para evitar duplicados
      chkPrincipal.removeEventListener("change", this._onChkPrincipalChange);
      // Bind del evento
      this._onChkPrincipalChange = this._onChkPrincipalChange.bind(this);
      chkPrincipal.addEventListener("change", this._onChkPrincipalChange);
    }

    this._actualizarContador(keys.length);
  }

/**
 * Marca/desmarca todas las filas visibles.
 * @param {boolean} marcar - true para seleccionar todas, false para deseleccionar
 */
seleccionarTodas(marcar) {
    const keys = Object.keys(this.grupos);
    if (marcar) {
        keys.forEach((k) => this.filasMarcadas.add(k));
    } else {
        this.filasMarcadas.clear();
    }
    
    // Actualizar todos los checkboxes individuales
    if (this.tablaBody) {
        this.tablaBody.querySelectorAll('.chk-seleccion-oat').forEach((chk) => {
            chk.checked = marcar;
        });
    }
    
    this._notificarSeleccionCambiada();
    this._actualizarEstadoCheckboxPrincipal();
}

/**
 * Actualiza el estado del checkbox principal basado en la selección actual
 * - checked=true si todos están seleccionados
 * - checked=false si ninguno está seleccionado
 * - indeterminate=true si hay selección parcial
 */
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
  /**
 * Evento del checkbox principal del encabezado
 * Selecciona o deselecciona todos los registros
 */
_onChkPrincipalChange(e) {
    const chkPrincipal = e.target;
    const marcar = chkPrincipal.checked;
    this.seleccionarTodas(marcar);
}

  /**
   * ✅ Calcula los horarios consolidados con prioridad FIN OPERACIONES
   * @param {Array} operaciones - Lista de operaciones del grupo
   * @returns {Object} - { horaInicio, horaFinal }
   */
  _calcularHorariosConsolidados(operaciones) {
    if (!operaciones || operaciones.length === 0) {
      return { horaInicio: "-", horaFinal: "-" };
    }

    // ==============================================
    // 1. Obtener hora de inicio (la más temprana)
    // ==============================================
    let horaInicio = null;
    const horasInicioValidas = operaciones
      .map((op) => op.horaInicio)
      .filter(
        (h) => h && h !== "-" && h !== "" && h !== "null" && h !== "undefined",
      );

    if (horasInicioValidas.length > 0) {
      // Convertir a formato HH:MM para comparar
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

    // ==============================================
    // 2. Verificar si existe "FIN OPERACIONES"
    // ==============================================
    const tieneFinOperaciones = operaciones.some((op) => {
      const hf = String(op.horaFinal || "")
        .toUpperCase()
        .trim();
      return hf === "FIN OPERACIONES";
    });

    // ==============================================
    // 3. Si existe FIN OPERACIONES, usarlo como hora final
    // ==============================================
    if (tieneFinOperaciones) {
      return {
        horaInicio: horaInicio,
        horaFinal: "FIN OPERACIONES",
      };
    }

    // ==============================================
    // 4. Si no existe FIN OPERACIONES, calcular la última hora real
    // ==============================================
    let horaFinal = null;
    const horasFinalValidas = operaciones
      .map((op) => op.horaFinal)
      .filter(
        (h) => h && h !== "-" && h !== "" && h !== "null" && h !== "undefined",
      );

    if (horasFinalValidas.length > 0) {
      // Convertir a formato HH:MM y ordenar
      const horasNormalizadas = horasFinalValidas.map((h) => {
        let hora = String(h).trim();
        if (!hora.includes(":")) {
          hora = convertirHoraMilitar(hora) || hora;
        }
        return hora;
      });

      // Para determinar la última hora considerando medianoche,
      // necesitamos usar la lógica de fechas completas
      const fechaBase = new Date();
      let fechaFinalMax = null;

      operaciones.forEach((op) => {
        const hi = String(op.horaInicio || "").trim();
        const hf = String(op.horaFinal || "").trim();

        if (!hi || !hf || hi === "-" || hf === "-" || hi === "" || hf === "")
          return;
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
          )
            return;

          const fechaInicio = new Date(fechaBase);
          fechaInicio.setHours(hiHoras, hiMinutos, 0, 0);

          const fechaFinal = new Date(fechaBase);
          fechaFinal.setHours(hfHoras, hfMinutos, 0, 0);

          // Si cruza medianoche, sumar un día
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

      // Si no se pudo calcular con fechas, usar la última hora numérica
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

  _actualizarContador(total) {
    if (this.contadorElement) {
      this.contadorElement.textContent = total;
    }
  }

  getGrupoSeleccionado() {
    if (this.filaSeleccionada && this.grupos[this.filaSeleccionada]) {
      return this.grupos[this.filaSeleccionada];
    }
    return null;
  }
}
