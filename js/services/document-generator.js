// ==============================================
// GENERADOR DE DOCUMENTOS
// ==============================================

import {
  generarFechaDocumento,
  generarFechaHoraEncabezado,
  calcularFechaFinal,
  calcularRangoOperacion,
  cruzaMedianoche,
  calcularFechasMision,
} from "../utils/date-utils.js";

import {
  obtenerSiglas,
  formatearNumeroOrden,
  sanitizarTexto,
  convertirHoraMilitar,
  limpiarSector,
} from "../utils/string-utils.js";

import { getGradoByNombre, getFuncionById } from "../models/oficial.js";

import { documentos, anexos } from "../core/constants.js";
import { filtrarPorTipoOperacion } from "../models/operacion.js";
import { filtrarPorTipoOperacion as filtrarConfig } from '../utils/sheets-config.js';

export class DocumentGenerator {
  constructor() {
    
    this.datos = null;
    this.comandante = null;
    this.oficial = null;
    this.numeroAccion = null;
    this.fechaDocumento = new Date();
    this.operacionesAgrupadas = [];
    this.autoridadSeguridad = "";
    this.origen = "";
    this.destino = "";
    this.origenCoordenadas = "";
    this.destinoCoordenadas = "";
    this.unidadResponsable = "";
    this.unidadDescripcion = "";
    this.configuracion = null;
  }

/**
   * ✅ Establece la configuración cargada desde Google Sheets
   * @param {Object} config - Configuración completa
   */
  setConfiguracion(config) {
    this.configuracion = config;
    console.log('📋 Configuración establecida en DocumentGenerator');
  }

  /**
   * ✅ Obtiene tareas generales desde configuración o fallback
   * @param {string} tipoOperacionId - ID del tipo de operación
   * @returns {Array} - Lista de tareas
   */
  _obtenerTareasGenerales(tipoOperacionId) {
    if (this.configuracion && this.configuracion.tareasGenerales) {
      return filtrarConfig(this.configuracion.tareasGenerales, tipoOperacionId)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    }
    // Fallback: usar los datos existentes
    return this._obtenerTareasGeneralesFallback();
  }

  /**
   * ✅ Obtiene subtareas generales desde configuración
   */
  _obtenerSubtareasGenerales(tareaIds) {
    if (!this.configuracion || !this.configuracion.subtareasGenerales) {
      return [];
    }
    return this.configuracion.subtareasGenerales
      .filter(sub => tareaIds.includes(sub.tareaId))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  /**
   * ✅ Obtiene tareas de escuadrilla desde configuración
   */
  _obtenerTareasEscudrilla(tipoOperacionId) {
    if (this.configuracion && this.configuracion.tareasEscudrilla) {
      return filtrarConfig(this.configuracion.tareasEscudrilla, tipoOperacionId)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    }
    return this._obtenerTareasEscudrillaFallback();
  }

  /**
   * ✅ Obtiene tareas de conductor desde configuración
   */
  _obtenerTareasConductor(tipoOperacionId) {
    if (this.configuracion && this.configuracion.tareasConductor) {
      return filtrarConfig(this.configuracion.tareasConductor, tipoOperacionId)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    }
    return this._obtenerTareasConductorFallback();
  }

  /**
   * ✅ Mapea el tipo de operación actual (string, ej. "RASTRILLAJE") al
   * tipoOperacionId real de la pestaña TIPOS_OPERACION de Google Sheets,
   * comparando contra 'codigo' y 'nombre'.
   * @returns {string|null} - tipoOperacionId o null si no hay match/config
   */
  _obtenerTipoOperacionId() {
    if (!this.configuracion || !this.configuracion.tiposOperacion) return null;

    const normalizar = (txt) =>
      String(txt || "").toUpperCase().replace(/\s+/g, " ").trim();

    const tipoActual = normalizar(this.datos?.tipoOperacion);
    if (!tipoActual) return null;

    const encontrado = this.configuracion.tiposOperacion.find((t) => {
      return (
        normalizar(t.codigo) === tipoActual || normalizar(t.nombre) === tipoActual
      );
    });

    return encontrado ? encontrado.tipoOperacionId : null;
  }

  /**
   * Configura todos los datos para la generación del documento
   * @param {Object} datos - Datos combinados de la operación
   * @param {Object} comandante - Datos del comandante
   * @param {Object} oficial - Datos del oficial A3
   * @param {string} numeroAccion - Número de acción táctica
   * @param {Date} fecha - Fecha del documento
   * @param {string} autoridadSeguridad - Autoridad/PMI a proteger
   * @param {string} origen - Lugar de origen
   * @param {string} destino - Lugar de destino
   * @param {string} origenCoordenadas - Coordenadas del origen
   * @param {string} destinoCoordenadas - Coordenadas del destino
   * @param {string} unidadResponsable - Unidad responsable
   * @param {string} unidadDescripcion - Descripción de la unidad responsable
   */
  setDatos(
    datos,
    comandante,
    oficial,
    numeroAccion,
    fecha,
    autoridadSeguridad,
    origen,
    destino,
    origenCoordenadas,
    destinoCoordenadas,
    unidadResponsable,
    unidadDescripcion,
  ) {
    this.datos = datos;
    this.comandante = comandante;
    this.oficial = oficial;
    this.numeroAccion = numeroAccion;
    this.fechaDocumento = fecha || new Date();
    this.operacionesAgrupadas = datos?.operacionesAgrupadas || [datos];
    this.autoridadSeguridad = autoridadSeguridad || "";
    this.origen = origen || "";
    this.destino = destino || "";
    this.origenCoordenadas = origenCoordenadas || "";
    this.destinoCoordenadas = destinoCoordenadas || "";
    console.log(`📍 Origen: ${this.origen} - ${this.origenCoordenadas}`);
    console.log(`📍 Destino: ${this.destino} - ${this.destinoCoordenadas}`);
    this.unidadResponsable = unidadResponsable || "";
    this.unidadDescripcion = unidadDescripcion || "";

    console.log(`📍 Origen: ${this.origen} - ${this.origenCoordenadas}`);
    console.log(`📍 Destino: ${this.destino} - ${this.destinoCoordenadas}`);
    console.log(
      `👥 Unidad responsable: ${this.unidadResponsable} - ${this.unidadDescripcion}`,
    );
  }

  /**
   * Genera el documento completo según el tipo de operación
   */
  generarDocumentoCompleto() {
    // Detectar el tipo de operación
    const tipoOperacion = String(this.datos?.tipoOperacion || "")
      .toUpperCase()
      .trim();

    console.log(
      "📋 Tipo de operación detectado (raw):",
      this.datos?.tipoOperacion,
    );
    console.log("📋 Tipo de operación procesado:", tipoOperacion);

    // Normalizar el tipo para comparación
    const tipoNormalizado = tipoOperacion.replace(/\s+/g, " ").trim();

    // Si es REGISTRO, usar el formato específico
    if (tipoNormalizado === "REGISTRO") {
      console.log("📋 Generando documento tipo REGISTRO");
      return this._generarDocumentoRegistro();
    }

    // Si es APOYO MINEDUC, usar el formato específico
    if (tipoNormalizado === "APOYO MINEDUC") {
      console.log("📋 Generando documento tipo APOYO MINEDUC");
      return this._generarDocumentoApoyoMINEDUC();
    }

    // Si es RASTRILLAJE, usar el formato específico
    if (tipoNormalizado === "RASTRILLAJE") {
      console.log("📋 Generando documento tipo RASTRILLAJE");
      return this._generarDocumentoRastrillaje();
    }

    // Si es CAMEX EJES VIALES, usar el formato específico
    if (tipoNormalizado === "CAMEX EJES VIALES") {
      console.log("📋 Generando documento tipo CAMEX EJES VIALES");
      return this._generarDocumentoCAMEXEjesViales();
    }

    // Si es RETEN MILITAR, usar el formato específico
    if (
      tipoNormalizado.includes("RETEN MILITAR") ||
      tipoNormalizado.includes("CONTROL TANQUEROS")
    ) {
      console.log("📋 Generando documento tipo RETÉN MILITAR");
      return this._generarDocumentoRetenMilitar();
    }

    // Si es CAMEX COORD. P.N., usar el formato específico
    if (tipoNormalizado.includes("CAMEX COORD")) {
      console.log("📋 Generando documento tipo CAMEX COORD. P.N.");
      return this._generarDocumentoCAMEXCoordPN();
    }

    // Si es SEGURIDAD ARS, usar el formato específico
    if (
      tipoNormalizado.includes("SEGURIDAD ARS") ||
      tipoNormalizado.includes("REPETIDORAS CCFFAA")
    ) {
      console.log("📋 Generando documento tipo SEGURIDAD ARS");
      return this._generarDocumentoSeguridadARS();
    }

    // Si es APOYO MIN. AMBIENTE ENERGÍA, usar el formato específico
    if (
      tipoNormalizado.includes("APOYO MIN. AMBIENTE ENERGÍA") ||
      tipoNormalizado.includes("CELEC")
    ) {
      console.log("📋 Generando documento tipo APOYO MIN. AMBIENTE ENERGÍA");
      return this._generarDocumentoApoyoMinAmbienteEnergia();
    }
     // ✅ NUEVO: OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS
    if (tipoNormalizado === "OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS") {
        console.log("📋 Generando documento tipo OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS");
        return this._generarDocumentoSostenibles();
    }

    // ✅ Si es PMI, usar el formato específico
    if (tipoNormalizado === "PMI") {
      console.log("📋 Generando documento tipo PMI");
      return this._generarDocumentoPMI();
    }

    // ✅ Si es INTERVENCIÓN, usar el formato específico
    if (tipoNormalizado === "INTERVENCIÓN" || tipoNormalizado === "INTERVENCION") {
      console.log("📋 Generando documento tipo INTERVENCIÓN");
      return this._generarDocumentoIntervencion();
    }

    // Si es APOYO SNAI u otro, usar el formato existente
    console.log("📋 Generando documento tipo APOYO SNAI (por defecto)");
    return this._generarDocumentoApoyoSNAI();
  }
  // ==============================================
  // MÉTODOS AUXILIARES REUTILIZABLES
  // ==============================================

  /**
   * Genera la sección de TAREAS GENERALES
   * @param {boolean} esRetenMilitar - Si es tipo RETEN MILITAR para agregar literal especial
   * @returns {Array} - Bloques HTML
   */
  _generarTareasGenerales(esRetenMilitar = false) {
    const bloques = [];

    bloques.push(
      '<div class="vacio"></div><div class="titulo-letra-11"><span class="marcador">B.</span>TAREAS GENERALES</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">1)</span>GENERALES</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ 1. Intentar obtener las tareas generales desde Google Sheets
    //    según el tipo de operación actual.
    const tipoOperacionId = this._obtenerTipoOperacionId();
    let tareasGenerales = [];

    if (tipoOperacionId && this.configuracion?.tareasGenerales?.length) {
      const tareasDesdeSheets = this._obtenerTareasGenerales(tipoOperacionId);

      if (tareasDesdeSheets.length > 0) {
        const tareaIds = tareasDesdeSheets.map((t) => t.tareaId);
        const subtareas = this._obtenerSubtareasGenerales(tareaIds);

        tareasGenerales = tareasDesdeSheets.map((t) => {
          const subs = subtareas
            .filter((s) => s.tareaId === t.tareaId)
            .map((s) => s.texto);
          return subs.length > 0 ? { texto: t.texto, subs } : t.texto;
        });

        // ✅ Literal especial (ej. link de guías de remisión para RETEN MILITAR),
        // definido en la pestaña LITERALES_ESPECIALES por tipoOperacionId.
        if (this.configuracion.literalesEspeciales) {
          const literales = this.configuracion.literalesEspeciales
            .filter((l) => l.tipoOperacionId === tipoOperacionId && l.texto)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));

          literales.forEach((lit) => {
            tareasGenerales.push({
              texto: lit.texto,
              subs: lit.subs ? [lit.subs] : [],
              esUrl: true,
            });
          });
        }
      }
    }

    // ✅ 2. FALLBACK: si Sheets aún no tiene filas para este tipo de operación,
    // usar el texto anterior para no dejar la sección vacía.
    if (tareasGenerales.length === 0) {
      tareasGenerales = [
        "Realizar el briefing sobre la misión a ejecutarse.",
        "En caso de suscitarse incidentes que pongan en peligro la integridad de los integrantes de la Escuadrilla, así como de terceros, se dará cumplimiento a la Ley Orgánica que Regula el Uso Legítimo de la Fuerza.",
        "El personal militar estará correctamente uniformado en todo momento.",
        "Tomar en consideración a las personas que pertenezcan a grupos vulnerables (LGBTIQ+, embarazadas, menores de edad, 3era edad y personas con discapacidad).",
        "Para las personas con identidades de género distintas al sexo biológico se le consultará su auto identificación respecto al género, con la finalidad de asignar personal hombre o mujer para el respectivo registro (cacheo).",
        {
          texto: "Se podrá aprehender a una persona en los siguientes casos;",
          subs: ["Con orden judicial.", "Delito flagrante."],
        },
        {
          texto: "Condiciones en que se considera delito flagrante.",
          subs: [
            "La persona es sorprendida en el acto de cometer el delito.",
            "Es perseguida inmediatamente después de haberlo cometido y existe evidencia clara de su participación en el delito.",
            "Se encuentra en posesión de objetos, instrumentos o indicios que vinculen directamente a la comisión del delito.",
          ],
        },
        // ✅ Si es RETEN MILITAR, insertar el literal especial h)
        ...(esRetenMilitar
          ? [
              {
                texto:
                  "Para el control minucioso de los tanqueros que transportan combustible, deberá verificar las guías de remisión en el siguiente link:",
                subs: [
                  "http://documentoselectronicos.eppetroecuador.ec/DocumentosElectronicosComercializacionProduccion/servlet/wpconsultaentesexternos",
                ],
                esUrl: true,
              },
            ]
          : []),
        "Aplicar los Derechos Humanos y normas de comportamiento.",
        "Queda terminantemente prohibido el consumo de bebidas alcohólicas o de sustancias catalogadas sujetas a fiscalización, durante la ejecución de la operación.",
        "Queda terminantemente prohibido el porte y uso de teléfonos celulares y/o equipos electrónicos durante todo el tiempo que dure la operación. Excepto el comandante de escuadrilla, y el aerotécnico designado como OPINF.",
        "Se prohíbe la toma de fotografías y/o grabación de las operaciones militares, así como subir las mismas en redes sociales.",
        "Se extremarán las medidas de seguridad operacionales con el personal, material, armamento, equipo y vehículos.",
        "En caso de encontrar un arma comunicarse directamente con Control de Armas de Manabí.",
        "La patrulla podrá abandonar su sector de responsabilidad, siempre y cuando sea por disposición del señor comandante del GOMAI Manabí y del oficial A3.",
      ];
    }

    // Generar letras automáticamente (a, b, c, d, ...)
    const letras = [];
    const totalItems = tareasGenerales.length;
    for (let i = 0; i < totalItems; i++) {
      letras.push(String.fromCharCode(97 + i) + ")"); // a), b), c), ...
    }

    tareasGenerales.forEach((item, i) => {
      if (typeof item === "string") {
        bloques.push(
          `<div class="item-letra"><span class="marcador">${letras[i]}</span><p class="text-doc">${item}</p></div>`,
        );
      } else {
        // Mostrar el texto principal
        bloques.push(
          `<div class="item-letra"><span class="marcador">${letras[i]}</span><p class="text-doc">${item.texto}</p></div>`,
        );
        // Mostrar los sub-items con viñetas (•)
        if (item.subs && item.subs.length > 0) {
          item.subs.forEach((sub) => {
            // Si es URL, mostrarla como enlace o texto plano
            if (item.esUrl) {
              bloques.push(
                `<div class="item-vineta-99"><span class="marcador">•</span><p class="text-doc" style="word-break: break-all;">${sub}</p></div>`,
              );
            } else {
              bloques.push(
                `<div class="item-vineta-99"><span class="marcador">•</span><p class="text-doc">${sub}</p></div>`,
              );
            }
          });
        }
      }
    });

    return bloques;
  }

  /**
   * Genera la sección de TAREAS ESPECÍFICAS
   * @returns {Array} - Bloques HTML
   */
  _generarTareasEspecificas() {
    const bloques = [];

    bloques.push(
      '<div class="vacio"></div><div class="titulo-letra-11"><span class="marcador">C.</span>TAREAS ESPECÍFICAS</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">1.</span>COMANDANTE DE ESCUADRILLA</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const tipoOperacionId = this._obtenerTipoOperacionId();

    // ✅ 1. TAREAS DEL COMANDANTE DE ESCUADRILLA — desde Sheets con fallback
    let tareasEscuadrilla = [];

    if (tipoOperacionId && this.configuracion?.tareasEscudrilla?.length) {
      const desdeSheets = this._obtenerTareasEscudrilla(tipoOperacionId);
      if (desdeSheets.length > 0) {
        const tareaIds = desdeSheets.map((t) => t.tareaId);
        const subtareas = (this.configuracion.subtareasEscudrilla || [])
          .filter((s) => tareaIds.includes(s.tareaId))
          .sort((a, b) => (a.orden || 0) - (b.orden || 0));

        tareasEscuadrilla = desdeSheets.map((t) => {
          const subs = subtareas
            .filter((s) => s.tareaId === t.tareaId)
            .map((s) => s.texto);
          return subs.length > 0 ? { texto: t.texto, subs } : t.texto;
        });
      }
    }

    if (tareasEscuadrilla.length === 0) {
      // ✅ FALLBACK: texto anterior, por si Sheets no tiene filas para este tipo
      tareasEscuadrilla = [
        "Dará lectura a la presente orden de acción táctica al personal militar profesional que integra la Escuadrilla.",
        {
          texto: "Deberá realizar la apertura y cierre de:",
          subs: [
            "Ficha del ECU-911.",
            "Aplicación COMOPE.",
            "Llenar la matriz ON LINE, de INICIO y FIN de operaciones.",
          ],
        },
        'Deberá dar parte en el grupo de WhatsApp "PARTES Y FOTOS GOMAI MANABI" al momento de iniciar y finalizar una operación militar.',
        "En caso de suscitarse incidentes que pongan en peligro la seguridad de los integrantes de la Escuadrilla, así como de terceros, se dará cumplimiento a la Ley Orgánica que Regula el Uso Legítimo de la Fuerza.",
        {
          texto: "En caso de suscitarse algún evento y/o acto hostil;",
          subs: [
            "Establecer la seguridad del punto.",
            "Establecer la cadena de custodia respectiva para los aprehendidos y material encontrado.",
            "Coordinar con el ECU911 el apoyo necesario.",
            "Dar parte al señor oficial de operaciones del GOMAI MANABI.",
            "Coordinar con el operador de guardia de operaciones para él envió del PARTE AL INSTANTE POR WHATSAPP de acuerdo con el formato ya establecido.",
            "Coordinar con el operador de guardia de operaciones la documentación que deberá obtener para su respaldo como sustento legal y archivo (Informe policial; acta entrega de custodia etc.)",
          ],
        },
        "Realizará la verificación del personal, material, armamento y equipo antes, durante y después de la operación.",
        "Mantendrá la disciplina y orden en todo momento.",
        "Queda terminantemente prohibido los tratos crueles, inhumanos, torturas y desaparición forzada en ejecución de las operaciones.",
        "Para las personas con identidades de género distintas al sexo biológico se le consultará su auto identificación respecto al género, con la finalidad de asignar personal hombre o mujer para el respectivo registro (cacheo).",
        "Mantener en todo momento encendido los medios de comunicación, personales e institucionales, a fin de realizar las coordinaciones necesarias en caso de requerirse.",
        "Una vez finalizada la operación, dará parte al jefe de Operaciones de las novedades existentes y elaborará el informe de cumplimiento en un plazo máximo de 24 horas.",
        "Disponer la designación de personal específico para filmar las operaciones militares que se ejecuten para su debido registro, en caso de ser necesario los videos serán entregados como parte de los procesos que se lleven a cabo para su judicialización.",
        "Recomendar al personal militar mantener la disciplina, profesionalismo y conducta militar adecuada.",
        "En forma permanente instruir en temas de DD.HH. y normas de comportamiento.",
      ];
    }

    // Letras generadas dinámicamente según el número real de tareas
    const letrasEscuadrilla = tareasEscuadrilla.map(
      (_, i) => String.fromCharCode(97 + i) + ")",
    );

    tareasEscuadrilla.forEach((item, i) => {
      if (typeof item === "string") {
        bloques.push(
          `<div class="item-letra-85"><span class="marcador">${letrasEscuadrilla[i]}</span><p class="text-doc">${item}</p></div>`,
        );
      } else {
        bloques.push(
          `<div class="item-letra-85"><span class="marcador">${letrasEscuadrilla[i]}</span><p class="text-doc">${item.texto}</p></div>`,
        );
        if (item.subs && item.subs.length > 0) {
          item.subs.forEach((sub) => {
            bloques.push(
              `<div class="item-vineta-106"><span class="marcador">•</span><p class="text-doc">${sub}</p></div>`,
            );
          });
        }
      }
    });

    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">2.</span>CONDUCTOR DE VEHÍCULOS MILITARES</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ 2. TAREAS DEL CONDUCTOR — desde Sheets con fallback
    let tareasConductor = [];

    if (tipoOperacionId && this.configuracion?.tareasConductor?.length) {
      const desdeSheets = this._obtenerTareasConductor(tipoOperacionId).map(
        (t) => t.texto,
      );
      if (desdeSheets.length > 0) {
        tareasConductor = desdeSheets;
      }
    }

    if (tareasConductor.length === 0) {
      tareasConductor = [
        "Verificar que el vehículo se encuentre en perfectas condiciones de empleo.",
        "Dar cumplimiento a las normas y procedimientos legales establecidos por la ley de tránsito.",
        "Realizarse el pre-manejo previo al cumplimiento de las operaciones militares.",
        "Realizar la apertura y cierre de la ficha para la custodia del vehículo, así como remitir el kilometraje y condiciones de este.",
      ];
    }

    const letrasConductor = tareasConductor.map(
      (_, i) => String.fromCharCode(97 + i) + ")",
    );

    tareasConductor.forEach((item, i) => {
      bloques.push(
        `<div class="item-letra-85"><span class="marcador">${letrasConductor[i]}</span><p class="text-doc">${item}</p></div>`,
      );
    });

    return bloques;
  }

  /**
   * Genera la sección de INSTRUCCIONES DE COORDINACIÓN
   * @returns {Array} - Bloques HTML
   */
  _generarInstruccionesCoordinacion() {
    const bloques = [];

    bloques.push(
      '<div class="vacio"></div><div class="titulo-letra"><span class="marcador">D.</span>INSTRUCCIONES DE COORDINACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ Intentar obtener las instrucciones desde Google Sheets
    const tipoOperacionId = this._obtenerTipoOperacionId();
    let instrucciones = [];

    if (tipoOperacionId && this.configuracion?.instrucciones?.length) {
      const desdeSheets = filtrarConfig(
        this.configuracion.instrucciones,
        tipoOperacionId,
      )
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((i) => i.texto);

      if (desdeSheets.length > 0) {
        instrucciones = desdeSheets;
      }
    }

    // ✅ FALLBACK: texto anterior, por si Sheets no tiene filas para este tipo
    if (instrucciones.length === 0) {
      instrucciones = [
        'La presente Orden de Acción Táctica entrará en vigencia a partir de su aprobación por el comandante del GOMAI "MANABÍ".',
        "Se autoriza las coordinaciones horizontales y verticales de acuerdo a su nivel.",
        "Coordinar con el ECU 911, Policía Nacional; Policía judicial; Departamento de control de armas en caso de ser necesario.",
        "Coordinar con DINASEN si existiere menores de edad involucrados actividades fuera de ley.",
      ];
    }

    const letras = instrucciones.map((_, i) => String.fromCharCode(97 + i) + ")");

    instrucciones.forEach((item, i) => {
      bloques.push(
        `<div class="item-letra-71"><span class="marcador">${letras[i]}</span><p class="text-doc">${item}</p></div>`,
      );
    });

    return bloques;
  }

  /**
   * ✅ Genera el bloque "Documentos: (Marco legal)" leyendo desde Google Sheets
   * (pestaña DOCUMENTOS, filtrada por tipoOperacionId), con fallback al
   * marco legal genérico anterior si Sheets aún no tiene filas para el tipo.
   * @returns {Array} - Bloques HTML
   */
  _generarBloqueDocumentos() {
    const bloques = [];

    bloques.push(
      '<p class="parrafo-doc-titulo"><span class="doc-label">Documentos:</span> (Marco legal)</p>',
    );
    bloques.push('<div class="vacio"></div>');

    const tipoOperacionId = this._obtenerTipoOperacionId();
    let listaDocumentos = [];

    if (tipoOperacionId && this.configuracion?.documentos?.length) {
      listaDocumentos = filtrarConfig(this.configuracion.documentos, tipoOperacionId)
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((d) => d.texto);
    }

    // ✅ FALLBACK: marco legal genérico anterior, por si Sheets no tiene filas
    // para este tipo de operación todavía.
    if (listaDocumentos.length === 0) {
      listaDocumentos = documentos;
    }

    listaDocumentos.forEach((doc) => {
      bloques.push(
        `<div class="item-docs"><span class="marcador">•</span><p class="text-doc">${doc}</p></div>`,
      );
    });
    bloques.push('<div class="vacio"></div>');

    return bloques;
  }

  /**
   * Genera la sección de ADMINISTRATIVAS Y LOGISTICA
   * @returns {Array} - Bloques HTML
   */
  _generarAdministrativasLogistica() {
    const bloques = [];

    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">IV.</span>ADMINISTRATIVAS Y LOGISTICA</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>ADMINISTRATIVAS</div>',
    );
    bloques.push(
      '<div class="titulo-num tam-10"><span class="marcador">1.</span>Personal</div>',
    );
    bloques.push(
      '<div class="anexo-nomina">Anexo "A" Nomina del personal</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">B.</span>LOGÍSTICA</div>',
    );
    bloques.push(
      '<div class="titulo-num"><span class="marcador">1.</span>Clase I</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Rancho caliente en la unidad</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">2.</span>Clase II y IV</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">El uniforme para utilizar será el pixelado verde.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Casco Táctico/Kevlar y chaleco antibalas.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Vehículos ADM/TAC</p></div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">3.</span>Clase III</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Abastecimiento de combustible en la unidad.</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">4.</span>Clase V (Armamento en dotación)</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">Pistolas Pietro Beretta, CZ, Browning</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Subametralladora Colt, Uzi </p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Fusil M4A2, M16, Fal, ParaFal</p></div>',
    );

    return bloques;
  }

  /**
   * Genera la sección de ENLACE, MEDIOS Y MANDO
   * @returns {Array} - Bloques HTML
   */
  _generarEnlaceMediosMando() {
    const bloques = [];

    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">V.</span>ENLACE, MEDIOS Y MANDO</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">A.</span>ENLACE</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>ECU-911</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Control de Armas - Manta - Manabí (0996891397) Guardia 24H</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">B.</span>MEDIOS</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Celular</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Radios VHF/FM simplex</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">C.</span>MANDO</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Comandante del GOMAI "MANABÍ".</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Oficial A-3 del GOMAI "MANABÍ".</div>',
    );

    return bloques;
  }

  /**
   * Genera la sección de FIRMAS
   * @returns {Array} - Bloques HTML
   */
  _generarFirmas() {
    const bloques = [];

    bloques.push('<div class="vacio"></div>');
    bloques.push('<div class="firma-aprueba">APRUEBA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoComandante = getGradoByNombre(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );
    const nombreComandante =
      this.comandante?.nombre || "Johnny Minchala Redrován";
    const cargoComandante = this.comandante?.funcion
      ? getFuncionById(this.comandante.funcion)
      : "COMANDANTE DEL GT ÁGUILA (GOMAI)";

    bloques.push(`<div class="firma-nombre">${nombreComandante}</div>`);
    bloques.push(
      `<div class="firma-grado">${gradoComandante || "Coronel EMT. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo">${cargoComandante}</div>`);
    bloques.push('<div class="vacio-2"></div>');
    bloques.push('<div class="firma-autentica">AUTENTICA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoOficial = getGradoByNombre(
      this.oficial?.nombre || "José Calapaqui González",
    );
    const nombreOficial = this.oficial?.nombre || "José Calapaqui González";
    const cargoOficial = this.oficial?.funcion
      ? getFuncionById(this.oficial.funcion)
      : "OFICIAL A3 GT ÁGUILA (GOMAI), Accidental";

    bloques.push(`<div class="firma-nombre-izq">${nombreOficial}</div>`);
    bloques.push(
      `<div class="firma-grado-izq">${gradoOficial || "Teniente Téc. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo-izq">${cargoOficial}</div>`);

    return bloques;
  }

  /**
   * Genera la sección de ANEXOS
   * @returns {Array} - Bloques HTML
   */
  _generarAnexos() {
    const bloques = [];

    bloques.push('<div class="vacio"></div>');
    bloques.push('<div class="anexos-titulo">ANEXOS:</div>');

    // ✅ La pestaña ANEXOS es global (no tiene tipoOperacionId), aplica a todos los tipos
    let listaAnexos = [];
    if (this.configuracion?.anexos?.length) {
      listaAnexos = [...this.configuracion.anexos]
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .map((a) => a.texto);
    }

    // ✅ FALLBACK: lista anterior, por si Sheets aún no tiene filas
    if (listaAnexos.length === 0) {
      listaAnexos = anexos;
    }

    listaAnexos.forEach((anexo) => {
      bloques.push(`<div class="anexo-item">${anexo}</div>`);
    });
    bloques.push('<div class="espacio-firmas"></div>');
    bloques.push('<div class="gpsg">GPSG/</div>');

    return bloques;
  }

  /**
   * Genera documento para tipo APOYO SNAI (formato original)
   */
  _generarDocumentoApoyoSNAI() {
    const bloques = [];

    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "0600";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "0600";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    const sector = this.datos?.sector || "La Cadena - Portoviejo";
    const accion = this.datos?.accion || "seguridad armada";
    const tipoOperacion = this.datos?.tipoOperacion || "APOYO SNAI";
    const numeroOrden = this.numeroAccion || "7299";
    const fechaMision = generarFechaDocumento(this.fechaDocumento, horaInicio);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    const asunto = `${tipoOperacion} en el traslado de PPL´s`;

    // --- ENCABEZADO ---
    bloques.push(`
            <div class="bloque-encabezado">
                <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
                <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
                <div class="linea-encabezado">${fechaEncabezado}</div>
                <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
            </div>
        `);
    bloques.push('<div class="vacio"></div>');

    // --- TÍTULO ---
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // --- ASUNTO ---
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // --- DOCUMENTOS ---
    bloques.push(...this._generarBloqueDocumentos());

    // --- I. SITUACIÓN ---
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
            <p class="texto-situacion">El cantón Bahía enfrenta actualmente una situación de seguridad compleja marcada por el incremento de hechos violentos, la cual se ve agravada por factores propios del sector, entre ellos la presencia del CPL Manabí Nro.4, que constituye un punto sensible frente a posibles influencias del crimen organizado, tanto al interior como al exterior del CRS. se ha evidenciado la concentración de familiares de personas privadas de la libertad (PPL) en viviendas cercanas al CRS, mismos estarían incrementando actividades de apoyo externo, facilitando actividades ilícitas y generando condiciones que pueden afectar la seguridad ciudadana y el orden público en los sectores aledaños.</p>
        `);
    bloques.push(`
            <p class="texto-situacion-2">Además, las vulnerabilidades en el Sistema Hidrocarburífero Nacional, especialmente en tramos y zonas rurales del cantón da lugar a actividades ilícitas como perforaciones clandestinas, acopio y transporte ilegal de combustibles. Estas condiciones han sido aprovechadas por estructuras delictivas vinculadas al crimen organizado, que combinan delitos como microtráfico, extorsión y sicariato con economías ilegales asociadas al sector hidrocarburífero, incrementando la violencia y el riesgo en el cantón.</p>
        `);
    bloques.push('<div class="vacio"></div>');

    // --- II. MISIÓN ---
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ Calcular fechas usando la lógica reutilizable
    const fechasMision = calcularFechasMision(
      this.operacionesAgrupadas,
      this.fechaDocumento,
    );
    const fechaInicioMision = fechasMision.fechaInicioStr;
    const fechaFinMision = fechasMision.fechaFinStr;

    let rutaCompleta = "";
    if (this.operacionesAgrupadas && this.operacionesAgrupadas.length > 0) {
      const sectores = this.operacionesAgrupadas
        .map((op) => op.sector || "Sector no especificado")
        .filter((s) => s);
      const sectoresUnicos = [...new Set(sectores)];

      if (sectoresUnicos.length === 1) {
        rutaCompleta = sectoresUnicos[0];
      } else if (sectoresUnicos.length === 2) {
        rutaCompleta = `${sectoresUnicos[0]} y ${sectoresUnicos[1]}`;
      } else {
        const ultimo = sectoresUnicos[sectoresUnicos.length - 1];
        const anteriores = sectoresUnicos.slice(0, -1).join(", ");
        rutaCompleta = `${anteriores} y ${ultimo}`;
      }
    } else {
      rutaCompleta = sector;
    }

    const misionTexto = `El GT ÁGUILA (GOMAI), realizará un Camex interior, el día ${fechaInicioMision} hasta ${fechaFinMision}, en el "${rutaCompleta}", con el objetivo de prevenir fugas de reos, garantizar la seguridad del personal y de la población en general, así como para cumplir con el proceso legal y de rehabilitación del recluso, aplicando la protección de derechos humanos, libertades y garantías de los ciudadanos en estricta observancia a Ley Orgánica que Regula el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // --- III. EJECUCIÓN ---
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    let conceptoTexto = `En coordinación y en apoyo a la SNAI y Policía Nacional el PMP del GT ÁGUILA (GOMAI), en su jurisdicción, brindara seguridad armada empleando una Unidad Táctica durante el traslado de las personas privadas de libertad desde `;

    if (this.operacionesAgrupadas && this.operacionesAgrupadas.length > 0) {
      const sectores = this.operacionesAgrupadas
        .map((op) => op.sector || "Sector no especificado")
        .filter((s) => s);
      const sectoresUnicos = [...new Set(sectores)];

      if (sectoresUnicos.length === 1) {
        conceptoTexto += `${sectoresUnicos[0]} respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;
      } else if (sectoresUnicos.length === 2) {
        conceptoTexto += `${sectoresUnicos[0]} y ${sectoresUnicos[1]} respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;
      } else {
        const ultimo = sectoresUnicos[sectoresUnicos.length - 1];
        const anteriores = sectoresUnicos.slice(0, -1).join(", ");
        conceptoTexto += `${anteriores} y ${ultimo} respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;
      }
    } else {
      conceptoTexto += `${sector} respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;
    }

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // --- TABLA ---
    let filasTabla = "";

    if (this.operacionesAgrupadas && this.operacionesAgrupadas.length > 0) {
      this.operacionesAgrupadas.forEach((op, index) => {
        let hi = op.horaInicio || "00:00";
        let hf = op.horaFinal || "00:00";

        hi = String(hi).trim();
        hf = String(hf).trim();

        if (!hi.includes(":")) {
          hi = convertirHoraMilitar(hi) || "00:00";
        }
        if (!hf.includes(":")) {
          hf = convertirHoraMilitar(hf) || "00:00";
        }

        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";

        const sec = op.sector || "Sector no especificado";

        filasTabla += `
                    <tr>
                        <td class="text-center">${String(index + 1).padStart(2, "0")}</td>
                        <td class="text-center">${hi} – Fin de Ops.</td>
                        <td>Ruta: ${sec}</td>
                    </tr>
                `;
      });
    } else {
      const hi = convertirHoraMilitar(horaInicio) || "00:30";
      const hf = convertirHoraMilitar(horaFinal) || "06:00";
      filasTabla = `
                <tr>
                    <td class="text-center">01</td>
                    <td class="text-center">${hi} – ${hf}</td>
                    <td>Ruta: ${sector}</td>
                </tr>
            `;
    }

// 🔧 NUEVO: resolver headers + anchos reales desde TABLA_COLUMNAS,
    // exactamente con la misma lógica que ya usa _generarTablaDesdeConfig
    // (TIPOS_OPERACION -> modeloId -> TABLAS -> tablaId -> TABLA_COLUMNAS),
    // pero SIN tocar cómo se arma filasTabla, para no cambiar el
    // contenido/formato de las celdas que ya funciona.
    const normalizarCodigo = (txt) =>
      String(txt || "").toUpperCase().replace(/\s+/g, " ").trim();

    const tipoOpConfigSNAI = (this.configuracion?.tiposOperacion || []).find(
      (t) => normalizarCodigo(t.codigo) === normalizarCodigo("APOYO SNAI"),
    );
    const modeloIdSNAI = tipoOpConfigSNAI?.modeloId;

    const tablaConfigSNAI = modeloIdSNAI
      ? (this.configuracion?.tablas || []).find((t) => t.modeloId === modeloIdSNAI)
      : null;
    const tablaIdSNAI = tablaConfigSNAI?.tablaId;

    const columnasSNAI = tablaIdSNAI
      ? (this.configuracion?.tablaColumnas || [])
          .filter(
            (c) => c.tablaId === tablaIdSNAI && c.activo !== false && c.activo !== "FALSE",
          )
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      : [];

    // Encabezados: desde Sheets si hay config, si no el mismo texto fijo de siempre
    const theadHtml =
      columnasSNAI.length > 0
        ? columnasSNAI
            .map(
              (c) =>
                `<th style="width:${this._normalizarAncho(c.ancho) || "auto"}">${c.encabezado}</th>`,
            )
            .join("")
        : `<th>ORD</th><th>HORARIO</th><th>ACTIVIDADES Y SECTOR</th>`;

    bloques.push(`
            <table class="tabla-operaciones tabla-apoyo-snai">
                <thead>
                    <tr>
                        ${theadHtml}
                    </tr>
                </thead>
                <tbody>
                    ${filasTabla}
                </tbody>
            </table>
        `);


    // --- B. TAREAS GENERALES (REUTILIZADO) ---
    bloques.push(...this._generarTareasGenerales(false));

    // --- C. TAREAS ESPECÍFICAS (REUTILIZADO) ---
    bloques.push(...this._generarTareasEspecificas());

    // --- D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO) ---
    bloques.push(...this._generarInstruccionesCoordinacion());

    // --- IV. ADMINISTRATIVAS Y LOGISTICA ---
    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">IV.</span>ADMINISTRATIVAS Y LOGISTICA</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>ADMINISTRATIVAS</div>',
    );
    bloques.push(
      '<div class="titulo-num tam-10"><span class="marcador">1.</span>Personal</div>',
    );
    bloques.push(
      '<div class="anexo-nomina">Anexo "A" Nomina del personal</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">B.</span>LOGÍSTICA</div>',
    );
    bloques.push(
      '<div class="titulo-num"><span class="marcador">1.</span>Clase I</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Rancho caliente en la unidad</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">2.</span>Clase II y IV</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">El uniforme para utilizar será el pixelado verde.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Casco Táctico/Kevlar y chaleco antibalas.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Vehículos ADM/TAC</p></div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">3.</span>Clase III</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Abastecimiento de combustible en la unidad.</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">4.</span>Clase V (Armamento en dotación)</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">Pistolas Pietro Beretta, CZ, Browning</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Subametralladora Colt</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Fusil M4A2</p></div>',
    );

    // --- V. ENLACE, MEDIOS Y MANDO ---
    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">V.</span>ENLACE, MEDIOS Y MANDO</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">A.</span>ENLACE</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>ECU-911</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Control de Armas - Manta - Manabí (0996891397) Guardia 24H</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">B.</span>MEDIOS</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Celular</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Radios VHF/FM simplex</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">C.</span>MANDO</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Comandante del GT AGUILA (GOMAI).</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Oficial A-3 del GT AGUILA (GOMAI).</div>',
    );

    // --- FIRMAS ---
    bloques.push('<div class="vacio"></div>');
    bloques.push('<div class="firma-aprueba">APRUEBA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoComandante = getGradoByNombre(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );
    const nombreComandante =
      this.comandante?.nombre || "Johnny Minchala Redrován";
    const cargoComandante = this.comandante?.funcion
      ? getFuncionById(this.comandante.funcion)
      : "COMANDANTE DEL GT ÁGUILA (GOMAI)";

    bloques.push(`<div class="firma-nombre">${nombreComandante}</div>`);
    bloques.push(
      `<div class="firma-grado">${gradoComandante || "Coronel EMT. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo">${cargoComandante}</div>`);
    bloques.push('<div class="vacio-2"></div>');
    bloques.push('<div class="firma-autentica">AUTENTICA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoOficial = getGradoByNombre(
      this.oficial?.nombre || "José Calapaqui González",
    );
    const nombreOficial = this.oficial?.nombre || "José Calapaqui González";
    const cargoOficial = this.oficial?.funcion
      ? getFuncionById(this.oficial.funcion)
      : "OFICIAL A3 GT ÁGUILA (GOMAI), Accidental";

    bloques.push(`<div class="firma-nombre-izq">${nombreOficial}</div>`);
    bloques.push(
      `<div class="firma-grado-izq">${gradoOficial || "Teniente Téc. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo-izq">${cargoOficial}</div>`);

    // --- ANEXOS ---
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  /**
   * Genera documento para tipo REGISTRO
   */
  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE REGISTRO
  // ==============================================
  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE RASTRILLAJE
  // ==============================================

  /**
   * Genera documento para tipo RASTRILLAJE
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoRastrillaje() {
    console.log("🛑 GENERANDO RASTRILLAJE - Formato específico");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- DATOS DE LA TABLA ---
    const sector = this.datos?.sector || "Sector no especificado";
    const parroquia = this.datos?.parroquia || "Parroquia no especificada";
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "";

    // --- FECHA BASE ---
    const fechaBase = this.fechaDocumento || new Date();

    // ✅ USAR LA NUEVA FUNCIÓN PARA CALCULAR EL RANGO DE OPERACIÓN
    const operacionesAgrupadas = this.operacionesAgrupadas || [this.datos];
    const rango = calcularRangoOperacion(operacionesAgrupadas, fechaBase);

    const horaInicio = rango.horaInicio;
    const horaFinal = rango.horaFinal;
    const fechaInicioObj = rango.fechaInicio;
    const fechaFinalObj = rango.fechaFinal;

    // Convertir horas a formato militar para el documento
    const horaInicioMilitar = horaInicio.replace(":", "");
    const horaFinalMilitar = horaFinal.replace(":", "");

    // Generar fechas formateadas para el documento
    const fechaInicioStr = generarFechaDocumento(
      fechaInicioObj,
      horaInicioMilitar,
    );
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinalMilitar);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones RASTRILLAJE";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO FIJO PARA RASTRILLAJE)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} atraviesa actualmente una crítica situación de seguridad debido al elevado índice de violencia, producto principalmente de la presencia y disputa de organizaciones criminales vinculadas al narcotráfico y economías ilegales, que aprovechan su ubicación estratégica como puerto y punto logístico en la costa ecuatoriana.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La pugna por el control territorial, rutas de salida de droga, microtráfico, extorsión y otros delitos conexos ha generado un incremento sostenido de muertes violentas, ataques armados y hechos delictivos, afectando tanto a sectores periféricos como a zonas urbanas y comerciales. Esta realidad ha deteriorado la percepción de seguridad ciudadana, alterando la dinámica social y económica del cantón, en este contexto, la violencia no responde a hechos aislados, sino a un problema latente que combina crimen organizado, vulnerabilidad social y economías ilícitas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA RASTRILLAJE)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará OMAI mediante patrullaje pedestre/rastrillaje, en el cantón ${canton}, el día ${fechaInicioMision} hasta ${fechaFinMision}, para neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH y los DDHH y estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `El personal del ${unidad}, ejecutará operaciones de RASTRILLAJE mediante patrullaje pedestre en los sectores de mayor incidencia delincuencial, a fin contrarrestar el accionar de organizaciones terroristas y actores no estatales no beligerantes, con el objetivo de reducir los índices de criminalidad y violencia que inciden en la seguridad ciudadana, respetando los Derechos humanos y en estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // --- TABLA DE EJECUCIÓN (SOLO RASTRILLAJE FILTRADOS) ---
    bloques.push(this._generarTablaRastrillaje());
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  /**
   * ✅ NUEVA SECCIÓN — Genera documento para tipo INTERVENCIÓN.
   *
   * Sigue exactamente la misma arquitectura que _generarDocumentoRastrillaje():
   * reutiliza calcularFechasMision() (misma lógica de fecha/hora que APOYO SNAI,
   * sin crear un algoritmo nuevo) y las 7 funciones compartidas de secciones
   * (documentos, tareas generales/específicas, instrucciones, administrativas,
   * enlace, firmas y anexos) — no se duplica ninguna de esas funciones.
   *
   * A diferencia de Rastrillaje/SNAI (que usan "GT ÁGUILA (GOMAI)" fijo), aquí
   * la UNIDAD se toma de this.unidadResponsable (la unidad seleccionada
   * dinámicamente en el formulario), tal como lo pide la especificación de
   * este tipo de operación.
   *
   * No genera tabla de ejecución: no fue solicitada para este tipo.
   *
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoIntervencion() {
    console.log("🛑 GENERANDO INTERVENCIÓN - Formato específico");

    const bloques = [];

    // --- UNIDAD (dinámica, seleccionada en el formulario) ---
    const unidad = this.unidadResponsable || "GT ÁGUILA (GOMAI)";

    // --- DATOS DE LA TABLA / CANTÓN ---
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "";

    // --- FECHA BASE ---
    const fechaBase = this.fechaDocumento || new Date();

    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones de intervención.";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal) — REUTILIZADO
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (texto fijo, con el cantón dinámico insertado)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} atraviesa actualmente una crítica situación de seguridad debido al elevado índice de violencia, producto principalmente de la presencia y disputa de organizaciones criminales vinculadas al narcotráfico y economías ilegales, que aprovechan su ubicación estratégica como puerto y punto logístico en la costa ecuatoriana.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La pugna por el control territorial, rutas de salida de droga, microtráfico, extorsión y otros delitos conexos ha generado un incremento sostenido de muertes violentas, ataques armados y hechos delictivos, afectando tanto a sectores periféricos como a zonas urbanas y comerciales. Esta realidad ha deteriorado la percepción de seguridad ciudadana, alterando la dinámica social y económica del cantón, en este contexto, la violencia no responde a hechos aislados, sino a un problema latente que combina crimen organizado, vulnerabilidad social y economías ilícitas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (texto dinámico con UNIDAD, fechas y CANTÓN)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ Misma lógica de fechas ya usada por APOYO SNAI/RASTRILLAJE — no se
    // crea un algoritmo nuevo, se reutiliza calcularFechasMision().
    const fechasMision = calcularFechasMision(
      this.operacionesAgrupadas,
      this.fechaDocumento,
    );
    const fechaInicioMision = fechasMision.fechaInicioStr;
    const fechaFinMision = fechasMision.fechaFinStr;

    const misionTexto = `El PMP del ${unidad}, ejecutará operaciones de allanamientos el día ${fechaInicioMision} hasta ${fechaFinMision} en el cantón ${canton}, para realizar las intervenciones en coordinación con la Policía Nacional, orientadas a neutralizar el accionar de los GAO/GDOT, reducir sus capacidades logísticas y afectar las economías criminales.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `El personal del ${unidad}, ejecutará intervenciones en coordinación con la Policía Nacional, en los sectores de mayor incidencia delincuencial, a fin de contrarrestar el accionar de organizaciones terroristas y actores no estatales no beligerantes, con el objetivo de reducir los índices de criminalidad y violencia que inciden en la seguridad ciudadana, respetando los derechos humanos y en estricta observancia a la Ley Orgánica que regula el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil en flagrancia donde se requiera la intervención rápida y oportuna del personal militar profesional con orden, de competencia legal de las Fuerzas Armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  /**
   * Genera la tabla de ejecución para operaciones RASTRILLAJE
   * @returns {string} - HTML de la tabla
   */
  /**
   * ✅ Resuelve el valor de una celda según el 'campoOrigen' definido en
   * la pestaña TABLA_COLUMNAS. Algunos campos son directos (canton,
   * parroquia, sector, unidadEducativa...) y otros son calculados
   * (horario, ord, tipoOperacion).
   */
  _resolverCampoTabla(campoOrigen, op, index, tipoOperacionCodigo) {
    switch (campoOrigen) {
      case "horario": {
        let hi = String(op.horaInicio || "00:00").trim();
        let hf = String(op.horaFinal || "00:00").trim();
        if (!hi.includes(":")) hi = convertirHoraMilitar(hi) || "00:00";
        if (!hf.includes(":")) hf = convertirHoraMilitar(hf) || "00:00";
        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";
        return `${hi} - ${hf}`;
      }
      case "ord":
        return String(index + 1);
      case "tipoOperacion":
        return tipoOperacionCodigo;
      default:
        return sanitizarTexto(op[campoOrigen] || "No especificado");
    }
  }

  /**
   * ✅ Genera la tabla HTML leyendo la configuración de columnas desde
   * Google Sheets (pestañas TIPOS_OPERACION -> modeloId -> TABLAS ->
   * tablaId -> TABLA_COLUMNAS), con fallback al HTML fijo anterior si
   * Sheets aún no tiene columnas configuradas para ese tipo.
   *
   * @param {string} tipoOperacionCodigo - ej. "REGISTRO"
   * @param {Array} operaciones - Operaciones ya filtradas por ese tipo
   * @param {string} fallbackHtml - HTML fijo anterior, por si Sheets no tiene config
   * @returns {string} - HTML de la tabla
   */
  /**
   * ✅ Normaliza el valor de TABLA_COLUMNAS.ancho venga como venga desde
   * Google Sheets: fracción por celda formateada como "Porcentaje"
   * (ej. 0.19), número entero plano (ej. 19), o texto con símbolo
   * (ej. "19%"). Siempre devuelve un string tipo "19%" listo para CSS,
   * o null si no hay valor válido.
   */
  _normalizarAncho(valor) {
    if (valor === null || valor === undefined || valor === "") return null;

    let numero;
    if (typeof valor === "number") {
      numero = valor;
    } else {
      numero = parseFloat(String(valor).replace("%", "").trim());
    }

    if (isNaN(numero)) return null;

    // Sheets con formato "Porcentaje" entrega una fracción (0.19 = 19%)
    if (numero > 0 && numero <= 1) {
      numero = numero * 100;
    }

    return `${numero}%`;
  }

  _generarTablaDesdeConfig(tipoOperacionCodigo, operaciones, fallbackHtml) {
    const normalizar = (txt) =>
      String(txt || "").toUpperCase().replace(/\s+/g, " ").trim();

    const tipoOpConfig = (this.configuracion?.tiposOperacion || []).find(
      (t) => normalizar(t.codigo) === normalizar(tipoOperacionCodigo),
    );
    const modeloId = tipoOpConfig?.modeloId;

    const tablaConfig = modeloId
      ? (this.configuracion?.tablas || []).find((t) => t.modeloId === modeloId)
      : null;
    const tablaId = tablaConfig?.tablaId;

    const columnas = tablaId
      ? (this.configuracion?.tablaColumnas || [])
          .filter(
            (c) => c.tablaId === tablaId && c.activo !== false && c.activo !== "FALSE",
          )
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      : [];

    // ✅ FALLBACK: Sheets aún no tiene columnas configuradas para este tipo
    if (columnas.length === 0) {
      return fallbackHtml;
    }

    if (operaciones.length === 0) {
      return `
                <p class="texto-concepto" style="color: #999; text-align: center;">
                    No se encontraron operaciones de tipo ${tipoOperacionCodigo} para mostrar en la tabla.
                </p>
            `;
    }

    const headers = columnas
      .map((c) => `<th style="width:${this._normalizarAncho(c.ancho) || "auto"}">${c.encabezado}</th>`)
      .join("");

    const filas = operaciones
      .map((op, index) => {
        const celdas = columnas
          .map(
            (c) =>
              `<td>${this._resolverCampoTabla(c.campoOrigen, op, index, tipoOperacionCodigo)}</td>`,
          )
          .join("");
        return `<tr>${celdas}</tr>`;
      })
      .join("");

    const claseTipo = tipoOperacionCodigo.toLowerCase().replace(/\s+/g, "-");

    return `
            <table class="tabla-operaciones tabla-${claseTipo}">
                <thead><tr>${headers}</tr></thead>
                <tbody>${filas}</tbody>
            </table>
        `;
  }

  _generarTablaRastrillaje() {
    // Filtrar solo operaciones de tipo RASTRILLAJE
    const operaciones = filtrarPorTipoOperacion(
      this.operacionesAgrupadas,
      "RASTRILLAJE",
    );

    // ✅ HTML fijo anterior, usado solo como fallback si Sheets no tiene
    // columnas configuradas todavía para este tipo de operación.
    let fallbackHtml = `
            <p class="texto-concepto" style="color: #999; text-align: center;">
                No se encontraron operaciones de tipo RASTRILLAJE para mostrar en la tabla.
            </p>
        `;

    if (operaciones.length > 0) {
      let filasTabla = "";

      operaciones.forEach((op) => {
        const parroquia = op.parroquia || "No especificada";
        const sector = op.sector || "No especificado";

        let hi = String(op.horaInicio || "00:00").trim();
        let hf = String(op.horaFinal || "00:00").trim();

        if (!hi.includes(":")) {
          hi = convertirHoraMilitar(hi) || "00:00";
        }
        if (!hf.includes(":")) {
          hf = convertirHoraMilitar(hf) || "00:00";
        }
        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";

        const horario = `${hi} - ${hf}`;
        const tipoOp = "RASTRILLAJE";

        filasTabla += `
            <tr>
                <td>${sanitizarTexto(parroquia)}</td>
                <td>${sanitizarTexto(sector)}</td>
                <td>${horario}</td>
                <td>${tipoOp}</td>
            </tr>
        `;
      });

      fallbackHtml = `
        <table class="tabla-operaciones tabla-rastrillaje">
            <thead>
                <tr>
                    <th>PARROQUIA</th>
                    <th>SECTOR</th>
                    <th>HORARIO</th>
                    <th>TIPO DE OPERACIÓN</th>
                </tr>
            </thead>
            <tbody>
                ${filasTabla}
            </tbody>
        </table>
    `;
    }

    // ✅ Intentar generar la tabla desde la configuración de Google Sheets
    // (TIPOS_OPERACION -> modeloId -> TABLAS -> tablaId -> TABLA_COLUMNAS)
    return this._generarTablaDesdeConfig("RASTRILLAJE", operaciones, fallbackHtml);
  }

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE APOYO MINEDUC
  // ==============================================

  /**
   * Genera documento para tipo APOYO MINEDUC
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoApoyoMINEDUC() {
    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const sector = this.datos?.sector || "Sector no especificado";
    const parroquia = this.datos?.parroquia || "Parroquia no especificada";
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones en Apoyo al MINEDUC";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO FIJO PARA APOYO MINEDUC)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón Manta atraviesa actualmente una crítica situación de seguridad debido al elevado índice de violencia, producto principalmente de la presencia y disputa de organizaciones criminales vinculadas al narcotráfico y economías ilegales, que aprovechan su ubicación estratégica como puerto y punto logístico en la costa ecuatoriana.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La pugna por el control territorial, rutas de salida de droga, microtráfico, extorsión y otros delitos conexos ha generado un incremento sostenido de muertes violentas, ataques armados y hechos delictivos, afectando tanto a sectores periféricos como a zonas urbanas y comerciales. Esta realidad ha deteriorado la percepción de seguridad ciudadana, alterando la dinámica social y económica del cantón, en este contexto, la violencia en Manta no responde a hechos aislados, sino a un problema latente que combina crimen organizado, vulnerabilidad social y economías ilícitas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA APOYO MINEDUC)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará operaciones en apoyo a otras entidades del estado (Ministerio de educación), en el cantón ${canton}, el día ${fechaInicioMision} hasta ${fechaFinMision}, a fin de identificar, aislar, prevenir y neutralizar la amenaza, cometimientos de actos hostiles y alteración del orden público que amenacen las Instituciones Educativas.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en realizar CAMEX, patrullaje motorizado, pedestre y presencia militar en las Instituciones Educativas empleando PMP con sus funciones establecidas, para neutralizar a los grupos de crimen organizado transnacional, identificados como organizaciones terroristas y actores no estatales beligerantes, con el empleo de a fin de contrarrestar el accionar de los GDO, contribuir con la seguridad integral del Estado y en la protección de los derechos, libertades y garantías de los ciudadanos.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // --- TABLA DE EJECUCIÓN (SOLO APOYO MINEDUC FILTRADOS) ---
    bloques.push(this._generarTablaApoyoMINEDUC());
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    // Usar la misma función auxiliar para TAREAS GENERALES
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }
  /**
   * Genera la tabla de ejecución para operaciones APOYO MINEDUC
   * @returns {string} - HTML de la tabla
   */
  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE CAMEX EJES VIALES
  // ==============================================

  /**
   * Genera documento para tipo CAMEX EJES VIALES
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoCAMEXEjesViales() {
    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const sector = this.datos?.sector || "Sector no especificado";
    const parroquia = this.datos?.parroquia || "Parroquia no especificada";
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones de Camex Ejes Viales";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO FIJO PARA CAMEX EJES VIALES)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad preocupante, caracterizada por el incremento de hechos violentos, asociados principalmente a su ubicación estratégica en una zona costera de Manabí. Esta condición ha sido aprovechada por organizaciones delictivas vinculadas al narcotráfico y otras economías ilícitas, que utilizan el territorio como punto de tránsito, acopio y salida marítima de sustancias catalogadas sujetas a fiscalización, generando disputas por el control de rutas y zonas de influencia.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La violencia se ve agravada por múltiples factores, entre ellos la disputa por el control territorial y las fracturas en la línea de mando del GAO "Los Choneros", que han intensificado los enfrentamientos internos. Estas dinámicas se complementan con condiciones socioeconómicas adversas, que incrementan la vulnerabilidad social y favorecen la captación de jóvenes por parte de las organizaciones criminales, fortaleciendo sus redes e incrementando los niveles de violencia en el territorio.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA CAMEX EJES VIALES)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará operaciones CAMEX en los ejes viales, en el cantón ${canton}, el día ${fechaInicioMision} hasta ${fechaFinMision}, a fin de evitar el tráfico ilegal de armas, municiones explosivos, SCSF y neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH y los DDHH, y estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;
    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en materializar operaciones de Camex en los ejes viales, para neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH. y los DD.HH. y la Ley Orgánica para Regular el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // --- TABLA DE EJECUCIÓN (SOLO CAMEX EJES VIALES FILTRADOS) ---
    bloques.push(this._generarTablaCAMEXEjesViales());
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  /**
   * Genera la tabla de ejecución para operaciones CAMEX EJES VIALES
   * @returns {string} - HTML de la tabla
   */
  _generarTablaCAMEXEjesViales() {
    // Filtrar solo operaciones de tipo CAMEX EJES VIALES
    const operaciones = filtrarPorTipoOperacion(
      this.operacionesAgrupadas,
      "CAMEX EJES VIALES",
    );

    let fallbackHtml = `
            <p class="texto-concepto" style="color: #999; text-align: center;">
                No se encontraron operaciones de tipo CAMEX EJES VIALES para mostrar en la tabla.
            </p>
        `;

    if (operaciones.length > 0) {
      let filasTabla = "";

      operaciones.forEach((op) => {
        const parroquia = op.parroquia || "No especificada";
        const sector = op.sector || "No especificado";

        let hi = String(op.horaInicio || "00:00").trim();
        let hf = String(op.horaFinal || "00:00").trim();

        if (!hi.includes(":")) {
          hi = convertirHoraMilitar(hi) || "00:00";
        }
        if (!hf.includes(":")) {
          hf = convertirHoraMilitar(hf) || "00:00";
        }
        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";

        const horario = `${hi} - ${hf}`;
        const tipoOp = "CAMEX EJES VIALES";

        filasTabla += `
            <tr>
                <td>${horario}</td>
                <td>${sanitizarTexto(parroquia)}</td>
                <td>${sanitizarTexto(sector)}</td>
                <td>${tipoOp}</td>
            </tr>
        `;
      });

      fallbackHtml = `
        <table class="tabla-operaciones tabla-camex-ejes-viales">
            <thead>
                <tr>
                    <th>HORARIO</th>
                    <th>PARROQUIA</th>
                    <th>SECTOR</th>
                    <th>TIPO DE OPERACIÓN</th>
                </tr>
            </thead>
            <tbody>
                ${filasTabla}
            </tbody>
        </table>
    `;
    }

    return this._generarTablaDesdeConfig("CAMEX EJES VIALES", operaciones, fallbackHtml);
  }

  _generarTablaApoyoMINEDUC() {
    // Filtrar solo operaciones de tipo APOYO MINEDUC
    const operaciones = filtrarPorTipoOperacion(
      this.operacionesAgrupadas,
      "APOYO MINEDUC",
    );

    let fallbackHtml = `
            <p class="texto-concepto" style="color: #999; text-align: center;">
                No se encontraron operaciones de tipo APOYO MINEDUC para mostrar en la tabla.
            </p>
        `;

    if (operaciones.length > 0) {
      let filasTabla = "";

      operaciones.forEach((op) => {
        let hi = String(op.horaInicio || "00:00").trim();
        let hf = String(op.horaFinal || "00:00").trim();

        if (!hi.includes(":")) {
          hi = convertirHoraMilitar(hi) || "00:00";
        }
        if (!hf.includes(":")) {
          hf = convertirHoraMilitar(hf) || "00:00";
        }
        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";

        const horario = `${hi} - ${hf}`;
        const sector = op.parroquia || "No especificado";
        const unidadEducativa =
          op.unidadEducativa || op.sector || "No especificada";

        filasTabla += `
            <tr>
                <td>${horario}</td>
                <td>${sanitizarTexto(sector)}</td>
                <td>${sanitizarTexto(unidadEducativa)}</td>
            </tr>
        `;
      });

      fallbackHtml = `
        <table class="tabla-operaciones tabla-apoyo-mineduc">
            <thead>
                <tr>
                    <th>HORA</th>
                    <th>SECTOR</th>
                    <th>UNIDAD EDUCATIVA</th>
                </tr>
            </thead>
            <tbody>
                ${filasTabla}
            </tbody>
        </table>
    `;
    }

    return this._generarTablaDesdeConfig("APOYO MINEDUC", operaciones, fallbackHtml);
  }
  /**
   * Genera documento para tipo REGISTRO
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoRegistro() {
    console.log("🛑 GENERANDO REGISTRO - Formato específico");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- DATOS DE LA TABLA ---
    const sector = this.datos?.sector || "Sector no especificado";
    const parroquia = this.datos?.parroquia || "Parroquia no especificada";
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHA BASE ---
    const fechaBase = this.fechaDocumento || new Date();

    // ✅ USAR LA NUEVA FUNCIÓN PARA CALCULAR EL RANGO DE OPERACIÓN
    const operacionesAgrupadas = this.operacionesAgrupadas || [this.datos];
    const rango = calcularRangoOperacion(operacionesAgrupadas, fechaBase);

    const horaInicio = rango.horaInicio;
    const horaFinal = rango.horaFinal;
    const fechaInicioObj = rango.fechaInicio;
    const fechaFinalObj = rango.fechaFinal;

    // Convertir horas a formato militar para el documento
    const horaInicioMilitar = horaInicio.replace(":", "");
    const horaFinalMilitar = horaFinal.replace(":", "");

    // Generar fechas formateadas para el documento
    const fechaInicioStr = generarFechaDocumento(
      fechaInicioObj,
      horaInicioMilitar,
    );
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinalMilitar);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones de Registro";

    // Log para depuración
    console.log("📊 Rango de operación calculado:");
    console.log(`   Hora Inicio: ${horaInicio}`);
    console.log(`   Hora Final: ${horaFinal}`);
    console.log(`   Fecha Inicio: ${fechaInicioObj.toLocaleString()}`);
    console.log(`   Fecha Final: ${fechaFinalObj.toLocaleString()}`);
    console.log(`   Fecha Inicio Str: ${fechaInicioStr}`);
    console.log(`   Fecha Fin Str: ${fechaFinStr}`);

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO FIJO PARA REGISTRO)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} atraviesa actualmente una crítica situación de seguridad debido al elevado índice de violencia, producto principalmente de la presencia y disputa de organizaciones criminales vinculadas al narcotráfico y economías ilegales, que aprovechan su ubicación estratégica como puerto y punto logístico en la costa ecuatoriana.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La pugna por el control territorial, rutas de salida de droga, microtráfico, extorsión y otros delitos conexos ha generado un incremento sostenido de muertes violentas, ataques armados y hechos delictivos, afectando tanto a sectores periféricos como a zonas urbanas y comerciales.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">Esta realidad ha deteriorado la percepción de seguridad ciudadana, alterando la dinámica social y económica del cantón. En este contexto, la violencia no responde a hechos aislados, sino a un problema latente que combina crimen organizado, vulnerabilidad social y economías ilícitas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA REGISTRO)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(
      this.operacionesAgrupadas,
      this.fechaDocumento,
    );
    const fechaInicioMision = fechasMision.fechaInicioStr;
    const fechaFinMision = fechasMision.fechaFinStr;

    const misionTexto = `El ${unidad}, ejecutará operaciones de Registro, el día ${fechaInicioMision} hasta ${fechaFinMision},en el cantón ${canton}, para neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH y los DDHH y estricta observancia a la Ley Orgánica que regula el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `El personal del ${unidad}, ejecutará operaciones de Combate Urbano / Control, en los sectores de mayor incidencia delincuencial, a fin de contrarrestar el accionar de organizaciones terroristas y actores no estatales no beligerantes, con el objetivo de reducir los índices de criminalidad y violencia que inciden en la seguridad ciudadana, respetando los derechos humanos y en estricta observancia a la Ley Orgánica que regula el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil en flagrancia donde se requiera la intervención rápida y oportuna del personal militar profesional con orden, de competencia legal de las Fuerzas Armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // --- TABLA DE EJECUCIÓN (SOLO REGISTROS FILTRADOS) ---
    bloques.push(this._generarTablaRegistro());
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA
    // ==============================================
    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">IV.</span>ADMINISTRATIVAS Y LOGISTICA</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>ADMINISTRATIVAS</div>',
    );
    bloques.push(
      '<div class="titulo-num tam-10"><span class="marcador">1.</span>Personal</div>',
    );
    bloques.push(
      '<div class="anexo-nomina">Anexo "A" Nomina del personal</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">B.</span>LOGÍSTICA</div>',
    );
    bloques.push(
      '<div class="titulo-num"><span class="marcador">1.</span>Clase I</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Rancho caliente en la unidad</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">2.</span>Clase II y IV</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">El uniforme para utilizar será el pixelado verde.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Casco Táctico/Kevlar y chaleco antibalas.</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Vehículos ADM/TAC</p></div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">3.</span>Clase III</div>',
    );
    bloques.push(
      '<div class="texto-indentado-70">Abastecimiento de combustible en la unidad.</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-num"><span class="marcador">4.</span>Clase V (Armamento en dotación)</div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">a.</span><p class="text-doc">Pistolas Pietro Beretta, CZ, Browning</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">b.</span><p class="text-doc">Subametralladora Colt, Uzi</p></div>',
    );
    bloques.push(
      '<div class="item-letra-92"><span class="marcador">c.</span><p class="text-doc">Fusil M4A2, M16, Fal, ParaFal</p></div>',
    );

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO
    // ==============================================
    bloques.push(
      '<div class="vacio"></div><div class="titulo-romano-2"><span class="marcador">V.</span>ENLACE, MEDIOS Y MANDO</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">A.</span>ENLACE</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>ECU-911</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Control de Armas - Manta - Manabí (0996891397) Guardia 24H</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">B.</span>MEDIOS</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Celular</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Radios VHF/FM simplex</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(
      '<div class="titulo-letra-11"><span class="marcador">C.</span>MANDO</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">1.</span>Comandante del GOMAI "MANABÍ".</div>',
    );
    bloques.push(
      '<div class="item-num-71"><span class="marcador">2.</span>Oficial A-3 del GOMAI "MANABÍ".</div>',
    );

    // ==============================================
    // 13. FIRMAS
    // ==============================================
    bloques.push('<div class="vacio"></div>');
    bloques.push('<div class="firma-aprueba">APRUEBA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoComandante = getGradoByNombre(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );
    const nombreComandante =
      this.comandante?.nombre || "Johnny Minchala Redrován";
    const cargoComandante = this.comandante?.funcion
      ? getFuncionById(this.comandante.funcion)
      : "COMANDANTE DEL GT ÁGUILA (GOMAI)";

    bloques.push(`<div class="firma-nombre">${nombreComandante}</div>`);
    bloques.push(
      `<div class="firma-grado">${gradoComandante || "Coronel EMT. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo">${cargoComandante}</div>`);
    bloques.push('<div class="vacio-2"></div>');
    bloques.push('<div class="firma-autentica">AUTENTICA:</div>');
    bloques.push('<div class="espacio-firmas"></div>');

    const gradoOficial = getGradoByNombre(
      this.oficial?.nombre || "José Calapaqui González",
    );
    const nombreOficial = this.oficial?.nombre || "José Calapaqui González";
    const cargoOficial = this.oficial?.funcion
      ? getFuncionById(this.oficial.funcion)
      : "OFICIAL A3 GT ÁGUILA (GOMAI), Accidental";

    bloques.push(`<div class="firma-nombre-izq">${nombreOficial}</div>`);
    bloques.push(
      `<div class="firma-grado-izq">${gradoOficial || "Teniente Téc. Avc."}</div>`,
    );
    bloques.push(`<div class="firma-cargo-izq">${cargoOficial}</div>`);

    // ==============================================
    // 14. ANEXOS
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  /**
   * Genera la tabla de ejecución para operaciones REGISTRO
   */
  _generarTablaRegistro() {
    const registros = filtrarPorTipoOperacion(
      this.operacionesAgrupadas,
      "REGISTRO",
    );

    let fallbackHtml = `
                <p class="texto-concepto" style="color: #999; text-align: center;">
                    No se encontraron operaciones de tipo REGISTRO para mostrar en la tabla.
                </p>
            `;

    if (registros.length > 0) {
      let filasTabla = "";

      registros.forEach((op) => {
        const canton = op.canton || "No especificado";
        const parroquia = op.parroquia || "No especificada";
        const sector = op.sector || "No especificado";

        let hi = String(op.horaInicio || "00:00").trim();
        let hf = String(op.horaFinal || "00:00").trim();

        if (!hi.includes(":")) {
          hi = convertirHoraMilitar(hi) || "00:00";
        }
        if (!hf.includes(":")) {
          hf = convertirHoraMilitar(hf) || "00:00";
        }
        if (!hi.includes(":")) hi = "00:00";
        if (!hf.includes(":")) hf = "00:00";

        const horario = `${hi} - ${hf}`;
        const tipoOp = "REGISTRO";

        filasTabla += `
                <tr>
                    <td>${sanitizarTexto(canton)}</td>
                    <td>${sanitizarTexto(parroquia)}</td>
                    <td>${sanitizarTexto(sector)}</td>
                    <td>${horario}</td>
                    <td>${tipoOp}</td>
                </tr>
            `;
      });

      fallbackHtml = `
            <table class="tabla-operaciones tabla-registro">
                <thead>
                    <tr>
                        <th>CANTÓN</th>
                        <th>PARROQUIA</th>
                        <th>SECTOR</th>
                        <th>HORARIO</th>
                        <th>TIPO DE OPERACIÓN</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasTabla}
                </tbody>
            </table>
        `;
    }

    return this._generarTablaDesdeConfig("REGISTRO", registros, fallbackHtml);
  }

  /**
   * Verifica si el cantón es MONTECRISTI o MANTA (case insensitive)
   * @param {string} canton - Nombre del cantón
   * @returns {boolean} - True si es MONTECRISTI o MANTA
   */
  _esCantonEspecial(canton) {
    if (!canton) return false;
    const cantonNormalizado = String(canton).toUpperCase().trim();
    return cantonNormalizado === "MONTECRISTI" || cantonNormalizado === "MANTA";
  }

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE PMI
  // ==============================================

  /**
   * Genera documento para tipo PMI (Protección de autoridades)
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoPMI() {
    console.log("🛑 GENERANDO PMI - Formato específico");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const sector = this.datos?.sector || "Sector no especificado";
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- DATOS DEL PANEL HTML ---
    const autoridadSeguridad = this.autoridadSeguridad || "No especificada";
    const origen = this.origen || "No especificado";
    const destino = this.destino || "No especificado";
    const origenCoordenadas = this.origenCoordenadas || "";
    const destinoCoordenadas = this.destinoCoordenadas || "";
    const unidadResponsable = this.unidadResponsable || "No especificada";
    const unidadDescripcion = this.unidadDescripcion || "";

    // Construir origen con coordenadas
    const origenConCoordenadas = origenCoordenadas
      ? `${origen} (Coord. ${origenCoordenadas})`
      : origen;
    const destinoConCoordenadas = destinoCoordenadas
      ? `${destino} (Coord. ${destinoCoordenadas})`
      : destino;

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Protección y Seguridad PMI de autoridades y funcionarios.";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO DINÁMICO CON CANTÓN)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} atraviesa actualmente una crítica situación de seguridad debido al elevado índice de violencia, producto principalmente de la presencia y disputa de organizaciones criminales vinculadas al narcotráfico y economías ilegales, que aprovechan su ubicación estratégica como puerto y punto logístico en la costa ecuatoriana.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La pugna por el control territorial, rutas de salida de droga, microtráfico, extorsión y otros delitos conexos ha generado un incremento sostenido de muertes violentas, ataques armados y hechos delictivos, afectando tanto a sectores periféricos como a zonas urbanas y comerciales. Esta realidad ha deteriorado la percepción de seguridad ciudadana, alterando la dinámica social y económica del cantón, en este contexto, la violencia en Manta no responde a hechos aislados, sino a un problema latente que combina crimen organizado, vulnerabilidad social y economías ilícitas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA PMI)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, brindará seguridad armada y protección a ${autoridadSeguridad}, desde el día ${fechaInicioMision} hasta ${fechaFinMision} en la ruta ${sector}, con el propósito de mitigar riesgos y garantizar la seguridad física de PMI, respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    // Construir la ruta con origen y destino
    const rutaTexto = `${origenConCoordenadas} – ${destinoConCoordenadas}`;
    const unidadEncargada = unidadDescripcion || unidadResponsable;

    const conceptoTexto = `El PMP del ${unidad}, se hará cargo de la seguridad armada del personal ${autoridadSeguridad}, en la ruta ${rutaTexto}, donde realizará la entrega formal de la custodia del personal, a ${unidadEncargada}, hasta la base aérea de Taura.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Esta operación se realizará con el objetivo de resguardar la integridad del personal transportado, observando estrictamente los principios de necesidad, legalidad, proporcionalidad y precaución en el empleo de la fuerza, con pleno respeto a los derechos humanos y en cumplimiento de la Ley Orgánica que Regula el Uso Legítimo de la Fuerza.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Asimismo, la patrulla deberá mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE CAMEX COORD. P.N.
  // ==============================================

  /**
   * Genera documento para tipo CAMEX COORD. P.N.
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoCAMEXCoordPN() {
    console.log("🛑 GENERANDO CAMEX COORD. P.N. - Formato específico");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const sectorRaw = this.datos?.sector || "Sector no especificado";
    const sector = limpiarSector(sectorRaw);
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Cumplimiento operaciones CAMEX en apoyo a la PPNN.";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO DINÁMICO CON CANTÓN)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad compleja marcada por el incremento de hechos violentos, la cual se ve agravada por factores propios del sector, que constituye un punto sensible frente a posibles influencias del crimen organizado, tanto al interior como al exterior del CRS. se ha evidenciado la concentración de familiares de personas privadas de la libertad (PPL) en viviendas cercanas al CRS, mismos estarían incrementando actividades de apoyo externo, facilitando actividades ilícitas y generando condiciones que pueden afectar la seguridad ciudadana y el orden público en los sectores aledaños.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA CAMEX COORD. P.N.)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
    const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará operaciones CAMEX en apoyo a la Policía Nacional, en el cantón ${canton} ${sector}, el día ${fechaInicioMision} hasta ${fechaFinMision}, para prevenir y neutralizar las actividades de grupos armados, a fin de reducir los índices de criminalidad y violencia, que inciden en la seguridad ciudadana respetando los derechos humanos y en estricta observancia a Ley Orgánica que Regula el Uso Legítimo de la Fuerza.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en ejecutar operaciones CAMEX en coordinación con la P.N dentro del área de jurisdicción, empleando PMP, para prevenir y neutralizar las actividades de grupos armados, a fin de reducir los índices de criminalidad y violencia, que inciden en la seguridad ciudadana respetando los derechos humanos y en estricta observancia a ley orgánica que regula el uso legítimo de la fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE APOYO MIN. AMBIENTE ENERGÍA (CELEC)
  // ==============================================

  /**
   * Genera documento para tipo APOYO MIN. AMBIENTE ENERGÍA (CELEC)
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoApoyoMinAmbienteEnergia() {
    console.log(
      "🛑 GENERANDO APOYO MIN. AMBIENTE ENERGÍA - Formato específico",
    );

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const sectorRaw = this.datos?.sector || "Sector no especificado";
    const sector = limpiarSector(sectorRaw);
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto =
      "Operaciones de seguridad Ministerio de Ambiente y Energía (CELEC).";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO DINÁMICO CON CANTÓN)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad preocupante, caracterizada por el incremento de hechos violentos, asociados principalmente a su ubicación estratégica en una zona costera de Manabí. Esta condición ha sido aprovechada por organizaciones delictivas vinculadas al narcotráfico y otras economías ilícitas, que utilizan el territorio como punto de tránsito, acopio y salida marítima de sustancias catalogadas sujetas a fiscalización, generando disputas por el control de rutas y zonas de influencia.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La violencia se ve agravada por múltiples factores, entre ellos la disputa por el control territorial y las fracturas en la línea de mando del GAO "Los Choneros", que han intensificado los enfrentamientos internos. Estas dinámicas se complementan con condiciones socioeconómicas adversas, que incrementan la vulnerabilidad social y favorecen la captación de jóvenes por parte de las organizaciones criminales, fortaleciendo sus redes e incrementando los niveles de violencia en el territorio.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA APOYO MIN. AMBIENTE ENERGÍA)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará operaciones en apoyo al Ministerio de Ambiente y Energía (CELEC), el día ${fechaInicioMision} hasta ${fechaFinMision} en el cantón ${canton}, sector ${sector}, a fin de identificar, aislar, prevenir y neutralizar la amenaza, cometimientos de actos hostiles y alteración del orden público que amenacen las ARS.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en realizar patrullaje motorizado, pedestre y presencia militar en apoyo al Ministerio de ambiente y energía (CELEC), enmarcadas dentro del marco de la ley y las disposiciones emitidas por el escalón superior, para neutralizar a los grupos de crimen organizado transnacional, identificados como organizaciones terroristas y actores no estatales beligerantes, a fin de contrarrestar el accionar de los GDO, contribuir con la seguridad integral del Estado y en la protección de los derechos, libertades y garantías del ciudadano.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE SEGURIDAD ARS
  // ==============================================

  /**
   * Genera documento para tipo SEGURIDAD ARS (REPETIDORAS CCFFAA)
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoSeguridadARS() {
    console.log("🛑 GENERANDO SEGURIDAD ARS - Formato específico");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto = "Seguridad (antena repetidora del CCFFAA) cerro Corozo.";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (TEXTO DINÁMICO CON CANTÓN)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad compleja marcada por el incremento de hechos violentos, la cual se ve agravada por factores propios del sector, que constituye un punto sensible frente a posibles influencias del crimen organizado, tanto al interior como al exterior del CRS. se ha evidenciado la concentración de familiares de personas privadas de la libertad (PPL) en viviendas cercanas al CRS, mismos estarían incrementando actividades de apoyo externo, facilitando actividades ilícitas y generando condiciones que pueden afectar la seguridad ciudadana y el orden público en los sectores aledaños.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA SEGURIDAD ARS)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, brindará seguridad en apoyo al MDN (antenas repetidoras), a partir ${fechaInicioMision} hasta ${fechaFinMision} en el cantón ${canton}, sector El Anegado en la antena repetidora del CCFFAA (cerro Corozo), a fin de identificar, aislar, prevenir y neutralizar la amenaza, cometimientos de actos hostiles y alteración del orden público que amenacen las ARS.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en ejecutar seguridad fija en la antena repetidora del CCFFAA en apoyo a otras entidades del estado; Seguridad a las Áreas Reservadas de Seguridad (ARS), enmarcadas dentro del marco de la ley y las disposiciones emitidas por el escalón superior.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantener el control operativo del dispositivo de seguridad establecido para las instalaciones de la antena repetidora del CCFFAA, ubicada en el cerro corozo, parroquia el Anegado empleando PMP con sus funciones establecidas, para neutralizar a los grupos de crimen organizado transnacional, identificados como organizaciones terroristas y actores no estatales beligerantes, con el empleo de a fin de contrarrestar el accionar de los GDO, contribuir con la seguridad integral del Estado y en la protección de los derechos, libertades y garantías del ciudadano.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Así también deberá mantenerse en alerta permanente ante algún evento y/o intento de acto hostil donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }

  // ==============================================
// GENERADOR DE DOCUMENTOS - OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS
// ==============================================

_generarDocumentoSostenibles() {
    console.log("🛑 GENERANDO OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS");

    const bloques = [];

    // --- UNIDAD ---
    const unidad = this.unidadResponsable || this.datos?.unidad || "GT ÁGUILA (GOMAI)";

    // --- DATOS ---
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";
    const fechaBase = this.fechaDocumento || new Date();

    // ✅ Obtener sectores (para otros cantones)
    const sectores = this.operacionesAgrupadas
        .map(op => op.sector || "Sector no especificado")
        .filter(s => s && s !== "Sector no especificado");
    const sectoresUnicos = [...new Set(sectores)];
    let sectorTexto = "Sector no especificado";
    if (sectoresUnicos.length === 1) {
        sectorTexto = sectoresUnicos[0];
    } else if (sectoresUnicos.length > 1) {
        sectorTexto = sectoresUnicos.join(" / ");
    }

    // ✅ Calcular fechas con la misma lógica de RASTRILLAJE
    const rango = calcularRangoOperacion(this.operacionesAgrupadas, fechaBase);
    const horaInicioMilitar = rango.horaInicio.replace(":", "");
    const horaFinalMilitar = rango.horaFinal.replace(":", "");
    const fechaInicioStr = generarFechaDocumento(rango.fechaInicio, horaInicioMilitar);
    const fechaFinStr = generarFechaDocumento(rango.fechaFinal, horaFinalMilitar);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(this.comandante?.nombre || "Johnny Minchala Redrován");

    // --- ASUNTO ---
    const asunto = "Operaciones Sostenibles en Áreas Criticas";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
        `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
        `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN
    // ==============================================
    bloques.push(
        '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>'
    );
    bloques.push('<div class="vacio"></div>');
    bloques.push(`
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad preocupante, caracterizada por el incremento de hechos violentos, asociados principalmente a su ubicación estratégica en una zona costera de Manabí. Esta condición ha sido aprovechada por organizaciones delictivas vinculadas al narcotráfico y otras economías ilícitas, que utilizan el territorio como punto de tránsito, acopio y salida marítima de sustancias catalogadas sujetas a fiscalización, generando disputas por el control de rutas y zonas de influencia.</p>
    `);
    bloques.push(`
        <p class="texto-situacion-2">La violencia se ve agravada por múltiples factores, entre ellos la disputa por el control territorial y las fracturas en la línea de mando del GAO "Los Choneros", que han intensificado los enfrentamientos internos. Estas dinámicas se complementan con condiciones socioeconómicas adversas, que incrementan la vulnerabilidad social y favorecen la captación de jóvenes por parte de las organizaciones criminales, fortaleciendo sus redes e incrementando los niveles de violencia en el territorio.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN
    // ==============================================
    bloques.push(
        '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>'
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ CONDICIÓN: MANTA vs OTRO CANTÓN
    const esManta = canton.toUpperCase().trim() === "MANTA";

    let misionTexto = "";
    if (esManta) {
        // ✅ MANTA: misión sin sector, CON tabla
        misionTexto =
            `El PMP del ${unidad}, ejecutará Operaciones Sostenibles en Áreas Criticas, en el canton ${canton}, el día ${fechaInicioStr} hasta ${fechaFinStr}, para neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH y los DDHH y estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;
    } else {
        // ✅ OTRO CANTÓN: misión CON sector, SIN tabla
        misionTexto =
            `El PMP del ${unidad}, ejecutará Operaciones Sostenibles en Áreas Criticas, en el canton ${canton}, sector ${sectorTexto}, el día ${fechaInicioStr} hasta ${fechaFinStr}, para neutralizar los ataques armados, amenazas o riesgos, orquestados por el crimen organizado, grupos armados organizados o terroristas o actores no estatales del conflicto armado interno, respetando el DIH y los DDHH y estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;
    }

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
        '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>'
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
        '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>'
    );

    const conceptoTexto =
        `El personal del ${unidad}, ejecutará operaciones de allanamientos y rastrillaje en los sectores de mayor incidencia delincuencial, a fin de contrarrestar el accionar de organizaciones terroristas y actores no estatales no beligerantes, con el objetivo de reducir los índices de criminalidad y violencia que inciden en la seguridad ciudadana, respetando los Derechos humanos y en estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Los ECOS se mantendrán en alerta permanente para ser activados con orden como FFRR en apoyo a las unidades desplegadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. TABLA DE EJECUCIÓN (SOLO PARA MANTA)
    // ==============================================
    if (esManta) {
        // Filtrar solo operaciones de tipo OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS
        const operacionesFiltradas = filtrarPorTipoOperacion(
            this.operacionesAgrupadas,
            "OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS"
        );

        let filasTabla = "";
        if (operacionesFiltradas.length > 0) {
            operacionesFiltradas.forEach((op) => {
                const canton = op.canton || "N/A";
                const parroquia = op.parroquia || "N/A";
                const sector = op.sector || "N/A";
                const tipoOp = "OPERACIONES SOSTENIBLES EN ÁREAS CRÍTICAS";

                let hi = String(op.horaInicio || "00:00").trim();
                let hf = String(op.horaFinal || "00:00").trim();

                if (!hi.includes(":")) {
                    hi = convertirHoraMilitar(hi) || "00:00";
                }
                if (!hf.includes(":")) {
                    hf = convertirHoraMilitar(hf) || "00:00";
                }
                if (!hi.includes(":")) hi = "00:00";
                if (!hf.includes(":")) hf = "00:00";

                const horario = `${hi} - ${hf}`;

                filasTabla += `
                    <tr>
                        <td>${sanitizarTexto(canton)}</td>
                        <td>${sanitizarTexto(parroquia)}</td>
                        <td>${sanitizarTexto(sector)}</td>
                        <td>${horario}</td>
                        <td>${tipoOp}</td>
                    </tr>
                `;
            });
        }

        // ✅ Generar tabla SOLO si hay registros
        if (filasTabla) {
            bloques.push(`
                <table class="tabla-operaciones tabla-sostenibles">
                    <thead>
                        <tr>
                            <th>CANTÓN</th>
                            <th>PARROQUIA</th>
                            <th>SECTOR</th>
                            <th>HORARIO</th>
                            <th>TIPO DE OPERACIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasTabla}
                    </tbody>
                </table>
            `);
            bloques.push('<div class="vacio"></div>');
        }
    }

    // ==============================================
    // 9. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(false));

    // ==============================================
    // 10. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 11. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 12. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 13. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 14. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 15. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
}

  // ==============================================
  // GENERADOR DE DOCUMENTOS - PARTE RETEN MILITAR
  // ==============================================

  /**
   * Genera documento para tipo RETEN MILITAR VIAS POLIDUCTO / CONTROL TANQUEROS
   * @returns {Array} - Bloques HTML del documento
   */
  _generarDocumentoRetenMilitar() {
    const bloques = [];

    // --- UNIDAD ---
    const unidad = "GT ÁGUILA (GOMAI)";

    // --- PROCESAR HORAS ---
    let horaInicio = this.datos?.horaInicio || "0030";
    horaInicio = String(horaInicio).trim();
    if (horaInicio === "") horaInicio = "0030";
    if (horaInicio.includes(":")) {
      horaInicio = horaInicio.replace(":", "");
    }
    while (horaInicio.length < 4) {
      horaInicio = "0" + horaInicio;
    }
    horaInicio = horaInicio.slice(0, 4);

    let horaFinal = this.datos?.horaFinal || "2359";
    horaFinal = String(horaFinal).trim();
    if (horaFinal === "") horaFinal = "2359";
    if (horaFinal.includes(":")) {
      horaFinal = horaFinal.replace(":", "");
    }
    while (horaFinal.length < 4) {
      horaFinal = "0" + horaFinal;
    }
    horaFinal = horaFinal.slice(0, 4);

    // --- DATOS DINÁMICOS ---
    // Limpiar sector (eliminar URLs)
    const sectorRaw = this.datos?.sector || "Sector no especificado";
    const sector = limpiarSector(sectorRaw);
    const canton = this.datos?.canton || "Cantón no especificado";
    const numeroOrden = this.numeroAccion || "7299";

    // --- FECHAS CON MANEJO DE CRUCE DE MEDIANOCHE ---
    const fechaBase = this.fechaDocumento || new Date();
    const fechaFinalObj = calcularFechaFinal(fechaBase, horaInicio, horaFinal);

    const fechaInicioStr = generarFechaDocumento(fechaBase, horaInicio);
    const fechaFinStr = generarFechaDocumento(fechaFinalObj, horaFinal);
    const fechaEncabezado = generarFechaHoraEncabezado();
    const siglas = obtenerSiglas(
      this.comandante?.nombre || "Johnny Minchala Redrován",
    );

    // --- ASUNTO ---
    const asunto =
      "Cumplimiento Retén Militar en las vías de ingreso al poliducto.";

    // ==============================================
    // 1. ENCABEZADO
    // ==============================================
    bloques.push(`
        <div class="bloque-encabezado">
            <div class="linea-encabezado">GT ÁGUILA (GOMAI)</div>
            <div class="linea-encabezado">MANTA (PROV. MANABÍ)</div>
            <div class="linea-encabezado">${fechaEncabezado}</div>
            <div class="linea-encabezado">${siglas}-${numeroOrden}</div>
        </div>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 2. TÍTULO
    // ==============================================
    const numeroOrdenCompleto = formatearNumeroOrden(numeroOrden);
    bloques.push(
      `<div class="titulo-documento">ORDEN DE ACCIÓN TÁCTICA Nro. ${numeroOrdenCompleto}</div>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 3. ASUNTO
    // ==============================================
    bloques.push(
      `<p class="parrafo-asunto"><span class="asunto-label">&nbsp;&nbsp;Asunto:</span>&nbsp;&nbsp;\t${asunto}</p>`,
    );
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 4. DOCUMENTOS (Marco legal)
    // ==============================================
    bloques.push(...this._generarBloqueDocumentos());

    // ==============================================
    // 5. I. SITUACIÓN (CONDICIONAL PARA RETEN MILITAR)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">I.</span>SITUACIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // ✅ Verificar si el cantón es MONTECRISTI o MANTA
    const cantonNormalizado = String(canton).toUpperCase().trim();
    const esCantonEspecial =
      cantonNormalizado === "MONTECRISTI" || cantonNormalizado === "MANTA";

    let situacionTexto = "";

    if (esCantonEspecial) {
      // Texto especial para MONTECRISTI o MANTA
      situacionTexto = `
        <p class="texto-situacion">El cantón ${canton} es considerada como zona estratégica para las organizaciones narco delictivas; así mismo, este cantón es utilizado como corredor de movilidad de SCSF por vía marítima, terrestre y aérea, donde estas bandas delincuenciales utilizan los puertos y muelles clandestinos para el acopio y transporte de alcaloide por vía marítima hacia otros países, siendo esta una de las razones de enfrentamientos de los grupos delincuenciales, situación que ha permitido que sea uno de los cantones más violentos del país, en lo que va del presente año, esto debido a la guerra que al momento existe entre las bandas delictivas (Los Choneros y Lobos), con la finalidad de mantener el poder y hegemonía del área para el cometimiento de delitos al margen de la ley, entre los cuales prioriza el microtráfico, extorciones, secuestros y sicariatos.</p>
    `;
    } else {
      // Texto original para otros cantones
      situacionTexto = `
        <p class="texto-situacion">El cantón ${canton} enfrenta actualmente una situación de seguridad preocupante, caracterizada por el incremento de hechos violentos, asociados principalmente a su ubicación estratégica en una zona costera de Manabí. Esta condición ha sido aprovechada por organizaciones delictivas vinculadas al narcotráfico y otras economías ilícitas, que utilizan el territorio como punto de tránsito, acopio y salida marítima de sustancias catalogadas sujetas a fiscalización, generando disputas por el control de rutas y zonas de influencia.</p>
        <p class="texto-situacion-2">La violencia se ve agravada por múltiples factores, entre ellos la disputa por el control territorial y las fracturas en la línea de mando del GAO "Los Choneros", que han intensificado los enfrentamientos internos. Estas dinámicas se complementan con condiciones socioeconómicas adversas, que incrementan la vulnerabilidad social y favorecen la captación de jóvenes por parte de las organizaciones criminales, fortaleciendo sus redes e incrementando los niveles de violencia en el territorio.</p>
    `;
    }

    bloques.push(situacionTexto);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 6. II. MISIÓN (TEXTO DINÁMICO PARA RETEN MILITAR)
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">II.</span>MISIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    const fechasMision = calcularFechasMision(this.operacionesAgrupadas, this.fechaDocumento);
const fechaInicioMision = fechasMision.fechaInicioStr;
const fechaFinMision = fechasMision.fechaFinStr;

const misionTexto = `El PMP del ${unidad}, ejecutará Retén Militar, en el cantón ${canton} ${sector}, el día ${fechaInicioMision} hasta ${fechaFinMision}, para prevenir delitos, como el tráfico ilegal de combustible, a fin de desgastar e inhabilitar la capacidad de los GAOs / GDOs / GDOTs; contribuyendo a la seguridad integral del Estado, protección de los derechos, libertades y garantías de los ciudadanos.`;

    bloques.push(`<p class="texto-mision">${misionTexto}</p>`);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 7. III. EJECUCIÓN
    // ==============================================
    bloques.push(
      '<div class="titulo-romano"><span class="marcador">III.</span>EJECUCIÓN</div>',
    );
    bloques.push('<div class="vacio"></div>');

    // --- A. CONCEPTO DE LA OPERACIÓN ---
    bloques.push(
      '<div class="titulo-letra"><span class="marcador">A.</span>CONCEPTO DE LA OPERACIÓN</div>',
    );

    const conceptoTexto = `La operación consistirá en realizarán RETÉN MILITAR en las principales rutas que conectan a las vías que dan acceso a los tramos del poliducto Libertad – Manta, mediante la verificación de la de guía de remisión a tanqueros y así también el registro minucioso a todos los vehículos como: camiones cisternas, camionetas entre otros vehículos con capacidad de transportar combustibles de manera ilícita.`;

    bloques.push(`<p class="texto-concepto">${conceptoTexto}</p>`);
    bloques.push(`
        <p class="texto-concepto">La operación se ejecutará respetando los derechos humanos y en estricta observancia a la ley orgánica que regula el uso legítimo de la fuerza.</p>
    `);
    bloques.push(`
        <p class="texto-concepto">Mantenerse en alerta permanente ante algún evento y/o intento de acto hostil EN FLAGRANCIA donde se requiera la intervención rápida y oportuna del personal militar profesional CON ORDEN, de competencia legal de fuerzas armadas.</p>
    `);
    bloques.push('<div class="vacio"></div>');

    // ==============================================
    // 8. B. TAREAS GENERALES (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasGenerales(true)); // ✅ true = agregar literal especial
    // ==============================================
    // 9. C. TAREAS ESPECÍFICAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarTareasEspecificas());

    // ==============================================
    // 10. D. INSTRUCCIONES DE COORDINACIÓN (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarInstruccionesCoordinacion());

    // ==============================================
    // 11. IV. ADMINISTRATIVAS Y LOGISTICA (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAdministrativasLogistica());

    // ==============================================
    // 12. V. ENLACE, MEDIOS Y MANDO (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarEnlaceMediosMando());

    // ==============================================
    // 13. FIRMAS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarFirmas());

    // ==============================================
    // 14. ANEXOS (REUTILIZADO)
    // ==============================================
    bloques.push(...this._generarAnexos());

    return bloques;
  }
  /**
   * Obtiene el número de orden completo para el documento
   * Formato: FTCM-GTAGUILA-2026-XXXX-S
   * @returns {string} - Número de orden completo
   */
  getNumeroOrdenCompleto() {
    return formatearNumeroOrden(this.numeroAccion || "7299");
  }

  /**
   * Obtiene solo el número de orden (sin prefijos) para el nombre del archivo
   * Ejemplo: "7299" o "7300"
   * @returns {string} - Número de orden simple (4 dígitos)
   */
  getNumeroOrdenSimple() {
    let num = this.numeroAccion || "7299";
    // Si ya es un número de 4 dígitos, devolverlo
    if (/^\d{4}$/.test(num)) {
      return num;
    }
    // Si contiene letras o guiones, extraer solo los números
    const match = String(num).match(/\d{4}/);
    if (match) {
      return match[0];
    }
    // Fallback: tomar los primeros 4 dígitos o usar 7299
    const soloNumeros = String(num).replace(/\D/g, "");
    if (soloNumeros.length >= 4) {
      return soloNumeros.slice(0, 4);
    }
    return "7299";
  }
}