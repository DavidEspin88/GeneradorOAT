// ==============================================
// DASHBOARD-VIEW.JS
// Controla la navegación entre vistas mediante el sidebar.
// ==============================================

import { MatrizController } from './matriz-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    const vistaDashboard = document.getElementById('vistaDashboard');
    const vistaCrearOrden = document.getElementById('vistaCrearOrden');
    const vistaMatriz = document.getElementById('vistaMatrizCumplimiento');
    
    // Elementos del sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const headerTitulo = document.getElementById('headerTitulo');
    const headerDescripcion = document.getElementById('headerDescripcion');
    const headerIcono = document.getElementById('headerIcono');

    // Configuración de las vistas
    const VISTAS_CONFIG = {
        dashboard: {
            id: 'vistaDashboard',
            titulo: 'Panel Principal',
            descripcion: 'Gestión de operaciones',
            icono: 'fa-solid fa-house'
        },
        'crear-orden': {
            id: 'vistaCrearOrden',
            titulo: 'Crear Orden de Operación',
            descripcion: 'Gestión y generación de órdenes de acción táctica',
            icono: 'fa-solid fa-file-pen'
        },
        matriz: {
            id: 'vistaMatrizCumplimiento',
            titulo: 'Matriz de Cumplimiento',
            descripcion: 'Análisis y seguimiento de las operaciones ejecutadas',
            icono: 'fa-solid fa-table-list'
        }
    };

    const matrizController = new MatrizController();

    function ocultarTodasLasVistas() {
        // Ocultar todas las vistas con display:none
        if (vistaDashboard) vistaDashboard.style.display = 'none';
        if (vistaCrearOrden) vistaCrearOrden.style.display = 'none';
        if (vistaMatriz) vistaMatriz.style.display = 'none';
        
        // Remover clase active de todas las vistas
        document.querySelectorAll('.vista-panel').forEach(v => {
            v.classList.remove('active');
        });
    }

    function mostrarVista(vistaNombre) {
        const config = VISTAS_CONFIG[vistaNombre];
        if (!config) return;

        // Ocultar todas las vistas
        ocultarTodasLasVistas();

        // Mostrar la vista seleccionada
        const vistaElement = document.getElementById(config.id);
        if (vistaElement) {
            vistaElement.style.display = '';
            vistaElement.classList.add('active');
        }

        // Actualizar cabecera
        if (headerTitulo) headerTitulo.textContent = config.titulo;
        if (headerDescripcion) headerDescripcion.textContent = config.descripcion;
        if (headerIcono) headerIcono.className = config.icono;

        // Actualizar sidebar
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.vista === vistaNombre) {
                link.classList.add('active');
            }
        });
    }

    // ==============================================
    // EVENTOS DEL SIDEBAR
    // ==============================================

    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            const vista = link.dataset.vista;
            if (vista) {
                mostrarVista(vista);
            }
        });
    });

    // ==============================================
    // MANTENER COMPATIBILIDAD CON BOTONES EXISTENTES
    // ==============================================

    const btnIrCrearOrden = document.getElementById('btnIrCrearOrden');
    const btnIrMatrizCumplimiento = document.getElementById('btnIrMatrizCumplimiento');

    if (btnIrCrearOrden) {
        btnIrCrearOrden.addEventListener('click', () => {
            if (!btnIrCrearOrden.disabled) {
                mostrarVista('crear-orden');
            }
        });
    }

    if (btnIrMatrizCumplimiento) {
        btnIrMatrizCumplimiento.addEventListener('click', () => {
            if (!btnIrMatrizCumplimiento.disabled) {
                mostrarVista('matriz');
            }
        });
    }

    // ==============================================
    // EVENTO DE CARGA DE EXCEL
    // ==============================================

    document.addEventListener('oat:excel-cargado', (evento) => {
        if (btnIrCrearOrden) {
            btnIrCrearOrden.disabled = false;
        }
        if (btnIrMatrizCumplimiento) {
            btnIrMatrizCumplimiento.disabled = false;
        }

        const detalle = evento.detail || {};
        matrizController.setDatos(detalle.registros, detalle.pestanasProcesadas);

        const indicadorOats = document.getElementById('dashIndicadorOats');
        const indicadorOperaciones = document.getElementById('dashIndicadorOperaciones');
        if (indicadorOats && typeof detalle.totalGrupos === 'number') {
            indicadorOats.textContent = detalle.totalGrupos;
        }
        if (indicadorOperaciones && typeof detalle.totalOperaciones === 'number') {
            indicadorOperaciones.textContent = detalle.totalOperaciones;
        }
    });

    // ==============================================
    // INICIALIZACIÓN
    // ==============================================

    mostrarVista('dashboard');
});