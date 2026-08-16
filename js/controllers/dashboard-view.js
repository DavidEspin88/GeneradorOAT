// ==============================================
// DASHBOARD-VIEW.JS
// Controla únicamente la navegación entre el Dashboard Principal, la
// vista "Crear Orden de Operación" y la vista "Matriz de Cumplimiento".
// No contiene ninguna lógica de negocio (carga de Excel, agrupación,
// generación de documentos, cálculo de la matriz, etc.) — toda esa
// lógica sigue exactamente igual dentro de AppController y
// MatrizController.
// ==============================================

import { MatrizController } from './matriz-controller.js';

document.addEventListener('DOMContentLoaded', () => {
    const vistaDashboard = document.getElementById('vistaDashboard');
    const vistaCrearOrden = document.getElementById('vistaCrearOrden');
    const vistaMatriz = document.getElementById('vistaMatrizCumplimiento');
    const btnIrCrearOrden = document.getElementById('btnIrCrearOrden');
    const btnIrMatrizCumplimiento = document.getElementById('btnIrMatrizCumplimiento');
    const btnVolverDashboard = document.getElementById('btnVolverDashboard');
    const btnVolverDashboardMatriz = document.getElementById('btnVolverDashboardMatriz');

    if (!vistaDashboard || !vistaCrearOrden) {
        console.warn('⚠️ dashboard-view: no se encontraron las vistas esperadas en el DOM');
        return;
    }

    const matrizController = new MatrizController();

    function ocultarTodasLasVistas() {
        vistaDashboard.style.display = 'none';
        vistaCrearOrden.style.display = 'none';
        if (vistaMatriz) vistaMatriz.style.display = 'none';
    }

    function mostrarDashboard() {
        ocultarTodasLasVistas();
        vistaDashboard.style.display = '';
    }

    function mostrarCrearOrden() {
        ocultarTodasLasVistas();
        vistaCrearOrden.style.display = '';
    }

    function mostrarMatriz() {
        if (!vistaMatriz) return;
        ocultarTodasLasVistas();
        vistaMatriz.style.display = '';
    }

    // ✅ Navegación Dashboard → Crear Orden de Operación
    if (btnIrCrearOrden) {
        btnIrCrearOrden.addEventListener('click', () => {
            if (btnIrCrearOrden.disabled) return;
            mostrarCrearOrden();
        });
    }

    // ✅ Navegación Crear Orden de Operación → Dashboard
    if (btnVolverDashboard) {
        btnVolverDashboard.addEventListener('click', () => {
            mostrarDashboard();
        });
    }

    // ✅ Navegación Dashboard → Matriz de Cumplimiento
    if (btnIrMatrizCumplimiento) {
        btnIrMatrizCumplimiento.addEventListener('click', () => {
            if (btnIrMatrizCumplimiento.disabled) return;
            mostrarMatriz();
        });
    }

    // ✅ Navegación Matriz de Cumplimiento → Dashboard
    if (btnVolverDashboardMatriz) {
        btnVolverDashboardMatriz.addEventListener('click', () => {
            mostrarDashboard();
        });
    }

    // ✅ Habilita las tarjetas del Dashboard en cuanto el Excel se cargó
    // correctamente, y le pasa los mismos registros ya cargados a la
    // Matriz de Cumplimiento (el usuario NO vuelve a cargar el Excel).
    // Escucha el evento personalizado que AppController dispara al
    // terminar de cargar (ver app-controller.js, onCargarExcel).
    document.addEventListener('oat:excel-cargado', (evento) => {
        if (btnIrCrearOrden) {
            btnIrCrearOrden.disabled = false;
        }
        if (btnIrMatrizCumplimiento) {
            btnIrMatrizCumplimiento.disabled = false;
        }

        const detalle = evento.detail || {};
        matrizController.setDatos(detalle.registros, detalle.pestanasProcesadas);

        // ✅ Cambio puramente visual: refleja los mismos totales que ya
        // muestra #estadoCarga (sin recalcular nada) en los dos
        // indicadores grandes del Dashboard.
        const indicadorOats = document.getElementById('dashIndicadorOats');
        const indicadorOperaciones = document.getElementById('dashIndicadorOperaciones');
        if (indicadorOats && typeof detalle.totalGrupos === 'number') {
            indicadorOats.textContent = detalle.totalGrupos;
        }
        if (indicadorOperaciones && typeof detalle.totalOperaciones === 'number') {
            indicadorOperaciones.textContent = detalle.totalOperaciones;
        }
    });

    // Estado inicial: siempre arrancar en el Dashboard.
    mostrarDashboard();
});