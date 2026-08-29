// ==============================================
// CONTROLADOR PRINCIPAL - CON CARGA DE CONFIGURACIÓN
// ==============================================

import { ExcelReader } from '../utils/excel-reader.js';
import { DocumentGenerator } from '../services/document-generator.js';
import { PageBuilder } from '../services/page-builder.js';
import { agruparPorAccionTactica, combinarOperaciones } from '../models/operacion.js';
import { validarSeleccionOficiales, validarGrupoSeleccionado } from '../utils/validators.js';
import { TableController } from './table-controller.js';
import { ModalController } from './modal-controller.js';
import { DetailModalController } from './detail-modal-controller.js';
import { DateController } from './date-controller.js';
import { Renderers } from '../views/renderers.js';
import { getOficiales, getFunciones, getGradoByNombre, getFuncionById } from '../models/oficial.js';
import { getLugares, getCoordenadasByLugar } from '../data/lugares.js';
import { getUnidadesResponsables, getDescripcionByUnidad } from '../data/unidades-responsables.js';
import { documentos, anexos } from '../core/constants.js';

// ✅ IMPORTAR FUNCIONES DE FECHA Y CONFIGURACIÓN
import { generarFechaHoraEncabezado } from '../utils/date-utils.js';
import { cargarConfiguracionCompleta, filtrarPorTipoOperacion } from '../utils/sheets-config.js';

// URL de tu Web App desplegada en Google Apps Script
const URL_APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbw2EDniBvhDtEx1o4Gz52L4oTGXdhosVyfD7zbV5sYrfUTKy4pd6CtiArh1E1_ggIGL/exec';

export class AppController {
    constructor() {
        // DOM Elements
        this.elements = {
            btnGenerar: document.getElementById('btnGenerarDocumento'),
            excelInput: document.getElementById('subirExcel'),
            estadoCarga: document.getElementById('estadoCarga'),
            contador: document.getElementById('contadorRegistros'),
            tablaBody: document.getElementById('tablaBody'),
            documentoRenderizado: document.getElementById('documentoRenderizado'),
            modal: document.getElementById('modalDocumento'),
            comandanteSelect: document.getElementById('comandanteSelect'),
            oficialSelect: document.getElementById('oficialSelect'),
            funcionComandanteSelect: document.getElementById('funcionComandanteSelect'),
            funcionOficialSelect: document.getElementById('funcionOficialSelect'),
            autoridadSeguridad: document.getElementById('autoridadSeguridad'),
            origenSelect: document.getElementById('origenSelect'),
            destinoSelect: document.getElementById('destinoSelect'),
            origenCoordenadas: document.getElementById('origenCoordenadas'),
            destinoCoordenadas: document.getElementById('destinoCoordenadas'),
            unidadResponsableSelect: document.getElementById('unidadResponsableSelect'),
            unidadResponsableInfo: document.getElementById('unidadResponsableInfo'),
            // ✅ Nuevo botón para generar documentos en lote desde los
            // checkboxes marcados en la tabla.
            btnGenerarSeleccion: document.getElementById('btnGenerarSeleccion'),
            tipoSeguridadSelect: document.getElementById('tipoSeguridadSelect'),
            cplSelect: document.getElementById('cplSelect'),
            cplContainer: document.getElementById('cplContainer'),
            cplInfo: document.getElementById('cplInfo')

        };

        // Sub-controladores
        this.tableController = new TableController(this.elements.tablaBody, this.elements.contador);
        this.modalController = new ModalController(this.elements.modal, this.elements.documentoRenderizado);
        this.detailModalController = new DetailModalController();
        this.dateController = new DateController();

        // Servicios
        this.excelReader = new ExcelReader();
        this.documentGenerator = new DocumentGenerator();
        this.pageBuilder = new PageBuilder();

        // Estado
        this.datosExcel = [];
        this.filaSeleccionada = null;
        this.gruposSeleccionados = [];

        // ✅ Configuración
        this.configuracion = null;

        // Inicializar
        this.inicializar();
    }

    async inicializar() {
        console.log('🚀 Inicializando App Controller...');

        // ✅ CARGAR CONFIGURACIÓN DESDE GOOGLE SHEETS
        try {
            this.configuracion = await cargarConfiguracionCompleta();
            if (this.configuracion && Object.keys(this.configuracion).length > 0) {
                // ✅ Verificar que los datos estén completos
                const tieneDatos = this.configuracion.tiposOperacion &&
                    this.configuracion.tiposOperacion.length > 0;

                if (tieneDatos) {
                    console.log('✅ Configuración cargada correctamente');
                    console.log(`📊 Tipos de operación: ${this.configuracion.tiposOperacion?.length || 0}`);
                    console.log(`📊 Tareas generales: ${this.configuracion.tareasGenerales?.length || 0}`);
                    console.log(`📊 Documentos: ${this.configuracion.documentos?.length || 0}`);
                } else {
                    console.warn('⚠️ Configuración sin datos, usando fallback');
                    this.configuracion = null;
                }
            } else {
                console.warn('⚠️ Configuración vacía, usando valores por defecto');
                this.configuracion = null;
            }
        } catch (error) {
            console.warn('⚠️ Error al cargar configuración:', error);
            this.configuracion = null;
        }

        // ✅ PASAR CONFIGURACIÓN AL GENERADOR
        if (this.documentGenerator && this.configuracion) {
            this.documentGenerator.setConfiguracion(this.configuracion);
        }

        this.cargarSelectores();
        this.cargarLugares();
        this.cargarUnidadesResponsables();
        this.configurarEventosTabla();

        this.configurarEventos();
        this.configurarEventosLugares();
        this.configurarEventosUnidadResponsable();
        this.actualizarBotonGenerar(false);
        this.actualizarBotonGenerarSeleccion(false);
        console.log('✅ App Controller inicializado');
    }



    configurarEventosTabla() {
        this.tableController.setOnFilaSeleccionada((grupo, key, numAccion) => {
            console.log('📋 Callback onFilaSeleccionada ejecutado');
            if (grupo && grupo.operaciones) {
                this.detailModalController.mostrar(
                    grupo.operaciones,
                    numAccion,
                    grupo.operaciones.length
                );
            } else {
                alert('No hay registros para mostrar en detalle');
            }
        });

        this.tableController.setOnVerOrden((grupo, numAccion) => {
            console.log('👁 Vista previa de Orden de Operaciones:', numAccion);
            this.mostrarVistaPrevia(grupo);
        });

        this.tableController.setOnSeleccionCambiada((cantidad) => {
            this.actualizarBotonGenerarSeleccion(cantidad > 0);
        });

        // ✅ CONFIGURAR FILTROS (asegurar que se llama)
        this._configurarFiltros();
    }

    /**
     * ✅ Carga los selectores de oficiales
     */
    cargarSelectores() {
        try {
            const oficiales = getOficiales();
            const funciones = getFunciones();

            if (this.elements.comandanteSelect) {
                this.elements.comandanteSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
                oficiales.forEach((oficial) => {
                    const option = document.createElement('option');
                    option.value = oficial.nombre;
                    option.textContent = `${oficial.grado} ${oficial.nombre}`;
                    this.elements.comandanteSelect.appendChild(option);
                });
                console.log(`✅ ${oficiales.length} oficiales cargados en Comandante`);
            }

            if (this.elements.oficialSelect) {
                this.elements.oficialSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
                oficiales.forEach((oficial) => {
                    const option = document.createElement('option');
                    option.value = oficial.nombre;
                    option.textContent = `${oficial.grado} ${oficial.nombre}`;
                    this.elements.oficialSelect.appendChild(option);
                });
                console.log(`✅ ${oficiales.length} oficiales cargados en Oficial A3`);
            }

            if (this.elements.funcionComandanteSelect) {
                this.elements.funcionComandanteSelect.innerHTML = '<option value="">-- Función --</option>';
                funciones.forEach((funcion) => {
                    const option = document.createElement('option');
                    option.value = funcion.id;
                    option.textContent = funcion.nombre;
                    this.elements.funcionComandanteSelect.appendChild(option);
                });
                console.log(`✅ ${funciones.length} funciones cargadas en Comandante`);
            }

            if (this.elements.funcionOficialSelect) {
                this.elements.funcionOficialSelect.innerHTML = '<option value="">-- Función --</option>';
                funciones.forEach((funcion) => {
                    const option = document.createElement('option');
                    option.value = funcion.id;
                    option.textContent = funcion.nombre;
                    this.elements.funcionOficialSelect.appendChild(option);
                });
                console.log(`✅ ${funciones.length} funciones cargadas en Oficial A3`);
            }
        } catch (error) {
            console.error('❌ Error al cargar selectores:', error);
        }
    }

    /**
     * Configura eventos de fecha
     */
    configurarEventosUnidadResponsable() {
        if (this.elements.unidadResponsableSelect) {
            this.elements.unidadResponsableSelect.addEventListener('change', () => {
                const selected = this.elements.unidadResponsableSelect.value;
                const descripcion = getDescripcionByUnidad(selected);
                if (this.elements.unidadResponsableInfo) {
                    if (descripcion) {
                        this.elements.unidadResponsableInfo.innerHTML = `<i class="fa-regular fa-circle-check"></i> ${descripcion}`;
                        this.elements.unidadResponsableInfo.style.color = '#28a745';
                        this.elements.unidadResponsableInfo.style.background = '#e8f5e9';
                    } else {
                        this.elements.unidadResponsableInfo.innerHTML = `<i class="fa-regular fa-circle-info"></i> Unidad responsable de la operación`;
                        this.elements.unidadResponsableInfo.style.color = '';
                        this.elements.unidadResponsableInfo.style.background = '#f5f5f5';
                    }
                }
            });
        }
    }
    /**
         * Configura eventos de lugares
         */
    configurarEventosLugares() {
        if (this.elements.origenSelect) {
            this.elements.origenSelect.addEventListener('change', () => {
                const selected = this.elements.origenSelect.value;
                const coordenadas = getCoordenadasByLugar(selected);
                if (this.elements.origenCoordenadas) {
                    if (coordenadas) {
                        this.elements.origenCoordenadas.innerHTML = `<i class="fa-regular fa-map"></i> Coordenadas: ${coordenadas}`;
                        this.elements.origenCoordenadas.classList.add('active');
                    } else {
                        this.elements.origenCoordenadas.innerHTML = `<i class="fa-regular fa-map"></i> Coordenadas: --`;
                        this.elements.origenCoordenadas.classList.remove('active');
                    }
                }
            });
        }

        if (this.elements.destinoSelect) {
            this.elements.destinoSelect.addEventListener('change', () => {
                const selected = this.elements.destinoSelect.value;
                const coordenadas = getCoordenadasByLugar(selected);
                if (this.elements.destinoCoordenadas) {
                    if (coordenadas) {
                        this.elements.destinoCoordenadas.innerHTML = `<i class="fa-regular fa-map"></i> Coordenadas: ${coordenadas}`;
                        this.elements.destinoCoordenadas.classList.add('active');
                    } else {
                        this.elements.destinoCoordenadas.innerHTML = `<i class="fa-regular fa-map"></i> Coordenadas: --`;
                        this.elements.destinoCoordenadas.classList.remove('active');
                    }
                }
            });
        }
    }


    /**
     * Carga los lugares
     */
    cargarLugares() {
        const lugares = getLugares();
        if (this.elements.origenSelect) {
            this.elements.origenSelect.innerHTML = '<option value="">-- Seleccionar Origen --</option>';
            lugares.forEach((lugar) => {
                const option = document.createElement('option');
                option.value = lugar.lugar;
                option.textContent = lugar.lugar;
                option.dataset.coordenadas = lugar.coordenadas;
                this.elements.origenSelect.appendChild(option);
            });
            console.log(`✅ ${lugares.length} lugares cargados en Origen`);
        }

        if (this.elements.destinoSelect) {
            this.elements.destinoSelect.innerHTML = '<option value="">-- Seleccionar Destino --</option>';
            lugares.forEach((lugar) => {
                const option = document.createElement('option');
                option.value = lugar.lugar;
                option.textContent = lugar.lugar;
                option.dataset.coordenadas = lugar.coordenadas;
                this.elements.destinoSelect.appendChild(option);
            });
            console.log(`✅ ${lugares.length} lugares cargados en Destino`);
        }
    }

    /**
     * Carga las unidades responsables
     */
    cargarUnidadesResponsables() {
        const unidades = getUnidadesResponsables();
        if (this.elements.unidadResponsableSelect) {
            this.elements.unidadResponsableSelect.innerHTML = '<option value="">-- Seleccionar Unidad --</option>';
            unidades.forEach((unidad) => {
                const option = document.createElement('option');
                option.value = unidad.nombre;
                option.textContent = `${unidad.nombre} - ${unidad.descripcion}`;
                option.dataset.descripcion = unidad.descripcion;
                this.elements.unidadResponsableSelect.appendChild(option);
            });
            console.log(`✅ ${unidades.length} unidades responsables cargadas`);
        }
    }

    /**
    * Configura eventos principales
    */
    configurarEventos() {
        if (this.elements.btnGenerar) {
            this.elements.btnGenerar.addEventListener('click', () => this.onGenerarDocumento());
        }

        // ✅ Nuevo botón: genera un documento por cada fila marcada con checkbox
        if (this.elements.btnGenerarSeleccion) {
            this.elements.btnGenerarSeleccion.addEventListener('click', () => this.onGenerarDesdeSeleccion());
        }

        if (this.elements.excelInput) {
            this.elements.excelInput.addEventListener('change', (e) => this.onCargarExcel(e));
        }

        this.dateController.setOnDateChange((fecha) => {
            console.log('📅 Fecha actualizada:', fecha);
        });
            // ✅ NUEVO: Configurar eventos de tipo de seguridad (PMI/PPL)
    this._configurarEventosTipoSeguridad();
    }

/**
 * Configura eventos para el selector de tipo de seguridad (PMI/PPL)
 * y el selector de Centro de Privación de Libertad (CPL)
 */
_configurarEventosTipoSeguridad() {
    const tipoSeguridadSelect = this.elements.tipoSeguridadSelect;
    const cplSelect = this.elements.cplSelect;
    const cplContainer = this.elements.cplContainer;
    const cplInfo = this.elements.cplInfo;

    // Si no existe el selector, salir (no romper)
    if (!tipoSeguridadSelect) {
        console.warn('⚠️ Selector de tipo de seguridad no encontrado');
        return;
    }

    // --- Evento: cambio de tipo de seguridad ---
    tipoSeguridadSelect.addEventListener('change', () => {
        const tipo = tipoSeguridadSelect.value;
        
        if (tipo === 'PPL') {
            // Habilitar selector CPL
            if (cplSelect) {
                cplSelect.disabled = false;
                cplSelect.value = ''; // Limpiar selección previa
            }
            if (cplContainer) {
                cplContainer.style.display = 'block';
                // Usamos timeout para la animación
                setTimeout(() => {
                    cplContainer.classList.add('active');
                }, 10);
            }
            if (cplInfo) {
                cplInfo.textContent = '⚠️ Obligatorio seleccionar un CPL';
                cplInfo.className = 'cpl-info required';
                cplInfo.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Obligatorio seleccionar un CPL';
            }
        } else {
            // PMI - deshabilitar y ocultar selector CPL
            if (cplSelect) {
                cplSelect.disabled = true;
                cplSelect.value = '';
            }
            if (cplContainer) {
                cplContainer.classList.remove('active');
                cplContainer.style.display = 'none';
            }
            if (cplInfo) {
                cplInfo.textContent = 'Seleccione el centro de privación de libertad';
                cplInfo.className = 'cpl-info';
                cplInfo.innerHTML = '<i class="fa-regular fa-circle-info"></i> Seleccione el centro de privación de libertad';
            }
        }
    });

    // --- Evento: cambio de CPL ---
    if (cplSelect) {
        cplSelect.addEventListener('change', () => {
            if (cplSelect.value) {
                const option = cplSelect.selectedOptions[0];
                const nombre = option?.dataset?.nombre || cplSelect.value;
                if (cplInfo) {
                    cplInfo.textContent = `✅ ${nombre}`;
                    cplInfo.className = 'cpl-info';
                    cplInfo.style.color = '#28a745';
                    cplInfo.innerHTML = `<i class="fa-regular fa-circle-check"></i> ${nombre}`;
                }
            } else {
                if (cplInfo) {
                    cplInfo.textContent = '⚠️ Obligatorio seleccionar un CPL';
                    cplInfo.className = 'cpl-info required';
                    cplInfo.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Obligatorio seleccionar un CPL';
                }
            }
        });
    }

    // --- Disparar evento inicial para establecer estado correcto ---
    // Esto asegura que si el usuario ya tiene seleccionado "PPL" al cargar,
    // el campo CPL se muestre habilitado
    if (tipoSeguridadSelect.value === 'PPL') {
        tipoSeguridadSelect.dispatchEvent(new Event('change'));
    }
}

    /**
     * ✅ Habilita/deshabilita el botón "Generar Documento desde selección"
     * según si hay alguna fila marcada con checkbox.
     */
    actualizarBotonGenerarSeleccion(habilitado) {
        if (this.elements.btnGenerarSeleccion) {
            this.elements.btnGenerarSeleccion.disabled = !habilitado;
            this.elements.btnGenerarSeleccion.style.opacity = habilitado ? '1' : '0.5';
        }
    }
    /**
     * ✅ Configura los eventos de filtros
     */
    _configurarFiltros() {
        console.log('🔍 Configurando filtros...');

        const filtros = [
            { id: 'filtroTipoOperacion', campo: 'tipoOperacion' },
            { id: 'filtroNumeroAccion', campo: 'numeroAccion' },
            { id: 'filtroCanton', campo: 'canton' },
            { id: 'filtroParroquia', campo: 'parroquia' },
            { id: 'filtroSector', campo: 'sector' }
        ];

        // ✅ Conectar cada input con su evento
        filtros.forEach(({ id, campo }) => {
            const input = document.getElementById(id);
            if (input) {
                console.log(`✅ Filtro conectado: ${id}`);
                input.addEventListener('input', (e) => {
                    const valor = e.target.value;
                    console.log(`🔍 Filtrando por ${campo}: "${valor}"`);
                    if (this.tableController) {
                        this.tableController.setFiltros({ [campo]: valor });
                    } else {
                        console.warn('⚠️ tableController no disponible');
                    }
                });
            } else {
                console.warn(`⚠️ Elemento no encontrado: ${id}`);
            }
        });

        // ✅ Botón limpiar filtros
        const btnLimpiar = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                console.log('🧹 Limpiando filtros...');
                filtros.forEach(({ id }) => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = '';
                    }
                });
                if (this.tableController) {
                    this.tableController.limpiarFiltros();
                }
            });
        } else {
            console.warn('⚠️ Botón "Limpiar filtros" no encontrado');
        }
    }
    /**
     * Actualiza el estado del botón generar
     */
    actualizarBotonGenerar(habilitado) {
        if (this.elements.btnGenerar) {
            this.elements.btnGenerar.disabled = !habilitado;
            this.elements.btnGenerar.style.opacity = habilitado ? '1' : '0.5';
            this.elements.btnGenerar.title = habilitado
                ? 'Generar OAT con el grupo seleccionado'
                : 'Selecciona un grupo de la tabla';
        }
    }

    async onCargarExcel(evento) {
        const archivo = evento.target.files[0];
        if (!archivo) return;

        console.log('📂 Procesando archivo:', archivo.name);

        Renderers.mostrarEstadoCarga(this.elements.estadoCarga, '⏳ Procesando...', 'warning');

        try {
            const datos = await this.excelReader.leerArchivo(archivo);
            this.datosExcel = datos;

            const grupos = agruparPorAccionTactica(datos);
            this.gruposSeleccionados = grupos;

            this.tableController.renderizar(grupos, (grupo, key, numAccion) => {
                this.filaSeleccionada = grupo;
                this.actualizarBotonGenerar(true);

                if (grupo && grupo.operaciones && grupo.operaciones.length > 0) {
                    this.detailModalController.mostrar(
                        grupo.operaciones,
                        numAccion,
                        grupo.operaciones.length
                    );
                }
            });

            const totalGrupos = Object.keys(grupos).length;
            Renderers.mostrarEstadoCarga(
                this.elements.estadoCarga,
                `✅ ${totalGrupos} OATs agrupadas (${datos.length} operaciones)`,
                'success'
            );

            console.log(`✅ ${totalGrupos} grupos de OAT (${datos.length} operaciones)`);

            // ✅ NUEVA SECCIÓN — Dashboard: avisa (sin acoplarse a ningún
            // módulo nuevo) que el Excel se cargó correctamente, para que
            // dashboard-view.js pueda habilitar la tarjeta "Crear Orden de
            // Operación" y pasarle los datos a la Matriz de Cumplimiento
            // (sin que el usuario tenga que volver a cargar el Excel).
            // No cambia ningún comportamiento existente.
            document.dispatchEvent(new CustomEvent('oat:excel-cargado', {
                detail: {
                    totalGrupos,
                    totalOperaciones: datos.length,
                    registros: datos,
                    pestanasProcesadas: this.excelReader.getPestanasProcesadas
                        ? this.excelReader.getPestanasProcesadas()
                        : [],
                }
            }));

        } catch (error) {
            console.error('❌ Error al cargar Excel:', error);
            Renderers.mostrarEstadoCarga(
                this.elements.estadoCarga,
                `❌ Error: ${error.message}`,
                'error'
            );
            alert('Error al cargar el Excel: ' + error.message);
        }
    }


    // ... resto de métodos (cargarUnidadesResponsables, cargarLugares, cargarSelectores, etc.) ...

    /**
      * ✅ Construye los bloques HTML y el payload completo para UN grupo
      * (OAT). Se usa tanto para la vista previa en el modal como para el
      * envío individual y el envío en lote — así toda la lógica de
      * extracción vive en un solo lugar.
      * @param {Object} grupo - Grupo de operaciones (una fila de la tabla)
      * @returns {{payload: Object, bloquesHtml: Array, numAccion: string, fechaParaDocumento: Date}}
      */
_construirDatosDocumento(grupo) {
    const comandanteNombre = this.elements.comandanteSelect?.value || '';
    const oficialA3Nombre = this.elements.oficialSelect?.value || '';
    const funcionCmdtId = this.elements.funcionComandanteSelect?.value || '';
    const funcionOficialId = this.elements.funcionOficialSelect?.value || '';

    const comandanteGrado = getGradoByNombre(comandanteNombre);
    const oficialA3Grado = getGradoByNombre(oficialA3Nombre);
    const funcionCmdtNombre = getFuncionById(funcionCmdtId);
    const funcionOficialNombre = getFuncionById(funcionOficialId);

    const autoridadSeguridad = this.elements.autoridadSeguridad?.value?.trim() || '';
    const origen = this.elements.origenSelect?.value || '';
    const destino = this.elements.destinoSelect?.value || '';
    const origenCoordenadas = getCoordenadasByLugar(origen) || '';
    const destinoCoordenadas = getCoordenadasByLugar(destino) || '';
    const unidadResponsable = this.elements.unidadResponsableSelect?.value || '';
    const unidadDescripcion = getDescripcionByUnidad(unidadResponsable) || '';

    // ✅ OBTENER NUEVOS VALORES DE TIPO DE SEGURIDAD
    const tipoSeguridad = this.elements.tipoSeguridadSelect?.value || 'PMI';
    const cplSelect = this.elements.cplSelect;
    const cplOption = cplSelect?.selectedOptions?.[0];
    const cplNombre = cplOption?.dataset?.nombre || '';
    const cplProvincia = cplOption?.dataset?.provincia || '';

    const numAccion = grupo.numero || '7299';
    const datosCombinados = combinarOperaciones(grupo.operaciones);

    let fechaParaDocumento = this.dateController.getFechaSeleccionada();
    if (!fechaParaDocumento || isNaN(fechaParaDocumento.getTime())) {
        fechaParaDocumento = new Date();
        console.warn('⚠️ Fecha no válida, usando fecha actual:', fechaParaDocumento);
    }

    // ✅ AHORA PASAMOS LOS NUEVOS PARÁMETROS
    this.documentGenerator.setDatos(
        datosCombinados,
        { nombre: comandanteNombre, funcion: funcionCmdtId },
        { nombre: oficialA3Nombre, funcion: funcionOficialId },
        numAccion,
        fechaParaDocumento,
        autoridadSeguridad,
        origen,
        destino,
        origenCoordenadas,
        destinoCoordenadas,
        unidadResponsable,
        unidadDescripcion,
        // ✅ NUEVOS PARÁMETROS
        tipoSeguridad,
        cplNombre,
        cplProvincia
    );

    const bloquesHtml = this.documentGenerator.generarDocumentoCompleto();

    const datosProcesados = extraerSeccionesDeBloques(bloquesHtml, datosCombinados);
    const tablas = extraerTablas(bloquesHtml);
    const tareas = extraerTareasEstructuradas(bloquesHtml);
    const instrucciones = extraerInstruccionesCoordinacion(bloquesHtml);
    const documentosExtraidos = extraerDocumentos(bloquesHtml);
    const anexosExtraidos = extraerAnexos(bloquesHtml);

    const horaInicioOp = datosCombinados.horaInicio || '0030';
    let fechaMilitarGrupo = '';
    try {
        fechaMilitarGrupo = this.dateController.getFechaFormateada(horaInicioOp);
    } catch (error) {
        console.warn('⚠️ Error al formatear fecha, usando valor por defecto:', error);
        fechaMilitarGrupo = `310000-JUL-26`;
    }

    const fechaEncabezado = generarFechaHoraEncabezado();

    const payload = {
        unidadResponsable: unidadResponsable || 'GT AGUILA (GOMAI)',
        unidadDescripcion: unidadDescripcion,
        numOrden: numAccion,
        fechaMilitarGrupo: fechaMilitarGrupo,
        fechaEncabezado: fechaEncabezado,

        asunto: datosProcesados.asunto,
        situacion: datosProcesados.situacion,
        mision: datosProcesados.mision,
        conceptoOperacion: datosProcesados.concepto,

        tareasGenerales: tareas.tareasGenerales || [],
        tareasEscudrilla: tareas.tareasEscudrilla || [],
        tareasConductor: tareas.tareasConductor || [],

        tablas: tablas || {},

        instruccionesCoordinacion: instrucciones || '',

        comandante: comandanteNombre,
        gradoComandante: comandanteGrado,
        funcionComandante: funcionCmdtNombre,
        oficialA3: oficialA3Nombre,
        gradoOficialA3: oficialA3Grado,
        funcionA3: funcionOficialNombre,
        autoridadSeguridad: autoridadSeguridad,

        origen: origen,
        origenCoordenadas: origenCoordenadas,
        destino: destino,
        destinoCoordenadas: destinoCoordenadas,

        // ✅ NUEVOS CAMPOS EN EL PAYLOAD (opcional, por si Apps Script los necesita)
        tipoSeguridad: tipoSeguridad,
        cplNombre: cplNombre,
        cplProvincia: cplProvincia,

        documentos: documentosExtraidos,
        anexos: anexosExtraidos,

        tipoOperacion: datosCombinados.tipoOperacion || '',
        canton: datosCombinados.canton || 'MANTA'
    };

    return { payload, bloquesHtml, numAccion, fechaParaDocumento };
}

    /**
     * ✅ Envía un payload ya construido a Apps Script (doPost).
     * No toca el modal ni el estado de ningún botón — eso lo maneja
     * quien la llama (onGenerarDocumento u onGenerarDesdeSeleccion).
     * @param {Object} payload
     * @returns {Promise<{ok: boolean, url?: string, mensaje?: string}>}
     */
    async _enviarAAppsScript(payload) {
        try {
            const response = await fetch(URL_APPS_SCRIPT, {
                method: 'POST',
                // ⚠️ text/plain evita el preflight OPTIONS que Apps Script Web App no maneja.
                // doPost() igual hace JSON.parse(e.postData.contents) sin mirar el header.
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Respuesta HTTP ${response.status}`);
            }

            const resultado = await response.json();

            if (resultado.estatus === 'OK') {
                return { ok: true, url: resultado.urlDocumento };
            }
            return { ok: false, mensaje: resultado.mensaje || 'Error desconocido' };
        } catch (error) {
            return { ok: false, mensaje: error.message };
        }
    }

    /**
     * ✅ Muestra SOLO la vista previa en el modal, sin enviar nada a
     * Apps Script. Es lo que dispara el botón 👁 de cada fila.
     * @param {Object} grupo
     */
    mostrarVistaPrevia(grupo) {
        const validacionGrupo = validarGrupoSeleccionado(grupo);
        if (!validacionGrupo.valido) {
            alert('⚠️ ' + validacionGrupo.mensaje);
            return;
        }

        const { bloquesHtml, numAccion, fechaParaDocumento } = this._construirDatosDocumento(grupo);

        const contenedorPreview = document.createElement('div');
        contenedorPreview.innerHTML = bloquesHtml.join('');
        this.modalController.mostrar(contenedorPreview, numAccion, fechaParaDocumento);
    }

    /**
     * ✅ Flujo del botón principal "Generar": vista previa + envío a
     * Apps Script para la fila actualmente seleccionada (this.filaSeleccionada).
     */
    async onGenerarDocumento() {
        console.log('🔄 Generando documento (fila seleccionada)...');

          // ✅ OBTENER NUEVOS VALORES DE TIPO DE SEGURIDAD
    const tipoSeguridad = this.elements.tipoSeguridadSelect?.value || 'PMI';
    const cplSelect = this.elements.cplSelect;
    const cplValue = cplSelect?.value || '';
    const cplOption = cplSelect?.selectedOptions?.[0];
    const cplNombre = cplOption?.dataset?.nombre || '';
    const cplProvincia = cplOption?.dataset?.provincia || '';

    // ✅ VALIDACIÓN: Si es PPL, debe tener un CPL seleccionado
    if (tipoSeguridad === 'PPL' && !cplValue) {
        alert('⚠️ Debe seleccionar un Centro de Privación de Libertad (CPL) para el tipo de seguridad PPL');
        if (cplSelect) {
            cplSelect.focus();
            cplSelect.style.borderColor = '#d32f2f';
            setTimeout(() => {
                cplSelect.style.borderColor = '';
            }, 3000);
        }
        return;
    }


        const validacionOficiales = validarSeleccionOficiales(
            this.elements.comandanteSelect?.value || '',
            this.elements.oficialSelect?.value || ''
        );
        if (!validacionOficiales.valido) {
            alert('⚠️ ' + validacionOficiales.mensaje);
            return;
        }

        const validacionGrupo = validarGrupoSeleccionado(this.filaSeleccionada);
        if (!validacionGrupo.valido) {
            alert('⚠️ ' + validacionGrupo.mensaje);
            return;
        }

        const { payload, bloquesHtml, numAccion, fechaParaDocumento } =
            this._construirDatosDocumento(this.filaSeleccionada);

        console.log('📦 Payload a enviar a Apps Script:', payload.numOrden);

        // Vista previa
        const contenedorPreview = document.createElement('div');
        contenedorPreview.innerHTML = bloquesHtml.join('');
        this.modalController.mostrar(contenedorPreview, numAccion, fechaParaDocumento);



        // Envío
        this.elements.btnGenerar.disabled = true;
        try {
            const resultado = await this._enviarAAppsScript(payload);
            if (resultado.ok) {
                console.log('✅ Documento generado en Google Docs:', resultado.url);
                alert('✅ Documento generado correctamente en Google Docs.\n\nEnlace: ' + resultado.url);
            } else {
                console.error('❌ Error del backend Apps Script:', resultado.mensaje);
                alert('❌ Error al generar el documento: ' + resultado.mensaje);
            }
        } finally {
            this.elements.btnGenerar.disabled = false;
        }
    }

    /**
     * ✅ Genera UN documento de Google Docs por cada fila marcada con
     * checkbox en la tabla, uno a la vez (no en paralelo, para no
     * saturar el Web App de Apps Script ni arriesgar condiciones de
     * carrera al copiar la plantilla). Al final muestra un resumen con
     * los enlaces generados y cualquier error.
     */
    async onGenerarDesdeSeleccion() {
        const seleccionadas = this.tableController.getGruposSeleccionados();

        // 🔍 DIAGNÓSTICO TEMPORAL: confirma en la consola exactamente cuántas
        // y cuáles OATs detectó el botón al momento de presionarlo.
        console.log('🚀 [DIAGNÓSTICO] onGenerarDesdeSeleccion — seleccionadas:',
            seleccionadas.map(s => s.numAccion));

        if (!seleccionadas || seleccionadas.length === 0) {
            alert('⚠️ Selecciona al menos una OAT con el checkbox de la tabla.');
            return;
        }

        const validacionOficiales = validarSeleccionOficiales(
            this.elements.comandanteSelect?.value || '',
            this.elements.oficialSelect?.value || ''
        );
        if (!validacionOficiales.valido) {
            alert('⚠️ ' + validacionOficiales.mensaje);
            return;
        }

        this.elements.btnGenerarSeleccion.disabled = true;
        const textoOriginalBoton = this.elements.btnGenerarSeleccion.textContent;

        const resultados = [];

        for (let i = 0; i < seleccionadas.length; i++) {
            const { grupo, numAccion } = seleccionadas[i];
            this.elements.btnGenerarSeleccion.textContent =
                `Generando ${i + 1} de ${seleccionadas.length}...`;

            const validacionGrupo = validarGrupoSeleccionado(grupo);
            if (!validacionGrupo.valido) {
                resultados.push({ numAccion, ok: false, mensaje: validacionGrupo.mensaje });
                continue;
            }

            try {
                const { payload } = this._construirDatosDocumento(grupo);

                // ✅ Enviar a Apps Script para generar/guardar el documento
                // de Google Docs en Drive.
                const resultado = await this._enviarAAppsScript(payload);
                resultados.push({ numAccion, ...resultado });
            } catch (error) {
                resultados.push({ numAccion, ok: false, mensaje: error.message });
            }
        }

        this.elements.btnGenerarSeleccion.disabled = false;
        this.elements.btnGenerarSeleccion.textContent = textoOriginalBoton;

        const exitosos = resultados.filter((r) => r.ok);
        const fallidos = resultados.filter((r) => !r.ok);

        let mensaje = `✅ ${exitosos.length} de ${resultados.length} documentos guardados en Drive.\n`;
        exitosos.forEach((r) => {
            mensaje += `\n• OAT ${r.numAccion}: ${r.url}`;
        });
        if (fallidos.length > 0) {
            mensaje += `\n\n❌ Fallaron ${fallidos.length}:`;
            fallidos.forEach((r) => {
                mensaje += `\n• OAT ${r.numAccion}: ${r.mensaje}`;
            });
        }

        alert(mensaje);
    }

    _actualizarBotonGenerar(habilitado) {
        if (this.elements.btnGenerar) {
            this.elements.btnGenerar.disabled = !habilitado;
            this.elements.btnGenerar.style.opacity = habilitado ? '1' : '0.5';
            this.elements.btnGenerar.title = habilitado
                ? 'Generar OAT con el grupo seleccionado'
                : 'Selecciona un grupo de la tabla';
        }
    }
}

// ==============================================
// FUNCIONES AUXILIARES DE EXTRACCIÓN
// ==============================================

function extraerSeccionesDeBloques(bloques, datosCombinados) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const asuntoElem = div.querySelector('.parrafo-asunto');
    const situacionElems = div.querySelectorAll('.texto-situacion, .texto-situacion-2');
    const misionElem = div.querySelector('.texto-mision');
    const conceptoElems = div.querySelectorAll('.texto-concepto');

    const asunto = asuntoElem ? asuntoElem.textContent.replace('Asunto:', '').trim() : `Cumplimiento operaciones ${datosCombinados.tipoOperacion}`;
    let situacion = Array.from(situacionElems).map(e => e.textContent.trim()).join('\n\n');
    let mision = misionElem ? misionElem.textContent.trim() : '';
    let concepto = Array.from(conceptoElems).map(e => e.textContent.trim()).join('\n\n');

    return { asunto, situacion, mision, concepto };
}

function extraerTareasCompletas(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const tareasGenerales = [];
    const tareasGeneralesSubs = [];

    const itemsGenerales = div.querySelectorAll('.item-letra');
    itemsGenerales.forEach(el => {
        const texto = el.querySelector('.text-doc');
        if (texto) {
            tareasGenerales.push(texto.textContent.trim());
        }
        let sub = el.nextElementSibling;
        while (sub && sub.classList.contains('item-vineta-99')) {
            const subTexto = sub.querySelector('.text-doc');
            if (subTexto) {
                tareasGeneralesSubs.push(subTexto.textContent.trim());
            }
            sub = sub.nextElementSibling;
        }
    });

    const tareasEscudrilla = [];
    const tareasEscudrillaSubs = [];

    const itemsEscuadrilla = div.querySelectorAll('.item-letra-85');
    const itemsComandante = Array.from(itemsEscuadrilla).slice(0, 14);
    itemsComandante.forEach(el => {
        const texto = el.querySelector('.text-doc');
        if (texto) {
            tareasEscudrilla.push(texto.textContent.trim());
        }
        let sub = el.nextElementSibling;
        while (sub && sub.classList.contains('item-vineta-106')) {
            const subTexto = sub.querySelector('.text-doc');
            if (subTexto) {
                tareasEscudrillaSubs.push(subTexto.textContent.trim());
            }
            sub = sub.nextElementSibling;
        }
    });

    const tareasConductor = [];
    const itemsConductor = Array.from(itemsEscuadrilla).slice(-4);
    itemsConductor.forEach(el => {
        const texto = el.querySelector('.text-doc');
        if (texto) {
            tareasConductor.push(texto.textContent.trim());
        }
    });

    return {
        tareasGenerales: tareasGenerales.join('\n'),
        tareasGeneralesSubs: tareasGeneralesSubs.join('\n'),
        tareasEscudrilla: tareasEscudrilla.join('\n'),
        tareasEscudrillaSubs: tareasEscudrillaSubs.join('\n'),
        tareasConductor: tareasConductor.join('\n')
    };
}

function extraerInstruccionesCoordinacion(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const instrucciones = [];
    const items = div.querySelectorAll('.item-letra-71');
    items.forEach(el => {
        const texto = el.querySelector('.text-doc');
        if (texto) {
            instrucciones.push(`${texto.textContent.trim()}`);
        }
    });

    return instrucciones.join('\n');
}

/**
 * ✅ Extrae los textos del bloque "Documentos: (Marco legal)" ya generado
 * (por document-generator.js, a partir de Google Sheets con fallback).
 * @param {Array} bloques - Bloques HTML del documento
 * @returns {Array<string>} - Lista de textos de documentos
 */
function extraerDocumentos(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const documentosEncontrados = [];
    const items = div.querySelectorAll('.item-docs .text-doc');
    items.forEach(el => {
        documentosEncontrados.push(el.textContent.trim());
    });

    return documentosEncontrados;
}

/**
 * ✅ Extrae los textos del bloque "ANEXOS" ya generado
 * (por document-generator.js, a partir de Google Sheets con fallback).
 * @param {Array} bloques - Bloques HTML del documento
 * @returns {Array<string>} - Lista de textos de anexos
 */
function extraerAnexos(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const anexosEncontrados = [];
    const items = div.querySelectorAll('.anexo-item');
    items.forEach(el => {
        anexosEncontrados.push(el.textContent.trim());
    });

    return anexosEncontrados;
}

// ==============================================
// FUNCIONES AUXILIARES - EXTRACCIÓN DE TABLAS
// ==============================================

/**
 * Extrae tablas del HTML generado
 * @param {Array} bloques - Bloques HTML del documento
 * @returns {Object} - Objeto con las tablas extraídas
 */
function extraerTablas(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    const tablas = {};

    // Buscar todas las tablas con clase 'tabla-operaciones'
    const elementosTabla = div.querySelectorAll('.tabla-operaciones');

    elementosTabla.forEach((tabla) => {
        // Identificar el tipo de tabla por su clase adicional
        let tipo = 'generica';
        if (tabla.classList.contains('tabla-registro')) tipo = 'registro';
        else if (tabla.classList.contains('tabla-rastrillaje')) tipo = 'rastrillaje';
        else if (tabla.classList.contains('tabla-apoyo-mineduc')) tipo = 'mineduc';
        else if (tabla.classList.contains('tabla-camex-ejes-viales')) tipo = 'camex';
        else if (tabla.classList.contains('tabla-apoyo-snai')) tipo = 'snai';
        else if (tabla.classList.contains('tabla-sostenibles')) tipo = 'sostenibles';
        // Extraer encabezados (texto Y ancho configurado en Sheets)
        const thead = tabla.querySelector('thead');
        const headers = [];
        const anchos = []; // ✅ porcentaje de cada columna (ej. 25), o null si no está definido
        if (thead) {
            thead.querySelectorAll('th').forEach(th => {
                headers.push(th.textContent.trim());
                const widthStyle = th.style.width || ''; // ej. "25%"
                const match = widthStyle.match(/(\d+(?:\.\d+)?)%/);
                anchos.push(match ? parseFloat(match[1]) : null);
            });
        }

        // Extraer filas
        const tbody = tabla.querySelector('tbody');
        const rows = [];
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => {
                    row.push(td.textContent.trim());
                });
                if (row.length > 0) rows.push(row);
            });
        }

        // Guardar la tabla
        tablas[tipo] = {
            headers: headers,
            rows: rows,
            anchos: anchos // ✅ ej. [25, 35, 20, 20] — porcentajes desde TABLA_COLUMNAS
        };
    });

    return tablas;
}

function extraerTareasEstructuradas(bloques) {
    const div = document.createElement('div');
    div.innerHTML = bloques.join('');

    // ==============================================
    // 1. TAREAS GENERALES
    // ==============================================
    const tareasGenerales = [];
    const itemsGenerales = div.querySelectorAll('.item-letra');

    itemsGenerales.forEach(el => {
        const texto = el.querySelector('.text-doc');
        const item = {
            texto: texto ? texto.textContent.trim() : '',
            subs: []
        };

        // Buscar sub-items (viñetas)
        let sub = el.nextElementSibling;
        while (sub && sub.classList.contains('item-vineta-99')) {
            const subTexto = sub.querySelector('.text-doc');
            if (subTexto) {
                item.subs.push(subTexto.textContent.trim());
            }
            sub = sub.nextElementSibling;
        }

        // Solo agregar si tiene texto
        if (item.texto || item.subs.length > 0) {
            tareasGenerales.push(item);
        }
    });

    // ==============================================
    // 2. TAREAS ESCUADRILLA
    // ==============================================
    const tareasEscudrilla = [];
    const itemsEscuadrilla = div.querySelectorAll('.item-letra-85');
    const itemsComandante = Array.from(itemsEscuadrilla).slice(0, 14);

    itemsComandante.forEach(el => {
        const texto = el.querySelector('.text-doc');
        const item = {
            texto: texto ? texto.textContent.trim() : '',
            subs: []
        };

        let sub = el.nextElementSibling;
        while (sub && sub.classList.contains('item-vineta-106')) {
            const subTexto = sub.querySelector('.text-doc');
            if (subTexto) {
                item.subs.push(subTexto.textContent.trim());
            }
            sub = sub.nextElementSibling;
        }

        if (item.texto || item.subs.length > 0) {
            tareasEscudrilla.push(item);
        }
    });

    // ==============================================
    // 3. TAREAS CONDUCTOR
    // ==============================================
    const tareasConductor = [];
    const itemsConductor = Array.from(itemsEscuadrilla).slice(-4);

    itemsConductor.forEach(el => {
        const texto = el.querySelector('.text-doc');
        if (texto) {
            tareasConductor.push(texto.textContent.trim());
        }
    });

    return {
        tareasGenerales,
        tareasEscudrilla,
        tareasConductor
    };
}