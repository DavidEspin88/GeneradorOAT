// ==============================================
// APP.JS - PUNTO DE ENTRADA PRINCIPAL
// ==============================================

import { AppController } from './controllers/app-controller.js';
import { ParteController } from './controllers/parte-controller.js';

console.log('🚀 Iniciando Generador de OAT v3.0...');

document.addEventListener('DOMContentLoaded', () => {
    try {
        const appController = new AppController();
        window.app = { appController };
        
        // ===== NUEVO: Inicializar ParteController =====
        const parteController = new ParteController();
        window.app.parteController = parteController;
        
        console.log('✅ Aplicación lista');
    } catch (error) {
        console.error('❌ Error al iniciar:', error);
        alert('Error al iniciar la aplicación. Revisa la consola para más detalles.');
    }
});