// ==============================================
// RENDERIZADORES DE UI
// ==============================================

export class Renderers {
    /**
     * Muestra estado de carga
     */
    static mostrarEstadoCarga(elemento, mensaje, tipo = 'info') {
        if (!elemento) return;
        elemento.textContent = mensaje;
        
        const colores = {
            info: '#666',
            warning: '#ff9800',
            success: '#28a745',
            error: '#dc3545'
        };
        elemento.style.color = colores[tipo] || '#666';
    }

    /**
     * Crea un título para el documento generado
     */
    static crearTituloGenerado(texto = 'Documento generado') {
        const titulo = document.createElement('h2');
        titulo.style.cssText = `
            color: #1a237e;
            margin: 20px 0 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1a237e;
        `;
        titulo.textContent = texto;
        return titulo;
    }

    /**
     * Crea un loader
     */
    static crearLoader(mensaje = 'Cargando...') {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
        `;
        container.innerHTML = `
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #1a237e;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            "></div>
            <p style="color: #666;">${mensaje}</p>
        `;
        return container;
    }

    /**
     * Muestra una notificación toast
     */
    static mostrarNotificacion(mensaje, tipo = 'info', duracion = 3000) {
        const colores = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#FF9800'
        };
        const iconos = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: ${colores[tipo] || '#333'};
            color: white;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        toast.innerHTML = `${iconos[tipo] || '📢'} ${mensaje}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duracion);
    }
}

// Inyectar estilos de animación
const styleAnimations = document.createElement('style');
styleAnimations.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styleAnimations);