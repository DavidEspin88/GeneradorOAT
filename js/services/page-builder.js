// ==============================================
// PAGINADOR - CORREGIDO PARA EVITAR PÁGINAS EXCESIVAS
// ==============================================

export class PageBuilder {
    constructor() {
        this.MM_PX = 96 / 25.4;
    }

    /**
     * Pagina el contenido en páginas A4
     * @param {Array} bloques - Array de strings HTML
     * @param {boolean} esPrimeraPagina - Si es la primera página
     * @returns {Array} - Array de páginas (strings HTML)
     */
    paginar(bloques, esPrimeraPagina = true) {
        // Si no hay bloques, retornar vacío
        if (!bloques || bloques.length === 0) {
            return [''];
        }

        const medidor = document.createElement('div');
        medidor.className = 'medidor-paginas';
        medidor.style.cssText = `
            position: absolute;
            left: -99999px;
            top: 0;
            visibility: hidden;
            width: 210mm;
            padding: 2.19cm 2.01cm 2cm 2.05cm;
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
        `;
        document.body.appendChild(medidor);

        // Altura disponible para contenido
        const alturaTotal = (297 - 21.9 - 20) * this.MM_PX;
        const alturaPrimera = alturaTotal;
        const alturaResto = alturaTotal - (5 * this.MM_PX);

        // Crear elementos para medir
        const elementos = bloques.map((html) => {
            const div = document.createElement('div');
            div.innerHTML = html;
            medidor.appendChild(div);
            return div;
        });

        const paginas = [];
        let paginaActual = [];
        let inicioTop = null;
        let esPrimera = esPrimeraPagina;
        let acumulado = 0;

        elementos.forEach((el, index) => {
            const top = el.offsetTop;
            const h = el.offsetHeight;
            const fin = top + h;
            const limite = esPrimera ? alturaPrimera : alturaResto;

            if (inicioTop === null) inicioTop = top;

            // Si el contenido excede el límite, crear nueva página
            if (fin - inicioTop > limite && paginaActual.length > 0) {
                // Unir contenido de la página actual
                const contenidoPagina = paginaActual.join('');
                
                // ✅ Solo agregar página si tiene contenido
                if (contenidoPagina.trim().length > 0) {
                    paginas.push(contenidoPagina);
                }
                
                // Iniciar nueva página con el elemento actual
                paginaActual = [el.outerHTML];
                inicioTop = top;
                esPrimera = false;
                acumulado = 0;
            } else {
                paginaActual.push(el.outerHTML);
                acumulado += h;
            }
        });

        // Agregar última página si tiene contenido
        if (paginaActual.length > 0) {
            const contenidoPagina = paginaActual.join('');
            if (contenidoPagina.trim().length > 0) {
                paginas.push(contenidoPagina);
            }
        }

        document.body.removeChild(medidor);

        // ✅ Si no hay páginas, crear una vacía
        if (paginas.length === 0) {
            paginas.push('');
        }

        return paginas;
    }

    /**
     * Genera el HTML de las páginas con numeración y sellos "SECRETO"
     * @param {Array} paginas - Array de contenidos HTML
     * @param {string} numeroOrden - Número de orden del documento
     * @param {number} paginaInicio - Número de página inicial
     * @returns {DocumentFragment} - Fragmento con todas las páginas
     */
    generarPaginas(paginas, numeroOrden, paginaInicio = 1) {
        const totalPaginas = paginas.length + paginaInicio - 1;
        const fragment = document.createDocumentFragment();

        paginas.forEach((contenido, index) => {
            const esPrimera = index === 0 && paginaInicio === 1;
            const pageDiv = document.createElement('div');
            
            // ✅ Usar clase 'page' para todas, sin saltos de página forzados
            pageDiv.className = 'page';
            
            // ✅ NO usar 'page-adicional' que fuerza saltos

            let html = '<div class="texto-secreto">SECRETO</div>';
            
            // ✅ Encabezado secundario a partir de la segunda página
            if (!esPrimera) {
                html += `<div class="encabezado-secundario">Orden de acción táctica Nro. ${numeroOrden}</div>`;
            }
            
            html += `<div class="contenido-pagina">${contenido}</div>`;
            
            // ✅ Pie de página con numeración y SECRETO
            html += `
                <div class="numeracion">${paginaInicio + index} - ${totalPaginas}</div>
                <div class="texto-secreto-pie">SECRETO</div>
            `;

            pageDiv.innerHTML = html;
            fragment.appendChild(pageDiv);
        });

        return fragment;
    }

    /**
     * Método de respaldo: paginación por conteo de elementos
     */
    paginarPorConteo(bloques, itemsPorPagina = 30) {
        const paginas = [];
        for (let i = 0; i < bloques.length; i += itemsPorPagina) {
            const contenido = bloques.slice(i, i + itemsPorPagina).join('');
            if (contenido.trim().length > 0) {
                paginas.push(contenido);
            }
        }
        if (paginas.length === 0) {
            paginas.push('');
        }
        return paginas;
    }
}