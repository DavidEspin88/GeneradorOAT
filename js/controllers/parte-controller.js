// ==============================================
// PARTE-CONTROLLER.JS
// Controlador para el módulo "Parte al Instante"
// ==============================================

import { ParteExtractor } from '../utils/parte-extractor.js';
import { ParteModals } from '../views/parte-view.js';
import { 
    getOficiales, 
    getGradoByNombre,
    getFunciones,
    getFuncionById
} from '../models/oficial.js';

import { generarFechaHoraEncabezado } from '../utils/date-utils.js';

export class ParteController {
    constructor() {
        console.log('📨 Inicializando ParteController...');
        
        // Elementos del DOM
        this.textoArea = document.getElementById('textoWhatsapp');
        this.btnWhatsapp = document.getElementById('btn-generarwhatsapp');
        this.btnCmdte = document.getElementById('btn-generarFormatoCmdte');
        this.btnMSM = document.getElementById('btn-generarMSM');
        this.btnGoogleDocs = document.getElementById('btn-enviarGoogleDocs');
        
        // Selectores de comandante (NOMBRE + FUNCIÓN)
        this.comandanteSelect = document.getElementById('comandanteSelectParte');
        this.funcionComandanteSelect = document.getElementById('funcionComandanteSelectParte');
        
        // Inicializar componentes
        this.extractor = new ParteExtractor();
        this.modals = new ParteModals();
        
        // Cargar selectores
        this._cargarSelectores();
        
        // Configurar eventos
        this._configurarEventos();
        
        console.log('✅ ParteController inicializado');
    }
    
    /**
     * Carga los oficiales y funciones en los selectores
     * (misma lógica que en AppController)
     */
    _cargarSelectores() {
        try {
            const oficiales = getOficiales();
            const funciones = getFunciones();
            
            // === CARGAR COMANDANTES ===
            if (this.comandanteSelect) {
                this.comandanteSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
                oficiales.forEach((oficial) => {
                    const option = document.createElement('option');
                    option.value = oficial.nombre;
                    option.textContent = `${oficial.grado} ${oficial.nombre}`;
                    this.comandanteSelect.appendChild(option);
                });
                console.log(`✅ ${oficiales.length} oficiales cargados en Comandante (Parte)`);
            }
            
            // === CARGAR FUNCIONES ===
            if (this.funcionComandanteSelect) {
                this.funcionComandanteSelect.innerHTML = '<option value="">-- Función --</option>';
                funciones.forEach((funcion) => {
                    const option = document.createElement('option');
                    option.value = funcion.id;
                    option.textContent = funcion.nombre;
                    this.funcionComandanteSelect.appendChild(option);
                });
                console.log(`✅ ${funciones.length} funciones cargadas (Parte)`);
            }
            
        } catch (error) {
            console.error('❌ Error al cargar selectores de comandante:', error);
        }
    }
    
    _configurarEventos() {
        // 1. GENERAR MSJ WHATSAPP → NO usa comandante
        if (this.btnWhatsapp) {
            this.btnWhatsapp.addEventListener('click', (e) => {
                e.preventDefault();
                this._generarWhatsappCmdte();
            });
        }
        
        // 2. FORMATO CMDTE PATRULLA 
        if (this.btnCmdte) {
            this.btnCmdte.addEventListener('click', (e) => {
                e.preventDefault();
                this._generarFormatoCmdte();
            });
        }
        
        // 3. GENERAR MENSAJE MILITAR
        if (this.btnMSM) {
            this.btnMSM.addEventListener('click', (e) => {
                e.preventDefault();
                this._generarMensajeMilitar();
            });
        }
        
        // 4. ENVIAR A GOOGLE DOCS 
        if (this.btnGoogleDocs) {
            this.btnGoogleDocs.addEventListener('click', () => {
                this._enviarGoogleDocs();
            });
        }
    }
    
    /**
     * Obtiene los datos del comandante seleccionado
     * @returns {Object} - { nombre, grado, funcion, cargoCompleto }
     */
    _getComandanteData() {
        const nombre = this.comandanteSelect ? this.comandanteSelect.value : '';
        const grado = getGradoByNombre(nombre);
        const funcionId = this.funcionComandanteSelect ? this.funcionComandanteSelect.value : '';
        const funcionNombre = getFuncionById(funcionId);
        
        // Cargo completo: si tiene función, se usa; si no, el genérico
        const cargoBase = 'COMANDANTE DEL GT AGUILA (GOMAI)';
        const cargoCompleto = funcionNombre || cargoBase;
        
        return { nombre, grado, funcion: funcionNombre, cargoCompleto };
    }
    
    /**
     * Valida que se haya seleccionado comandante y función
     */
    _validarComandante() {
        const comandante = this._getComandanteData();
        if (!comandante.nombre) {
            alert('⚠️ Debes seleccionar un Comandante.');
            return null;
        }
        if (!comandante.funcion) {
            alert('⚠️ Debes seleccionar la Función del Comandante (Titular/Accidental).');
            return null;
        }
        return comandante;
    }
    
    // ==========================================================
    // 1. GENERAR MSJ WHATSAPP — NO usa comandante
    // ==========================================================
    _generarWhatsappCmdte() {
        const texto = this.textoArea ? this.textoArea.value : '';
        
        if (!texto.trim()) {
            alert('El campo de texto está vacío.');
            return;
        }
        
        const datos = this.extractor.extraerTodos(texto);
        const gfh = this.extractor.obtenerGFH();
        
        const resultado = `
            <p>*FTC "MANABÍ"*</p>
            <p>*GOMAI*</p>
            <p>*PROVINCIA:* ${datos.provincia}</p>
            <p>*CANTÓN:* ${datos.canton}</p>
            <p>*SECTOR:* ${datos.sector}</p>
            <p>*COORD:* ${datos.coordenadas}</p>
            <p>*GFH:* ${gfh}</p>
            <p>*OPERACIÓN:* ${datos.comoCortado}</p>
            <br>
            <p>*RESULTADOS:*</p>
            <p>${datos.resultados}</p>
            <br>
            <p>${datos.acciones}</p>
            <p>Adjunto fotografías.</p>
        `;
        
        this.modals.mostrarParte(resultado);
    }
    
    // ==========================================================
    // 2. FORMATO CMDTE PATRULLA — NO usa comandante
    // ==========================================================
    _generarFormatoCmdte() {
        this.modals.mostrarCmdte();
    }
    
    // ==========================================================
    // 3. GENERAR MENSAJE MILITAR — SÍ usa comandante
    // ==========================================================
    _generarMensajeMilitar() {
        const texto = this.textoArea ? this.textoArea.value : '';
        
        if (!texto.trim()) {
            alert('El campo de texto está vacío.');
            return;
        }
        
        // ✅ Validar comandante completo (nombre + función)
        const comandante = this._validarComandante();
        if (!comandante) return;
        
        const datos = this.extractor.extraerTodos(texto);
        
        // ✅ Mensaje Militar CON comandante al final
        this.modals.mostrarMilitar(datos, comandante);
    }
    
    // ==========================================================
    // 4. ENVIAR A GOOGLE DOCS — SÍ usa comandante
    // ==========================================================
async _enviarGoogleDocs() {
    const texto = this.textoArea ? this.textoArea.value : '';
    
    if (!texto.trim()) {
        alert('El campo de texto está vacío.');
        return;
    }
    
    const comandante = this._validarComandante();
    if (!comandante) return;
    
    const datos = this.extractor.extraerTodos(texto);
    const gfh = this.extractor.obtenerGFH();
    const fechaEncabezado = generarFechaHoraEncabezado();
    
    // ✅ CONSTRUIR PAYLOAD
    const payload = {
        ...datos,
        comandante: {
            nombre: comandante.nombre,
            grado: comandante.grado,
            funcion: comandante.funcion,
            cargoCompleto: comandante.cargoCompleto
        },
        gfh: gfh,
        fechaEncabezado: fechaEncabezado
    };
    
    console.log('📤 Enviando a Google Docs (POST):', JSON.stringify(payload, null, 2));
    
    // ✅ P-10: antes se mandaba por JSONP GET con el payload entero como
    // query param (&data=...encodeURIComponent...). Con partes largos de
    // WhatsApp, la URL podía acercarse o superar el límite práctico de
    // longitud. Ahora se manda por POST normal, con el payload en el
    // body — el mismo patrón que ya usa _enviarAAppsScript() en
    // app-controller.js para el OAT principal. El Apps Script #2 ya
    // tenía doPost() implementado (llamando a la misma procesarDatos()
    // compartida), así que no hizo falta tocar el backend otra vez.
    const URL_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxqiE8opUBUT77znu1-5l-BiWUQYfCXcs6bfUR0yMTNNHDpme38aOaz4-C2BD8jXko/exec';
    
    if (this.btnGoogleDocs) {
        this.btnGoogleDocs.disabled = true;
    }
    
    try {
        const response = await fetch(URL_WEBHOOK, {
            method: 'POST',
            // text/plain evita el preflight OPTIONS (mismo truco que ya
            // usa app-controller.js), reduciendo la posibilidad de que
            // el navegador bloquee la respuesta por CORS.
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
        });
        
        const resultado = await response.json();
        console.log('📥 Respuesta de Apps Script:', resultado);
        
        if (resultado.estatus === 'OK') {
            alert('✅ Documento generado correctamente.\n\nURL: ' + resultado.urlDocumento);
        } else {
            alert('❌ Error: ' + resultado.mensaje);
        }
    } catch (error) {
        console.error('❌ Error al enviar la información:', error);
        alert('❌ Error al enviar la información. No se pudo conectar con Google Apps Script.\n\n' + error.message);
    } finally {
        if (this.btnGoogleDocs) {
            this.btnGoogleDocs.disabled = false;
        }
    }
}
    /**
     * Obtiene la fecha para el encabezado en formato DDHHMM-MES-AA
     */
    _obtenerFechaEncabezado() {
        const ahora = new Date();
        const dia = String(ahora.getDate()).padStart(2, '0');
        const hora = String(ahora.getHours()).padStart(2, '0');
        const minutos = String(ahora.getMinutes()).padStart(2, '0');
        const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
        const mes = meses[ahora.getMonth()];
        const anio = String(ahora.getFullYear());
        return `${dia}${hora}${minutos}-${mes}-${anio}`;
    }
}